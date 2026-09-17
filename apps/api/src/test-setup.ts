// Loaded by vitest before any spec file runs, so process.env.DATABASE_URL
// (and any other .env value) is available to DB-backed specs the same way
// it already is for src/db/migrate.ts and src/db/seed.ts.
import 'dotenv/config';
