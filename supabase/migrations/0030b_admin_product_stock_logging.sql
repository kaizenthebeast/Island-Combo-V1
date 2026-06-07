-- ─────────────────────────────────────────────────────────────────────────────
-- #3 (cont.)  Teach the admin product RPCs to write the stock ledger.
--   • add_admin_product    → 'restock' movement for each new variant's opening stock
--   • update_admin_product → 'adjustment' on net stock change of an existing variant,
--                            'restock' for a newly-added variant
-- Only the stock-logging lines are new; the rest of each function is unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_admin_product(payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_product_id bigint;
  v_variant    jsonb;
  v_attr       jsonb;
  v_detail     jsonb;
  v_image      jsonb;
  v_tier       jsonb;
  v_variant_id bigint;
  v_sku        text;
  v_index      int := 0;
  v_user_id    uuid;
  v_stock      int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You must be logged in to perform this action';
  END IF;

  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'FORBIDDEN: admin or staff role required to manage products'
      USING errcode = '42501';
  END IF;

  IF payload->>'name' IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Product name is required';
  END IF;
  IF payload->>'slug' IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Product slug is required';
  END IF;
  IF payload->'variants' IS NULL OR jsonb_array_length(payload->'variants') = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: At least one variant is required';
  END IF;

  BEGIN
    INSERT INTO products (name, description, category_id, slug, discount, status, type)
    VALUES (
      payload->>'name',
      payload->>'description',
      (payload->>'category_id')::bigint,
      payload->>'slug',
      (payload->>'discount')::numeric,
      COALESCE((payload->>'status')::product_status, 'ACTIVE'::product_status),
      payload->>'type'
    )
    RETURNING product_id INTO v_product_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'DUPLICATE_ERROR: A product with slug "%" already exists', payload->>'slug';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'PRODUCT_INSERT_ERROR: % — %', SQLERRM, SQLSTATE;
  END;

  FOR v_variant IN SELECT * FROM jsonb_array_elements(payload->'variants')
  LOOP
    v_index := v_index + 1;

    IF (v_variant->>'price')::numeric IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Variant % is missing a price', v_index;
    END IF;
    IF (v_variant->>'price')::numeric < 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Variant % price cannot be negative', v_index;
    END IF;

    v_sku   := 'P' || v_product_id || '-V' || v_index;
    v_stock := COALESCE((v_variant->>'stock')::int, 0);

    BEGIN
      INSERT INTO product_variants (product_id, sku, price, stock, is_active)
      VALUES (
        v_product_id,
        v_sku,
        (v_variant->>'price')::numeric,
        v_stock,
        COALESCE((v_variant->>'is_active')::boolean, true)
      )
      RETURNING variant_id INTO v_variant_id;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'DUPLICATE_ERROR: SKU "%" already exists for variant %', v_sku, v_index;
      WHEN OTHERS THEN
        RAISE EXCEPTION 'VARIANT_INSERT_ERROR: Variant % — % (%)', v_index, SQLERRM, SQLSTATE;
    END;

    -- Ledger the opening stock of the new variant.
    IF v_stock <> 0 THEN
      INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, actor, note)
      VALUES (v_variant_id, v_stock, v_stock, 'restock', v_user_id, 'Variant created');
    END IF;

    IF v_variant->'pricing_tiers' IS NOT NULL
       AND jsonb_array_length(v_variant->'pricing_tiers') > 0 THEN
      FOR v_tier IN SELECT * FROM jsonb_array_elements(v_variant->'pricing_tiers')
      LOOP
        INSERT INTO variant_pricing_tiers (variant_id, label, min_quantity, discount_percent, is_active)
        VALUES (
          v_variant_id, 'wholesale',
          (v_tier->>'min_quantity')::int,
          (v_tier->>'discount_percent')::numeric,
          true
        );
      END LOOP;
    END IF;

    FOR v_attr IN SELECT * FROM jsonb_array_elements(v_variant->'attributes')
    LOOP
      INSERT INTO variant_attributes (variant_id, attribute_name, attribute_value)
      VALUES (v_variant_id, v_attr->>'attribute_name', v_attr->>'attribute_value');
    END LOOP;

    FOR v_image IN SELECT * FROM jsonb_array_elements(v_variant->'images')
    LOOP
      INSERT INTO product_images (variant_id, image_path, is_primary, sort_order)
      VALUES (
        v_variant_id,
        v_image->>'url',
        COALESCE((v_image->>'is_primary')::boolean, false),
        COALESCE((v_image->>'sort_order')::int, 0)
      );
    END LOOP;
  END LOOP;

  FOR v_detail IN SELECT * FROM jsonb_array_elements(payload->'details')
  LOOP
    INSERT INTO product_details (product_id, attribute_name, attribute_value, sort_order)
    VALUES (
      v_product_id,
      v_detail->>'attribute_name',
      v_detail->>'attribute_value',
      COALESCE((v_detail->>'sort_order')::int, 0)
    );
  END LOOP;

  RETURN v_product_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_product(payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_variant    jsonb;
  v_attr       jsonb;
  v_detail     jsonb;
  v_image      jsonb;
  v_tier       jsonb;
  v_variant_id bigint;
  v_index      int := 0;
  v_sku        text;
  v_product_id bigint;
  v_user_id    uuid;
  v_old_stock  int;
  v_new_stock  int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You must be logged in to perform this action';
  END IF;

  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'FORBIDDEN: admin or staff role required to manage products'
      USING errcode = '42501';
  END IF;

  v_product_id := (payload->>'product_id')::bigint;
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: product_id is required for update';
  END IF;
  IF payload->>'name' IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Product name is required';
  END IF;
  IF payload->>'slug' IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Product slug is required';
  END IF;
  IF payload->'variants' IS NULL OR jsonb_array_length(payload->'variants') = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: At least one variant is required';
  END IF;

  BEGIN
    UPDATE products SET
      name        = payload->>'name',
      description = payload->>'description',
      category_id = (payload->>'category_id')::bigint,
      slug        = payload->>'slug',
      discount    = (payload->>'discount')::numeric,
      status      = COALESCE((payload->>'status')::product_status, 'ACTIVE'::product_status),
      type        = payload->>'type',
      updated_at  = now()
    WHERE product_id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND_ERROR: Product with id % does not exist', v_product_id;
    END IF;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'DUPLICATE_ERROR: A product with slug "%" already exists', payload->>'slug';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'PRODUCT_UPDATE_ERROR: % — %', SQLERRM, SQLSTATE;
  END;

  DELETE FROM product_details WHERE product_id = v_product_id;
  FOR v_detail IN SELECT * FROM jsonb_array_elements(payload->'details')
  LOOP
    INSERT INTO product_details (product_id, attribute_name, attribute_value, sort_order)
    VALUES (
      v_product_id,
      v_detail->>'attribute_name',
      v_detail->>'attribute_value',
      COALESCE((v_detail->>'sort_order')::int, 0)
    );
  END LOOP;

  FOR v_variant IN SELECT * FROM jsonb_array_elements(payload->'variants')
  LOOP
    v_index := v_index + 1;

    IF (v_variant->>'price')::numeric IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Variant % is missing a price', v_index;
    END IF;
    IF (v_variant->>'price')::numeric < 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Variant % price cannot be negative', v_index;
    END IF;

    IF (v_variant->>'variant_id') IS NOT NULL THEN
      v_variant_id := (v_variant->>'variant_id')::bigint;

      SELECT stock INTO v_old_stock
      FROM product_variants WHERE variant_id = v_variant_id AND product_id = v_product_id;

      UPDATE product_variants SET
        price      = (v_variant->>'price')::numeric,
        stock      = COALESCE((v_variant->>'stock')::int, 0),
        is_active  = COALESCE((v_variant->>'is_active')::boolean, true),
        updated_at = now()
      WHERE variant_id = v_variant_id
        AND product_id = v_product_id
      RETURNING stock INTO v_new_stock;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND_ERROR: Variant % not found for product %', v_variant_id, v_product_id;
      END IF;

      -- Ledger any net stock change from this edit.
      IF v_new_stock IS DISTINCT FROM v_old_stock THEN
        INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, actor, note)
        VALUES (v_variant_id, v_new_stock - v_old_stock, v_new_stock, 'adjustment', v_user_id, 'Admin product update');
      END IF;
    ELSE
      v_sku := 'P' || v_product_id || '-V' ||
        ((SELECT COUNT(*) FROM product_variants WHERE product_id = v_product_id) + 1);
      v_new_stock := COALESCE((v_variant->>'stock')::int, 0);

      INSERT INTO product_variants (product_id, sku, price, stock, is_active)
      VALUES (
        v_product_id,
        v_sku,
        (v_variant->>'price')::numeric,
        v_new_stock,
        COALESCE((v_variant->>'is_active')::boolean, true)
      )
      RETURNING variant_id INTO v_variant_id;

      IF v_new_stock <> 0 THEN
        INSERT INTO public.stock_movements (variant_id, delta, balance_after, reason, actor, note)
        VALUES (v_variant_id, v_new_stock, v_new_stock, 'restock', v_user_id, 'Variant created');
      END IF;
    END IF;

    DELETE FROM variant_pricing_tiers WHERE variant_id = v_variant_id;
    INSERT INTO variant_pricing_tiers (variant_id, label, min_quantity, discount_percent, is_active)
    VALUES (v_variant_id, 'retail', 1, 0, true);

    IF v_variant->'pricing_tiers' IS NOT NULL THEN
      FOR v_tier IN SELECT * FROM jsonb_array_elements(v_variant->'pricing_tiers')
      LOOP
        INSERT INTO variant_pricing_tiers (variant_id, label, min_quantity, discount_percent, is_active)
        VALUES (
          v_variant_id,
          COALESCE(v_tier->>'label', 'wholesale'),
          (v_tier->>'min_quantity')::int,
          (v_tier->>'discount_percent')::numeric,
          true
        );
      END LOOP;
    END IF;

    DELETE FROM variant_attributes WHERE variant_id = v_variant_id;
    FOR v_attr IN SELECT * FROM jsonb_array_elements(v_variant->'attributes')
    LOOP
      INSERT INTO variant_attributes (variant_id, attribute_name, attribute_value)
      VALUES (v_variant_id, v_attr->>'attribute_name', v_attr->>'attribute_value');
    END LOOP;

    DELETE FROM product_images WHERE variant_id = v_variant_id;
    FOR v_image IN SELECT * FROM jsonb_array_elements(v_variant->'images')
    LOOP
      INSERT INTO product_images (variant_id, image_path, is_primary, sort_order)
      VALUES (
        v_variant_id,
        v_image->>'url',
        COALESCE((v_image->>'is_primary')::boolean, false),
        COALESCE((v_image->>'sort_order')::int, 0)
      );
    END LOOP;
  END LOOP;

  RETURN v_product_id;
END;
$function$;
