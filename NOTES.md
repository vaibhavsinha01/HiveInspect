# Hive Template Importer

## What was built

A Next.js 14 importer for Spectora spreadsheet exports. It parses a template into sections, items, and comments, stores it in Supabase, and provides a browser editor for names and comment text. The committed example is the Residential template exported from Spectora on 2026-11-08. `fixtures/spectora-export.xls` is OOXML despite its `.xls` extension: 42 columns and 392 rows (13 sections, 69 items, 392 comments).

## Fixture privacy scan

Scanned all fixture cell text for email and common US phone patterns: zero matches for either. An address-shaped pattern produced 65 candidates, but sampling showed these were inspection labels and phrases rather than confirmed street addresses. This is a pattern scan, not a guarantee that the fixture contains no identifying information.

## Data model

`templates` has many `sections`, each section has many `items`, and each item has many `comments`. Every child row has a position so source ordering is retained. Comments hold `name`, exported HTML `body`, and `extra` JSON for unmapped columns; templates hold the source filename and import issues.

This structure keeps names editable and allows browsing/searching at section and item level. One HTML blob would make individual comments hard to edit, count, validate, or preserve in order. Comment body HTML remains intact in storage.

## Column mapping

Exact, case-insensitive trimmed matches take priority for `Section Name`, `Item Name`, `Comment Name`, and `Comment Text`; regex rules provide the fallback. `Comment Type` is retained in `extra` and is not treated as body text. Blank section/item cells fill down from the previous named row. Names decode HTML entities for display; body HTML remains as exported. Unmapped nonempty columns are stored in `extra` and reported. `Order (w/i item)` disagreement is reported without reordering.

The fixture also has `Default Photo 1` through `Default Photo 10` and captions, answer types, defaults, options, recommendation, locked, uses, and last modified columns. These settings are retained as read-only `extra` values when populated. The importer does not execute answer types or options, apply defaults/recommendations/locked/uses behavior, display default photos, or interpret last-modified metadata.

## Rich content

Comment HTML is stored as exported. The visual editor sanitizes markup through DOMPurify and allows `p`, `a`, `b`, `strong`, `i`, `em`, `u`, `br`, `ul`, `ol`, `li`, `span`, and `div`, with `href`, `target`, `rel`, `style`, and `class` attributes. If sanitization would remove markup, the comment opens in HTML mode so edits do not silently discard it. Users can switch between Visual and HTML modes where safe.

## Export gaps and importer limits

### Missing from the export

- Anything not present in the source spreadsheet, including template history or data Spectora did not export, cannot be reconstructed.
- The importer cannot infer the intended meaning of unknown or blank values.

### Not supported or rendered by the importer

- Default photos are retained as extra values, not rendered as image controls.
- Answer types, defaults, answer options, recommendation, locked state, uses, and last modified are not implemented as executable template behavior.
- No add, delete, or reorder controls for sections, items, or comments.
- Only the first worksheet is read; plain-text exports are unsupported.

Supported input is `.xls`, `.xlsx`, or `.csv`, up to 10 MB. There is no authentication; anyone who can reach the app can edit. Concurrent edits are last-write-wins.

## AI

Gemini is an optional header-mapping fallback. It receives column headers and up to two sample rows, not the whole file; its suggested indexes are validated for range, required mappings, nonempty headers, and duplicate assignments. The import report identifies AI-mapped columns for review. Parser output is deterministic once a mapping is selected. Tests cover mapping validation and parser use of a validated mapping. AI coding tools were used while building this project.

## Checks

- `tests/parse.test.js`: ordering, fill-down, HTML, extra columns, blank rows, and malformed input.
- `tests/fixture.test.js`: fixture totals, entity-decoded names, and preserved HTML bodies.
- `tests/ai.test.js`: mapping validation and parser mapping.
- `tests/api-validation.test.js`: UUID, table, field, type, and length validation.
- `tests/roundtrip.test.js`: SheetJS source rows against parser output; optional save/load comparison.
- `tests/db.test.js`: copy independence and atomic failure; requires reachable Supabase credentials.
- Commands: `npm run format`, `npm run format:check`, `npm test`, `npm run build`, and `npm run test:db`.
- Manual checks not run: editor save/copy, invalid upload, health endpoint with a live database, and Docker runtime. Supabase was unreachable and the Docker engine was unavailable here.

## Failure cases

An unsupported file or missing header fails with a readable import error. Files over 10 MB are rejected. A missing Supabase configuration is reported by the server. Gemini is optional; missing or invalid mapping results in an import error rather than guessed columns.

## Improvement choice

The importer emphasizes a trust report. A template tuned over four years should not need to be retyped after import; visible row and comment counts plus retained unmapped settings help show what arrived and what still needs human review.

## Cut

Reordering, row creation/deletion, authentication, multi-sheet parsing, and full Spectora answer behavior were left out to keep this importer small. Grafana and Prometheus were excluded because this is a small serverless-friendly app intended for Vercel; a monitoring stack would add deployment and maintenance work without a matching operational need.

Time spent: TODO(author)
Binsr comparison: TODO(author)
Hive feedback: TODO(author)

## Credits

Next.js, Supabase JS, SheetJS, DOMPurify, Gemini.

## AI_USAGE

AI coding assistance was used for implementation and documentation. The Gemini feature in the product is optional and only helps map headers; see the AI section above.
