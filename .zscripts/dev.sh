#!/usr/bin/env bash
# .zscripts/dev.sh - Runs as a managed child of the container's init system
# The container's /start.sh detects this script and runs it automatically.
#
# IMPORTANT: This script must keep running for the preview to be active.
# It uses a watchdog loop to auto-restart the Next.js server if it crashes.
set -e

cd /home/z/my-project

# Force DATABASE_URL to Neon PostgreSQL — override the system-level SQLite URL
export DATABASE_URL="postgresql://neondb_owner:npg_CSnsIG7AOY0a@ep-falling-resonance-at9k0s2g.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Also load other env vars from .env.local
if [ -f .env.local ]; then
  set -a
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    export "$key=$value"
  done < .env.local
  set +a
  echo "[DEV] Loaded .env.local"
fi

# Ensure DATABASE_URL is always Neon (re-override after .env.local load)
export DATABASE_URL="postgresql://neondb_owner:npg_CSnsIG7AOY0a@ep-falling-resonance-at9k0s2g.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo "[DEV] DATABASE_URL=${DATABASE_URL:0:30}..."
echo "[DEV] Starting Next.js dev server on port 3000 (with auto-restart)..."

# Watchdog loop: if the server crashes, restart it after 3 seconds
while true; do
  npx next dev -p 3000 -H 0.0.0.0 || true
  echo "[DEV] Server exited, restarting in 3s..."
  sleep 3
done
