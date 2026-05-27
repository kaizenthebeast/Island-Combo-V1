-- ─────────────────────────────────────────────────────────────────────────────
-- Adds a slug column to public.category so categories can be addressed by
-- /category/<slug> in the app instead of /category/<id>.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Shared slugify helper (used by trigger + backfill) ───────────────────────
CREATE OR REPLACE FUNCTION public.slugify(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_slug text;
BEGIN
  v_slug := lower(coalesce(p_text, ''));
  v_slug := regexp_replace(v_slug, '&', ' and ', 'g');
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  RETURN v_slug;
END;
$$;

-- 2. Add slug column (nullable for now, made NOT NULL after backfill) ────────
ALTER TABLE public.category
  ADD COLUMN IF NOT EXISTS slug text;

-- 3. Backfill from name ───────────────────────────────────────────────────────
UPDATE public.category
SET slug = public.slugify(name)
WHERE slug IS NULL OR slug = '';

-- 4. De-dupe any collisions by appending -<category_id> to all but the
--    lowest-id row sharing the slug. Cheap and deterministic.
WITH duplicates AS (
  SELECT
    category_id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY category_id) AS rn
  FROM public.category
)
UPDATE public.category c
SET slug = c.slug || '-' || c.category_id
FROM duplicates d
WHERE d.category_id = c.category_id
  AND d.rn > 1;

-- 5. Constraints ──────────────────────────────────────────────────────────────
ALTER TABLE public.category
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'category_slug_key'
      AND conrelid = 'public.category'::regclass
  ) THEN
    ALTER TABLE public.category
      ADD CONSTRAINT category_slug_key UNIQUE (slug);
  END IF;
END $$;

-- 6. Trigger: auto-fill slug if caller didn't provide one ─────────────────────
CREATE OR REPLACE FUNCTION public.category_set_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS category_set_slug_trigger ON public.category;
CREATE TRIGGER category_set_slug_trigger
  BEFORE INSERT ON public.category
  FOR EACH ROW EXECUTE FUNCTION public.category_set_slug();
