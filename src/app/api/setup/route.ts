import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/setup
 * Verifies that the database connection works and tables exist.
 */
export async function POST() {
  const results: { step: string; status: string; message?: string }[] = [];

  try {
    // Step 1: Verify products table
    await db.product.findFirst();
    results.push({ step: 'products table', status: 'ok' });
  } catch (e: any) {
    results.push({ step: 'products table', status: 'error', message: e?.message });
  }

  try {
    // Step 2: Verify product_images table
    await db.productImage.findFirst();
    results.push({ step: 'product_images table', status: 'ok' });
  } catch (e: any) {
    results.push({ step: 'product_images table', status: 'error', message: e?.message });
  }

  try {
    // Step 3: Verify admin_users table
    await db.adminUser.findFirst();
    results.push({ step: 'admin_users table', status: 'ok' });
  } catch (e: any) {
    results.push({ step: 'admin_users table', status: 'error', message: e?.message });
  }

  // Step 4: Verify admin env vars
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  results.push({
    step: 'admin credentials',
    status: adminEmail && adminPassword ? 'ok' : 'error',
    message: !adminEmail || !adminPassword ? 'ADMIN_EMAIL and/or ADMIN_PASSWORD environment variables are not set' : undefined,
  });

  return NextResponse.json({ results });
}
