# Architecture

```
Browser (Next.js pages)
  -> src/app/api/*          HTTP only: parse request, call a repository function, return JSON
       -> src/lib/import/   pure functions: spreadsheet bytes -> { tree, issues } (no I/O)
       -> src/lib/db/       repository: list, load, save, update, copy
            -> Postgres     import_template() writes the whole tree in one transaction
```

## Decisions
- Parsing is deterministic and has no database access, so it is unit-tested against the committed fixture.
- Import and copy both go through `import_template()`. Any failure rolls back the whole template, so no partial imports exist.
- Edits go through a whitelist of tables and fields in `src/lib/db/templates.js`.
- Comment text is stored as exported HTML; unmapped Spectora columns are kept in `comments.extra` (jsonb).
- The service-role key is used only on the server. Row level security is enabled with no public policies.

## Folders
- `src/app` pages and API routes
- `src/lib/import` column rules, entity decoding, parser
- `src/lib/db` Supabase client and repository
- `supabase/migrations` numbered SQL, run in order
- `fixtures` committed Spectora export
- `tests` parser tests (always) and database tests (need env vars)
- `scripts` seed
