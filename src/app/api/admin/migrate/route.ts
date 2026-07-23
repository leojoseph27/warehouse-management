import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'node:child_process';

/**
 * POST /api/admin/migrate
 *
 * Manually syncs the Prisma schema to the database by running
 * `prisma db push --skip-generate`. Use this endpoint when the DB
 * schema is out of sync with the Prisma client (e.g., after a schema
 * change was deployed but the migration wasn't applied).
 *
 * Symptoms of schema mismatch:
 *   - GET /api/products returns 500 with "column ... does not exist"
 *   - POST /api/products/import returns 200 but with 0 imported and N errors
 *
 * Authentication:
 *   - Requires the `X-Admin-Token` header to match `ADMIN_PASSWORD`
 *     env var. This is a lightweight auth check to prevent randoms
 *     from triggering DB schema syncs.
 *
 * Response:
 *   200 — { ok: true, output: string } on success
 *   401 — { error: 'Unauthorized' } if the admin token is missing/wrong
 *   500 — { error: string, output: string } if `db push` fails
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // ── Auth check ──
  const adminToken = request.headers.get('x-admin-token');
  const expectedToken = process.env.ADMIN_PASSWORD;

  if (!expectedToken) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not set on the server.' },
      { status: 500 }
    );
  }

  if (adminToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide the correct X-Admin-Token header.' },
      { status: 401 }
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not set on the server.' },
      { status: 500 }
    );
  }

  // ── Run prisma db push ──
  try {
    const output = execSync('npx prisma db push --skip-generate', {
      env: process.env,
      encoding: 'utf8',
      timeout: 50_000, // 50s hard timeout
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return NextResponse.json({
      ok: true,
      output,
      message: 'Database schema synced successfully.',
    });
  } catch (err: any) {
    const stderr = err?.stderr || err?.stdout || '';
    const message = err?.message || String(err);

    console.error('[/api/admin/migrate] prisma db push failed:', message);
    console.error('[/api/admin/migrate] stderr:', stderr);

    return NextResponse.json(
      {
        ok: false,
        error: 'prisma db push failed: ' + message,
        output: stderr,
      },
      { status: 500 }
    );
  }
}
