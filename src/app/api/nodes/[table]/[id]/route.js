import { NextResponse } from 'next/server'
import { update, validId } from '@/lib/db/templates'
import { log } from '@/lib/log'

export async function PATCH(request, { params }) {
  if (!validId(params.id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  try {
    const patch = await request.json()
    await update(params.table, params.id, patch)
    log('node.update.success', { table: params.table, id: params.id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const status = error.status || 400
    log('node.update.failure', { table: params.table, id: params.id, status })
    return NextResponse.json({ error: error.message }, { status })
  }
}
