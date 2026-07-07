import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/callback
 *
 * Google redirects here after the user grants permission. The URL contains
 * a `code` query parameter that we exchange for tokens (access_token +
 * refresh_token).
 *
 * This endpoint displays the tokens on a simple HTML page so the developer
 * can copy the refresh_token into Vercel env vars. It does NOT save anything
 * to the database, filesystem, or cookies.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * This is a development-only endpoint.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle Google's error response (e.g. user denied access)
  if (error) {
    return htmlResponse(`
      <div style="font-family: monospace; max-width: 600px; margin: 40px auto; padding: 20px;">
        <h1 style="color: #dc2626;">❌ Authorization Failed</h1>
        <p>Google returned an error: <strong>${escapeHtml(error)}</strong></p>
        <p><a href="/api/auth/google">Try again</a></p>
      </div>
    `);
  }

  if (!code) {
    return htmlResponse(`
      <div style="font-family: monospace; max-width: 600px; margin: 40px auto; padding: 20px;">
        <h1 style="color: #dc2626;">❌ No Authorization Code</h1>
        <p>No "code" parameter was found in the callback URL.</p>
        <p><a href="/api/auth/google">Start over</a></p>
      </div>
    `);
  }

  // The redirect URI must match the one used in /api/auth/google
  const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;

    if (!refreshToken) {
      return htmlResponse(`
        <div style="font-family: monospace; max-width: 600px; margin: 40px auto; padding: 20px;">
          <h1 style="color: #dc2626;">⚠️ No Refresh Token Returned</h1>
          <p>Google did not return a refresh_token. This usually means you have
          already authorized this app and Google is not issuing a new one.</p>
          <h3>To fix this:</h3>
          <ol>
            <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank">https://myaccount.google.com/permissions</a></li>
            <li>Find this app in the list and click "Remove Access"</li>
            <li>Go back to <a href="/api/auth/google">/api/auth/google</a> and authorize again</li>
          </ol>
          <p>Using <code>prompt: 'consent'</code> forces Google to ask for
          permission again and return a new refresh_token.</p>
        </div>
      `);
    }

    return htmlResponse(`
      <div style="font-family: monospace; max-width: 800px; margin: 40px auto; padding: 20px;">
        <h1 style="color: #16a34a;">✅ Success! Copy Your Refresh Token</h1>

        <div style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0;">Refresh Token</h3>
          <textarea readonly style="width: 100%; height: 80px; font-family: monospace; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; padding: 8px;" onclick="this.select()">${escapeHtml(refreshToken)}</textarea>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Click the box above to select all, then Ctrl+C to copy.</p>
        </div>

        <div style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0;">Access Token (short-lived, for testing only)</h3>
          <textarea readonly style="width: 100%; height: 60px; font-family: monospace; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; padding: 8px;" onclick="this.select()">${escapeHtml(accessToken || '(not returned)')}</textarea>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0;">📋 Next Steps</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Copy the <strong>Refresh Token</strong> above.</li>
            <li>Go to your Vercel project → Settings → Environment Variables.</li>
            <li>Add (or update) <code>GOOGLE_REFRESH_TOKEN</code> with the value above.</li>
            <li>Make sure these are also set:
              <ul>
                <li><code>GOOGLE_CLIENT_ID</code></li>
                <li><code>GOOGLE_CLIENT_SECRET</code></li>
                <li><code>GOOGLE_DRIVE_FOLDER_ID</code></li>
              </ul>
            </li>
            <li>Redeploy your project on Vercel.</li>
            <li>Test the upload at <a href="/">the app</a>.</li>
          </ol>
        </div>

        <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0; color: #dc2626;">⚠️ Security</h3>
          <p style="margin: 0; font-size: 14px;">
            This page is for development only. No tokens were saved to the
            database or any file. Refresh this page and the tokens will be
            gone — copy them now.
          </p>
        </div>

        <p style="text-align: center; margin-top: 30px;">
          <a href="/" style="background: #2563eb; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">← Back to App</a>
        </p>
      </div>
    `);
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return htmlResponse(`
      <div style="font-family: monospace; max-width: 600px; margin: 40px auto; padding: 20px;">
        <h1 style="color: #dc2626;">❌ Token Exchange Failed</h1>
        <pre style="background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${escapeHtml(errorMsg)}</pre>
        <p><a href="/api/auth/google">Try again</a></p>
      </div>
    `);
  }
}

function htmlResponse(body: string) {
  return new NextResponse(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Google OAuth Setup</title></head><body>${body}</body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
