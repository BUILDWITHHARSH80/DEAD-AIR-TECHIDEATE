# DEAD AIR / Radio Meridian migration plan

## Phase 0 — reconnaissance

### Current data, storage, and live-update map

| Concern | Current location | Existing behavior |
|---|---|---|
| D1 binding | `vite.config.ts`, `.openai/hosting.json`, `wrangler.local.jsonc`, `cloudflare-env.d.ts` | The Vite config builds a Vinext worker with D1 binding `DB`; local Wrangler config persists a local D1 database. |
| D1 schema | `db/schema.ts`, `drizzle/0000_flat_madame_hydra.sql`, `drizzle/meta/*`, `db/index.ts` | SQLite tables are teams, sessions, settings, documents, challenges, media, activity, and limits. `db/index.ts` imports `cloudflare:workers` and Drizzle's D1 driver. |
| D1 queries / transaction batches | `lib/engine.ts`, `app/api/game/route.ts`, `app/api/media/route.ts`, `app/api/events/route.ts` | `lib/engine.ts` uses D1 `prepare/bind/first/all/run` and `db().batch`; the game and media routes make additional direct D1 calls through those helpers. The second `cloudflare:workers` import in `app/api/game/route.ts` supplies `ADMIN_PASSWORD`. |
| R2 binding and media | `.openai/hosting.json`, `vite.config.ts`, `cloudflare-env.d.ts`, `lib/engine.ts`, `app/api/media/route.ts`, `app/api/game/route.ts` | `bucket()` exposes R2. Media upload currently passes multipart bytes through the API; reads stream the object; delete and admin team deletion remove R2 objects. `media.id` doubles as the R2 object key. |
| SSE endpoint | `app/api/events/route.ts` | Authenticated route polls settings revision and activity every two seconds and emits an SSE change event. |
| SSE client / recovery | `app/console.tsx` | `EventSource('/api/events')` triggers snapshot reloads; the console also has a recovery refresh and status indicator. |
| Cloudflare-only build/hosting | `vite.config.ts`, `build/sites-vite-plugin.ts`, `.openai/hosting.json`, `wrangler.local.jsonc`, `scripts/run-framework.mjs`, `scripts/start-local.mjs`, `scripts/sites-env.mjs`, `scripts/install-ci.mjs`, `scripts/execution-profile.mjs`, `package.json`, `package-lock.json`, `tsconfig.json` | Vinext, `@cloudflare/vite-plugin`, Wrangler, Worker type definitions, and a build plugin that copies D1 migrations configure local and production builds. `scripts/start-local.mjs` launches Wrangler. |
| ChatGPT hosting adapter | `app/chatgpt-auth.ts` | Reads ChatGPT-specific identity headers and exposes sign-in/out helpers; no game route currently imports it. Remove as part of the requested hosting cleanup after confirming no imports. |
| Existing tests/docs | `tests/integration.mjs`, `tests/archive-access.mjs`, `README.md` | Integration suite expects D1 and asserts the SSE route; README describes Wrangler, local D1 and `.env`. Both need migration updates. |

### Supabase database inspection and conflict handling

The requested `.env.local` is absent from the checkout. The only local `.env` key is `ADMIN_PASSWORD`; no Supabase URL, DB URL, anon key, service key, or separate test URL is configured. Therefore I could not connect to Supabase and have not queried, altered, or applied anything to the project. Existing schemas, tables, columns, constraints, indexes, RLS, functions/views, buckets, and row counts remain unverified.

The repository's current target table shapes are visible in `db/schema.ts` and the initial Drizzle migration. The requested target adds UUID team/media IDs, JSONB state/data, timestamptz media/activity timestamps, `storage_path`, RLS, and `file_unlocks`. Because the remote schema is unknown, the migration implementation should isolate app-owned tables in a new `meridian` schema rather than risk reusing an existing same-named public table. Before applying it, the operator must review the generated schema inventory and confirm that no existing `meridian` schema or `media` Storage bucket contains valuable unrelated data. Migrations must fail safely on shape conflicts; they must not drop or rewrite unknown objects. Existing team-state unlock/approval values will need a reviewed additive backfill into `meridian.file_unlocks`; do not attempt to import or mutate an unknown remote table automatically.

### Hosting decision

Choose standard Next.js 16 App Router on Vercel's Node.js runtime. `next@16.2.6` and `eslint-config-next` are already dependencies; the route handlers use standard `Request`/`Response` APIs and the pages use the App Router file layout. The Cloudflare coupling is concentrated in database/storage access and the Vite/Wrangler launch/build chain, so replacing those adapters and switching scripts is a bounded migration. The Vinext+Nitro fallback would retain an unnecessary compatibility layer and does not simplify the Cloudflare-specific data bindings. Confirm by running the app's dev server, typecheck, and production build after conversion.

### Vercel constraints and design response

- No SSE or long-lived request: use Supabase Realtime Broadcast only for invalidation, with cookie-authenticated state fetches and a short polling fallback.
- 4.5 MB request-body ceiling: upload files directly from the browser to private Supabase Storage using a short-lived signed upload URL; finalize and validate metadata server-side.
- No persistent filesystem and many function instances: Postgres is the sole game-state store; no local file state or instance memory is authoritative.
- Use Node.js serverless route handlers and keep request handlers short-lived. Choose the Vercel region near the configured Supabase region once the project region is known.

## Phase 1+ implementation notes

- Keep all app tables and the leaderboard view in `meridian` to avoid unknown `public` objects. Set the server DB connection's search path explicitly, or schema-qualify every query and view reference.
- Use the six requested environment variable names; only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` belong in browser code. The database URL, service role, and admin password are server-only.
- Keep the custom `meridian` session cookie. Do not add Supabase Auth.
- Implement the leaderboard ordering once in Postgres and expose that result to snapshots, admin screens, and the API.
- The explicitly requested rule ranks file count and unlock times ahead of objectives/accuracy. Objectives and accuracy remain visible but cease to decide order.

## Outstanding Phase 0 checks

- Supply the six environment variables in an ignored `.env.local` (and a separate local/test Supabase instance or test project) to enable read-only live schema inspection and later isolated verification.
- Inspect Supabase Storage buckets and project region before finalizing/applying the migration and Vercel region choice.
- No migration has been applied and no deployment or push has occurred.
