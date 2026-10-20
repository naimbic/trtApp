/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbCash, TbReceipt2, TbChartLine, TbUsers, TbUserPlus, TbTrophy, TbFileText, TbChecklist, TbPlus, TbTrash, TbBuilding, TbUser } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Segment from '@/components/ui/Segment'
import RelationSelect from '../kit/RelationSelect'
import { api, notify } from '../kit/api'
import { GOAL_KINDS, PERIODS, kindOf, suggestName, defaultSteps } from '@/lib/crm/goalsCalc'
import { tr } from '@/utils/t'

export const KIND_ICON = { income: TbCash, invoiced: TbReceipt2, profit: TbChartLine, customers: TbUsers, leads: TbUserPlus, converted: TbTrophy, contracts: TbFileText, tasks: TbChecklist }
const GROUPS = ['Money', 'Customers and leads', 'Work']
const blank = { subject: '', description: '', kind: 'income', achievement: '', period: 'month', startDate: '', endDate: '', staffId: null, forStaff: false, steps: [] }

const Label = ({ children, hint }) => <div className="mb-1.5 flex items-baseline justify-between gap-2"><label className="form-label block">{children}</label>{hint && <span className="text-xs text-gray-400">{hint}</span>}</div>

/** Create or edit a goal: what to reach, the target, the period, who it is for, and the steps on the way. goal = null creates one. */
const GoalDialog = ({ open, goal, preset, symbol, onClose, onSaved }) => {
    const [v, setV] = useState(blank)
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (!open) return
        setV(goal ? {
            subject: goal.subject, description: goal.description || '', kind: goal.kind || 'income', achievement: goal.target || '', period: goal.period || 'month',
            startDate: goal.period === 'fixed' ? dayjs(goal.startDate).format('YYYY-MM-DD') : '', endDate: goal.period === 'fixed' ? dayjs(goal.endDate).format('YYYY-MM-DD') : '',
            staffId: goal.staffId, forStaff: !!goal.staffId, steps: (goal.steps || []).map((s) => ({ id: s.id, title: s.title, at: s.at ?? '', due: s.due || '', done: !!s.done })),
        } : { ...blank, ...(preset || {}) })
    }, [open, goal, preset])
    const kind = kindOf(v.kind)
    const set = (patch) => setV((x) => ({ ...x, ...patch }))
    const unit = kind?.unit === 'money' ? symbol || '' : tr(kind?.label || '').toLowerCase()
    const setStep = (i, patch) => set({ steps: v.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
    const save = async () => {
        if (!(Number(v.achievement) > 0)) return notify('warning', tr('Enter the target to reach'))
        if (v.period === 'fixed' && (!v.startDate || !v.endDate)) return notify('warning', tr('Choose the first and the last day'))
        if (v.forStaff && !v.staffId) return notify('warning', tr('Choose the team member'))
        setBusy(true)
        try {
            const steps = v.steps.filter((s) => s.title.trim()).map((s, i) => ({ id: s.id || `s${i + 1}`, title: s.title.trim(), at: s.at === '' ? null : Number(s.at), due: s.due || null, done: !!s.done }))
            const body = {
                subject: v.subject.trim() || suggestName(v.kind, v.period, v.achievement), description: v.description, kind: v.kind, achievement: Number(v.achievement), period: v.period,
                startDate: v.period === 'fixed' ? v.startDate : null, endDate: v.period === 'fixed' ? v.endDate : null, staffId: kind?.staff && v.forStaff ? v.staffId : null, stepsRaw: steps.length ? JSON.stringify(steps) : '',
            }
            await api(goal ? `/api/crm/goals/${goal.id}` : '/api/crm/goals', { method: goal ? 'PATCH' : 'POST', body })
            notify('success', goal ? tr('Goal saved') : tr('Goal created')); onSaved?.(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={760} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4 pr-10">{goal ? tr('Edit goal') : tr('New goal')}</h5>
            <div className="max-h-[66vh] overflow-y-auto pr-1">
                <Label>{tr('What do you want to reach?')}</Label>
                <div className="mb-5 flex flex-col gap-2.5">
                    {GROUPS.map((g) => (
                        <div key={g}>
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{tr(g)}</div>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                {GOAL_KINDS.filter((k) => k.group === g).map((k) => {
                                    const Icon = KIND_ICON[k.key]
                                    const on = v.kind === k.key
                                    return (
                                        <button key={k.key} type="button" onClick={() => set({ kind: k.key, ...(!k.staff ? { forStaff: false, staffId: null } : {}) })} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${on ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                                            <Icon className="shrink-0 text-xl" /><span className="min-w-0"><b className="block truncate">{tr(k.label)}</b><small className="block truncate text-[11px] text-gray-400">{tr(k.hint)}</small></span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <Label>{tr('Target')}</Label>
                        <Input type="number" min="0" step={kind?.unit === 'money' ? '0.01' : '1'} value={v.achievement} onChange={(e) => set({ achievement: e.target.value })} suffix={<span className="text-xs text-gray-400">{unit}</span>} placeholder={kind?.unit === 'money' ? '100000' : '10'} />
                    </div>
                    <div>
                        <Label>{tr('For')}</Label>
                        <div className="flex items-center gap-2">
                            <Segment size="sm" value={v.forStaff ? 'staff' : 'company'} onChange={(x) => { const t = Array.isArray(x) ? x[0] : x; if (t) set({ forStaff: t === 'staff' && !!kind?.staff, ...(t === 'company' ? { staffId: null } : {}) }) }}>
                                <Segment.Item value="company"><span className="inline-flex items-center gap-1"><TbBuilding />{tr('Whole company')}</span></Segment.Item>
                                <Segment.Item value="staff" disabled={!kind?.staff}><span className="inline-flex items-center gap-1"><TbUser />{tr('A team member')}</span></Segment.Item>
                            </Segment>
                        </div>
                        {v.forStaff && <div className="mt-2"><RelationSelect resource="staff" value={v.staffId} onChange={(id) => set({ staffId: id })} placeholder={tr('Choose the team member')} /></div>}
                        {!kind?.staff && <p className="mt-1 text-xs text-gray-400">{tr('This goal is measured for the whole company.')}</p>}
                    </div>
                </div>

                <div className="mb-5">
                    <Label hint={PERIODS.find((p) => p.key === v.period) && tr(PERIODS.find((p) => p.key === v.period).hint)}>{tr('Period')}</Label>
                    <Segment size="sm" value={v.period} onChange={(x) => { const t = Array.isArray(x) ? x[0] : x; if (t) set({ period: t }) }}>
                        {PERIODS.map((p) => <Segment.Item key={p.key} value={p.key}>{tr(p.label)}</Segment.Item>)}
                    </Segment>
                    {v.period === 'fixed' && (
                        <div className="mt-2 grid max-w-md grid-cols-2 gap-3">
                            <Input type="date" value={v.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                            <Input type="date" value={v.endDate} min={v.startDate || undefined} onChange={(e) => set({ endDate: e.target.value })} />
                        </div>
                    )}
                </div>

                <div className="mb-5">
                    <Label hint={tr('Milestones complete by themselves; action steps you tick off')}>{tr('Steps (the process)')}</Label>
                    <div className="flex flex-col gap-2">
                        {v.steps.map((s, i) => (
                            <div key={s.id || i} className="grid grid-cols-[1fr_110px_136px_auto] items-center gap-2">
                                <Input size="sm" value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder={tr('Step, for example: Send the 20 pending offers')} />
                                <Input size="sm" type="number" value={s.at} onChange={(e) => setStep(i, { at: e.target.value })} placeholder={tr('Reached at')} title={tr('Leave empty for an action step you tick off')} />
                                <Input size="sm" type="date" value={s.due} onChange={(e) => setStep(i, { due: e.target.value })} title={tr('Due date')} />
                                <button type="button" className="text-gray-400 hover:text-red-500" aria-label={tr('Remove')} onClick={() => set({ steps: v.steps.filter((_, j) => j !== i) })}><TbTrash /></button>
                            </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                            <Button size="xs" icon={<TbPlus />} onClick={() => set({ steps: [...v.steps, { id: '', title: '', at: '', due: '', done: false }] })}>{tr('Add a step')}</Button>
                            <Button size="xs" variant="plain" disabled={!(Number(v.achievement) > 0)} onClick={() => set({ steps: [...v.steps, ...defaultSteps(v.achievement).map((s) => ({ ...s, title: tr('{n}% of the target', { n: Math.round((s.at / Number(v.achievement)) * 100) }) }))] })}>{tr('Add milestones at 25 / 50 / 75 / 100%')}</Button>
                        </div>
                    </div>
                </div>

                <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><Label hint={tr('Optional')}>{tr('Name')}</Label><Input value={v.subject} onChange={(e) => set({ subject: e.target.value })} placeholder={suggestName(v.kind, v.period, v.achievement)} /></div>
                    <div><Label hint={tr('Optional')}>{tr('Note')}</Label><Input value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
                </div>
            </div>
            <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button><Button variant="solid" loading={busy} onClick={save}>{goal ? tr('Save changes') : tr('Create goal')}</Button></div>
        </Dialog>
    )
}

export default GoalDialog
