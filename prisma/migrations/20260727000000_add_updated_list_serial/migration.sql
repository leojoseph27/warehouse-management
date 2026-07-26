-- Add updatedListSerial column to products table.
-- Stores a sequential number assigned when a product first becomes "modified"
-- (enters the Updated List). Once assigned, it never changes.
-- null = product has not been modified yet.

ALTER TABLE "products" ADD COLUMN "updatedListSerial" INTEGER;

-- Create an index for efficient sorting/filtering in the Updated List
CREATE INDEX "products_updatedListSerial_idx" ON "products"("updatedListSerial");
