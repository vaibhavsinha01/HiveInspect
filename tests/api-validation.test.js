import test from 'node:test'
import assert from 'node:assert/strict'
import { validId, validatePatch } from '../src/lib/db/templates.js'

test('UUID validation accepts canonical UUID and rejects malformed ids', () => {
  assert.equal(validId('d9428888-122b-4d3a-8c12-123456789abc'), true)
  assert.equal(validId('not-a-uuid'), false)
})

test('node patches whitelist fields and enforce type and length limits', () => {
  assert.deepEqual(validatePatch('comments', { body: 'text', name: 'Title' }), {
    body: 'text',
    name: 'Title',
  })
  assert.throws(() => validatePatch('users', { name: 'x' }), /Invalid table/)
  assert.throws(() => validatePatch('items', { pos: 2 }), /Invalid field/)
  assert.throws(() => validatePatch('items', { name: 4 }), /Invalid field/)
  assert.throws(() => validatePatch('items', { name: 'x'.repeat(501) }), /Invalid field/)
  assert.throws(() => validatePatch('comments', { body: 'x'.repeat(100001) }), /Invalid field/)
})
