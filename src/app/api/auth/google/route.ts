import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google
 *
 * Redirects the user to Google's OAuth 2.0 consent screen to authorize
 * the application to access their Google Drive.
 *
 * Requests ONLY the drive scope with access_type=offline and prompt=consent
 * so Google always returns a refresh_token (even if the user has previously
 * authorized the app).
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * This is a development-only endpoint for generating a refresh token.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.',
      },
      { status: 500 }
    );
  }

  // The redirect URI MUST match what's configured in the Google Cloud Console
  // under the OAuth 2.0 Client ID's "Authorized redirect URIs".
  // Use the request's origin so it works on both localhost and Vercel.
  const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
  });

  return NextResponse.redirect(authUrl);
}
