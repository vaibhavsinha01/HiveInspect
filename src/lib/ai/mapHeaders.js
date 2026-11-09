const roles = ['section', 'item', 'name', 'body']
const model = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash'
export function validate(text, n, headers = []) {
  let o
  try {
    o = JSON.parse(text)
  } catch {
    throw new Error('model returned invalid JSON')
  }
  const cols = {}
  for (const k of roles) {
    const v = o?.[k]
    if (v == null) {
      if (k === 'body' || k === 'section') throw new Error(`model did not map required "${k}"`)
      continue
    }
    if (!Number.isInteger(v) || v < 0 || v >= n)
      throw new Error(`model gave an invalid column for "${k}"`)
    if (headers.length && !headers[v]) throw new Error(`model mapped "${k}" to an empty column`)
    cols[k] = v
  }
  const vals = Object.values(cols)
  if (new Set(vals).size !== vals.length) throw new Error('model mapped two roles to one column')
  return cols
}
export async function mapHeaders({ headers, rows }) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const cut = (v) => String(v).slice(0, 80)
  const prompt = `A home inspection template spreadsheet has these columns (index: header):\n${headers.map((c, i) => `${i}: ${cut(c)}`).join('\n')}\n\nSample rows:\n${JSON.stringify((rows || []).slice(1).map((r) => r.map(cut)))}\n\nReturn only JSON {"section":int,"item":int|null,"name":int|null,"body":int} with the column index for: section name, item name, comment name, comment text. Use null if absent. Never invent indexes.`
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    },
  )
  if (!r.ok) throw new Error('Gemini request failed with status ' + r.status)
  const j = await r.json()
  return validate(j.candidates?.[0]?.content?.parts?.[0]?.text, headers.length, headers)
}
