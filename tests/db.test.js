import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
const skip = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY
const unavailable = (error) => /fetch failed|ENOTFOUND|ECONN/.test(error?.message || '')
const lib = async () => ({
  ...(await import('../src/lib/db/templates.js')),
  ...(await import('../src/lib/db/client.js')),
  ...(await import('../src/lib/import/parse.js')),
})
test('copy is independent and edits persist', { skip }, async (context) => {
  const { save, copy, load, update, parse } = await lib()
  const { tree, issues } = parse(
    readFileSync(new URL('../fixtures/spectora-export.xls', import.meta.url)),
  )
  const created = []
  try {
    const a = await save('db-test', tree, issues, 'fixture')
    created.push(a.id)
    const b = await copy(a.id)
    created.push(b.id)
    const cb = await load(b.id),
      secB = cb.tree[0].id
    await update('sections', secB, { name: 'Changed' })
    assert.equal((await load(a.id)).tree[0].name, tree[0].name)
    assert.equal((await load(b.id)).tree[0].name, 'Changed')
    const n = (template) =>
      template.tree.reduce((x, s) => x + s.items.reduce((y, i) => y + i.comments.length, 0), 0)
    assert.equal(n(await load(a.id)), 392)
    assert.equal(n(await load(b.id)), 392)
  } catch (error) {
    if (!unavailable(error)) throw error
    context.skip('Supabase is unreachable from this environment')
  } finally {
    if (created.length) {
      const { getDb } = await lib()
      try {
        await getDb().from('templates').delete().in('id', created)
      } catch (error) {
        if (!unavailable(error)) throw error
      }
    }
  }
})
test('failed import leaves nothing behind', { skip }, async (context) => {
  const { save, getDb } = await lib()
  await assert.rejects(
    save('atomic-test', [{ name: 'S', items: [{ name: null, comments: [] }] }], [], 'x'),
  )
  const { data, error } = await getDb().from('templates').select('id').eq('name', 'atomic-test')
  if (unavailable(error)) return context.skip('Supabase is unreachable from this environment')
  if (error) throw new Error(error.message)
  assert.equal(data.length, 0)
})
