/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TbAt, TbHash } from 'react-icons/tb'
import { mentionDirectory } from '@/utils/mentions'
import { tr } from '@/utils/t'

// Typing "@" in a comment, note, reply or chat box suggests colleagues; "#" suggests tags. It works in every multi-line text box of the
// app (and in inputs marked data-mention) without each screen doing anything. A box opts out with data-no-mention; code boxes
// (spellCheck off) are skipped. Choosing an item writes "@Full Name" / "#tag" into the box; colleagues are told when the text is saved.
const TRIGGER = /(^|[\s(])([@#])([\p{L}\p{N}_.'-]*(?: [\p{L}\p{N}_.'-]*)?)$/u
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const eligible = (el) => !!el && !el.readOnly && !el.disabled && !el.closest('[data-no-mention]') && ((el.tagName === 'TEXTAREA' && el.spellcheck !== false) || (el.tagName === 'INPUT' && el.hasAttribute('data-mention')))

function setValue(el, value, caret) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true })) // React sees a normal typing event
    el.setSelectionRange(caret, caret)
}

const MentionLayer = () => {
    const [st, setSt] = useState(null) // { el, kind, start, items, rect }
    const [active, setActive] = useState(0)
    const ref = useRef(null)
    ref.current = { st, active }

    useEffect(() => {
        const compute = (el) => {
            if (!eligible(el)) return setSt(null)
            const before = el.value.slice(0, el.selectionStart ?? 0)
            const m = TRIGGER.exec(before)
            if (!m) return setSt(null)
            const kind = m[2], q = norm(m[3])
            mentionDirectory().then((d) => {
                const now = el.value.slice(0, el.selectionStart ?? 0)
                if (now !== before) return
                const pool = kind === '@' ? d.staff.map((s) => ({ key: s.id, label: s.name, insert: `@${s.name} ` })) : d.tags.map((t) => ({ key: t, label: t, insert: `#${t.replace(/\s+/g, '-')} ` }))
                const starts = pool.filter((p) => norm(p.label).startsWith(q)), has = pool.filter((p) => !norm(p.label).startsWith(q) && norm(p.label).includes(q))
                const items = [...starts, ...has].slice(0, 6)
                if (!items.length) return setSt(null)
                setActive(0)
                setSt({ el, kind, start: before.length - m[0].length + m[1].length, end: before.length, items, rect: el.getBoundingClientRect() })
            })
        }
        const onInput = (e) => compute(e.target)
        const onKeyUp = (e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) compute(e.target) }
        const onKeyDown = (e) => {
            const { st: s, active: a } = ref.current
            if (!s || e.target !== s.el) return
            if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setActive((a + 1) % s.items.length) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActive((a - 1 + s.items.length) % s.items.length) }
            else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); pick(s, s.items[a]) }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setSt(null) }
        }
        const onOut = (e) => { if (ref.current.st && e.target === ref.current.st.el) setTimeout(() => setSt(null), 120) }
        document.addEventListener('input', onInput, true)
        document.addEventListener('keyup', onKeyUp, true)
        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('focusout', onOut, true)
        return () => { document.removeEventListener('input', onInput, true); document.removeEventListener('keyup', onKeyUp, true); document.removeEventListener('keydown', onKeyDown, true); document.removeEventListener('focusout', onOut, true) }
    }, [])

    const pick = (s, item) => {
        const { el } = s
        const v = el.value
        const next = v.slice(0, s.start) + item.insert + v.slice(s.end)
        setValue(el, next, s.start + item.insert.length)
        setSt(null)
        el.focus()
    }

    if (!st) return null
    const below = st.rect.bottom + 4 + st.items.length * 36 + 8 < window.innerHeight
    const style = { position: 'fixed', left: Math.max(8, Math.min(st.rect.left, window.innerWidth - 288)), width: 280, zIndex: 100000, ...(below ? { top: st.rect.bottom + 4 } : { bottom: window.innerHeight - st.rect.top + 4 }) }
    return createPortal(
        <div style={style} role="listbox" className="overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-600 dark:bg-gray-800" onMouseDown={(e) => e.preventDefault()}>
            <div className="px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{st.kind === '@' ? tr('Mention a colleague') : tr('Tags')}</div>
            {st.items.map((it, i) => (
                <button key={it.key} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => pick(st, it)} className={`flex h-9 w-full items-center gap-2 px-3 text-left text-sm ${i === active ? 'bg-primary/10 text-primary' : ''}`}>
                    <span className="text-gray-400">{st.kind === '@' ? <TbAt /> : <TbHash />}</span><span className="truncate font-semibold">{it.label}</span>
                </button>
            ))}
        </div>,
        document.body,
    )
}

export default MentionLayer

/** The suggestions for "@query" (colleagues) or "#query" (tags): [{ key, label, insert }]. Shared with the rich text editor. */
export async function mentionItems(kind, q) {
    const d = await mentionDirectory()
    const n = norm(q)
    const pool = kind === '@' ? d.staff.map((s) => ({ key: s.id, label: s.name, insert: `@${s.name} ` })) : d.tags.map((t) => ({ key: t, label: t, insert: `#${t.replace(/\s+/g, '-')} ` }))
    const starts = pool.filter((p) => norm(p.label).startsWith(n)), has = pool.filter((p) => !norm(p.label).startsWith(n) && norm(p.label).includes(n))
    return [...starts, ...has].slice(0, 6)
}
export const MENTION_TRIGGER = TRIGGER

/** The small list under the caret. `rect` = where to show it (below its bottom edge, or above its top edge when there is no room). */
export const MentionBox = ({ kind, items, active, setActive, onPick, rect }) => {
    const below = rect.bottom + 4 + items.length * 36 + 8 < window.innerHeight
    const style = { position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)), width: 280, zIndex: 100000, ...(below ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }) }
    return createPortal(
        <div style={style} role="listbox" className="overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-600 dark:bg-gray-800" onMouseDown={(e) => e.preventDefault()}>
            <div className="px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{kind === '@' ? tr('Mention a colleague') : tr('Tags')}</div>
            {items.map((it, i) => (
                <button key={it.key} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => onPick(it)} className={`flex h-9 w-full items-center gap-2 px-3 text-left text-sm ${i === active ? 'bg-primary/10 text-primary' : ''}`}>
                    <span className="text-gray-400">{kind === '@' ? <TbAt /> : <TbHash />}</span><span className="truncate font-semibold">{it.label}</span>
                </button>
            ))}
        </div>,
        document.body,
    )
}
