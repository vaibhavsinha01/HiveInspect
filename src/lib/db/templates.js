import { getDb } from './client.js'
const ok = ({ data, error }) => {
  if (error)
    throw Object.assign(new Error(error.message), {
      code: error.code,
      status: error.code === 'PGRST116' ? 404 : 500,
    })
  return data
}
const editable = {
  templates: ['name'],
  sections: ['name'],
  items: ['name'],
  comments: ['name', 'body'],
}
export const validId = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
export function validatePatch(table, patch) {
  if (!editable[table] || !patch || typeof patch !== 'object' || Array.isArray(patch))
    throw new Error('Invalid table or patch')
  const fields = Object.entries(patch)
  if (
    !fields.length ||
    fields.some(
      ([key, value]) =>
        !editable[table].includes(key) ||
        typeof value !== 'string' ||
        value.length > (key === 'body' ? 100000 : 500),
    )
  )
    throw new Error('Invalid field value')
  return Object.fromEntries(fields)
}
export async function save(name, tree, issues, source, copiedFrom = null) {
  const id = ok(
    await getDb().rpc('import_template', {
      p_name: name,
      p_source: source,
      p_issues: issues,
      p_tree: tree,
      p_copied_from: copiedFrom,
    }),
  )
  return { id }
}
export async function list() {
  const db = getDb(),
    templates = ok(
      await db
        .from('templates')
        .select('id,name,source,created_at,copied_from')
        .order('created_at', { ascending: false }),
    )
  const sections = ok(await db.from('sections').select('id,template_id'))
  const items = ok(await db.from('items').select('id,section_id'))
  const comments = ok(await db.from('comments').select('id,item_id'))
  const sectionCounts = new Map(),
    itemCounts = new Map(),
    commentCounts = new Map()
  sections.forEach((s) =>
    sectionCounts.set(s.template_id, (sectionCounts.get(s.template_id) || 0) + 1),
  )
  sections.forEach((s) => {
    const childItems = items.filter((i) => i.section_id === s.id)
    itemCounts.set(s.template_id, (itemCounts.get(s.template_id) || 0) + childItems.length)
    childItems.forEach((i) =>
      commentCounts.set(
        s.template_id,
        (commentCounts.get(s.template_id) || 0) + comments.filter((c) => c.item_id === i.id).length,
      ),
    )
  })
  return templates.map((t) => ({
    ...t,
    sections: sectionCounts.get(t.id) || 0,
    items: itemCounts.get(t.id) || 0,
    comments: commentCounts.get(t.id) || 0,
  }))
}
export async function update(table, id, patch) {
  if (!editable[table]) throw new Error('Bad table')
  const p = validatePatch(table, patch)
  const result = await getDb().from(table).update(p).eq('id', id).select('id')
  if (result.error) throw new Error(result.error.message)
  if (!result.data?.length) throw Object.assign(new Error('Not found'), { status: 404 })
}
export async function load(id) {
  const t = ok(await getDb().from('templates').select('*').eq('id', id).single())
  const ss = ok(await getDb().from('sections').select('*').eq('template_id', id).order('pos'))
  const ids = ss.map((s) => s.id)
  const its = ids.length
    ? ok(await getDb().from('items').select('*').in('section_id', ids).order('pos'))
    : []
  const iids = its.map((i) => i.id),
    cs = []
  for (let i = 0; i < iids.length; i += 100)
    cs.push(
      ...ok(
        await getDb()
          .from('comments')
          .select('*')
          .in('item_id', iids.slice(i, i + 100))
          .order('pos'),
      ),
    )
  t.tree = ss.map((s) => ({
    ...s,
    items: its
      .filter((i) => i.section_id === s.id)
      .map((i) => ({ ...i, comments: cs.filter((c) => c.item_id === i.id) })),
  }))
  return t
}
export async function copy(id) {
  const t = await load(id)
  return save(t.name + ' (copy)', t.tree, t.issues, t.source, t.id)
}
export async function remove(id) {
  const result = await getDb().from('templates').delete().eq('id', id).select('id')
  if (result.error) throw new Error(result.error.message)
  if (!result.data?.length) throw Object.assign(new Error('Not found'), { status: 404 })
}
