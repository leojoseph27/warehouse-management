-- Convert dimension/measure fields from DOUBLE PRECISION to TEXT to support
-- multi-value storage for boxed sets.
--
-- Why: Products like a "Knife + Scissors + Peeler" boxed set need to store
-- multiple lengths (23, 32, 43) or named lengths (Knife: 23, Scissors: 32,
-- Peeler: 43) in a SINGLE column — without adding extra columns.
--
-- TEXT is the cleanest choice because:
--   - A single value "23" still works (backward compatible)
--   - Multiple values "23, 32, 43" are stored as a comma-separated string
--   - Named values "Knife: 23, Scissors: 32" use "Name: value" segments
--   - Excel import/export treat the cell as text (no type coercion issues)
--
-- The USING clause casts existing Float values to their text representation.
-- Trailing ".0" is stripped so "23.0" becomes "23" (cleaner display).
--
-- Affected tables: products, product_originals
-- Affected columns: capacity, weight, length, width, height, diameter
--
-- NOTE: defaultPrice stays Float (used for numeric range filters: priceMin/priceMax).
--       sourceRow stays Int (used for range filters and sorting).
--       confidenceScore, pieces, setCount stay Int (counts/scores, not multi-value).

-- ── products table ──
ALTER TABLE "products" ALTER COLUMN "capacity" TYPE TEXT USING
  CASE WHEN "capacity" IS NULL THEN NULL
       WHEN "capacity" = TRUNC("capacity") THEN TRUNC("capacity")::text
       ELSE "capacity"::text
  END;

ALTER TABLE "products" ALTER COLUMN "weight" TYPE TEXT USING
  CASE WHEN "weight" IS NULL THEN NULL
       WHEN "weight" = TRUNC("weight") THEN TRUNC("weight")::text
       ELSE "weight"::text
  END;

ALTER TABLE "products" ALTER COLUMN "length" TYPE TEXT USING
  CASE WHEN "length" IS NULL THEN NULL
       WHEN "length" = TRUNC("length") THEN TRUNC("length")::text
       ELSE "length"::text
  END;

ALTER TABLE "products" ALTER COLUMN "width" TYPE TEXT USING
  CASE WHEN "width" IS NULL THEN NULL
       WHEN "width" = TRUNC("width") THEN TRUNC("width")::text
       ELSE "width"::text
  END;

ALTER TABLE "products" ALTER COLUMN "height" TYPE TEXT USING
  CASE WHEN "height" IS NULL THEN NULL
       WHEN "height" = TRUNC("height") THEN TRUNC("height")::text
       ELSE "height"::text
  END;

ALTER TABLE "products" ALTER COLUMN "diameter" TYPE TEXT USING
  CASE WHEN "diameter" IS NULL THEN NULL
       WHEN "diameter" = TRUNC("diameter") THEN TRUNC("diameter")::text
       ELSE "diameter"::text
  END;

-- ── product_originals table ──
ALTER TABLE "product_originals" ALTER COLUMN "capacity" TYPE TEXT USING
  CASE WHEN "capacity" IS NULL THEN NULL
       WHEN "capacity" = TRUNC("capacity") THEN TRUNC("capacity")::text
       ELSE "capacity"::text
  END;

ALTER TABLE "product_originals" ALTER COLUMN "weight" TYPE TEXT USING
  CASE WHEN "weight" IS NULL THEN NULL
       WHEN "weight" = TRUNC("weight") THEN TRUNC("weight")::text
       ELSE "weight"::text
  END;

ALTER TABLE "product_originals" ALTER COLUMN "length" TYPE TEXT USING
  CASE WHEN "length" IS NULL THEN NULL
       WHEN "length" = TRUNC("length") THEN TRUNC("length")::text
       ELSE "length"::text
  END;

ALTER TABLE "product_originals" ALTER COLUMN "width" TYPE TEXT USING
  CASE WHEN "width" IS NULL THEN NULL
       WHEN "width" = TRUNC("width") THEN TRUNC("width")::text
       ELSE "width"::text
  END;

ALTER TABLE "product_originals" ALTER COLUMN "height" TYPE TEXT USING
  CASE WHEN "height" IS NULL THEN NULL
       WHEN "height" = TRUNC("height") THEN TRUNC("height")::text
       ELSE "height"::text
  END;

ALTER TABLE "product_originals" ALTER COLUMN "diameter" TYPE TEXT USING
  CASE WHEN "diameter" IS NULL THEN NULL
       WHEN "diameter" = TRUNC("diameter") THEN TRUNC("diameter")::text
       ELSE "diameter"::text
  END;
