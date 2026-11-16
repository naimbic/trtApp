import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TbStar, TbMinus, TbPlus, TbPencil } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import cn from '@/utils/classNames'
import { api, notify, useCan } from '@/views/crm/kit/api'
import useMe from '@/utils/hooks/useMe'
import { mentionDirectory } from '@/utils/mentions'
import { tr } from '@/utils/t'

const QUICK = [1, 5, 10, 20]

/** The popup: how many points, to whom (when several people are possible) and why. `manage` also allows removing points. */
export const GivePointsDialog = ({ open, onClose, people = [], reason = '', relType, relId, link, manage, onGiven, startMinus = false, startN = 5 }) => {
    const [n, setN] = useState(startN)
    const [minus, setMinus] = useState(startMinus)
    const [why, setWhy] = useState('')
    const [to, setTo] = useState([])
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) { setN(startN); setMinus(startMinus); setWhy(reason || ''); setTo(people.length === 1 ? [people[0].id] : []) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    const save = async () => {
        if (!to.length) return notify('warning', tr('Choose who gets the points'))
        setBusy(true)
        try {
            await api('/api/crm/points', { method: 'POST', body: { staffIds: to, points: (minus ? -1 : 1) * Math.abs(Number(n) || 0), reason: why, relType, relId, link } })
            notify('success', minus ? tr('Points removed') : tr('Points given'))
            onGiven?.(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={440} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1 flex items-center gap-2 pr-10"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-xl text-amber-600"><TbStar /></span>{minus ? tr('Remove points') : tr('Give points')}</h5>
            <p className="mb-4 text-sm text-gray-500">{tr('Points reward good work. They are worth money and are paid with the salary.')}</p>
            <div className="flex flex-col gap-3">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">{tr('To')}</label>
                    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                        {people.map((p) => { const on = to.includes(p.id); return <button key={p.id} type="button" disabled={people.length === 1} onClick={() => setTo((x) => (on ? x.filter((i) => i !== p.id) : [...x, p.id]))} className={cn('rounded-full border px-3 py-1 text-sm font-semibold transition', on ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary dark:border-gray-600 dark:text-gray-300')}>{p.name}</button> })}
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">{tr('Points')}</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {manage && <button type="button" title={minus ? tr('Give points') : tr('Remove points')} aria-pressed={minus} onClick={() => setMinus((m) => !m)} className={cn('flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition', minus ? 'border-red-300 bg-red-50 text-red-600' : 'border-emerald-300 bg-emerald-50 text-emerald-600')}>{minus ? <TbMinus /> : <TbPlus />}</button>}
                        {QUICK.map((q) => <button key={q} type="button" onClick={() => setN(q)} className={cn('h-9 rounded-xl border px-3 text-sm font-bold transition', Number(n) === q ? (minus ? 'border-red-400 bg-red-50 text-red-600' : 'border-amber-400 bg-amber-50 text-amber-700') : 'border-gray-200 text-gray-600 hover:border-amber-300 dark:border-gray-600 dark:text-gray-300')}>{minus ? '−' : '+'}{q}</button>)}
                        <div className="w-24"><Input size="sm" type="number" min="1" value={n} onChange={(e) => setN(e.target.value)} /></div>
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">{minus ? tr('Why (the person sees it)') : tr('For what (the person sees it)')}</label>
                    <Input textArea rows={2} value={why} placeholder={tr('Finished in time, useful information, great work…')} onChange={(e) => setWhy(e.target.value)} />
                </div>
            </div>
            <div className="mt-5 flex justify-end gap-2"><Button size="sm" onClick={onClose}>{tr('Cancel')}</Button><Button size="sm" variant="solid" loading={busy} onClick={save}>{minus ? tr('Remove points') : tr('Give points')}</Button></div>
        </Dialog>
    )
}

/**
 * The star button that rewards somebody for a message, a comment, a task… Shown only to people allowed to give points, and never for one's own work.
 * people: [{ id, name }] (the staff who did the thing). relType / relId / link say what is rewarded; reason pre-fills the "for what".
 */
const GivePoints = ({ people = [], anyone = false, reason, relType, relId, link, className, label, onGiven }) => {
    const can = useCan()
    const meId = useMe()?.staffId
    const [pos, setPos] = useState(null) // the small menu under the star
    const [dialog, setDialog] = useState(null) // { minus, n }: the full popup
    const [busy, setBusy] = useState(false)
    const btn = useRef(null)
    const [all, setAll] = useState(null) // the whole team, when nobody in particular is known (`anyone`)
    const manage = can('points', 'manage_points')
    const known = people.filter((p) => p?.id)
    const open_ = !!(pos || dialog)
    useEffect(() => { if (open_ && anyone && !known.length && !all) mentionDirectory().then((d) => setAll(d.staff || [])) }, [open_]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!pos) return undefined
        const away = (e) => { if (!btn.current?.contains(e.target) && !e.target.closest?.('[data-points-menu]')) setPos(null) }
        const esc = (e) => { if (e.key === 'Escape') setPos(null) }
        const gone = () => setPos(null)
        document.addEventListener('pointerdown', away, true)
        document.addEventListener('keydown', esc)
        window.addEventListener('scroll', gone, true)
        return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', gone, true) }
    }, [pos])
    if (!(can('points', 'give') || manage)) return null
    const pickAny = anyone && !known.length
    const list = (pickAny ? all || [] : known).filter((p) => p?.id && (manage || p.id !== meId))
    if (!list.length && !pickAny) return null
    const toggle = (e) => {
        e.stopPropagation(); e.preventDefault()
        if (pos) return setPos(null)
        const r = btn.current.getBoundingClientRect()
        const w = 208, h = manage ? 150 : 112
        setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: r.bottom + h + 12 > window.innerHeight ? r.top - h - 6 : r.bottom + 6 })
    }
    // one person: the points go at once; several people: the popup asks who
    const quick = async (q) => {
        if (list.length !== 1) { setPos(null); return setDialog({ minus: false, n: q }) }
        setBusy(true)
        try {
            await api('/api/crm/points', { method: 'POST', body: { staffIds: [list[0].id], points: q, reason, relType, relId, link } })
            notify('success', tr('+{n} points for {name}', { n: q, name: list[0].name || '' }))
            onGiven?.()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false); setPos(null) }
    }
    const row = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700'
    return (
        <>
            <button ref={btn} type="button" title={tr('Give points')} aria-label={tr('Give points')} aria-haspopup="menu" aria-expanded={!!pos} onClick={toggle} className={cn(className || 'grid size-6 place-items-center rounded-md text-gray-500 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-gray-700', pos && 'text-amber-500')}><TbStar />{label && <span className="ml-1">{label}</span>}</button>
            {pos && createPortal(
                <div data-points-menu role="menu" onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 100002, width: 208 }} className="rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-600 dark:bg-gray-800">
                    <p className="mb-1.5 truncate px-1 text-xs font-semibold text-gray-500">{list.length === 1 ? tr('Points for {name}', { name: list[0].name || '' }) : tr('Give points')}</p>
                    <div className="mb-1 grid grid-cols-4 gap-1">
                        {QUICK.map((q) => <button key={q} type="button" role="menuitem" disabled={busy} onClick={() => quick(q)} className="h-8 rounded-lg border border-amber-200 bg-amber-50 text-sm font-bold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">+{q}</button>)}
                    </div>
                    <button type="button" role="menuitem" className={row} onClick={() => { setPos(null); setDialog({ minus: false, n: 5 }) }}><TbPencil className="text-gray-400" />{tr('Other amount…')}</button>
                    {manage && <button type="button" role="menuitem" className={cn(row, 'text-red-600')} onClick={() => { setPos(null); setDialog({ minus: true, n: 5 }) }}><TbMinus />{tr('Remove points…')}</button>}
                </div>, document.body)}
            {dialog && (!pickAny || all) && <GivePointsDialog open onClose={() => setDialog(null)} people={list} reason={reason} relType={relType} relId={relId} link={link} manage={manage} startMinus={dialog.minus} startN={dialog.n} onGiven={onGiven} />}
        </>
    )
}

export default GivePoints
