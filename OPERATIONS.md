# Operations

## Environment and access

Use only the six variable names in `.env.example`. Keep `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_PASSWORD` in server environments. The browser receives only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not copy production credentials into tests.

The app's `meridian` cookie is HttpOnly, SameSite=Strict, and Secure when requests arrive over HTTPS. Admin and team sessions remain in the private `meridian.sessions` table; Supabase Auth is not used.

## Database changes

1. Inspect the target Supabase project and Storage bucket before applying migrations.
2. Review every SQL statement in `supabase/migrations/`.
3. Run `npm run db:migrate` only for the intended project after the SQL has been approved. The runner reads `SUPABASE_DB_URL` and applies migrations in filename order.
4. Do not test against the live event database. Use local Supabase or a separate test project.

The schema uses the `meridian` namespace to avoid collisions with unknown `public` objects. All game tables have RLS enabled with no client policies, and `anon`/`authenticated` receive no table privileges. Server routes use the server DB connection or service role.

## Integration test safety

Set `TEST_URL`, `TEST_SUPABASE_DB_URL`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`, and `TEST_DB_ISOLATED=true` only for a disposable test deployment/database. The test suite refuses to run unless the URL and explicit isolated-database confirmation are present. Never point it at the live event project. `tests/sql/backdate_file_unlock.sql` is a test-only fixture helper and must not be applied to production.

## Event operations

The control room commissions the current story documents and stations, then registers teams manually. Keep team access codes private. The Postgres `meridian.leaderboard_v` view orders all teams by unlocked-file count, latest unlock, first unlock, and team code. Paused time is not subtracted because the current event settings do not track cumulative pause duration.

Clients subscribe to the public `meridian-event` Broadcast channel for `{ kind, revision }` invalidations only. The cookie-authenticated APIs are the only source of game state. The console refreshes on broadcasts, polls every 3 seconds while disconnected, refreshes every 15 seconds as recovery, and reloads when the tab becomes visible.

Media uploads reserve capacity, use a one-use signed upload URL, and go from the browser directly to the private `media` bucket. Finalization verifies the stored size and file signature before writing a media row. Existing uploads are locked after final submission. Authorized downloads use 60-second signed URLs with private/no-store response headers.

## Deployment

Use Vercel's Next.js Node.js runtime. Set the function region close to Supabase after checking the project's region. Vercel's `VERCEL_URL` is used for Origin checks on preview and production hosts. Do not deploy until the user authorizes it.
