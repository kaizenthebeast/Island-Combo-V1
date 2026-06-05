-- 0008_order_fulfillment.sql
-- Admin order fulfillment & tracking.
--
-- Adds: a canonical order-status CHECK, and three SECURITY DEFINER RPCs that are
-- the ONLY way the admin reads/writes orders. They self-check is_staff(), so we
-- never expose a broad view to `authenticated` (which PostgREST would happily
-- serve to any logged-in user). Customer-facing reads keep using plain RLS.
--
-- Status lifecycle (lowercase canonical, UI renders pretty labels):
--   pending  -> COD order placed, awaiting fulfillment
--   paid     -> payment received (PayPal/card)
--   shipped  -> handed to courier
--   out_for_delivery
--   delivered  -> card order delivered            (terminal success, accrues points)
--   completed  -> COD cash collected & finalized  (terminal success, accrues points)
--   cancelled  -> terminal

begin;

-- 1) Canonical status set ------------------------------------------------------
-- Existing rows are only 'pending' / 'completed', both inside the new set.
alter table public.orders
  drop constraint if exists orders_order_status_check;

alter table public.orders
  add constraint orders_order_status_check
  check (order_status in (
    'pending', 'paid', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'
  ));

-- 2) Admin: paginated, filterable order list -----------------------------------
-- Returns each matching order's summary plus a window total_count so the caller
-- can paginate without a second query.
create or replace function public.admin_list_orders(
  p_search    text default null,
  p_status    text default null,
  p_payment   text default null,
  p_sort_key  text default 'created_at',
  p_sort_dir  text default 'desc',
  p_limit     int  default 10,
  p_offset    int  default 0
)
returns table (
  order_id        bigint,
  user_id         uuid,
  order_status    text,
  payment_method  text,
  total_amount    numeric,
  shipping_fee    numeric,
  discount_amount numeric,
  promo_code      text,
  created_at      timestamptz,
  updated_at      timestamptz,
  customer_name   text,
  email           text,
  phone_number    text,
  total_qty       bigint,
  item_count      bigint,
  total_count     bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_asc    boolean := (lower(coalesce(p_sort_dir, 'desc')) = 'asc');
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  with base as (
    select
      o.order_id, o.user_id, o.order_status, o.payment_method,
      o.total_amount, o.shipping_fee, o.discount_amount, o.promo_code,
      o.created_at, o.updated_at,
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '') as customer_name,
      p.email,
      o.phone_number,
      coalesce((select sum(oi.quantity) from public.order_items oi where oi.order_id = o.order_id), 0)::bigint as total_qty,
      (select count(*) from public.order_items oi where oi.order_id = o.order_id)::bigint as item_count
    from public.orders o
    left join public.profile p on p.user_id = o.user_id
    where (p_status  is null or p_status  in ('', 'All') or o.order_status   = p_status)
      and (p_payment is null or p_payment in ('', 'All') or o.payment_method = p_payment)
      and (
        v_search is null
        or o.order_id::text = v_search
        or p.email ilike '%' || v_search || '%'
        or concat_ws(' ', p.first_name, p.last_name) ilike '%' || v_search || '%'
      )
  ),
  counted as (
    select base.*, count(*) over() as total_count from base
  )
  select *
  from counted
  order by
    case when p_sort_key = 'total_amount' and     v_asc then counted.total_amount end asc  nulls last,
    case when p_sort_key = 'total_amount' and not v_asc then counted.total_amount end desc nulls last,
    case when p_sort_key = 'order_status' and     v_asc then counted.order_status end asc,
    case when p_sort_key = 'order_status' and not v_asc then counted.order_status end desc,
    case when p_sort_key not in ('total_amount','order_status') and     v_asc then counted.created_at end asc,
    case when p_sort_key not in ('total_amount','order_status') and not v_asc then counted.created_at end desc
  limit  greatest(coalesce(p_limit, 10), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- 3) Admin: single order detail (header + customer + line items) ---------------
-- Timeline is read separately via the existing transaction_event RLS.
create or replace function public.admin_get_order(p_order_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_order    public.orders;
  v_customer jsonb;
  v_items    jsonb;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_order from public.orders where order_id = p_order_id;
  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'user_id',    p.user_id,
    'name',       nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'email',      p.email,
    'phone_text', p.phone_text
  )
  into v_customer
  from public.profile p
  where p.user_id = v_order.user_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',           oi.id,
      'variant_id',   oi.variant_id,
      'quantity',     oi.quantity,
      'price',        oi.price,
      'line_total',   oi.price * oi.quantity,
      'sku',          pv.sku,
      'product_name', pr.name
    ) order by oi.id
  ), '[]'::jsonb)
  into v_items
  from public.order_items oi
  left join public.product_variants pv on pv.variant_id = oi.variant_id
  left join public.products pr         on pr.product_id = pv.product_id
  where oi.order_id = p_order_id;

  return jsonb_build_object(
    'order',    to_jsonb(v_order),
    'customer', coalesce(v_customer, '{}'::jsonb),
    'items',    v_items
  );
end;
$$;

-- 4) Admin: status update (the fulfillment tool) -------------------------------
-- Atomically: update the status, append a timeline entry, and accrue loyalty
-- points the first time the order reaches a terminal-success state.
create or replace function public.admin_update_order_status(
  p_order_id       bigint,
  p_status         text,
  p_delivery_notes text default null
)
returns public.orders
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor   uuid := auth.uid();
  v_order   public.orders;
  v_points  integer;
  v_accrued boolean;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_status not in ('pending','paid','shipped','out_for_delivery','delivered','completed','cancelled') then
    raise exception 'Invalid status %', p_status using errcode = '22023';
  end if;

  update public.orders
     set order_status = p_status,
         updated_at   = now()
   where order_id = p_order_id
  returning * into v_order;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  -- Append to the order timeline (transaction_event).
  perform public.log_transaction_event(
    p_order_id,
    null,
    p_status,
    'staff',
    v_actor,
    nullif(btrim(coalesce(p_delivery_notes, '')), ''),
    jsonb_build_object('delivery_notes', p_delivery_notes)
  );

  -- Points accrual: once per order, on the first terminal-success transition.
  if p_status in ('delivered', 'completed') and v_order.user_id is not null then
    select exists (
      select 1 from public.profile_pts_transaction_records
      where order_id = p_order_id and points > 0
    ) into v_accrued;

    if not v_accrued then
      v_points := floor(coalesce(v_order.total_amount, 0))::int;  -- 1 pt per $1
      if v_points > 0 then
        insert into public.profile_pts_transaction_records (user_id, order_id, points, reason)
        values (v_order.user_id, p_order_id, v_points, 'Order ' || p_status);

        update public.profile_pts
           set total_pts = total_pts + v_points
         where user_id = v_order.user_id;

        if not found then
          insert into public.profile_pts (user_id, total_pts)
          values (v_order.user_id, v_points);
        end if;
      end if;
    end if;
  end if;

  return v_order;
end;
$$;

grant execute on function public.admin_list_orders(text, text, text, text, text, int, int) to authenticated;
grant execute on function public.admin_get_order(bigint) to authenticated;
grant execute on function public.admin_update_order_status(bigint, text, text) to authenticated;

commit;
