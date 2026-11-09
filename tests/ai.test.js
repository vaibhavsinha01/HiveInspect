import test from 'node:test'
import assert from 'node:assert'
import * as XLSX from 'xlsx'
import { validate } from '../src/lib/ai/mapHeaders.js'
import { parse } from '../src/lib/import/parse.js'
const H = ['Zone', 'Thing', 'Note title', 'Note']
test('valid mapping accepted', () => {
  assert.deepEqual(validate('{"section":0,"item":1,"name":2,"body":3}', 4, H), {
    section: 0,
    item: 1,
    name: 2,
    body: 3,
  })
})
test('malformed, invented, duplicate or missing mappings rejected', () => {
  assert.throws(() => validate('not json', 4), /invalid JSON/)
  assert.throws(() => validate('{"section":0,"body":9}', 4), /invalid column/)
  assert.throws(() => validate('{"section":0,"body":0}', 4), /one column/)
  assert.throws(() => validate('{"section":0}', 4), /required "body"/)
  assert.throws(() => validate('{"section":0,"body":1}', 4, ['a', '']), /empty column/)
})
test('parser uses a validated mapping', () => {
  const buf = XLSX.write(
    {
      SheetNames: ['a'],
      Sheets: { a: XLSX.utils.aoa_to_sheet([H, ['Roof', 'Shingles', 'Worn', 'Old']]) },
    },
    { type: 'buffer', bookType: 'xlsx' },
  )
  let err
  try {
    parse(buf)
  } catch (e) {
    err = e
  }
  assert.ok(err.headers)
  const { tree } = parse(buf, { h: err.h, cols: { section: 0, item: 1, name: 2, body: 3 } })
  assert.equal(tree[0].items[0].comments[0].body, 'Old')
})
