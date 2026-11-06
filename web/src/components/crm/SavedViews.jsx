import { useCallback, useEffect, useRef, useState } from 'react'
import { TbBookmark, TbBookmarkFilled, TbCheck, TbShare, TbTrash, TbUsers } from 'react-icons/tb'
import { api, notify } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

const same = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {})
const clean = (s) => JSON.parse(JSON.stringify(s || {}))

/**
 * "Views" of a list page: save the filters / search / sort as a named view (private or shared with the team), apply one with a click.
 * page: a short key (leads, tasks...) · getState(): the page's filters as plain JSON · applyState(state): puts them back.
 */
const SavedViews = ({ page, getState, applyState, className = '' }) => {
    const [open, setOpen] = useState(false)
    const [views, setViews] = useState(null)
    const [name, setName] = useState('')
    const [shared, setShared] = useState(false)
    const box = useRef(null)
    const load = useCallback(() => { api(`/api/crm/saved-views?page=${page}`).then((d) => setViews(d.list)).catch(() => setViews([])) }, [page])
    useEffect(() => { load() }, [load])
    useEffect(() => {
        if (!open) return undefined
        const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
        const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
    }, [open])
    const now = clean(getState())
    const active = (views || []).find((v) => same(v.state, now))
    const save = async () => {
        if (!name.trim()) return
        try { await api('/api/crm/saved-views', { method: 'POST', body: { page, name, state: now, shared } }); notify('success', tr('View saved')); setName(''); setShared(false); load() } catch (e) { notify('danger', e.message) }
    }
    const patch = async (v, body) => { try { await api(`/api/crm/saved-views/${v.id}`, { method: 'PATCH', body }); load() } catch (e) { notify('danger', e.message) } }
    const remove = async (v) => { try { await api(`/api/crm/saved-views/${v.id}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) } }
    return (
        <div ref={box} className={`relative ${className}`}>
            <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition ${active ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'}`}>
                {active ? <TbBookmarkFilled /> : <TbBookmark />}<span className="max-w-[9rem] truncate">{active ? active.name : tr('Views')}</span>
            </button>
            {open && (
                <div role="dialog" aria-label={tr('Saved views')} className="absolute end-0 z-40 mt-1.5 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-600 dark:bg-gray-800">
                    <div className="max-h-60 overflow-y-auto">
                        {(views || []).map((v) => (
                            <div key={v.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${active?.id === v.id ? 'bg-primary/5' : ''}`}>
                                <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-start font-semibold" onClick={() => { applyState(clean(v.state)); setOpen(false) }}>
                                    {active?.id === v.id ? <TbCheck className="shrink-0 text-primary" /> : <span className="w-4 shrink-0" />}
                                    <span className="truncate">{v.name}</span>
                                    {v.shared && <TbUsers className="shrink-0 text-xs text-gray-400" title={v.mine ? tr('Shared with the team') : `${tr('Shared by')} ${v.owner}`} />}
                                </button>
                                {v.mine && <button type="button" title={v.shared ? tr('Stop sharing') : tr('Share with the team')} aria-label={tr('Share with the team')} className={`grid size-7 place-items-center rounded-md ${v.shared ? 'text-primary' : 'text-gray-300 hover:text-primary'}`} onClick={() => patch(v, { shared: !v.shared })}><TbShare /></button>}
                                {v.mine && <button type="button" title={tr('Delete')} aria-label={tr('Delete')} className="grid size-7 place-items-center rounded-md text-gray-300 hover:text-red-500" onClick={() => remove(v)}><TbTrash /></button>}
                            </div>
                        ))}
                        {views && !views.length && <p className="px-2 py-3 text-center text-xs text-gray-400">{tr('No saved view yet. Set the filters you like, then save them below.')}</p>}
                    </div>
                    <div className="mt-1 border-t border-gray-100 pt-2 dark:border-gray-700" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}>
                        <input className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-900" placeholder={tr('Name this view…')} aria-label={tr('Name this view…')} value={name} onChange={(e) => setName(e.target.value)} />
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1.5 text-xs text-gray-500"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />{tr('Share with the team')}</label>
                            <button type="button" disabled={!name.trim()} onClick={save} className="h-8 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-40">{tr('Save current')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SavedViews
