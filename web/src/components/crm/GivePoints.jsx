import { useEffect, useState } from 'react'
import { TbStar, TbMinus, TbPlus } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import cn from '@/utils/classNames'
import { api, notify, useCan } from '@/views/crm/kit/api'
import useMe from '@/utils/hooks/useMe'
import { tr } from '@/utils/t'

const QUICK = [1, 5, 10, 20]

/** The popup: how many points, to whom (when several people are possible) and why. `manage` also allows removing points. */
export const GivePointsDialog = ({ open, onClose, people = [], reason = '', relType, relId, link, manage, onGiven }) => {
    const [n, setN] = useState(5)
    const [minus, setMinus] = useState(false)
    const [why, setWhy] = useState('')
    const [to, setTo] = useState([])
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) { setN(5); setMinus(false); setWhy(reason || ''); setTo(people.length === 1 ? [people[0].id] : []) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
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
const GivePoints = ({ people = [], reason, relType, relId, link, className, label, onGiven }) => {
    const can = useCan()
    const meId = useMe()?.staffId
    const [open, setOpen] = useState(false)
    const manage = can('points', 'manage_points')
    if (!(can('points', 'give') || manage)) return null
    const list = people.filter((p) => p?.id && (manage || p.id !== meId))
    if (!list.length) return null
    return (
        <>
            <button type="button" title={tr('Give points')} aria-label={tr('Give points')} onClick={(e) => { e.stopPropagation(); setOpen(true) }} className={className || 'grid size-6 place-items-center rounded-md text-gray-500 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-gray-700'}><TbStar />{label && <span className="ml-1">{label}</span>}</button>
            {open && <GivePointsDialog open onClose={() => setOpen(false)} people={list} reason={reason} relType={relType} relId={relId} link={link} manage={manage} onGiven={onGiven} />}
        </>
    )
}

export default GivePoints
