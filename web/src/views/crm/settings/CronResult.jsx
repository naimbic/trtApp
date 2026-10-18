import { Link } from 'react-router'
import { TbReceipt2, TbFileDescription, TbFileText, TbContract, TbCashBanknote, TbChecklist, TbTrash, TbLifebuoy, TbSend, TbCheck, TbPlayerSkipForward, TbAlertTriangle, TbMinus, TbEye, TbArrowUpRight, TbUser, TbMail, TbMailOff, TbCoin, TbCalendarDue } from 'react-icons/tb'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

const JOB_ICON = { invoices: TbReceipt2, estimates: TbFileDescription, proposals: TbFileText, contracts: TbContract, expenses: TbCashBanknote, tasks: TbChecklist, cleanup: TbTrash, tickets: TbLifebuoy }
const ROUTE = { invoice: '/crm/invoices', estimate: '/crm/estimates', proposal: '/crm/proposals', contract: '/crm/contracts', task: '/crm/tasks', ticket: '/crm/tickets' }

/** Who and how much: the client, who the email would go to, the amount and how late (shown in the preview). */
const Info = ({ info }) => {
    if (!info) return null
    return (
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {info.client && <span className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200"><TbUser className="text-sm text-gray-400" />{info.client}</span>}
            {info.noEmail
                ? <span className="inline-flex items-center gap-1 font-semibold text-red-500"><TbMailOff className="text-sm" />{tr('No email address: it would fail')}</span>
                : <span className="inline-flex items-center gap-1"><TbMail className="text-sm text-gray-400" />{info.to.join(', ')}</span>}
            {info.amount && <span className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200"><TbCoin className="text-sm text-gray-400" />{info.amount}</span>}
            {info.dueDate && <span className="inline-flex items-center gap-1"><TbCalendarDue className="text-sm text-gray-400" />{info.dueDate}{info.daysLabel ? ` · ${info.daysLabel}` : ''}</span>}
        </span>
    )
}

/** What a line of the cron log means: will happen (preview), done, skipped, failed, or nothing to do. */
export const kindOf = (t) => (t.startsWith('!') ? 'error' : / turned off$/.test(t) ? 'off' : / nothing to do$/.test(t) ? 'idle' : /skipped/.test(t) ? 'skip' : t.startsWith('[preview]') ? 'would' : 'done')
const clean = (t) => t.replace(/^\[preview\]\s*/, '').replace(/^!\s*/, '')

const KIND = () => ({
    would: { icon: TbSend, chip: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400', dot: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', label: tr('Will happen') },
    done: { icon: TbCheck, chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: tr('Done') },
    skip: { icon: TbPlayerSkipForward, chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', dot: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: tr('Skipped') },
    error: { icon: TbAlertTriangle, chip: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400', dot: 'bg-red-500/10 text-red-500 dark:text-red-400', label: tr('Failed') },
})

/** The text of a line with the document's name turned into a link to it. */
const LineText = ({ text, r }) => {
    const to = r && ROUTE[r.type] ? `${ROUTE[r.type]}/${r.id}` : null
    if (!to) return <>{text}</>
    const i = r.label ? text.lastIndexOf(r.label) : -1
    const link = (label) => <Link to={to} className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary hover:underline">{label}<TbArrowUpRight className="text-sm" /></Link>
    if (i < 0) return <>{text} {link(tr('Open'))}</>
    return <>{text.slice(0, i)}{link(r.label)}{text.slice(i + r.label.length)}</>
}

/** The result of a cron run or preview: a summary, one card per task with its lines, and the tasks that had nothing to do. */
const CronResult = ({ result }) => {
    const lines = result.lines || [], refs = result.refs || []
    const groups = result.groups?.length ? result.groups : [{ key: 'all', label: tr('Result'), from: 0, to: lines.length }]
    const items = (g) => lines.slice(g.from, g.to).map((text, n) => ({ text, kind: kindOf(text), ref: refs[g.from + n] || null }))
    const grouped = groups.map((g) => ({ ...g, items: items(g) }))
    const idle = grouped.filter((g) => g.items.every((i) => i.kind === 'idle'))
    const off = grouped.filter((g) => g.items.every((i) => i.kind === 'off'))
    const busy = grouped.filter((g) => !idle.includes(g) && !off.includes(g))
    const loose = lines.filter((_, n) => !groups.some((g) => n >= g.from && n < g.to) && result.groups?.length)
    const count = (k) => grouped.reduce((a, g) => a + g.items.filter((i) => i.kind === k).length, 0)
    const K = KIND()
    const chips = [['would', result.dry ? tr('to do') : null], ['done', tr('done')], ['skip', tr('skipped')], ['error', tr('failed')]].filter(([k, l]) => l && count(k))
    return (
        <div className="mt-4 space-y-3">
            <div className={classNames('flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm', result.dry ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300')}>
                {result.dry ? <TbEye className="text-xl" /> : <TbCheck className="text-xl" />}
                <div className="min-w-0 flex-1"><div className="font-bold">{result.dry ? tr('Preview') : tr('Run finished')}</div><div className="text-xs opacity-80">{result.dry ? tr('Nothing was sent or changed.') : `${result.ms} ${tr('ms')}`}</div></div>
                <div className="flex flex-wrap gap-1.5">{chips.map(([k, l]) => <span key={k} className={classNames('rounded-full px-2 py-0.5 text-xs font-bold', K[k].chip)}>{count(k)} {l}</span>)}{!chips.length && <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold dark:bg-gray-800/60">{tr('Nothing to do')}</span>}</div>
            </div>

            {busy.map((g) => {
                const Icon = JOB_ICON[g.key] || TbMinus
                return (
                    <div key={g.key} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-700/30"><Icon className="text-lg text-gray-500" /><span className="font-bold">{tr(g.label)}</span><span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-600 dark:text-gray-200">{g.items.filter((i) => i.kind !== 'idle' && i.kind !== 'off').length}</span></div>
                        <ul className="max-h-[26rem] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                            {g.items.filter((i) => i.kind !== 'idle' && i.kind !== 'off').map((i, n) => {
                                const k = K[i.kind], KI = k.icon
                                return (
                                    <li key={n} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                                        <span className={classNames('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm', k.dot)}><KI /></span>
                                        <span className="min-w-0 flex-1 break-words">
                                            <LineText text={clean(i.text)} r={i.ref} />
                                            <Info info={i.ref?.info} />
                                        </span>
                                        <span className={classNames('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', k.chip)}>{k.label}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )
            })}

            {loose.length > 0 && <ul className="rounded-xl border border-red-200 p-3 text-sm text-red-600 dark:border-red-500/30">{loose.map((l, n) => <li key={n}>{clean(l)}</li>)}</ul>}

            {off.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="font-semibold">{tr('Turned off:')}</span>
                    {off.map((g) => { const Icon = JOB_ICON[g.key] || TbMinus; return <span key={g.key} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-400 line-through dark:border-gray-600"><Icon />{tr(g.label)}</span> })}
                </div>
            )}

            {idle.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="font-semibold">{tr('Nothing to do:')}</span>
                    {idle.map((g) => { const Icon = JOB_ICON[g.key] || TbMinus; return <span key={g.key} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-gray-700"><Icon />{tr(g.label)}</span> })}
                </div>
            )}
        </div>
    )
}

export default CronResult
