---
description: Pre-PR verification — lint, type-check, build, and project hygiene checks
allowed-tools: Bash(npm run lint:*), Bash(npx tsc -b:*), Bash(npm run build:*), Bash(git status:*), Bash(git ls-files:*), Bash(git diff:*), Read, Grep, Glob
---

## Results

### Lint
!`npm run lint 2>&1`

### Type-check
!`npx tsc -b 2>&1`

### Build
!`npm run build 2>&1`

### Changed files
!`git status --short`

## Your task

Using the output above, produce a short pre-PR report with a ✅ / ❌ line for each check:

1. **Lint** — list each error/warning as `file:line — message`.
2. **Type errors** — list each `tsc` error as `file:line — message`, with a one-line likely fix.
3. **Build** — pass/fail; quote the first error if it failed.
4. **Missing migrations** — if any changed file touches the database shape (new `.from("<table>")`, `.rpc("<fn>")`, new columns in `src/types.ts`) but `supabase/schema.sql` was not changed, flag it. Also confirm every `create table` in `supabase/schema.sql` has a matching `enable row level security`.
5. **Unhandled errors** — scan the changed files for Supabase calls whose `error` is ignored, `fetch` / promises without `.catch` or `try`, and async event handlers that can throw silently.
6. **Secrets** — fail if `.env` is tracked (`git ls-files .env`), or if `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or a `re_…` / JWT-looking literal appears in `src/` or any staged file, or if `resend` is imported from `src/`.

End with a single verdict line: **Ready for PR** or **Not ready — fix N issue(s)**. Do not modify files; report only.
