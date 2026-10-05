# Migration verification record

## Local checks completed

- `npm ci --no-audit --no-fund` completed.
- `npm run typecheck` passed.
- `npm run test:notify` passed: broadcasts occur after commit and are absent after rollback.
- `npm run test:archive-access` passed: legacy approval conversion, verified decryption persistence, and access revocation.
- `npm run build` passed during Phase 6, before the Phase 7 test/documentation changes. Re-run against this exact revision before deployment.
- `npm run dev` served the landing page with HTTP 200 during Phase 6.

## Not verified

- The isolated integration suite (`npm run test:integration`) was not run. It requires a dedicated test database and explicitly refuses to proceed without `TEST_DB_ISOLATED=true` and the test-only environment variables documented in `OPERATIONS.md`.
- Neither migration was applied to Supabase. No Supabase project credentials were available, and existing project schemas, bucket configuration, and data counts remain unknown.
- Supabase Realtime, signed Storage upload/finalization, Vercel deployment behavior, and production database connectivity have not been exercised against a live project.
- No visual review was performed at desktop or 390px mobile widths. The requested manual game-flow checks (commission, three teams, different unlock orders, simultaneous browsers, pause/end, and 20 MB upload) remain to be performed in an isolated deployment.

## Release gate

Before production use, inspect the existing Supabase project and take a backup; review the SQL in `supabase/migrations/`; apply it only after confirming the isolated `meridian` schema and private `media` bucket behavior; configure the production environment variables listed in `OPERATIONS.md`; then run the isolated integration suite and manual game-flow checklist. Select a Vercel region near the Supabase database once its region is known.

No SQL was applied, no deployment was made, and no push was made for this verification record.
