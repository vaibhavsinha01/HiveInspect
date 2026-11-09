import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { error } = await getDb().from('templates').select('id').limit(1)
    return NextResponse.json({ ok: !error, db: !error }, { status: error ? 500 : 200 })
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 500 })
  }
}
