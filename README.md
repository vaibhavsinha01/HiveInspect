# Hive Template Importer

Next.js 14 + Supabase (Postgres). Imports a Spectora "Export HTML Text" spreadsheet into structured templates, sections, items and comments. Supports editing, duplicating and persistence.

## Setup

1. Create a Supabase project and run `001_schema.sql`, then `002_import_function.sql` in the SQL editor.
2. `cp .env.example .env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role key, server-only). Gemini variables are optional.
3. `npm ci`
4. `npm run dev` then open http://localhost:3000
5. Seed: put the export at `fixtures/spectora-export.xls`, run `npm run seed`.

## Deploy (Vercel)

Push to GitHub, import in Vercel, add the two env vars, deploy. Then run the seed against the same database.

## Docker

Copy `.env.example` to `.env`, fill in the Supabase values, then run `docker compose up --build`. Supabase remains external. The health endpoint is `/api/health`.

## Test and format

Run `npm run format:check`, `npm test`, and `npm run build`. `npm run test:db` runs database persistence checks using `.env`; they skip when credentials are absent or Supabase cannot be reached. `npm run format` applies Prettier.

The list/import page is `/`; editors are at `/templates/:id`. Legacy editor links redirect to the new editor path. `GET /api/health` reports `{ ok, db }` without returning credentials.

## Layout

- `src/lib/import/parse.js` spreadsheet to tree and import report
- `src/lib/db/templates.js` save, load; copy reuses the same tree writer
- `src/app/api/*` import, load, duplicate, delete, health, and whitelisted PATCH updates
- `src/app/page.js`, `src/app/templates/[id]/page.js` list/import and editor

## Data model

templates 1-n sections 1-n items 1-n comments. Each has `pos` for ordering. Comment `body` holds raw HTML; unmapped columns go to `comments.extra` (jsonb). `templates.issues` stores the import report.

## Import behaviour

- Columns matched by header name (Section, Item, Comment Name, Comment Text); the rest are kept in `extra` and reported.
- Blank section or item cells inherit the previous value.
- Blank rows are counted in the report. Nothing is dropped silently.
- Chosen improvement: import report with row/section/item/comment counts so the inspector can trust the import.

## Optional AI fallback (Gemini)

Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) to enable it. It runs only when the headers cannot be matched. Gemini receives the column headers and up to 2 sample rows and returns column indexes only. The response is validated (valid JSON, indexes in range, no empty or reused columns, section and comment text required) and anything else is rejected with an error. Parsing stays deterministic, no content passes through the model, and the import report states that the mapping came from AI so the user can verify it. Without a key, a file with unknown headers is rejected.

## Troubleshooting

- "Server is missing SUPABASE_URL or SUPABASE_SERVICE_KEY": the `.env` file is missing or misnamed. In the project root run `copy .env.example .env` (Windows) or `cp .env.example .env`, fill both values, make sure the file is not named `.env.txt`, then stop and restart `npm run dev`.
- "Could not find the function import_template": run `002_import_function.sql`, then `notify pgrst, 'reload schema';`.
- Keep the project outside OneDrive-synced folders if installs or the dev server behave oddly.
