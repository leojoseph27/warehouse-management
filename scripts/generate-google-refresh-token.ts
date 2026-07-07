/**
 * Google OAuth Refresh Token Generator
 *
 * This is a TEMPORARY helper script to generate a Google OAuth Refresh Token
 * for your personal Google account. It does NOT modify the application and
 * does NOT save any credentials.
 *
 * Usage:
 *   1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment
 *      (e.g. in .env.local or export them in your shell)
 *   2. Run: npm run generate-refresh-token
 *   3. Open the printed URL in your browser
 *   4. Authorize with leojoseph861@gmail.com
 *   5. Google redirects to http://localhost:3000/oauth2callback?code=...
 *      (the page won't load — that's fine — just copy the "code" parameter
 *       from the URL)
 *   6. Paste the code into the terminal when prompted
 *   7. Copy the Refresh Token into your Vercel env vars
 *   8. Delete this script after you're done
 *
 * Required env vars (read ONLY from environment — never hardcoded):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

import { google } from 'googleapis';
import * as readline from 'readline';

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('');
    console.error('❌ Missing environment variables.');
    console.error('');
    console.error('   This script reads ONLY from the environment. Set these before running:');
    console.error('');
    console.error('     export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"');
    console.error('     export GOOGLE_CLIENT_SECRET="your-client-secret"');
    console.error('');
    console.error('   Or add them to .env.local and run with: npm run generate-refresh-token');
    console.error('');
    process.exit(1);
  }

  const redirectUri = 'http://localhost:3000/oauth2callback';

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Request ONLY the Drive scope, with offline access + consent prompt
  // so Google always returns a refresh_token.
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Google OAuth Refresh Token Generator');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Step 1: Open this URL in your browser:');
  console.log('');
  console.log('  ─────────────────────────────────────────────────────────');
  console.log('  ' + authorizeUrl);
  console.log('  ─────────────────────────────────────────────────────────');
  console.log('');
  console.log('  Step 2: Authorize with leojoseph861@gmail.com');
  console.log('');
  console.log('  Step 3: Google will redirect to:');
  console.log('          http://localhost:3000/oauth2callback?code=4/0Axx...');
  console.log('');
  console.log('          The page will NOT load (no server running).');
  console.log('          That is expected. Just copy the "code" parameter');
  console.log('          value from the URL bar.');
  console.log('');
  console.log('  Step 4: Paste the code below when prompted.');
  console.log('');

  // Read the authorization code from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('  Paste the authorization code here: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!code) {
    console.error('');
    console.error('❌ No code entered. Exiting.');
    process.exit(1);
  }

  console.log('');
  console.log('  Exchanging authorization code for tokens...');

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('');
      console.error('❌ No refresh token returned by Google.');
      console.error('');
      console.error('   This usually means you have already generated a token for');
      console.error('   this client and Google is not returning a new one.');
      console.error('');
      console.error('   Fix: go to https://myaccount.google.com/permissions,');
      console.error('   remove the app access, then run this script again.');
      console.error('');
      process.exit(1);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ SUCCESS — Copy these to Vercel env vars');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Refresh Token:');
    console.log(tokens.refresh_token);
    console.log('');
    console.log('Access Token:');
    console.log(tokens.access_token || '(not returned — refresh token is enough)');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Next steps:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('  Set these 4 env vars in Vercel (and .env.local locally):');
    console.log('');
    console.log('    GOOGLE_CLIENT_ID=' + clientId);
    console.log('    GOOGLE_CLIENT_SECRET=' + clientSecret);
    console.log('    GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('    GOOGLE_DRIVE_FOLDER_ID=<your-folder-id>');
    console.log('');
    console.log('  Then delete this script:');
    console.log('    rm scripts/generate-google-refresh-token.ts');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
  } catch (err: any) {
    console.error('');
    console.error('❌ Failed to exchange code for tokens:');
    console.error('   ' + (err?.message || err));
    if (err?.response?.data) {
      console.error('   Response: ' + JSON.stringify(err.response.data));
    }
    console.error('');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
