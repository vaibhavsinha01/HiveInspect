import { NextResponse as R } from 'next/server'
import { load, copy, remove, validId } from '@/lib/db/templates'
export const dynamic = 'force-dynamic'
export async function GET(_, { params }) {
  if (!validId(params.id)) return R.json({ error: 'Invalid id' }, { status: 400 })
  try {
    return R.json(await load(params.id))
  } catch (e) {
    return R.json({ error: e.message }, { status: e.code === 'PGRST116' ? 404 : 500 })
  }
}
export async function POST(_, { params }) {
  if (!validId(params.id)) return R.json({ error: 'Invalid id' }, { status: 400 })
  try {
    return R.json(await copy(params.id))
  } catch (e) {
    return R.json({ error: e.message }, { status: e.status || 500 })
  }
}
export async function DELETE(_, { params }) {
  if (!validId(params.id)) return R.json({ error: 'Invalid id' }, { status: 400 })
  try {
    await remove(params.id)
    return R.json({ ok: true })
  } catch (e) {
    return R.json({ error: e.message }, { status: e.status || 500 })
  }
}
