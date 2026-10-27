/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ShareButton from '@/components/crm/ShareButton'
import { cleanHtml } from '@/lib/crm/richText'
import { STYLE } from '@/views/crm/kit/RichText'
import { mentionDirectory } from '@/utils/mentions'
import classNames from '@/utils/classNames'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Wraps "@Full Name" of colleagues and known "#tags" found in the text parts of safe HTML. */
function decorate(html, dir) {
    const names = dir.staff.filter((s) => s.name).sort((a, b) => b.name.length - a.name.length)
    const byName = new Map(names.map((s) => [norm(s.name), s]))
    const tags = new Set(dir.tags.map((t) => norm(t.replace(/\s+/g, '-'))))
    const re = new RegExp(`(^|[\\s(])(@(?:${names.map((s) => esc(s.name)).join('|') || '(?!)'})|#[\\p{L}\\p{N}_-]+)(?=$|[\\s.,;:!?)])`, 'giu')
    let inLink = 0
    return html.split(/(<[^>]+>)/g).map((part) => {
        if (part.startsWith('<')) { if (/^<a\b/i.test(part)) inLink++; else if (/^<\/a>/i.test(part)) inLink = Math.max(0, inLink - 1); return part }
        if (inLink || !part) return part
        return part.replace(re, (m, pre, tok) => {
            if (tok[0] === '@') { const p = byName.get(norm(tok.slice(1))); return p ? `${pre}<span class="mention" data-staff="${p.id}" title="Chat">${tok}</span>` : m }
            return tags.has(norm(tok.slice(1))) ? `${pre}<span class="hashtag">${tok}</span>` : m
        })
    }).join('')
}

/** A saved comment, note or description: rich text (or old plain text) shown safely, mentions and tags picked out; a mention opens the chat. */
const RichView = ({ html, className }) => {
    const clean = useMemo(() => cleanHtml(html), [html])
    const [dir, setDir] = useState(null)
    const needs = clean.includes('@') || clean.includes('#')
    useEffect(() => { if (needs) mentionDirectory().then(setDir) }, [needs])
    const out = useMemo(() => (dir && needs ? decorate(clean, dir) : clean), [clean, dir, needs])
    // a share icon appears over a link or an image when the pointer rests on it (and stays while its menu is open)
    const wrap = useRef(null), timer = useRef(null)
    const [hov, setHov] = useState(null)
    const pinned = useRef(false)
    useEffect(() => () => clearTimeout(timer.current), [])
    const over = (e) => {
        const el = e.target.closest?.('a[href], img')
        if (!el || !wrap.current?.contains(el)) return
        const img = el.tagName === 'IMG'
        const url = img ? el.currentSrc || el.src : el.href
        if (!/^(https?:|mailto:|tel:)/i.test(url || '')) return
        clearTimeout(timer.current)
        const r = el.getBoundingClientRect()
        setHov({ top: Math.max(r.top - 28, 4), left: Math.min(r.right + 22, window.innerWidth - 36), url, img, title: img ? el.alt || '' : el.textContent.trim().slice(0, 120), name: img ? (url.split('?')[0].split('/').pop() || 'image') : '' })
    }
    const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => { if (!pinned.current) setHov(null) }, 350) }
    if (!clean) return null
    const onClick = (e) => {
        const el = e.target.closest?.('[data-staff]')
        if (!el || !dir) return
        e.stopPropagation()
        const id = el.getAttribute('data-staff')
        if (id === dir.me) return
        window.dispatchEvent(new CustomEvent('trt-chat-open', { detail: { staffId: id, name: el.textContent.replace(/^@/, '') } }))
    }
    return (
        <>
            <div ref={wrap} className={classNames('rich-view break-words', STYLE, className)} onClick={onClick} onMouseOver={over} onMouseLeave={leave} dangerouslySetInnerHTML={{ __html: out }} />
            {hov && createPortal(
                <div className="fixed z-[125] rounded-lg bg-white/95 p-0.5 shadow-md dark:bg-gray-800/95" style={{ top: hov.top, left: hov.left - 30 }} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={leave}>
                    <ShareButton url={hov.url} title={hov.title} text={hov.title} file={hov.img ? { url: hov.url, name: hov.name } : undefined} onToggle={(o) => { pinned.current = o; if (!o) leave() }} />
                </div>, document.body)}
        </>
    )
}

export default RichView
