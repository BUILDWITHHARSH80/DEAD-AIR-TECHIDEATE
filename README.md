# DEAD AIR / Radio Meridian

A private, browser based investigation game. The application uses the Vinext/React frontend, a Cloudflare Worker API, D1 for event state, and R2 for private team media.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set a long, private `ADMIN_PASSWORD`.
3. Apply the local D1 migrations with `npm run db:migrate:local`.
4. Start the app with `npm run dev` and open the local URL printed by the dev server.
5. Sign in at `/admin/login` as `control` with the configured password, then choose **COMMISSION STATION** once. Commissioning creates the event settings, documents, challenges, and audit entry; it intentionally creates no teams.
6. Open the Teams tab and register teams individually or with CSV. A CSV may have a header (`id,name,access code`) or rows in `id,name,access code` order. Leave an ID or access code empty to generate it. Generated or supplied access codes are shown once after creation; save and distribute them privately.

Local D1 data and R2 objects are stored under `.wrangler/` and are excluded from Git. Do not commit `.env` or distribute the private team roster publicly.

## Event operations

The control room manages the transmission timer, team roster, challenges, documents, media review, ECHO oversight, activity, and event settings. Team IDs are unique and may be custom values such as `TEAM 01` or `FIELD_WEST`. Team names are unique without regard to letter case. Access codes must contain 8–64 characters. Setting a new code signs out that team’s active sessions. Deleting a team removes its sessions, activity, media records, and private media objects; the deletion is recorded in the admin activity log.

Team members sign in with their team ID, registered name, and access code at `/login`. Admin and participant sessions use separate routes.

## Commands

- `npm run dev` — start the local development server.
- `npm run build` — build the production app.
- `npm run typecheck` — check TypeScript types.
- `npm run db:migrate:local` — apply D1 migrations to the local database.
- `npm run test:integration` — run the end-to-end API/game suite against the disposable server configured by `TEST_URL` (defaults to `http://localhost:5173`). The suite expects a fresh local D1 database and a local `.env` file.

The `public/studio.png` file is a local placeholder. Replace it with the original studio image asset before publishing if that reference asset is available.
