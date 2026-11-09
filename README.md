# Hive Template Importer

**Live app:** <your-vercel-url> (no login required)
**Walkthrough video:** <your-video-link>

Imports a Spectora "Export HTML Text" spreadsheet into a structured template (templates → sections → items → comments). You can edit it, revert comment text, duplicate it, and everything persists in Supabase Postgres.

**Input file:** Spectora template "<template name, e.g. InterNACHI Residential>", exported via *Export to spreadsheet → Export HTML Text*, committed at `fixtures/spectora-export.xls`. It contains no customer data.

**Features:** import with an import report, edit section/item names and comment text (rich text or raw HTML), revert comment text, search comments, duplicate a template as an independent copy.

See [NOTES.md](NOTES.md) for what was cut and why, supported input, known limitations, how the work was checked, time spent, and credits.

## Stack

Next.js 14 (pages and API routes), Supabase Postgres, Vercel hosting. Docker and GitHub Actions are included for portability and checks.

## Setup

1. Create a Supabase project. In the SQL editor, run `supabase/migrations/001_schema.sql`, then `supabase/migrations/002_import_function.sql`.
2. `cp .env.example .env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role key, server-only). The Gemini variables are optional.
3. `npm ci`
4. `npm run dev`, then open http://localhost:3000
5. Seed the database: the fixture is already in the repo, so just run `npm run seed`.

Credentials are never committed. `.env` is git-ignored.

## Deploy (Vercel)

Push to GitHub, import the repo in Vercel, add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` as environment variables, and deploy. Run the seed against the same database so the app opens on an imported template.

## Docker (optional)

Copy `.env.example` to `.env`, fill in the Supabase values, then run `docker compose up --build`. Supabase stays external. Health check: `GET /api/health` returns `{ ok, db }` with no credentials.

## Test and format

- `npm run format:check`, `npm test`, `npm run build`
- `npm run test:db` runs database persistence checks using `.env`. They skip if credentials are missing or Supabase is unreachable.
- `npm run format` applies Prettier.

GitHub Actions runs install, format check, tests, build, and a Docker build on every push.

## Layout

- `src/lib/import/parse.js`: spreadsheet to tree and import report
- `src/lib/import/spectora-columns.js`: Spectora header matching and entity decoding
- `src/lib/ai/mapHeaders.js`: optional Gemini header fallback
- `src/lib/db/templates.js`: save, load, copy (copy reuses the same tree writer)
- `src/app/api/*`: import, load, duplicate, delete, health, and whitelisted PATCH edits
- `src/app/page.js`, `src/app/templates/[id]/page.js`: list/import page and editor
- `supabase/migrations/`: schema and the atomic import function
- `tests/`: parser, fixture, round-trip, database, AI, and API validation tests
- `docs/prompts/finish.md`: the implementation checklist prompt used with Claude

The list/import page is `/`. Editors are at `/templates/:id`, and legacy editor links redirect to the new path.

## Data model

`templates` 1-n `sections` 1-n `items` 1-n `comments`. Every child has a foreign key to its parent (with cascade delete) and a `pos` column, so ordering is stored explicitly and indexed.

- `comments.body` holds the comment HTML. Only comment bodies contain HTML. A template is never stored as one blob.
- `comments.extra` (jsonb) keeps export columns the importer did not map, so they aren't discarded.
- `templates.issues` (jsonb) stores the import report.
- `templates.copied_from` links a duplicate to its original.

All writes for an import or a copy happen in one Postgres function, `import_template`, inside a single transaction. A failure partway through writes nothing.

## Import behaviour

- Columns are matched by header name (Section, Item, Comment Name, Comment Text). Other columns are kept in `extra` and listed in the report.
- Blank section or item cells inherit the previous value.
- Blank rows are counted in the report. Nothing is dropped silently.
- Spectora HTML entities are decoded without altering the text.
- The fixture imports as 13 sections, 69 items, and 392 comments, in source order.

**Rich content and limits:** bold, lists, and links inside comments are stored as HTML and preserved. <State limits you verified, e.g. images, inline styles, or settings the importer doesn't support.> Information that is not in the export cannot be recovered. Information the importer does not support is flagged in the import report.

**Chosen improvement:** an import report (row, section, item, and comment counts plus issues) so an inspector can verify nothing was lost, along with comment search and revert.

## Failure handling

A file with unknown headers, a wrong file type, or a malformed spreadsheet is rejected with a clear error, and nothing is written to the database.

## Optional AI fallback (Gemini)

Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) to enable it. It runs only when headers can't be matched. Gemini receives the headers and up to 2 sample rows and returns column indexes only. The response is validated (valid JSON, indexes in range, no empty or reused columns, section and comment text required), and anything else is rejected. Parsing stays deterministic, no content passes through the model, and the report states that the mapping came from AI. Without a key, a file with unknown headers is rejected.

## Security

The service key stays server-side. Row level security is enabled on all tables, and `import_template` is executable only by the service role.

## Troubleshooting

- **"Server is missing SUPABASE_URL or SUPABASE_SERVICE_KEY":** the `.env` file is missing or misnamed. Run `cp .env.example .env` (`copy` on Windows), fill both values, make sure it isn't named `.env.txt`, then restart `npm run dev`.
- **"Could not find the function import_template":** run `002_import_function.sql`, then `notify pgrst, 'reload schema';`.
- Keep the project outside OneDrive-synced folders if installs or the dev server behave oddly.