'use client'
import { useEffect, useRef, useState } from 'react'
import CommentEditor from '@/components/CommentEditor'
export default function T({ params }) {
  const [t, setT] = useState(),
    [st, setSt] = useState(''),
    [bad, setBad] = useState(false),
    [q, setQ] = useState(''),
    [dup, setDup] = useState(false)
  const [warn, setWarn] = useState(false),
    original = useRef({})
  const saveQueues = useRef(new Map())
  useEffect(() => {
    fetch('/api/templates/' + params.id)
      .then((r) => r.json())
      .then((d) => {
        if (d.tree)
          original.current = Object.fromEntries(
            d.tree.flatMap((s) => s.items.flatMap((i) => i.comments.map((c) => [c.id, c.body]))),
          )
        setT(d)
      })
      .catch(() => setT({ error: 'Could not load template' }))
  }, [params.id])
  useEffect(() => {
    const handler = (e) => {
      if (warn) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [warn])
  const apply = (id, p) =>
    setT((o) => ({
      ...o,
      ...(o.id === id ? p : {}),
      tree: o.tree.map((s) => ({
        ...s,
        ...(s.id === id ? p : {}),
        items: s.items.map((i) => ({
          ...i,
          ...(i.id === id ? p : {}),
          comments: i.comments.map((c) => (c.id === id ? { ...c, ...p } : c)),
        })),
      })),
    }))
  const save = async (table, id, key, orig, e, force = false) => {
    const v = typeof e === 'string' ? e : e.target.value
    const previous = saveQueues.current.get(id) || Promise.resolve()
    const operation = previous
      .catch(() => {})
      .then(async () => {
        if (!force && v === orig) return
        setSt('Saving...')
        setBad(false)
        setWarn(true)
        try {
          const r = await fetch(`/api/nodes/${table}/${id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ [key]: v }),
          })
          if (!r.ok) throw new Error('Save failed')
          apply(id, { [key]: v })
          setSt('Saved')
          setWarn(false)
        } catch {
          setSt('Save failed, try again')
          setBad(true)
          setWarn(true)
        }
      })
    saveQueues.current.set(id, operation)
    await operation
    if (saveQueues.current.get(id) === operation) saveQueues.current.delete(id)
  }
  const copy = async () => {
    setDup(true)
    try {
      const r = await fetch('/api/templates/' + params.id, { method: 'POST' }),
        d = await r.json()
      if (!r.ok) throw 0
      location.href = '/templates/' + d.id
    } catch {
      setSt('Duplicate failed')
      setBad(true)
      setDup(false)
    }
  }
  const fold = (v) => document.querySelectorAll('details.sec').forEach((d) => (d.open = v))
  if (!t) return <main className="wrap muted">Loading...</main>
  if (t.error)
    return (
      <main className="wrap">
        <p className="err">{t.error}</p>
        <a href="/">Back to templates</a>
      </main>
    )
  const k = q.trim().toLowerCase(),
    has = (x) => !k || x.toLowerCase().includes(k)
  const tree = t.tree
    .map((s) => ({
      ...s,
      items: s.items
        .map((i) => ({
          ...i,
          comments: i.comments.filter((c) =>
            has(s.name + ' ' + i.name + ' ' + c.name + ' ' + c.body),
          ),
        }))
        .filter((i) => i.comments.length || has(s.name + ' ' + i.name)),
    }))
    .filter((s) => s.items.length)
  const imported = Number(t.issues[0]?.msg.match(/(\d+) comments?/)?.[1] || 0),
    read = Number(t.issues[0]?.msg.match(/Read (\d+)/)?.[1] || 0),
    dropped = Math.max(0, read - imported),
    mismatch = read !== imported,
    matchCount = tree.reduce((n, s) => n + s.items.reduce((m, i) => m + i.comments.length, 0), 0)
  return (
    <>
      <header className="bar">
        <div className="wrap">
          <a href="/">&larr; Templates</a>
          <input
            key={t.id}
            className="f title grow"
            aria-label="Template name"
            defaultValue={t.name}
            onBlur={(e) => save('templates', t.id, 'name', t.name, e)}
          />
          <span className={'status' + (bad ? ' err' : '')} role="status">
            {st}
          </span>
          <button className="btn primary" onClick={copy} disabled={dup}>
            {dup ? 'Duplicating...' : 'Duplicate'}
          </button>
        </div>
      </header>
      <main className="wrap">
        <p className={mismatch ? 'err' : 'muted'} role="status">
          {read} rows read → {imported} comments imported, {dropped} dropped
        </p>
        <details className="report">
          <summary>
            Import report ({t.issues.length}) &middot; Source: {t.source}
          </summary>
          <ul>
            {t.issues.map((x, i) => (
              <li key={i}>
                {x.row ? `Row ${x.row}: ` : ''}
                {x.msg}
              </li>
            ))}
          </ul>
        </details>
        <div className="tools">
          <label className="grow">
            Search sections, items, comments
            <input
              className="search"
              aria-label="Search sections, items, comments"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <small className="muted">{matchCount} matching comments</small>
          </label>
          <button className="btn" onClick={() => fold(true)}>
            Expand all
          </button>
          <button className="btn" onClick={() => fold(false)}>
            Collapse all
          </button>
        </div>
        {!tree.length && <p className="muted">Nothing matches your search.</p>}
        {tree.map((s) => (
          <details className="sec" open key={s.id}>
            <summary>
              <input
                className="f title grow"
                aria-label="Section name"
                defaultValue={s.name}
                onClick={(e) => e.preventDefault()}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                onBlur={(e) => save('sections', s.id, 'name', s.name, e)}
              />
              <span className="tag">
                {s.items.length} {s.items.length === 1 ? 'item' : 'items'}
              </span>
            </summary>
            {s.items.map((i) => (
              <div className="item" key={i.id}>
                <input
                  className="f"
                  style={{ fontWeight: 700, color: '#0F172A' }}
                  aria-label="Item name"
                  defaultValue={i.name}
                  onBlur={(e) => save('items', i.id, 'name', i.name, e)}
                />
                {i.comments.map((c) => {
                  const kind = Object.entries(c.extra).find(([x]) => x.startsWith('Comment Type'))
                  return (
                    <div className="cm" key={c.id}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          className="f"
                          style={{ fontWeight: 600 }}
                          placeholder="Comment name"
                          aria-label="Comment name"
                          defaultValue={c.name}
                          onBlur={(e) => save('comments', c.id, 'name', c.name, e)}
                        />
                        {kind && <span className="tag">{kind[1]}</span>}
                      </div>
                      <CommentEditor
                        value={c.body}
                        onSave={(v) => save('comments', c.id, 'body', c.body, v)}
                      />
                      <button
                        className="btn mini"
                        onClick={() =>
                          save('comments', c.id, 'body', c.body, original.current[c.id] ?? '', true)
                        }
                      >
                        Revert comment
                      </button>
                      {Object.keys(c.extra).length > 0 && (
                        <details>
                          <summary>Spectora settings</summary>
                          {Object.entries(c.extra).map(([x, v]) => (
                            <div key={x}>
                              <b>{x}:</b> {v}
                            </div>
                          ))}
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </details>
        ))}
      </main>
    </>
  )
}
