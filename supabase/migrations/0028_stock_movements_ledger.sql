-- ─────────────────────────────────────────────────────────────────────────────
-- #3  Append-only inventory ledger.
--
-- Stock was only a mutable counter on product_variants — no history of why it
-- changed. stock_movements records every change as a signed delta plus the
-- resulting on-hand (balance_after), so the ledger is auditable and self-checking
-- (sum of deltas per variant == current stock). Writes happen only inside
-- SECURITY DEFINER RPCs (create_order, add/update_admin_product — wired in 0030),
-- which bypass RLS; the table is staff read-only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.stock_movements (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variant_id    bigint  NOT NULL REFERENCES public.product_variants(variant_id) ON DELETE CASCADE,
  delta         integer NOT NULL,                  -- signed: -2 sold, +10 restocked
  balance_after integer,                           -- on-hand immediately after this movement
  reason        text    NOT NULL
                  CHECK (reason IN ('opening','order','restock','adjustment','cancellation','return')),
  order_id      bigint  REFERENCES public.orders(order_id) ON DELETE SET NULL,
  actor         uuid,                              -- auth.uid() that caused it (null for system)
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stock_movements_variant_id_idx ON public.stock_movements (variant_id);
CREATE INDEX stock_movements_order_id_idx   ON public.stock_movements (order_id);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Audit log: staff read-only. No write policy — only SECURITY DEFINER RPCs insert.
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));

GRANT SELECT ON public.stock_movements TO authenticated;

-- Backfill: one 'opening' movement per variant capturing current on-hand, so the
-- ledger's running sum equals live stock from day one.
INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, note)
SELECT variant_id, stock, stock, 'opening', 'Initial ledger baseline'
FROM public.product_variants;
