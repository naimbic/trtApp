/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useMemo, useState } from 'react'
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
    if (!clean) return null
    const onClick = (e) => {
        const el = e.target.closest?.('[data-staff]')
        if (!el || !dir) return
        e.stopPropagation()
        const id = el.getAttribute('data-staff')
        if (id === dir.me) return
        window.dispatchEvent(new CustomEvent('trt-chat-open', { detail: { staffId: id, name: el.textContent.replace(/^@/, '') } }))
    }
    return <div className={classNames('rich-view break-words', STYLE, className)} onClick={onClick} dangerouslySetInnerHTML={{ __html: out }} />
}

export default RichView
