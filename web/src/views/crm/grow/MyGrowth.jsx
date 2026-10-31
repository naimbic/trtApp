import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TbRocket, TbTargetArrow, TbBooks, TbListCheck, TbUsers, TbPlus, TbSearch, TbExternalLink, TbCertificate, TbLanguage, TbCash, TbCheck, TbTrash, TbBulb } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import Tabs from '@/components/ui/Tabs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import cn from '@/utils/classNames'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const { TabList, TabNav, TabContent } = Tabs
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const ST = { planned: ['Planned', 'bg-sky-100 text-sky-700'], learning: ['Learning', 'bg-amber-100 text-amber-700'], passed: ['Passed', 'bg-emerald-100 text-emerald-700'], failed: ['Failed', 'bg-red-100 text-red-700'], dropped: ['Dropped', 'bg-gray-100 text-gray-500'] }
const KIND = { certification: ['Certification', <TbCertificate key="c" />], language: ['Language', <TbLanguage key="l" />], course: ['Course', <TbBooks key="b" />], skill: ['Skill', <TbBulb key="s" />] }
const CAT = { ads: 'Advertising', seo: 'SEO', social: 'Social media', sales: 'Sales', analytics: 'Analytics', web: 'Web', ai: 'AI', design: 'Design', project: 'Projects', automation: 'Automation' }
const LEVEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const SECTION = { work_fast: 'Work fast', avoid_mistakes: 'Do not make mistakes', follow_up: 'Follow up, miss nothing', upgrade_skills: 'Upgrade your skills', convert_leads: 'Convert leads into clients', opportunities: 'Find opportunities', income_levers: 'Bring more income', weekly_routine: 'Every week', monthly_routine: 'Every month' }
const num = (n) => Math.round(Number(n || 0)).toLocaleString('fr-FR').replace(/ | /g, ' ')
const when = (d) => { if (!d) return ''; const n = dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day'); return `${dayjs(d).format('DD MMM YYYY')} · ${n === 0 ? tr("today") : n > 0 ? `${n} ${tr("days left")}` : `${-n} ${tr("days ago")}`}` }
const Stat = ({ icon, tone, label, value }) => <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><span className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-2xl', tone)}>{icon}</span><div><div className="text-2xl font-bold leading-tight heading-text">{value}</div><div className="text-sm text-gray-500">{label}</div></div></div>

/* ------------------------------------------------------------ goal dialog */
const GoalDialog = ({ goal, can, mine, currency, onClose, onChanged }) => {
    const [v, setV] = useState(null)
    const [busy, setBusy] = useState(false)
    const [del, setDel] = useState(false)
    useEffect(() => { if (goal) setV({ title: goal.title || '', kind: goal.kind || 'certification', provider: goal.provider || '', url: goal.url || '', status: goal.status || 'planned', targetDate: goal.targetDate ? new Date(goal.targetDate) : null, note: goal.note || '', supportAmount: goal.supportAmount ?? '', primeAmount: goal.primeAmount ?? '', approved: !!goal.approved, primePaid: !!goal.primePaid, catalogKey: goal.catalogKey || '' }) }, [goal])
    if (!goal || !v) return null
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const isNew = !goal.id
    const owner = isNew || mine
    const editable = owner || can.manage
    const save = async () => {
        setBusy(true)
        try { await api(isNew ? '/api/crm/growth/goals' : `/api/crm/growth/goals/${goal.id}`, { method: isNew ? 'POST' : 'PUT', body: { ...v, targetDate: v.targetDate ? new Date(v.targetDate).toISOString() : null, supportAmount: v.supportAmount === '' ? null : v.supportAmount, primeAmount: v.primeAmount === '' ? null : v.primeAmount } }); notify('success', tr("Goal saved")); onChanged(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const kinds = Object.entries(KIND).map(([value, [label]]) => ({ value, label: tr(label) }))
    const sts = Object.entries(ST).map(([value, [label]]) => ({ value, label: tr(label) }))
    return (
        <Dialog isOpen width={680} onClose={onClose} onRequestClose={onClose}>
            <div className="max-h-[78vh] overflow-y-auto pe-1">
                <h5 className="mb-3 flex items-center gap-2"><TbTargetArrow />{isNew ? tr("New goal") : tr("Goal")}{goal.staffName && !mine && <span className="text-sm font-normal text-gray-500">· {goal.staffName}</span>}</h5>
                <div className="space-y-3">
                    <div><L>{tr("What do you want to learn or get?")}</L><Input disabled={!editable} value={v.title} placeholder={tr("Google Ads Search certification")} onChange={(e) => set({ title: e.target.value })} /></div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div><L>{tr("Kind")}</L><Select size="sm" isDisabled={!editable} isSearchable={false} options={kinds} value={kinds.find((o) => o.value === v.kind)} onChange={(o) => set({ kind: o.value })} /></div>
                        <div><L>{tr("Status")}</L><Select size="sm" isDisabled={!editable} isSearchable={false} options={sts} value={sts.find((o) => o.value === v.status)} onChange={(o) => set({ status: o.value })} /></div>
                        <div><L>{tr("Target date")}</L><DatePicker size="sm" disabled={!editable} value={v.targetDate} onChange={(d) => set({ targetDate: d })} /></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div><L>{tr("Provider or school")}</L><Input size="sm" disabled={!editable} value={v.provider} onChange={(e) => set({ provider: e.target.value })} /></div>
                        <div><L>{tr("Link")}</L><Input size="sm" disabled={!editable} value={v.url} placeholder="https://" onChange={(e) => set({ url: e.target.value })} /></div>
                    </div>
                    <div><L>{tr("Notes")}</L><Input textArea rows={2} disabled={!editable} value={v.note} onChange={(e) => set({ note: e.target.value })} /></div>
                    {(can.manage || goal.supportAmount != null || goal.primeAmount != null || goal.approved) && (
                        <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-700/40">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><TbCash />{tr("Support and prime")}</div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div><L>{`${tr("The company pays the cost")} (${currency})`}</L><Input size="sm" type="number" disabled={!can.manage} value={v.supportAmount} onChange={(e) => set({ supportAmount: e.target.value })} /></div>
                                <div><L>{`${tr("Prime when passed")} (${currency})`}</L><Input size="sm" type="number" disabled={!can.manage} value={v.primeAmount} onChange={(e) => set({ primeAmount: e.target.value })} /></div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-5 text-sm">
                                <label className="flex items-center gap-2"><Switcher disabled={!can.manage} checked={v.approved} onChange={(c) => set({ approved: c })} />{tr("Approved")}</label>
                                <label className="flex items-center gap-2"><Switcher disabled={!can.manage || v.status !== 'passed'} checked={v.primePaid} onChange={(c) => set({ primePaid: c })} />{tr("Prime paid")}</label>
                            </div>
                            {!can.manage && <p className="mt-2 text-xs text-gray-500">{tr("A manager sets the support and the prime when the goal is approved.")}</p>}
                        </div>
                    )}
                    {!isNew && (
                        <div><L>{tr("Certificate and proofs")}</L><AttachmentsPanel relType="skillgoal" relId={goal.id} canEdit={editable} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" maxMb={10} hint={tr("PDF or photo of the certificate or the receipt, up to 10 MB")} /></div>
                    )}
                </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
                {!isNew && (mine && !goal.approved && goal.status !== 'passed' || can.remove) && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(true)}>{tr("Delete")}</Button>}
                <div className="ms-auto flex gap-2"><Button onClick={onClose}>{tr("Close")}</Button>{editable && <Button variant="solid" loading={busy} onClick={save}>{tr("Save")}</Button>}</div>
            </div>
            <ConfirmDialog isOpen={del} type="danger" title={tr("Delete this goal?")} confirmText={tr("Delete")} onClose={() => setDel(false)} onCancel={() => setDel(false)} onConfirm={() => { setDel(false); api(`/api/crm/growth/goals/${goal.id}`, { method: 'DELETE' }).then(() => { notify('success', tr("Goal deleted")); onChanged(); onClose() }).catch((e) => notify('danger', e.message)) }}><p>{goal.title}</p></ConfirmDialog>
        </Dialog>
    )
}

const GoalCard = ({ g, currency, showWho, onOpen }) => (
    <button type="button" onClick={() => onOpen(g)} className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-start transition hover:border-primary/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex flex-wrap items-center gap-1.5"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ST[g.status]?.[1])}>{tr(ST[g.status]?.[0])}</span><span className="inline-flex items-center gap-1 text-xs text-gray-500">{KIND[g.kind]?.[1]}{tr(KIND[g.kind]?.[0])}</span>{g.approved && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><TbCheck />{tr("Approved")}</span>}</div>
        <div className="font-semibold leading-snug">{g.title}</div>
        <div className="mt-0.5 text-xs text-gray-500">{[showWho && g.staffName, g.provider].filter(Boolean).join(' · ')}</div>
        {g.targetDate && g.status !== 'passed' && <div className="mt-2 text-xs text-gray-500">{tr("Target")}: {when(g.targetDate)}</div>}
        <div className="mt-2 flex flex-wrap gap-3 text-xs">{g.supportAmount ? <span className="text-sky-600">{tr("Company pays")} {num(g.supportAmount)} {currency}</span> : null}{g.primeAmount ? <span className={g.primePaid ? 'text-emerald-600' : 'text-amber-600'}>{tr("Prime")} {num(g.primeAmount)} {currency}{g.primePaid ? ` · ${tr("paid")}` : ''}</span> : null}{g.files > 0 && <span className="text-gray-400">{g.files} {tr("file(s)")}</span>}</div>
    </button>
)

/* ------------------------------------------------------------ my goals */
const Goals = ({ g, reload, currency, can, open, setOpen }) => {
    const list = g?.list || []
    const live = list.filter((x) => ['planned', 'learning'].includes(x.status)), done = list.filter((x) => !['planned', 'learning'].includes(x.status))
    const owed = list.filter((x) => x.status === 'passed' && x.primeAmount && !x.primePaid).reduce((a, x) => a + x.primeAmount, 0)
    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3"><Stat icon={<TbTargetArrow />} tone="bg-amber-100 text-amber-600" label={tr("in progress")} value={live.length} /><Stat icon={<TbCertificate />} tone="bg-emerald-100 text-emerald-600" label={tr("passed")} value={list.filter((x) => x.status === 'passed').length} /><Stat icon={<TbCash />} tone="bg-violet-100 text-violet-600" label={`${tr("prime waiting for you")} ${currency}`} value={num(owed)} /></div>
            <div className="flex items-center justify-between"><h5>{tr("My goals")}</h5><Button variant="solid" size="sm" icon={<TbPlus />} onClick={() => setOpen({ title: '', kind: 'certification', status: 'planned' })}>{tr("New goal")}</Button></div>
            {!list.length && <Card><div className="py-6 text-center"><p className="mb-1 font-semibold">{tr("You have no goal yet")}</p><p className="text-sm text-gray-500">{tr("Pick one in the Catalog: a certification each quarter, or a language exam. Your manager approves it and may pay the cost and a prime.")}</p></div></Card>}
            {live.length > 0 && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{live.map((x) => <GoalCard key={x.id} g={x} currency={currency} onOpen={setOpen} />)}</div>}
            {done.length > 0 && <><h6 className="text-gray-500">{tr("Finished")}</h6><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{done.map((x) => <GoalCard key={x.id} g={x} currency={currency} onOpen={setOpen} />)}</div></>}
        </div>
    )
}

/* ------------------------------------------------------------ catalog */
const Catalog = ({ data, goals, add }) => {
    const [q, setQ] = useState('')
    const [cat, setCat] = useState('')
    const have = new Set((goals?.list || []).map((x) => x.catalogKey).filter(Boolean))
    const certs = (data.catalog.certifications || []).filter((c) => (!cat || c.category === cat) && (!q || `${c.title} ${c.provider} ${c.why}`.toLowerCase().includes(q.toLowerCase())))
    const cats = [...new Set(data.catalog.certifications.map((c) => c.category))]
    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-500">{tr("Costs, validity and links are indicative: always confirm on the provider's page before you pay.")}</p>
            <div className="flex flex-wrap items-center gap-2"><div className="w-full sm:w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search the catalog")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                {['', ...cats].map((c) => <button key={c || 'all'} type="button" onClick={() => setCat(c)} className={cn('rounded-full px-3 py-1 text-xs font-medium transition', cat === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300')}>{c ? tr(CAT[c] || c) : tr("All")}</button>)}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {certs.map((c) => (
                    <Card key={c.key} className="flex flex-col">
                        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500"><span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">{tr(CAT[c.category] || c.category)}</span><span>{tr(LEVEL[c.level] || c.level)}</span></div>
                        <div className="font-semibold leading-snug">{c.title}</div><div className="text-xs text-gray-500">{c.provider}</div>
                        <p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300">{c.why}</p>
                        <div className="mt-2 space-y-0.5 text-xs text-gray-500"><div>{tr("Cost")}: {c.cost}</div><div>{tr("Validity")}: {c.validity}</div><div>{tr("Suggested prime")}: {c.primeSuggestion}</div></div>
                        <div className="mt-3 flex items-center justify-between gap-2"><a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><TbExternalLink />{tr("Details")}</a>{have.has(c.key) ? <span className="text-xs font-semibold text-emerald-600">{tr("In your goals")}</span> : <Button size="xs" variant="solid" icon={<TbPlus />} onClick={() => add({ title: c.title, provider: c.provider, url: c.url, kind: 'certification', catalogKey: c.key, status: 'planned' })}>{tr("Add to my goals")}</Button>}</div>
                    </Card>
                ))}
                {!certs.length && <p className="col-span-full py-6 text-center text-gray-400">{tr("Nothing matches")}</p>}
            </div>
            <div><h5 className="mb-3 flex items-center gap-2"><TbLanguage />{tr("Languages")}</h5>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.catalog.languages.map((l) => (
                    <Card key={l.key} className="flex flex-col"><div className="font-semibold">{l.language}</div><div className="text-xs text-gray-500">{l.exam} · {l.levels}</div><p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300">{l.why}</p><div className="mt-2 text-xs text-gray-500">{tr("Cost")}: {l.cost}</div>
                        {(l.freeResources || []).length > 0 && <div className="mt-2 space-y-0.5 text-xs">{l.freeResources.map((r) => { const m = r.match(/^(.*?)\s*(https?:\/\/\S+)$/); return m ? <a key={r} href={m[2]} target="_blank" rel="noreferrer" className="block truncate text-primary hover:underline">{m[1]}</a> : <div key={r}>{r}</div> })}</div>}
                        <div className="mt-3 flex items-center justify-between gap-2"><a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><TbExternalLink />{tr("Exam")}</a>{have.has(l.key) ? <span className="text-xs font-semibold text-emerald-600">{tr("In your goals")}</span> : <Button size="xs" variant="solid" icon={<TbPlus />} onClick={() => add({ title: `${l.language}: ${l.exam}`, provider: l.exam, url: l.url, kind: 'language', catalogKey: l.key, status: 'planned' })}>{tr("Add to my goals")}</Button>}</div></Card>
                ))}</div>
            </div>
            <div><h5 className="mb-3">{tr("Where to follow what is new")}</h5><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.catalog.newsSources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm transition hover:border-primary/50 dark:border-gray-700 dark:bg-gray-800"><span className="truncate">{s.name}</span><span className="shrink-0 text-xs text-gray-400">{s.topic}</span></a>)}</div></div>
        </div>
    )
}

