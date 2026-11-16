import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { TbStar, TbTrophy, TbCash, TbCalendarStats, TbTrash, TbSettings, TbChecklist, TbMessage, TbBulb, TbPlus } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { GivePointsDialog } from '@/components/crm/GivePoints'
import cn from '@/utils/classNames'
import { api, notify } from '../kit/api'
import confirmDelete from '@/components/crm/useConfirm'
import { tr } from '@/utils/t'

const num = (n) => Math.round(Number(n || 0)).toLocaleString('fr-FR').replace(/ | /g, ' ')
const cash = (n, cur) => `${(Math.round(Number(n || 0) * 100) / 100).toLocaleString('fr-FR').replace(/ | /g, ' ')} ${cur || ''}`.trim()
const initials = (s = '') => s.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()
const Stat = ({ icon, tone, label, value, sub }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl', tone)}>{icon}</span>
        <div className="min-w-0"><div className="text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">{value}</div><div className="truncate text-xs text-gray-500">{label}</div>{sub && <div className="truncate text-xs font-semibold text-emerald-600">{sub}</div>}</div>
    </div>
)
const Pts = ({ n }) => <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums', n < 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700')}>{n > 0 ? '+' : ''}{num(n)}</span>
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>

const Line = ({ p, who, onDelete }) => (
    <li className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-2.5 py-2 text-sm dark:bg-gray-700/40">
        <Pts n={p.points} />
        <div className="min-w-0 flex-1">
            <div className="break-words text-gray-800 dark:text-gray-100">{who && <b>{p.staff?.name || tr('Someone')} · </b>}{p.reason ? (p.kind === 'task_on_time' ? p.reason.replace('Task finished in time', tr('Task finished in time')) : p.reason) : tr('Good work')}</div>
            <div className="text-xs text-gray-400">{dayjs(p.at).format('DD MMM YYYY, HH:mm')}{p.by ? ` · ${p.by === 'Automatic' ? tr('Automatic') : p.by}` : ''}{p.paid ? ` · ${tr('paid')}` : ''}{p.link && <> · <Link to={p.link} className="font-semibold text-primary hover:underline">{tr('Open')}</Link></>}</div>
        </div>
        {onDelete && !p.paid && <button type="button" title={tr('Delete')} aria-label={tr('Delete')} onClick={() => onDelete(p)} className="grid size-6 shrink-0 place-items-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500"><TbTrash /></button>}
    </li>
)

