import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { parse } from '../src/lib/import/parse.js'
const { tree, issues } = parse(
  readFileSync(new URL('../fixtures/spectora-export.xls', import.meta.url)),
)
test('real export counts match rows', () => {
  assert.equal(tree.length, 13)
  assert.equal(
    tree.reduce((a, s) => a + s.items.length, 0),
    69,
  )
  assert.equal(
    tree.reduce((a, s) => a + s.items.reduce((b, i) => b + i.comments.length, 0), 0),
    392,
  )
  assert.ok(issues[0].msg.startsWith('Read 392'))
})
test('first section and entity decoding', () => {
  assert.equal(tree[0].name, 'Inspection Details')
  assert.ok(tree.some((s) => s.items.some((i) => i.name === 'Siding, Flashing & Trim')))
  assert.ok(!tree.some((s) => s.name.includes('&amp;')))
})
test('html bodies preserved', () => {
  const b = tree
    .flatMap((s) => s.items.flatMap((i) => i.comments))
    .filter((c) => /<[a-z]/i.test(c.body))
  assert.equal(b.length, 198)
})
