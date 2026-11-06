import { useCallback, useState } from 'react'
import { TbX } from 'react-icons/tb'
import Dropdown from '@/components/ui/Dropdown'
import { api, notify } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

/** The ticked rows of a list: toggle one, tick all, clear. */
export const useSelection = () => {
    const [ids, setIds] = useState(() => new Set())
    const toggle = useCallback((id) => setIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n }), [])
    const set = useCallback((list, on) => setIds((s) => { const n = new Set(s); for (const id of list) { if (on) n.add(id); else n.delete(id) } return n }), [])
    const clear = useCallback(() => setIds(new Set()), [])
    return { ids, count: ids.size, has: (id) => ids.has(id), toggle, set, clear, list: () => [...ids] }
}

/** A small checkbox for a row or a header (stops the click from opening the row). */
export const TickBox = ({ checked, onChange, label }) => (
    <input type="checkbox" aria-label={label || tr('Select')} className="size-4 cursor-pointer rounded border-gray-300 accent-[var(--primary,#4f46e5)]" checked={checked} onChange={(e) => onChange(e.target.checked)} onClick={(e) => e.stopPropagation()} />
)

/** Runs a bulk call and says what happened (how many worked, which failed and why). Returns the answer. */
export async function runBulk(url, body, doneText) {
    try {
        const r = await api(url, { method: 'POST', body })
        if (r.failed?.length) notify('warning', `${tr('{n} done', { n: r.done })} · ${tr('{n} could not be changed', { n: r.failed.length })}: ${r.failed[0].error}`)
        else notify('success', doneText ? doneText(r.done) : tr('{n} done', { n: r.done }))
        return r
    } catch (e) { notify('danger', e.message); return null }
}

/**
 * The bar that appears at the bottom when rows are ticked: how many, then the actions.
 * actions: [{ label, icon, onClick? , options?: [{ label, onClick }], danger? }]  (options = a small menu)
 */
const BulkBar = ({ count, actions, onClear, busy }) => {
    if (!count) return null
    return (
        <div role="toolbar" aria-label={tr('Actions for the selected rows')} className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-1rem)] flex-wrap items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-2xl dark:border-gray-600 dark:bg-gray-800">
            <span className="px-1 text-sm font-bold">{tr('{n} selected', { n: count })}</span>
            <span className="h-5 w-px bg-gray-200 dark:bg-gray-600" />
            {actions.map((a) => {
                const cls = `inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition disabled:opacity-50 ${a.danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'}`
                if (a.options) {
                    return (
                        <Dropdown key={a.label} placement="top-start" renderTitle={<span role="button" tabIndex={0} className={`${cls} cursor-pointer`}>{a.icon}{a.label}</span>}>
                            <div className="max-h-64 overflow-y-auto">
                                {a.options.map((o) => <Dropdown.Item key={o.label} eventKey={o.label} onClick={() => o.onClick()}>{o.color && <span className="me-2 inline-block size-2.5 rounded-full" style={{ background: o.color }} />}{o.label}</Dropdown.Item>)}
                            </div>
                        </Dropdown>
                    )
                }
                return <button key={a.label} type="button" disabled={busy} className={cls} onClick={a.onClick}>{a.icon}{a.label}</button>
            })}
            <button type="button" aria-label={tr('Clear the selection')} title={tr('Clear the selection')} className="grid size-8 place-items-center rounded-lg text-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onClear}><TbX /></button>
        </div>
    )
}

export default BulkBar
