-- Add oldValues column to products table for change history tracking.
-- Stores a JSON string mapping field names to their original (pre-edit) values.
-- Example: {"nameEn": "Fruit Knife", "length": "12 cm"}
--
-- When a field is changed from a non-null value to a different value, the
-- old value is saved here (only once — the first original value is preserved
-- and never overwritten on subsequent edits).

ALTER TABLE "products" ADD COLUMN "oldValues" TEXT;
