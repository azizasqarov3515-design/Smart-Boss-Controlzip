---
name: Drizzle schema must be pushed to the database
description: Why "column ... does not exist" 500 errors happen in the api-server and how to fix them
---

The Drizzle schema lives in `lib/db/src/schema/*.ts`. The api-server routes import these table definitions, but editing the schema file does NOT change the actual Postgres database — the change must be pushed.

**Rule:** After adding/removing/renaming a column (or table) in `lib/db/src/schema`, run `pnpm --filter @workspace/db run push` (drizzle-kit push). Use `run push-force` only when drizzle prompts about a destructive/ambiguous change you've confirmed.

**Why:** If the code references a column that isn't in the DB yet, the insert/update fails at query time with Postgres `column "X" of relation "Y" does not exist`, which the routes surface as a generic HTTP 500 (e.g. "Mijoz yaratishda xatolik"). The code looks correct; only the DB is out of sync.

**How to apply:** When you see a 500 whose underlying error is `column ... does not exist`, check the schema file defines it, confirm the live DB lacks it (`information_schema.columns`), then push. The runtime DATABASE_URL is managed by Replit and is available to drizzle-kit automatically. For deploying to production, the production DB needs the same push — see the database skill.
