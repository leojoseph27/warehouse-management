---
Task ID: 1
Agent: Main
Task: Migrate from Supabase to Neon PostgreSQL with Prisma

Work Log:
- Cloned repo from https://github.com/leojoseph27/my-inventory.git
- Installed dependencies (npm install, bun install)
- Analyzed all Supabase usage across the codebase (7 API routes + utility files)
- Updated prisma/schema.prisma from SQLite to PostgreSQL with @@map directives
- Added Neon DATABASE_URL to .env and .env.local
- Ran prisma db push to create tables in Neon
- Rewrote src/lib/db.ts as Prisma client singleton
- Rewrote all API routes to use Prisma instead of Supabase:
  - /api/products (GET, POST)
  - /api/products/[id] (GET, PUT, DELETE)
  - /api/products/stats (GET)
  - /api/products/check-duplicate (GET)
  - /api/products/cleanup (DELETE)
  - /api/products/import (POST)
  - /api/products/export (GET)
  - /api/images/[id] (DELETE, PATCH)
  - /api/images/upload (POST) - new route replacing Supabase Storage
  - /api/setup (POST)
  - /api/seed (POST)
- Created image upload route that stores images as base64 data URLs in DB
- Updated .zscripts/dev.sh to load .env.local and override system DATABASE_URL
- Tested all endpoints successfully: products CRUD, stats, setup, auth, cleanup

Stage Summary:
- All Supabase references replaced with Prisma ORM
- Database tables created in Neon PostgreSQL
- All API endpoints tested and working
- Auth still uses env vars (ADMIN_EMAIL/ADMIN_PASSWORD)
- Image storage changed from Supabase Storage to base64 in DB
