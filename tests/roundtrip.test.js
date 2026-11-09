import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { parse } from '../src/lib/import/parse.js'
import { dec } from '../src/lib/import/spectora-columns.js'

const bytes = readFileSync(new URL('../fixtures/spectora-export.xls', import.meta.url))
const workbook = XLSX.read(bytes)
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
  header: 1,
  defval: '',
  raw: false,
})
const headerRow = rows.findIndex((row) => row.some((cell) => /^section/i.test(String(cell).trim())))
const headers = rows[headerRow]
const indexes = {
  section: headers.indexOf('Section Name'),
  item: headers.indexOf('Item Name'),
  name: headers.indexOf('Comment Name'),
  body: headers.indexOf('Comment Text'),
}
const roleIndexes = new Set(Object.values(indexes))
let currentSection = ''
let currentItem = ''
const expected = rows
  .slice(headerRow + 1)
  .filter((row) => row.some((cell) => cell !== ''))
  .map((row) => {
    const rowSection = dec(row[indexes.section])
    if (rowSection && rowSection !== currentSection) currentItem = ''
    currentSection = rowSection || currentSection
    currentItem = dec(row[indexes.item]) || currentItem
    return {
      section: currentSection,
      item: currentItem,
      name: dec(row[indexes.name]),
      body: row[indexes.body],
      extra: Object.fromEntries(
        headers.flatMap((header, index) =>
          !roleIndexes.has(index) && row[index] !== '' ? [[header, row[index]]] : [],
        ),
      ),
    }
  })
const flattened = parse(bytes).tree.flatMap((section) =>
  section.items.flatMap((item) =>
    item.comments.map((comment) => ({ section: section.name, item: item.name, ...comment })),
  ),
)

test('fixture rows round-trip through parser in source order', () => {
  assert.equal(flattened.length, expected.length)
  assert.deepEqual(flattened, expected)
})

const hasDb = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
const unavailable = (error) => /fetch failed|ENOTFOUND|ECONN/.test(error?.message || '')
test(
  'fixture saves and loads with identical flattened content',
  { skip: !hasDb },
  async (context) => {
    const { save, load, getDb } = await import('../src/lib/db/templates.js').then(
      async (repository) => ({ ...repository, ...(await import('../src/lib/db/client.js')) }),
    )
    const { tree, issues } = parse(bytes)
    let id
    try {
      ;({ id } = await save('roundtrip-test', tree, issues, 'spectora-export.xls'))
      const loaded = await load(id)
      const result = loaded.tree.flatMap((section) =>
        section.items.flatMap((item) =>
          item.comments.map((comment) => ({
            section: section.name,
            item: item.name,
            name: comment.name,
            body: comment.body,
            extra: comment.extra,
          })),
        ),
      )
      assert.deepEqual(result, flattened)
    } catch (error) {
      if (!unavailable(error)) throw error
      context.skip('Supabase is unreachable from this environment')
    } finally {
      if (id) {
        const { error } = await getDb().from('templates').delete().eq('id', id)
        if (error && !unavailable(error)) throw new Error(error.message)
      }
    }
  },
)
