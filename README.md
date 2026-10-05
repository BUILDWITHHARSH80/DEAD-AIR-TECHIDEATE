# DEAD AIR / Radio Meridian

A private, browser based investigation game. The application uses Next.js 16 on Vercel, Supabase Postgres for event state, Supabase Storage for private team media, and Supabase Realtime Broadcast for live invalidation. It keeps the existing `meridian` session cookie and does not use Supabase Auth.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and set the six environment variables. Keep `.env.local` private and out of Git.
3. Review the SQL in `supabase/migrations/` and inspect your Supabase project for schema and Storage bucket conflicts before applying it. No migration is applied automatically by `npm run dev` or `npm run build`.
4. After approving the reviewed migrations, run `npm run db:migrate` against the intended Supabase project.
5. Run `npm run dev` and open `http://localhost:5173`.
6. Sign in at `/admin/login` as `control` with `ADMIN_PASSWORD`, choose **COMMISSION STATION** once, then register teams from the Teams tab. Commissioning preserves the current story setup and creates no teams.

The database connection, service-role key, and admin password are server-only. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public browser configuration; RLS and the lack of table policies prevent direct table access. The app uses only the service role or the server Postgres connection for game data.

## Ranking

The single source of ranking is `meridian.leaderboard_v`. Order is files unlocked descending, latest unlock ascending, first unlock ascending, then team code ascending. All registered teams appear, including teams with no unlocked files. The requested rule places unlock completion and speed ahead of broadcast/truth objectives and accuracy; those values remain visible but do not decide rank.

The checked-in story currently seeds four documents (`01`–`04`) and eight physical challenges. The leaderboard display uses the requested eight slots; only existing document unlocks can appear unlocked. No new story files or passkeys are invented.

## Deploy to Vercel

1. Import the repository in Vercel and use the `supabase-vercel` branch for preview until the migration is reviewed.
2. Set these variables in the required Vercel environments:

   | Variable | Visibility |
   |---|---|
   | `SUPABASE_URL` | Server-only |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret |
   | `SUPABASE_DB_URL` | Server-only secret |
   | `ADMIN_PASSWORD` | Server-only secret |
   | `NEXT_PUBLIC_SUPABASE_URL` | Public browser configuration |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public browser configuration |

3. Confirm the Supabase project schema/Storage inventory and review the migration SQL. Run `npm run db:migrate` only after approving the SQL for that project.
4. Set Vercel's function region near the Supabase project's region once that region is known. Do not guess a region before checking the project.
5. Deploy the preview, validate the event flow, then promote it to production when authorized.
6. Add the production and custom domains in Vercel. Keep the Supabase public URL variables consistent with the Supabase project; Vercel supplies `VERCEL_URL` automatically for Origin validation.

Vercel runs the standard Next.js Node.js runtime. Upload bytes go directly from the browser to a short-lived signed URL in the private `media` bucket; API routes handle authorization, reservation, verification, and metadata only. Realtime messages contain invalidation metadata, and clients reload state through the authenticated API.

## Commands

- `npm run dev` — local Next.js development server.
- `npm run build` — production build.
- `npm run typecheck` — TypeScript validation.
- `npm run db:migrate` — apply the additive SQL migrations using `SUPABASE_DB_URL`.
- `npm run test:integration` — integration suite against `TEST_URL`; it must be a disposable deployment backed by a separate Supabase project or local Supabase instance, never the main project.

Before running integration tests, configure `TEST_URL`, `TEST_SUPABASE_DB_URL`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`, and `TEST_DB_ISOLATED=true`. The isolated confirmation is required so the suite cannot run accidentally against the main event database. The suite uses a test-only SQL helper for unlock-time fixtures.
