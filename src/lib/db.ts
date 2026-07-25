import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma with optimized connection pool for Neon PostgreSQL
// Neon requires connection pooling for serverless/edge environments
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // Neon connection pool configuration via DATABASE_URL
    // Recommended: ?pgbouncer=true&connect_timeout=10&pool_timeout=30
  });
};

export const db = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Graceful shutdown handling
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect();
  });
}

export default db;

/**
 * Touch a product's `updatedAt` timestamp without changing any other field.
 *
 * WHY: The "Recently Updated" filter (onlyModified=1) queries
 * `WHERE "updatedAt" > "createdAt"`. Image operations (upload, delete,
 * replace, set-primary, reorder) only modify the `product_images` table,
 * not the `products` table — so the product's `updatedAt` doesn't change
 * and the product doesn't appear in the "Recently Updated" filter.
 *
 * Calling this after every image operation ensures the product shows up
 * in the "Recently Updated" filter whenever its images change.
 *
 * HOW: We explicitly set `updatedAt: new Date()` because Prisma's
 * `@updatedAt` only auto-fires when at least one field in `data` changes.
 * An empty `data: {}` would NOT trigger the auto-update.
 *
 * Errors are swallowed (just logged) so a failed touch never breaks the
 * actual image operation — the image was already uploaded/deleted, and
 * the user expects that to succeed even if the touch fails.
 */
export async function touchProductUpdatedAt(productId: string): Promise<void> {
  try {
    await db.product.update({
      where: { id: productId },
      data: { updatedAt: new Date() },
    });
  } catch (err: any) {
    // Don't let a failed touch break the image operation.
    console.error(`[touchProductUpdatedAt] Failed for product ${productId}:`, err?.message || err);
  }
}

// Helper for bulk operations with proper transaction handling
export async function bulkCreate<T>(
  model: any,
  data: T[],
  batchSize: number = 100
): Promise<{ created: number; errors: { index: number; error: string }[] }> {
  const errors: { index: number; error: string }[] = [];
  let created = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      await model.createMany({ data: batch, skipDuplicates: true });
      created += batch.length;
    } catch (err: any) {
      // If batch fails, try individual inserts to identify problematic rows
      for (let j = 0; j < batch.length; j++) {
        try {
          await model.create({ data: batch[j] });
          created++;
        } catch (singleErr: any) {
          errors.push({ index: i + j, error: singleErr?.message || String(singleErr) });
        }
      }
    }
  }

  return { created, errors };
}