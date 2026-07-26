import { db } from '@/lib/db';

/**
 * Assign a sequential `updatedListSerial` to every modified product
 * (`updatedAt > createdAt`) that doesn't already have one.
 *
 * ROOT CAUSE this fixes:
 *   The previous implementation only assigned `updatedListSerial` inside the
 *   PUT handler (on product save). Products that were modified *before* the
 *   feature shipped — or via any path that doesn't go through PUT — have
 *   `updatedListSerial = NULL`, so the Updated List showed serials only for
 *   the handful of products saved after the feature (e.g. just "1" and "2").
 *
 * Guarantees:
 *   - Existing serials are NEVER changed or reused.
 *   - New serials start at `(current max serial) + 1`.
 *   - Within the unnumbered set, the oldest modification (by `updatedAt`)
 *     gets the lowest available number, so the Updated List reads
 *     1, 2, 3, … in a stable, deterministic order.
 *   - Idempotent: a no-op (0 rows affected) once every modified product has
 *     a serial, so it is cheap to run on every Updated List load.
 *
 * Implementation:
 *   A single atomic PostgreSQL `UPDATE ... FROM (subquery)` using a window
 *   function (`ROW_NUMBER`). No client-side loop, no multi-statement
 *   transaction — one round-trip, inherently atomic. Column names are
 *   double-quoted because Prisma creates camelCase columns and PostgreSQL
 *   lowercases unquoted identifiers.
 *
 * @returns number of products that received a new serial (0 = nothing to do).
 */
export async function backfillUpdatedListSerials(): Promise<number> {
  const affected = await db.$executeRaw`
    UPDATE products SET "updatedListSerial" = sub.new_serial
    FROM (
      SELECT id,
        ROW_NUMBER() OVER (ORDER BY "updatedAt" ASC) +
        COALESCE(
          (SELECT MAX("updatedListSerial") FROM products
           WHERE "updatedListSerial" IS NOT NULL),
          0
        ) AS new_serial
      FROM products
      WHERE "updatedAt" > "createdAt"
        AND "updatedListSerial" IS NULL
    ) AS sub
    WHERE products.id = sub.id
  `;
  // Prisma returns the affected-row count as a number (Prisma 5+).
  return Number(affected);
}
