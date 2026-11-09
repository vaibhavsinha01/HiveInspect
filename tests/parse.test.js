import test from 'node:test'
import assert from 'node:assert'
import * as XLSX from 'xlsx'
import { parse } from '../src/lib/import/parse.js'
const book = (rows) =>
  XLSX.write(
    { SheetNames: ['a'], Sheets: { a: XLSX.utils.aoa_to_sheet(rows) } },
    { type: 'buffer', bookType: 'xlsx' },
  )
const H = ['Section Name', 'Item Name', 'Comment Name', 'Comment Text', 'Rating']
test('order, fill-down, html and extra column preserved', () => {
  const { tree, issues } = parse(
    book([
      H,
      ['Roof', 'Shingles', 'Worn', '<a href="x">Link</a> worn', 'Defect'],
      ['', '', 'Missing', 'Missing shingles', ''],
      ['', 'Flashing', 'OK', 'Fine', ''],
      ['Attic', 'Vent', 'Blocked', 'Blocked', ''],
    ]),
  )
  assert.deepEqual(
    tree.map((s) => s.name),
    ['Roof', 'Attic'],
  )
  assert.deepEqual(
    tree[0].items.map((i) => i.name),
    ['Shingles', 'Flashing'],
  )
  assert.deepEqual(
    tree[0].items[0].comments.map((c) => c.name),
    ['Worn', 'Missing'],
  )
  assert.equal(tree[0].items[0].comments[0].body, '<a href="x">Link</a> worn')
  assert.equal(tree[0].items[0].comments[0].extra.Rating, 'Defect')
  assert.ok(issues.some((i) => i.msg.includes('Rating')))
})
test('blank rows reported', () => {
  const { issues } = parse(book([H, ['A', 'B', 'C', 'D', ''], ['', '', '', '', '']]))
  assert.ok(issues.some((i) => i.msg.includes('1 blank')))
})
test('wrong file fails clearly', () => {
  assert.throws(
    () =>
      parse(
        book([
          ['x', 'y'],
          [1, 2],
        ]),
      ),
    /Section column/,
  )
  assert.throws(
    () =>
      parse(
        book([
          ['Section', 'Item'],
          ['a', 'b'],
        ]),
      ),
    /comment text/,
  )
})
test('exact trimmed headers map Comment Text even when Comment Type comes first', () => {
  const { tree } = parse(
    book([
      [' Section Name ', ' Item Name ', 'Comment Type', ' Comment Text ', ' Comment Name '],
      ['Roof', 'Vent', 'defect', 'Raw <b>HTML</b>', 'Name'],
    ]),
  )
  assert.equal(tree[0].items[0].comments[0].body, 'Raw <b>HTML</b>')
  assert.equal(tree[0].items[0].comments[0].name, 'Name')
  assert.equal(tree[0].items[0].comments[0].extra['Comment Type'], 'defect')
})
test('header candidates must start with section', () => {
  assert.doesNotThrow(() => parse(book([['prefix section title'], H, ['A', 'B', 'C', 'D', '']])))
  assert.throws(
    () => parse(book([['not a section header'], ['A', 'B', 'C', 'D', '']])),
    /Section column/,
  )
})
test('order disagreements are reported without reordering rows', () => {
  const headers = [...H, 'Order (w/i item)']
  const { tree, issues } = parse(
    book([headers, ['A', 'Item', 'First', 'body 1', '', 0], ['', '', 'Second', 'body 2', '', 8]]),
  )
  assert.deepEqual(
    tree[0].items[0].comments.map((comment) => comment.name),
    ['First', 'Second'],
  )
  assert.ok(issues.some((issue) => issue.msg.includes('Order (w/i item) is 8')))
})
