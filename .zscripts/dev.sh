#!/usr/bin/env bash
# .zscripts/dev.sh - Runs as a managed child of the container's init system
# The container's /start.sh detects this script and runs it automatically.
set -e

cd /home/z/my-project

# Load environment variables from .env.local
# This MUST override system-level env vars like DATABASE_URL
if [ -f .env.local ]; then
  set -a
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    export "$key=$value"
  done < .env.local
  set +a
  echo "[DEV] Loaded .env.local (DATABASE_URL=${DATABASE_URL:0:30}...)"
fi

# Always use dev mode in sandbox environment
echo "[DEV] Starting Next.js dev server on port 3000..."
exec npx next dev -p 3000 -H 0.0.0.0
