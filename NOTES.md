# NOTES
Template used: Residential Template, exported from Spectora on 2026-11-08 via Export to spreadsheet > Export HTML Text. Committed as fixtures/spectora-export.xls (42 columns, 392 rows: 13 sections, 69 items, 392 comments).

## Cut
Drag/drop reorder, add/delete rows, HTML preview, auth, multi-sheet files, plain-text export.

## Supported input
First sheet of .xls/.xlsx/.csv with Section, Item and comment text columns. HTML stays inside comment bodies unchanged.

## Limits
Unmapped columns are stored read-only. Content absent from the export cannot be recovered. No login: anyone with the URL can edit.

## Checks
`npm test`; manual persistence, copy-independence and bad-file checks in README.

## Time
(fill in)

## Credit
Next.js, Supabase JS, SheetJS. Built with Claude.
