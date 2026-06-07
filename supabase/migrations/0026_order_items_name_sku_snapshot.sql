-- ─────────────────────────────────────────────────────────────────────────────
-- #1  Snapshot product name + SKU onto order_items.
--
-- order_items stored only variant_id/quantity/price; the name & SKU were rebuilt
-- via a LIVE join to product_variants→products at read time, so a product rename
-- or variant delete silently rewrote order history. Snapshot them like `price`
-- already is, so each line is self-describing forever.
-- create_order is taught to populate these in migration 0030 (single redefinition
-- after all the new tables exist); the NOT NULL on product_name is added there too.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.order_items
  ADD COLUMN product_name text,
  ADD COLUMN sku          text;

-- Backfill existing rows from the current catalog.
UPDATE public.order_items oi
SET product_name = p.name,
    sku          = v.sku
FROM public.product_variants v
JOIN public.products p ON p.product_id = v.product_id
WHERE oi.variant_id = v.variant_id;

-- Safety net: any line whose variant/product is already gone gets a placeholder
-- so the NOT NULL (added in 0030) can't fail on legacy data.
UPDATE public.order_items
SET product_name = 'Unknown product'
WHERE product_name IS NULL;

-- admin_get_order: prefer the snapshot, fall back to the live join for safety.
CREATE OR REPLACE FUNCTION public.admin_get_order(p_order_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      'sku',          coalesce(oi.sku, pv.sku),
      'product_name', coalesce(oi.product_name, pr.name)
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
$function$;
