import { NextResponse as R } from 'next/server'
import { list, save } from '@/lib/db/templates'
import { parse } from '@/lib/import/parse'
import { mapHeaders } from '@/lib/ai/mapHeaders'
import { log } from '@/lib/log'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    return R.json(await list())
  } catch (e) {
    return R.json({ error: e.message }, { status: 500 })
  }
}
export async function POST(req) {
  let saving = false
  try {
    const f = (await req.formData()).get('file')
    if (!f || !f.arrayBuffer) throw new Error('No file uploaded')
    if (f.size > 10 * 1024 * 1024) throw new Error('File larger than 10 MB')
    const buf = Buffer.from(await f.arrayBuffer())
    let out
    try {
      out = parse(buf)
    } catch (e) {
      if (!e.headers) throw e
      const cols = await mapHeaders(e).catch((x) => {
        throw new Error(e.message + ' (AI column mapping failed: ' + x.message + ')')
      })
      if (!cols) throw e
      out = parse(buf, { h: e.h, cols })
      out.issues.unshift({
        row: null,
        msg:
          'Columns mapped by AI (Gemini), please verify: ' +
          Object.entries(cols)
            .map(([k, i]) => `${k} = "${e.headers[i]}"`)
            .join(', '),
      })
    }
    const { tree, issues } = out
    saving = true
    const t = await save(f.name.replace(/\.[^.]+$/, ''), tree, issues, f.name)
    log('import.success', { id: t.id })
    return R.json({ id: t.id })
  } catch (e) {
    const status = e.status || (saving ? 500 : 400)
    log('import.failure', { status })
    return R.json({ error: e.message }, { status })
  }
}