/* ------------------------------------------------------------ playbook */
const Tips = ({ title, items }) => (
    <details className="group rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold"><span>{tr(title)}</span><span className="text-xs font-normal text-gray-400">{items.length}</span></summary>
        <div className="grid gap-2 px-4 pb-4 md:grid-cols-2">{items.map((i) => <div key={i.title} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700/40"><div className="text-sm font-semibold">{i.title}</div><div className="text-sm text-primary">{i.tip}</div><div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{i.how}</div></div>)}</div>
    </details>
)
const Checklist = ({ id, title, items }) => {
    const key = `growth-check-${id}-${id === 'daily' ? dayjs().format('YYYY-MM-DD') : id === 'weekly' ? dayjs().format('GGGG-[W]WW') : dayjs().format('YYYY-MM')}`
    const [on, setOn] = useState(() => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } })
    const toggle = (i) => setOn((o) => { const n = o.includes(i) ? o.filter((x) => x !== i) : [...o, i]; try { localStorage.setItem(key, JSON.stringify(n)) } catch { /* private window */ } return n })
    return <Card><h6 className="mb-2 flex items-center justify-between">{tr(title)}<span className="text-xs font-normal text-gray-400">{on.length}/{items.length}</span></h6><div className="space-y-1.5">{items.map((t, i) => <label key={t} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={on.includes(i)} onChange={() => toggle(i)} /><span className={on.includes(i) ? 'text-gray-400 line-through' : ''}>{t}</span></label>)}</div></Card>
}
const Playbook = ({ data }) => {
    const pb = data.playbook
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3"><Checklist id="daily" title="Every day" items={pb.checklists.daily} /><Checklist id="weekly" title="Every week" items={pb.checklists.weekly} /><Checklist id="monthly" title="Every month" items={pb.checklists.monthly} /></div>
            <div className="space-y-2"><h5>{tr("For the team")}</h5>{Object.entries(pb.team).map(([k, items]) => <Tips key={k} title={SECTION[k] || k} items={items} />)}</div>
            {pb.admin && <div className="space-y-2"><h5>{tr("For the administrators")}</h5>{Object.entries(pb.admin).map(([k, items]) => <Tips key={k} title={SECTION[k] || k} items={items} />)}</div>}
        </div>
    )
}

