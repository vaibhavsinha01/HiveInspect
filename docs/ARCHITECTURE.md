# Architecture

```text
Browser pages
  -> Next.js route handlers
     -> src/lib/import: deterministic spreadsheet parsing and import report
     -> src/lib/db: Supabase repository functions
        -> Postgres: import_template() writes the tree atomically
```

## Data flow

The list page uploads `.xls`, `.xlsx`, or `.csv` files to `POST /api/templates`. The route parses the first sheet and stores the template through the `import_template()` function. The editor loads a structured tree, then saves individual whitelisted fields through `PATCH /api/nodes/[table]/[id]`. Copying reuses the tree writer; deleting a template cascades through its children.

## Decisions

- Parsing is deterministic. Gemini is an optional header-only mapping fallback; its output is validated before parsing.
- Sections, items, and comments are separate ordered rows to support editing and searching. Comment body HTML remains as exported, and unmapped columns are stored in `comments.extra`.
- `templates.issues` stores the import report, including row counts, mapping notes, and unmapped-column notes.
- The Supabase service key stays server-side. Row-level security is enabled without public policies.
- Health checks expose only `{ ok, db }`; logs record JSON event metadata and never spreadsheet content or credentials.

## Paths

- `src/app`: pages and API routes, including `/api/health`
- `src/lib/import`: parser and Spectora header rules
- `src/lib/db`: Supabase client and repository
- `supabase/migrations`: apply `001_schema.sql`, then `002_import_function.sql`; add future schema changes as a new `003_*.sql`
- `fixtures`: committed source export
- `tests`: deterministic parser, fixture, AI mapping, API validation, and optional database tests

The app can run on Vercel or in the provided Node 20 Docker image. Supabase remains external.
