# Hive Template Importer

## What I built

A web app that takes a Spectora template export and brings it into Hive Inspect as an editable template. You upload the spreadsheet, the app reads it into sections, items, and comments, saves it, and lets you browse and edit it in the browser.

The flow:

1. Upload a Spectora export (`.xls`, `.xlsx`, or `.csv`, up to 10 MB).
2. The importer works out which columns are the section, item, comment name, and comment text.
3. It builds the template structure and saves it to Supabase.
4. An import report shows what arrived, what was mapped by AI, and which columns were kept but not interpreted.
5. You edit names and comment text in the browser, in a visual editor or raw HTML.

The example template in the repo is the Residential template exported from Spectora on 2026-11-08 (`fixtures/spectora-export.xls`). Despite the `.xls` extension, it is an OOXML file.

## Approach

**Data model.** Four Postgres tables in Supabase: `templates`, `sections`, `items`, and `comments`. Each one belongs to the one above it and stores a position, so the original order is kept. Comments hold the name, the HTML body exactly as exported, and an `extra` JSON field for unmapped columns. Separate rows (instead of one HTML blob) let individual comments be edited, counted, and validated. Deleting a template cascades to everything under it.

**Atomic import.** The whole import runs in one Postgres function, `import_template`, inside a single transaction. If any insert fails, everything rolls back, so there are no half-imported templates. Only the server's service role can call it.

**Column mapping.** Exact header matches (case-insensitive, trimmed) are tried first for Section Name, Item Name, Comment Name, and Comment Text. Regex rules are the fallback. Blank section or item cells are filled down from the row above. Names are decoded for display, while comment HTML is stored as exported. Columns the importer does not use are saved in `extra` and listed in the report. If the order column disagrees with row order, it is reported but nothing is reordered.

**Trust report.** The main improvement I made was an import report. A template built up over years should not have to be retyped, so the report shows what came across and what still needs a human to check.

## Checks

| Test                           | What it covers                                                              |
| ------------------------------ | --------------------------------------------------------------------------- |
| `tests/parse.test.js`          | Ordering, fill-down, HTML, extra columns, blank rows, malformed input       |
| `tests/fixture.test.js`        | Fixture totals, decoded names, preserved HTML bodies                        |
| `tests/ai.test.js`             | Mapping validation and parser use of a validated mapping                    |
| `tests/api-validation.test.js` | UUID, table, field, type, and length validation                             |
| `tests/roundtrip.test.js`      | Source rows compared with parser output, plus optional save/load comparison |
| `tests/db.test.js`             | Copy independence and atomic failure (needs reachable Supabase credentials) |

Commands: `npm run format`, `npm run format:check`, `npm test`, `npm run build`, `npm run test:db`.

## AI usage

**In the product.** Gemini is an optional fallback for mapping headers. It receives only the column headers and up to two sample rows, never the whole file. Its suggested column indexes are validated for range, required mappings, nonempty headers, and duplicate assignments. Columns mapped by AI are flagged in the import report for review. Once a mapping is chosen, parsing is deterministic.

**While building.** AI coding tools were used for implementation and documentation. I reviewed and tested the output.

## Stack

Next.js 14, Supabase (database), SheetJS (spreadsheet parsing), DOMPurify (HTML sanitizing in the editor), Gemini (optional header mapping), deployed on Vercel.
