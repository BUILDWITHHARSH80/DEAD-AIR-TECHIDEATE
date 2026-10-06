# Repository agent rules

- Work on branch `supabase-vercel`; do not push or deploy unless the user explicitly says to.
- Never print, log, commit, or hard-code credentials. Read secrets only from environment variables. `.env.local` and all `.env*` files must remain gitignored. Keep `SUPABASE_DB_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Never run destructive SQL (`DROP`, `TRUNCATE`, or `DELETE` of existing data) against the user's Supabase project without showing the exact statements and receiving approval. Prefer additive migrations.
- Never run integration tests against the main Supabase project. Use a separate test project or local Supabase.
- Preserve gameplay/story text, passkeys, scoring inputs, existing admin and participant behavior, and current UI style except where the migration brief explicitly asks for changes.
- Create one commit per migration phase. Do not combine separate phases into one commit.
