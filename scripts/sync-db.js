/**
 * Sync Prisma schema to the database.
 *
 * This script runs `prisma db push` to ensure the database schema matches
 * the Prisma schema. It is invoked during the Vercel build (see the
 * `build` script in package.json) so that schema changes (like adding
 * the `enCatalog` column) are automatically applied to the production
 * database on every deployment.
 *
 * Why `db push` instead of `migrate deploy`?
 *   - The repo's migration history is incomplete (no initial migration
 *     creates the `products` / `product_originals` / etc. tables), so
 *     `prisma migrate deploy` would fail on a fresh DB.
 *   - `db push` directly syncs the schema to the DB without requiring
 *     migration history, which is what we want for this project.
 *
 * Error handling:
 *   - If `DATABASE_URL` is missing, log a warning and exit 0 (don't
 *     fail the build — the app might still work if the schema is
 *     already in sync, and failing here would block preview deploys).
 *   - If `db push` fails for any other reason, log the error and exit 1
 *     so the build fails loudly and the issue is visible.
 */

const { execSync } = require('node:child_process');

function log(msg) {
  // Prefix with a recognizable tag so it shows up in Vercel build logs.
  console.log(`[sync-db] ${msg}`);
}

function logError(msg) {
  console.error(`[sync-db] ERROR: ${msg}`);
}

function main() {
  if (!process.env.DATABASE_URL) {
    logError('DATABASE_URL is not set. Skipping DB sync.');
    logError('If this is a production deployment, the DB schema may be out of sync.');
    logError('Set DATABASE_URL in your Vercel project settings.');
    // Exit 0 so the build can continue — the app may still work if the
    // schema is already in sync from a previous deployment.
    process.exit(0);
  }

  // Mask the password in the URL for logging.
  const maskedUrl = process.env.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  log(`Database URL: ${maskedUrl}`);

  try {
    log('Running `prisma db push --skip-generate` to sync schema to DB...');
    // `--skip-generate` because we already ran `prisma generate` in the build script.
    // `--accept-data-loss` is NOT used — if a destructive change is detected,
    // the build will fail so the user can review the change manually.
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    log('DB schema sync completed successfully.');
  } catch (err) {
    logError('`prisma db push` failed.');
    logError('This usually means:');
    logError('  1. The DB is unreachable (check DATABASE_URL and network).');
    logError('  2. The schema has a destructive change (e.g., dropping a column).');
    logError('     Review the Prisma schema and resolve the conflict manually.');
    logError('  3. There is a Prisma version mismatch.');
    logError('');
    logError(`Original error: ${err.message}`);

    // Fail the build — deploying with an out-of-sync schema would result
    // in 500 errors on every API call that touches the affected tables.
    process.exit(1);
  }
}

main();
