/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import { mentionDirectory } from '@/utils/mentions'
import { tr } from '@/utils/t'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A text with the colleagues named by @ and the #tags picked out in colour. Plain text stays plain. */
const Mentioned = ({ text, onDark = false }) => {
    const [dir, setDir] = useState(null)
    const t = String(text ?? '')
    const needs = t.includes('@') || t.includes('#')
    useEffect(() => { if (needs) mentionDirectory().then(setDir) }, [needs])
    if (!needs || !dir) return t
    const names = dir.staff.map((s) => s.name).filter(Boolean).sort((a, b) => b.length - a.length)
    const parts = []
    const re = new RegExp(`(^|[\\s(])(@(?:${names.map(esc).join('|') || '(?!)'})|#[\\p{L}\\p{N}_-]+)(?=$|[\\s.,;:!?)])`, 'giu')
    let last = 0, m
    while ((m = re.exec(t))) {
        const start = m.index + m[1].length
        if (start > last) parts.push(t.slice(last, start))
        const person = m[2][0] === '@' ? dir.staff.find((s) => s.name.toLowerCase() === m[2].slice(1).toLowerCase()) : null
        const canChat = person && person.id !== dir.me
        parts.push(<span key={start} role={canChat ? 'button' : undefined} tabIndex={canChat ? 0 : undefined} title={canChat ? tr('Chat with {name}', { name: person.name }) : undefined}
            onClick={canChat ? (e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('trt-chat-open', { detail: { staffId: person.id, name: person.name } })) } : undefined}
            onKeyDown={canChat ? (e) => { if (e.key === 'Enter') e.currentTarget.click() } : undefined}
            className={`${canChat ? 'cursor-pointer hover:underline ' : ''}${onDark ? 'font-bold underline' : m[2][0] === '@' ? 'rounded bg-primary/10 px-1 font-semibold text-primary' : 'font-semibold text-amber-600 dark:text-amber-400'}`}>{m[2]}</span>)
        last = start + m[2].length
    }
    if (last < t.length) parts.push(t.slice(last))
    return <>{parts}</>
}

export default Mentioned