/* ------------------------------------------------------------ team */
const Team = ({ currency, setOpen, version }) => {
    const [t, setT] = useState(null)
    const [all, setAll] = useState([])
    const load = useCallback(() => { api('/api/crm/growth/team').then(setT).catch((e) => notify('danger', e.message)); api('/api/crm/growth/goals?all=1').then((r) => setAll(r.list)).catch(() => {}) }, [])
    useEffect(() => { load() }, [load, version])
    if (!t) return <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p>
    const tot = t.totals
    const attention = all.filter((g) => (!g.approved && ['planned', 'learning'].includes(g.status)) || (g.status === 'passed' && g.primeAmount && !g.primePaid))
    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={<TbTargetArrow />} tone="bg-amber-100 text-amber-600" label={tr("learning now")} value={tot.learning} /><Stat icon={<TbCertificate />} tone="bg-emerald-100 text-emerald-600" label={tr("passed this year")} value={tot.passedThisYear} /><Stat icon={<TbCash />} tone="bg-violet-100 text-violet-600" label={`${tr("primes to pay")} ${currency}`} value={num(tot.primeOwed)} /><Stat icon={<TbUsers />} tone="bg-red-100 text-red-600" label={tr("members without a goal")} value={tot.withoutGoal} /></div>
            {attention.length > 0 && <div><h5 className="mb-2">{tr("Waiting for you")}</h5><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{attention.map((g) => <GoalCard key={g.id} g={g} currency={currency} showWho onOpen={setOpen} />)}</div></div>}
            <Card>
                <h5 className="mb-3">{tr("The team")}</h5>
                <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-gray-200 text-start text-xs text-gray-500 dark:border-gray-700">{['Member', 'Planned', 'Learning', 'Passed', 'This year', 'To approve', 'Prime owed', 'Prime paid', 'Company paid'].map((h, i) => <th key={h} className={cn('py-2 font-semibold', i === 0 ? 'text-start' : 'text-end')}>{tr(h)}</th>)}</tr></thead>
                    <tbody>{t.list.map((r) => <tr key={r.id} className="border-b border-gray-100 last:border-0 dark:border-gray-700/60"><td className="py-2 font-medium">{r.name}</td>{[r.planned, r.learning, r.passed, r.passedThisYear, r.toApprove, num(r.primeOwed), num(r.primePaid), num(r.support)].map((x, i) => <td key={i} className={cn('py-2 text-end', i === 4 && r.toApprove > 0 && 'font-semibold text-amber-600', i === 5 && r.primeOwed > 0 && 'font-semibold text-violet-600')}>{x}</td>)}</tr>)}</tbody></table></div>
            </Card>
            <div><h5 className="mb-2">{tr("All goals")}</h5><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{all.map((g) => <GoalCard key={g.id} g={g} currency={currency} showWho onOpen={setOpen} />)}</div></div>
        </div>
    )
}

