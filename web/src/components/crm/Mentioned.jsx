/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import { mentionDirectory } from '@/utils/mentions'
import { tr } from '@/utils/t'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
const TAIL = /[.,;:!?)\]]+$/

/** A link in a text: opens in a new browser tab and never triggers the row it sits in. */
const Link = ({ url, onDark }) => {
    const tail = TAIL.exec(url)?.[0] || ''
    const clean = tail ? url.slice(0, -tail.length) : url
    return <><a href={/^www\./i.test(clean) ? `https://${clean}` : clean} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={onDark ? 'underline' : 'text-primary underline hover:opacity-80'}>{clean}</a>{tail}</>
}

/** A text with the colleagues named by @ and the #tags picked out in colour, and every web address clickable (new tab). Plain text stays plain. */
const Mentioned = ({ text, onDark = false }) => {
    const [dir, setDir] = useState(null)
    const t = String(text ?? '')
    const needs = t.includes('@') || t.includes('#')
    const links = /(?:https?:\/\/|www\.)/i.test(t)
    useEffect(() => { if (needs) mentionDirectory().then(setDir) }, [needs])
    if (!links && (!needs || !dir)) return t
    // the text between the web addresses, with the mentions and tags picked out of it
    const mentions = (seg, key) => {
        if (!needs || !dir || !seg) return seg
        const names = dir.staff.map((s) => s.name).filter(Boolean).sort((a, b) => b.length - a.length)
        const parts = []
        const re = new RegExp(`(^|[\\s(])(@(?:${names.map(esc).join('|') || '(?!)'})|#[\\p{L}\\p{N}_-]+)(?=$|[\\s.,;:!?)])`, 'giu')
        let last = 0, m
        while ((m = re.exec(seg))) {
            const start = m.index + m[1].length
            if (start > last) parts.push(seg.slice(last, start))
            const person = m[2][0] === '@' ? dir.staff.find((s) => s.name.toLowerCase() === m[2].slice(1).toLowerCase()) : null
            const canChat = person && person.id !== dir.me
            parts.push(<span key={`${key}-${start}`} role={canChat ? 'button' : undefined} tabIndex={canChat ? 0 : undefined} title={canChat ? tr('Chat with {name}', { name: person.name }) : undefined}
                onClick={canChat ? (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('trt-chat-open', { detail: { staffId: person.id, name: person.name } })) } : undefined}
                onKeyDown={canChat ? (e) => { if (e.key === 'Enter') e.currentTarget.click() } : undefined}
                className={`${canChat ? 'cursor-pointer hover:underline ' : ''}${onDark ? 'font-bold underline' : m[2][0] === '@' ? 'rounded bg-primary/10 px-1 font-semibold text-primary' : 'font-semibold text-amber-600 dark:text-amber-400'}`}>{m[2]}</span>)
            last = start + m[2].length
        }
        if (last < seg.length) parts.push(seg.slice(last))
        return parts
    }
    const out = []
    let last = 0, m
    URL_RE.lastIndex = 0
    while ((m = URL_RE.exec(t))) {
        if (m.index > last) out.push(<span key={`t${last}`}>{mentions(t.slice(last, m.index), last)}</span>)
        out.push(<Link key={`u${m.index}`} url={m[0]} onDark={onDark} />)
        last = m.index + m[0].length
    }
    if (last < t.length) out.push(<span key={`t${last}`}>{mentions(t.slice(last), last)}</span>)
    return <>{out}</>
}

export default Mentioned
