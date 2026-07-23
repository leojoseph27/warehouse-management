-- Add enCatalog column to products and product_originals tables.
-- EN CATALOG is a third product name (alongside Name AR and Name EN),
-- placed in the Product Information group. Optional free-text field.

ALTER TABLE "products" ADD COLUMN "enCatalog" TEXT;

ALTER TABLE "product_originals" ADD COLUMN "enCatalog" TEXT;
