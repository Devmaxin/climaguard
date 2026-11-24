# Supabase migrations

Database changes for ClimaGuard are versioned as SQL files in `supabase/migrations/` and applied to the live project through the Supabase CLI. Nothing is applied to the live database except through this workflow.

Project: `zlcjnaflbqlntdsmihsb` (ClimaGuard). Plan: Supabase Free. No Docker, no local stack — the CLI is used only to manage migrations against the hosted project.

## Tooling

The CLI is a pinned devDependency, not a global install:

```
npm install --save-dev --save-exact supabase@3.4.0
npx supabase --version
```

Always run it through `npx supabase` (or `node_modules/.bin/supabase`) so everyone uses the pinned version. Requires Node >= 20.19.0.

## One-time setup

```
npx supabase login
npx supabase link --project-ref zlcjnaflbqlntdsmihsb
```

`login` stores an access token in the CLI's own config directory outside this repository. Never paste that token into a file, a commit, a chat message, or source code — and never substitute a service-role key for it. The service-role key must never appear in any file in this repository, client or server.

## Workflow for a new migration

1. Pull the current remote migration history so local and remote agree:
   ```
   npx supabase migration list
   ```
   If remote versions are missing locally, stop and investigate before writing SQL.
2. Write the migration as a new timestamped file. Never edit a migration that has already been applied anywhere:
   ```
   npx supabase migration new <short_snake_case_name>
   ```
   This creates `supabase/migrations/<timestamp>_<name>.sql`.
3. Author the SQL. Keep it inside a single transaction (`begin; … commit;`). Include RLS enablement, policies, grants and function privilege revokes in the same migration that creates the objects.
4. Review the SQL statically before it touches anything. Use `npx supabase db diff --linked` to see what the hosted database would change, if useful.
5. Dry-run where possible:
   ```
   npx supabase db push --dry-run
   ```
6. Apply, only with explicit founder approval for that specific migration:
   ```
   npx supabase db push
   ```
   This is a write to the live database. It needs a separate, explicit approval — a task asking for a migration to be *written* is not approval to apply it.
7. Confirm the schema and history:
   ```
   npx supabase migration list
   npx supabase db diff --linked
   ```
   An empty diff means remote matches the migration files.
8. Commit the migration file together with any `database.types.ts` update in `src/lib/supabase/`.

## Safeguards

These are not style preferences. Each one protects the live database or the founder's credentials.

- **Never run `npx supabase db reset --remote`.** It destroys the remote database.
- **Never pass `--yes` to a hosted (linked) command without explicit founder approval for that exact operation.** It auto-confirms prompts, including destructive ones. The CLI refuses hosted mutations from an agent run and tells you it needs `--yes` — treat that error as a stop-and-ask, not a hint to re-run. Approval for one command never carries to the next.
- **Never use `supabase migration repair` to hide a failure.** Repair edits migration *history* only — it records a version as applied without running its SQL. It is legitimate only when the schema has been independently verified to already contain the migration's changes, and only with founder approval. If the schema is incomplete or in doubt, stop and report; do not repair.
- **Never delete or rewrite migration history**, locally or remote. Add a new forward migration instead.
- **Never edit an applied migration file.** Someone else's database already reflects the old contents.
- **Never modify the live database outside this workflow** — no ad-hoc SQL in the Dashboard editor. Ad-hoc changes make the migration files lie about the schema. If an emergency requires it, follow up immediately with a migration that reconciles history and document it.
- **Never run destructive SQL** (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` without a scoped `WHERE`) without explicit founder approval, and never author it speculatively.
- **Never apply a migration because a task asked for it to be created.** Authoring and applying are separate approvals.
- **Keep the CLI's temp files out of git.** `supabase/.gitignore` covers `.temp` and `.branches`. Tokens live in the CLI's own config directory, outside this repository.
- **Keep it free.** Supabase Free tier only: no paid plans, no paid add-ons, no paid third-party services in the migration path.

## Conventions in this repository

- `supabase/config.jsonc` is the CLI's project config (CLI v3.4+ format; earlier CLIs used `config.toml`). It is committed. Local stack settings in it are unused — no Docker work happens here.
- `0001_phase2_accounts.sql` predates the CLI link and was applied by hand through the Dashboard SQL Editor. Its remote schema was verified field by field (tables, columns, constraints, indexes, RLS policies, triggers, function privileges, grants) against the file first, and only then was history recorded with `supabase migration repair --status applied 0001 --remote`. `migration list` now reports `0001` on both sides. Note that `migration repair` defaults to the local stack and needs `--remote` to touch the linked project.
- Hand-written types in `src/lib/supabase/database.types.ts` must stay in sync with the migrations. Regenerating them with `npx supabase gen types typescript --linked` is optional; if used, review the output before committing — it replaces the file wholesale.
