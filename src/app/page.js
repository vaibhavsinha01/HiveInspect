'use client'
import { useEffect, useState } from 'react'
export default function Home() {
  const [list, setList] = useState(null),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false)
  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) =>
        Array.isArray(d)
          ? setList(d)
          : (setList([]), setErr(d.error || 'Could not load templates')),
      )
      .catch(() => {
        setList([])
        setErr('Could not load templates')
      })
  }, [])
  const send = async (f) => {
    if (!f || busy) return
    setBusy(true)
    setErr('')
    try {
      const fd = new FormData()
      fd.append('file', f)
      const r = await fetch('/api/templates', { method: 'POST', body: fd }),
        d = await r.json()
      if (!r.ok) throw new Error(d.error)
      location.href = '/templates/' + d.id
    } catch (e) {
      setErr(e.message || 'Import failed')
      setBusy(false)
    }
  }
  const rename = async (template) => {
    try {
      const response = await fetch(`/api/nodes/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: template.name }),
      })
      if (!response.ok) throw new Error('Rename failed')
    } catch (e) {
      setErr(e.message)
    }
  }
  const remove = async (template) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return
    try {
      const response = await fetch(`/api/templates/${template.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      setList((values) => values.filter((value) => value.id !== template.id))
    } catch (e) {
      setErr(e.message)
    }
  }
  return (
    <>
      <header className="bar">
        <div className="wrap">
          <h1 className="title grow">Template Importer</h1>
        </div>
      </header>
      <main className="wrap">
        <label
          className={'drop' + (drag ? ' on' : '')}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            send(e.dataTransfer.files[0])
          }}
        >
          <b>{busy ? 'Importing...' : 'Drop a Spectora export here or click to choose'}</b>
          <span className="muted">
            Export to spreadsheet &rarr; Export HTML Text (.xls, .xlsx, .csv)
          </span>
          <input
            type="file"
            hidden
            accept=".xls,.xlsx,.csv"
            disabled={busy}
            onChange={(e) => {
              send(e.target.files[0])
              e.target.value = ''
            }}
          />
        </label>
        {err && (
          <p className="err" role="alert">
            <b>Import failed:</b> {err}
          </p>
        )}
        <h2>Your templates</h2>
        <div style={{ marginTop: 12 }}>
          {list === null && <p className="muted">Loading...</p>}
          {list && !list.length && <p className="muted">No templates yet. Import one above.</p>}
          {list &&
            list.map((t) => (
              <div className="card" key={t.id}>
                <div className="grow">
                  <input
                    className="f"
                    aria-label={`Rename ${t.name}`}
                    value={t.name}
                    onChange={(e) =>
                      setList((values) =>
                        values.map((value) =>
                          value.id === t.id ? { ...value, name: e.target.value } : value,
                        ),
                      )
                    }
                    onBlur={() => rename(t)}
                  />
                  {t.copied_from && <span className="tag">copy</span>}
                  <br />
                  <small>
                    {t.sections} sections · {t.items} items · {t.comments} comments ·{' '}
                    {t.source || 'No source file'}
                  </small>
                  <br />
                  <small>{new Date(t.created_at).toLocaleString()}</small>
                </div>
                <a className="btn" href={'/templates/' + t.id}>
                  Open
                </a>
                <button className="btn" onClick={() => remove(t)}>
                  Delete
                </button>
              </div>
            ))}
        </div>
      </main>
    </>
  )
}