const MyGrowth = () => {
    const [sp, setSp] = useSearchParams()
    const tab = sp.get('tab') || 'goals'
    const [data, setData] = useState(null)
    const [goals, setGoals] = useState(null)
    const [open, setOpen] = useState(null)
    const [version, setVersion] = useState(0)
    const reload = useCallback(() => { api('/api/crm/growth/goals').then(setGoals).catch((e) => notify('danger', e.message)); setVersion((x) => x + 1) }, [])
    useEffect(() => { api('/api/crm/growth').then(setData).catch((e) => notify('danger', e.message)); reload() }, [reload])
    const myIds = useMemo(() => new Set((goals?.list || []).map((x) => x.id)), [goals])
    if (!data || !goals) return <Container><p className="py-16 text-center text-gray-400">{tr("Loading…")}</p></Container>
    const can = data.can
    return (
        <Container>
            <div className="mb-5"><h3 className="flex items-center gap-2"><TbRocket className="text-primary" />{tr("My growth")}</h3><p className="text-sm text-gray-500">{tr("Your learning goals, the certifications and languages worth getting, and simple habits to work fast and never miss a thing.")}</p></div>
            <Tabs value={tab} onChange={(t) => setSp({ tab: t })}>
                <TabList><TabNav value="goals" icon={<TbTargetArrow />}>{tr("My goals")}</TabNav><TabNav value="catalog" icon={<TbBooks />}>{tr("Catalog")}</TabNav><TabNav value="playbook" icon={<TbListCheck />}>{tr("Playbook")}</TabNav>{can.all && <TabNav value="team" icon={<TbUsers />}>{tr("Team")}</TabNav>}</TabList>
                <div className="pt-5">
                    <TabContent value="goals"><Goals g={goals} reload={reload} currency={data.currency} can={can} open={open} setOpen={setOpen} /></TabContent>
                    <TabContent value="catalog"><Catalog data={data} goals={goals} add={setOpen} /></TabContent>
                    <TabContent value="playbook"><Playbook data={data} /></TabContent>
                    {can.all && <TabContent value="team"><Team currency={data.currency} setOpen={setOpen} version={version} /></TabContent>}
                </div>
            </Tabs>
            <GoalDialog goal={open} can={can} mine={!!open && (!open.id || myIds.has(open.id))} currency={data.currency} onClose={() => setOpen(null)} onChanged={reload} />
        </Container>
    )
}

export default MyGrowth
