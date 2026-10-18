import { useEffect, useRef, useState } from 'react'
import classNames from '@/utils/classNames'

/**
 * A compact picker for the top bar: it shows only the chosen item and, when the pointer rests on it (or it is tapped / focused),
 * slides open to show the others. `items`: [{ key, node, label }]; `lead` is a small icon in front.
 */
const HoverPicker = ({ items, value, onChange, lead, label, className }) => {
    const [open, setOpen] = useState(false)
    const box = useRef(null)
    const current = items.find((i) => i.key === value) || items[0]
    const others = items.filter((i) => i.key !== current?.key)
    useEffect(() => {
        if (!open) return undefined
        const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
        document.addEventListener('pointerdown', away)
        return () => document.removeEventListener('pointerdown', away)
    }, [open])
    if (!current) return null
    const pick = (k) => { onChange(k); setOpen(false) }
    return (
        <div
            ref={box}
            role="group"
            aria-label={label}
            className={classNames('flex shrink-0 items-center rounded-full border border-gray-200 bg-white/60 p-0.5 transition-shadow dark:border-gray-600 dark:bg-gray-800/60', open && 'shadow-md', className)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={(e) => { if (!box.current?.contains(e.relatedTarget)) setOpen(false) }}
        >
            <button type="button" title={current.label} aria-label={current.label} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-gray-700 outline-hidden transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
                {lead}{current.node}
            </button>
            <div className={classNames('flex items-center gap-0.5 overflow-hidden transition-all duration-300 ease-out', open ? 'max-w-[34rem] opacity-100' : 'max-w-0 opacity-0')} aria-hidden={!open}>
                {others.map((i, n) => (
                    <button key={i.key} type="button" tabIndex={open ? 0 : -1} title={i.label} aria-label={i.label} onClick={() => pick(i.key)} style={{ transitionDelay: open ? `${n * 35}ms` : '0ms' }}
                        className={classNames('flex h-8 shrink-0 items-center rounded-full px-2.5 text-sm font-semibold text-gray-500 outline-hidden transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100', open ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0')}>
                        {i.node}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default HoverPicker