const PointsPage = () => {
    const [d, setD] = useState(null)
    const [give, setGive] = useState(false)
    const [cfg, setCfg] = useState(null)
    const [busy, setBusy] = useState(false)
    const load = useCallback(async () => {
        try { const r = await api('/api/crm/points'); setD(r); setCfg(r.settings) } catch (e) { notify('danger', e.message) }
    }, [])
    useEffect(() => { load() }, [load])
    if (!d) return <Container><div className="py-16 text-center text-gray-400">{tr('Loading…')}</div></Container>
    const { me, can, currency } = d
    const del = (p) => confirmDelete(tr('Delete these points?'), async () => { try { await api(`/api/crm/points/${p.id}`, { method: 'DELETE' }); notify('success', tr('Deleted')); load() } catch (e) { notify('danger', e.message) } }, { text: tr('The entry is removed and the total of the person changes.') })
    const saveCfg = async () => {
        setBusy(true)
        try { setCfg(await api('/api/crm/points/settings', { method: 'PUT', body: cfg })); notify('success', tr('Saved')); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const toPay = d.board.filter((r) => r.unpaid > 0)
    const rules = [
        ...(d.settings.taskOnTime > 0 ? [[<TbChecklist key="t" />, tr('Finish a task on or before its due date'), `+${d.settings.taskOnTime}`]] : []),
        [<TbMessage key="m" />, tr('Share valuable information in a message or a comment'), tr('given by a colleague')],
        [<TbBulb key="b" />, tr('Do something good for a client or for the team'), tr('given by a colleague')],
    ]
    return (
        <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="flex items-center gap-2"><TbStar className="text-amber-500" />{tr('Points')}</h3><p className="text-sm text-gray-500">{tr('Rewards for good work: finished in time, useful information, things done well. Points are paid with the salary.')}</p></div>
                {can.give && <Button variant="solid" icon={<TbPlus />} onClick={() => setGive(true)}>{can.manage ? tr('Give or remove points') : tr('Give points')}</Button>}
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={<TbCalendarStats />} tone="bg-amber-100 text-amber-600" label={tr('My points this month')} value={num(me.month)} />
                <Stat icon={<TbStar />} tone="bg-violet-100 text-violet-600" label={tr('My points in total')} value={num(me.total)} />
                <Stat icon={<TbCash />} tone="bg-emerald-100 text-emerald-600" label={tr('Waiting to be paid')} value={num(me.unpaid)} sub={d.settings.value > 0 ? `= ${cash(me.money, currency)}` : null} />
                <Stat icon={<TbTrophy />} tone="bg-sky-100 text-sky-600" label={tr('My rank this month')} value={(() => { const i = d.board.findIndex((r) => r.id === me.staffId); return i >= 0 && me.month > 0 ? `#${i + 1}` : '–' })()} />
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-3">
                <Card>
                    <h5 className="mb-3 flex items-center gap-2"><TbTrophy className="text-amber-500" />{tr('Ranking of the month')}</h5>
                    {d.board.some((r) => r.month !== 0 || r.total !== 0) ? (
                        <ol className="space-y-1.5">{d.board.map((r, i) => (
                            <li key={r.id} className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm', r.id === me.staffId ? 'bg-primary/10' : 'bg-gray-50 dark:bg-gray-700/40')}>
                                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500')}>{i + 1}</span>
                                <Avatar size={26} shape="circle" src={r.image || undefined}>{initials(r.name)}</Avatar>
                                <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                                <span className="hidden text-xs text-gray-400 xl:inline">{tr('total')} {num(r.total)}</span>
                                <Pts n={r.month} />
                            </li>
                        ))}</ol>
                    ) : <p className="py-6 text-center text-sm text-gray-400">{tr('Nobody has points yet. Be the first.')}</p>}
                </Card>
                <Card>
                    <h5 className="mb-3">{tr('My points')}</h5>
                    {d.history.length ? <ul className="max-h-[420px] space-y-1.5 overflow-y-auto">{d.history.map((p) => <Line key={p.id} p={p} onDelete={can.manage ? del : null} />)}</ul> : <p className="py-6 text-center text-sm text-gray-400">{tr('You have no points yet.')}</p>}
                </Card>
                <div className="flex flex-col gap-4">
                    <Card>
                        <h5 className="mb-3">{tr('How to earn points')}</h5>
                        <ul className="space-y-2 text-sm">{rules.map(([icon, text, pts], i) => <li key={i} className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-lg text-amber-600 dark:bg-amber-500/10">{icon}</span><span className="min-w-0 flex-1">{text}<span className="block text-xs font-bold text-amber-700">{pts}</span></span></li>)}</ul>
                        {d.settings.value > 0 && <p className="mt-3 rounded-xl bg-emerald-50 p-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{tr('1 point = {amount}, paid with the salary as a prime.', { amount: cash(d.settings.value, currency) })}</p>}
                    </Card>
                    {can.manage && cfg && (
                        <Card>
                            <h5 className="mb-3 flex items-center gap-2"><TbSettings />{tr('Rules')}</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div><L>{tr('Money for 1 point')} ({currency})</L><Input size="sm" type="number" min="0" step="0.01" value={cfg.value} onChange={(e) => setCfg({ ...cfg, value: e.target.value })} /></div>
                                <div><L>{tr('Task finished in time')}</L><Input size="sm" type="number" min="0" value={cfg.taskOnTime} onChange={(e) => setCfg({ ...cfg, taskOnTime: e.target.value })} /></div>
                                <div><L>{tr('Most points given at once')}</L><Input size="sm" type="number" min="1" value={cfg.maxGive} onChange={(e) => setCfg({ ...cfg, maxGive: e.target.value })} /></div>
                                <div><L>{tr('Most points a month per person')}</L><Input size="sm" type="number" min="0" value={cfg.monthCap} onChange={(e) => setCfg({ ...cfg, monthCap: e.target.value })} /></div>
                            </div>
                            <p className="mt-2 text-xs text-gray-400">{tr('0 for a task finished in time switches that rule off; 0 for the monthly limit means no limit. The limits do not apply to managers of the points.')}</p>
                            <div className="mt-3 flex justify-end"><Button size="sm" variant="solid" loading={busy} onClick={saveCfg}>{tr('Save')}</Button></div>
                        </Card>
                    )}
                </div>
            </div>
            {can.manage && (
                <Card className="mt-4">
                    <h5 className="mb-1 flex items-center gap-2"><TbCash className="text-emerald-500" />{tr('Points to pay')}</h5>
                    <p className="mb-3 text-sm text-gray-500">{tr('When you record a salary in Payroll, the Prime field is filled with this amount and the points are marked as paid.')}</p>
                    {toPay.length ? (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{toPay.map((r) => (
                            <div key={r.id} className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-500/10">
                                <Avatar size={28} shape="circle" src={r.image || undefined}>{initials(r.name)}</Avatar>
                                <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                                <span className="text-xs text-gray-500">{num(r.unpaid)} {tr('points')}</span>
                                <b className="shrink-0 text-emerald-700 dark:text-emerald-300">{cash(r.money, currency)}</b>
                            </div>
                        ))}</div>
                    ) : <p className="py-4 text-center text-sm text-gray-400">{tr('Nothing to pay.')}</p>}
                    <div className="mt-3"><Link to="/crm/payroll" className="text-sm font-semibold text-primary hover:underline">{tr('Open Payroll')}</Link></div>
                </Card>
            )}
            <Card className="mt-4">
                <h5 className="mb-3">{tr('Latest points of the team')}</h5>
                {d.feed.length ? <ul className="grid gap-1.5 lg:grid-cols-2">{d.feed.map((p) => <Line key={p.id} p={p} who onDelete={can.manage ? del : null} />)}</ul> : <p className="py-6 text-center text-sm text-gray-400">{tr('Nothing yet.')}</p>}
            </Card>
            {give && <GivePointsDialog open onClose={() => setGive(false)} people={d.people} manage={can.manage} onGiven={load} />}
        </Container>
    )
}

export default PointsPage
