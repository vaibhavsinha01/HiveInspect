hi can you implement this for me - use less tokens and keep things simple and don't change that much keep the structure same # Task: finish the Hive Template Importer repo (Next.js 14 + Supabase)

Read the repo first (README, NOTES, docs/ARCHITECTURE.md, src/, supabase/migrations, tests, ci.yml, fixtures). Do the phases in order. After each: npm test && npm run build, then one git commit.

Rules: keep importer output unchanged (fixture = 13 sections, 69 items, 392 comments) and existing tests passing. No secrets in the repo. DB changes only via a new 003\_\*.sql. Don't invent facts: leave TODO(author) for time spent, Binsr comparison, Hive feedback. No second fixture/export, no video, no Grafana/Prometheus. Keep the parser deterministic and the Gemini header-mapping fallback as is.

1. Readability and renames

- Add Prettier (no semis, single quotes, width 100), format and format:check scripts; format everything.
- Replace single-letter names with descriptive ones (parse.js, db/templates.js, editor page, page.js, CommentEditor.js, mapHeaders.js). Add brief comments on non-obvious choices (fill-down of blank cells, entities decoded for names only, body HTML stored as exported, unmapped columns in extra).
- Renames (update all imports, links, tests, docs): app/t/[id] -> app/templates/[id] (keep /t/:id redirect in next.config.js); lib/import/columns.js -> spectora-columns.js; tests/real.test.js -> fixture.test.js; api/update -> api/nodes/[table]/[id] using PATCH.

2. Parser robustness and proof

- Match exact headers first (Section Name, Item Name, Comment Name, Comment Text; case-insensitive, trimmed); regex only as fallback. "Comment Type..." must never become the body, even if it comes before "Comment Text".
- Header row = row with a cell that STARTS with "section".
- If an Order (w/i item) column disagrees with row order, add an import-report issue; don't reorder.
- Add tests for each of the above.
- Add tests/roundtrip.test.js: read the fixture with SheetJS directly, compare to flattened parse output row by row (count, order, body text exact, extra columns, names after entity decoding). With DB env vars also compare save -> load; skip cleanly otherwise and clean up. Add test:db script.

3. API hardening

- Validate UUID ids; correct codes (400 bad input, 404 missing, 500 server fault); errors as { error }.
- Nodes PATCH: whitelist tables/fields, string only, max 500 chars for names, 100,000 for body.
- Add DELETE /api/templates/[id] and GET /api/health ({ ok, db }, no secrets).
- Add small JSON logger src/lib/log.js for import/update success and failure (never log file contents or keys).
- Add function-level validation tests.

4. Frontend (no new libraries)

- List page: per-template counts (sections/items/comments) and source file; Delete (confirm) and Rename; loading and empty states.
- Editor: trust banner "N rows read -> N comments imported, 0 dropped" (red if counts disagree); muted placeholder "No text in the Spectora export" for empty comments; visible Comment Type badge; "1 item" pluralisation; beforeunload warning while a save is pending or failed; per-comment Revert to the loaded value; search match count; labels, focus outlines, contrast.

5. DevOps (small)

- Dockerfile (multi-stage, Node 20, non-root), .dockerignore, docker-compose.yml using .env (Supabase stays external).
- ci.yml: Node cache, npm ci, format:check, test, build, plus a Docker build job (no push). No secrets required.
- Complete .env.example. Report git ls-files | grep -i env.

6. Docs (most important)
   Rewrite NOTES.md with: what was built; template used (Residential, Spectora export 2026-11-08, fixtures/spectora-export.xls is really OOXML with .xls extension, 42 cols, 392 rows; scan fixture for emails/phones/addresses and report); data model + why not one HTML blob; column mapping; rich-content handling (HTML kept in comments, DOMPurify allowed tags, Visual vs HTML mode); two separate lists "missing from the export" vs "not supported/rendered by the importer" (check Default Photo N, answer types, defaults, options, recommendation, locked, uses, last modified against the fixture); supported input and limits (first sheet, .xls/.xlsx/.csv, no plain-text export, 10 MB, no auth, last write wins, no add/delete/reorder); AI in the product (what it sees, validation, report says AI used, tests; AI coding tools used to build); how I checked (each test file + commands + manual checks); failure cases; chosen improvement (import trust report: a four-year-tuned template can't be retyped, so show nothing was lost); cut and why (incl. Grafana/Prometheus: serverless Vercel); time, Binsr, Hive feedback as TODO(author); credits (Next.js, Supabase JS, SheetJS, DOMPurify, Gemini).

Also: remove README's stale "Before submitting" section, fix paths/scripts, add Docker, /api/health, migration order 001-003; update ARCHITECTURE.md; save this prompt as docs/prompts/finish.md and add a short AI_USAGE section.
Finish
Run format:check, test, build (and test:db if env set). Confirm git grep -n "/t/" shows only the redirect and no secrets are committed. Report per-phase changes, anything incomplete, and every TODO(author).
