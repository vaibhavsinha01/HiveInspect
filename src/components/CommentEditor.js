'use client'
import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
const cfg = {
  ALLOWED_TAGS: ['p', 'a', 'b', 'strong', 'i', 'em', 'u', 'br', 'ul', 'ol', 'li', 'span', 'div'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
}
const clean = (h) => DOMPurify.sanitize(h, cfg)
const lost = () =>
  DOMPurify.removed.filter(
    (r) => !(r.element && ['BODY', 'HTML', 'HEAD'].includes(r.element.nodeName)),
  ).length
export default function CommentEditor({ value, onSave }) {
  const ref = useRef(),
    base = useRef(''),
    linkRange = useRef(null)
  const [linkOpen, setLinkOpen] = useState(false),
    [linkUrl, setLinkUrl] = useState(''),
    [notice, setNotice] = useState('')
  const [mode, setMode] = useState(() => {
    clean(value)
    return lost() ? 'html' : 'rich'
  })
  const [html, setHtml] = useState(value)
  useEffect(() => {
    setHtml(value)
    if (mode === 'rich' && ref.current) {
      ref.current.innerHTML = clean(value)
      base.current = ref.current.innerHTML
    }
  }, [mode, value])
  const cmd = (c, v) => {
    document.execCommand(c, false, v)
    ref.current.focus()
  }
  const link = () => {
    const selection = window.getSelection()
    linkRange.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null
    setLinkOpen(true)
  }
  const insertLink = (event) => {
    event.preventDefault()
    const selection = window.getSelection()
    if (linkRange.current && selection) {
      selection.removeAllRanges()
      selection.addRange(linkRange.current)
    }
    if (linkUrl.trim()) cmd('createLink', linkUrl.trim())
    setLinkOpen(false)
    setLinkUrl('')
  }
  const blur = () => {
    const h = ref.current.innerHTML
    if (h !== base.current) {
      base.current = h
      setHtml(h)
      onSave(h)
    }
  }
  const toHtml = () => {
    setHtml(ref.current.innerHTML)
    setMode('html')
  }
  const toRich = () => {
    clean(html)
    if (lost()) {
      setNotice(
        'This markup cannot be preserved in Visual mode. Keep editing this comment as HTML.',
      )
      return
    }
    setNotice('')
    setMode('rich')
  }
  const btn = (label, fn, t) => (
    <button
      type="button"
      className="btn mini"
      title={t}
      onMouseDown={(e) => e.preventDefault()}
      onClick={fn}
    >
      {label}
    </button>
  )
  return (
    <div className="ce">
      <div className="tb">
        {mode === 'rich' && (
          <>
            {btn(<b>B</b>, () => cmd('bold'), 'Bold')}
            {btn(<i>I</i>, () => cmd('italic'), 'Italic')}
            {btn('Link', link, 'Add link')}
            {btn('List', () => cmd('insertUnorderedList'), 'Bullet list')}
          </>
        )}
        <span className="grow" />
        {mode === 'rich' ? (
          <button type="button" className="btn mini" onClick={toHtml}>
            Edit HTML
          </button>
        ) : (
          <button type="button" className="btn mini" onClick={toRich}>
            Visual
          </button>
        )}
      </div>
      {linkOpen && (
        <form className="tools" onSubmit={insertLink}>
          <label>
            Link URL
            <input
              className="search"
              type="url"
              autoFocus
              required
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
          </label>
          <button className="btn mini" type="submit">
            Insert link
          </button>
          <button className="btn mini" type="button" onClick={() => setLinkOpen(false)}>
            Cancel
          </button>
        </form>
      )}
      {notice && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}
      {mode === 'rich' ? (
        <div
          ref={ref}
          className="rich"
          data-placeholder="No text in the Spectora export"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Comment text"
          onBlur={blur}
        />
      ) : (
        <textarea
          key={value}
          className="f"
          style={{ fontFamily: 'ui-monospace,monospace', fontSize: 13 }}
          rows={4}
          aria-label="Comment HTML"
          defaultValue={html}
          onBlur={(e) => {
            if (e.target.value !== html) {
              setHtml(e.target.value)
              onSave(e.target.value)
            }
          }}
        />
      )}
    </div>
  )
}
