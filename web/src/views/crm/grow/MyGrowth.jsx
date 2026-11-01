import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TbRocket, TbTargetArrow, TbBooks, TbListCheck, TbUsers, TbPlus, TbSearch, TbExternalLink, TbCertificate, TbLanguage, TbCash, TbCheck, TbTrash, TbBulb, TbTrophy } from 'react-icons/tb'
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
import { LevelBar, Trophy, TrophyIcon, LEVEL_TONE, money } from './GrowthCard'
import cn from '@/utils/classNames'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const { TabList, TabNav, TabContent } = Tabs
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const ST = { planned: ['Planned', 'bg-sky-100 text-sky-700'], learning: ['Learning', 'bg-amber-100 text-amber-700'], passed: ['Passed', 'bg-emerald-100 text-emerald-700'], failed: ['Failed', 'bg-red-100 text-red-700'], dropped: ['Dropped', 'bg-gray-100 text-gray-500'] }
const KIND = { certification: ['Certification', <TbCertificate key="c" />], language: ['Language', <TbLanguage key="l" />], course: ['Course', <TbBooks key="b" />], skill: ['Skill', <TbBulb key="s" />] }
const CAT = { ads: 'Advertising', seo: 'SEO', social: 'Social media', sales: 'Sales', analytics: 'Analytics', web: 'Web', ai: 'AI', design: 'Design', project: 'Projects', automation: 'Automation' }
const LEVEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const SECTION = { work_fast: 'Work fast', avoid_mistakes: 'Do not make mistakes', follow_up: 'Follow up, miss nothing', upgrade_skills: 'Upgrade your skills', ai_learning: 'AI learning', convert_leads: 'Convert leads into clients', opportunities: 'Find opportunities', income_levers: 'Bring more income', weekly_routine: 'Every week', monthly_routine: 'Every month' }
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
const Goals = ({ g, reload, currency, can, open, setOpen, me, goTrophies }) => {
    const list = g?.list || []
    const live = list.filter((x) => ['planned', 'learning'].includes(x.status)), done = list.filter((x) => !['planned', 'learning'].includes(x.status))
    const owed = list.filter((x) => x.status === 'passed' && x.primeAmount && !x.primePaid).reduce((a, x) => a + x.primeAmount, 0)
    return (
        <div className="space-y-5">
            {me && <Card><div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]"><LevelBar r={me} /><button type="button" onClick={goTrophies} className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"><TbTrophy className="text-xl" />{me.trophies.filter((t) => t.earned).length}/{me.trophies.length} {tr("trophies")}</button></div></Card>}
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
                        <div className="mt-2 space-y-0.5 text-xs text-gray-500"><div>{tr("Cost")}: {c.cost}</div><div>{tr("Validity")}: {c.validity}</div><div className="font-semibold text-amber-600">{tr("Prime when passed")}: {money(c.prime)}</div></div>
                        <div className="mt-3 flex items-center justify-between gap-2"><a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><TbExternalLink />{tr("Details")}</a>{have.has(c.key) ? <span className="text-xs font-semibold text-emerald-600">{tr("In your goals")}</span> : <Button size="xs" variant="solid" icon={<TbPlus />} onClick={() => add({ title: c.title, provider: c.provider, url: c.url, kind: 'certification', catalogKey: c.key, status: 'planned' })}>{tr("Add to my goals")}</Button>}</div>
                    </Card>
                ))}
                {!certs.length && <p className="col-span-full py-6 text-center text-gray-400">{tr("Nothing matches")}</p>}
            </div>
            <div><h5 className="mb-3 flex items-center gap-2"><TbLanguage />{tr("Languages")}</h5>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.catalog.languages.map((l) => (
                    <Card key={l.key} className="flex flex-col"><div className="font-semibold">{l.language}</div><div className="text-xs text-gray-500">{l.exam} · {l.levels}</div><p className="mt-2 flex-1 text-sm text-gray-600 dark:text-gray-300">{l.why}</p><div className="mt-2 text-xs text-gray-500">{tr("Cost")}: {l.cost}</div><div className="text-xs font-semibold text-amber-600">{tr("Prime when passed")}: {money(l.prime)}</div>
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
/* ------------------------------------------------------------ trophies and points */
const WAYS = [['Pass a certificate', '100 to 300 points by level (+50 for AI)'], ['Pass a language exam', '200 points'], ['Pass a course', '100 points'], ['Pass a skill', '80 points'], ['Start learning a goal', '20 points'], ['Plan a goal', '10 points'], ['Win a trophy', '+50 points']]

const Trophies = ({ data }) => {
    const me = data.me
    const board = data.board || []
    const won = me.trophies.filter((t) => t.earned)
    const prizes = me.trophies.filter((t) => t.prize > 0)
    const owed = won.filter((t) => t.prize > 0 && !t.paid).reduce((a, t) => a + t.prize, 0)
    return (
        <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <Card>
                    <h5 className="mb-3 flex items-center gap-2"><TbRocket className="text-primary" />{tr("Your level")}</h5>
                    <LevelBar r={me} big />
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">{data.levels.map((l) => <span key={l.key} className={cn('rounded-full px-2.5 py-1 font-semibold', LEVEL_TONE[l.key], me.level.key === l.key && 'ring-2 ring-primary/40')}>{tr(l.label)} · {l.min}</span>)}</div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{tr("Every certificate, language exam or course you pass gives points and can win a trophy with a cash prize between 200 and 1000 MAD, on top of the prime of the goal. Pick a goal in the Catalog and ask for approval: the first step is the easiest.")}</p>
                    {owed > 0 && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{tr("Prize waiting for payment")}: {money(owed)}</p>}
                </Card>
                <Card>
                    <h5 className="mb-3">{tr("Hall of fame")}</h5>
                    {board.length ? <ol className="space-y-1.5">{board.map((r, i) => <li key={r.id} className={cn('flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm', r.id === data.me.staffId ? 'bg-primary/10' : 'bg-gray-50 dark:bg-gray-700/40')}><span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500')}>{i + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{r.name}</span><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', LEVEL_TONE[r.levelKey])}>{tr(r.level)}</span><span className="w-12 text-end font-bold">{r.points}</span><span className="inline-flex w-9 items-center justify-end gap-0.5 text-xs text-amber-600"><TbTrophy />{r.trophies}</span></li>)}</ol> : <p className="py-6 text-center text-sm text-gray-400">{tr("Nobody has points yet: be the first!")}</p>}
                </Card>
            </div>
            <div><h5 className="mb-3 flex items-center gap-2"><TbTrophy className="text-amber-500" />{tr("Trophies")} <span className="text-sm font-normal text-gray-500">{won.length}/{me.trophies.length}</span></h5>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{me.trophies.map((t) => <Trophy key={t.key} t={t} />)}</div>
                <p className="mt-2 text-xs text-gray-500">{tr("Prizes")}: {prizes.map((t) => `${tr(t.label)} ${money(t.prize)}`).join(' · ')}</p>
            </div>
            <Card><h5 className="mb-2">{tr("How points work")}</h5><div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">{WAYS.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-gray-100 py-1 dark:border-gray-700"><span>{tr(k)}</span><b className="shrink-0 text-end">{tr(v)}</b></div>)}</div></Card>
        </div>
    )
}

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
            {(t.trophiesOwed || []).length > 0 && (
                <Card><h5 className="mb-2 flex items-center gap-2"><TbTrophy className="text-amber-500" />{tr("Trophy prizes to pay")} <span className="text-sm font-normal text-gray-500">{money(tot.trophyOwed)}</span></h5>
                    <div className="space-y-1.5">{t.trophiesOwed.map((x) => <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10"><span><b>{x.staffName}</b> · {tr(x.label)} · {dayjs(x.awardedAt).format('DD MMM YYYY')}</span><span className="flex items-center gap-2"><b>{money(x.prize)}</b>{t.can?.manage && <Button size="xs" variant="solid" icon={<TbCheck />} onClick={() => api(`/api/crm/growth/trophies/${x.id}`, { method: 'PUT', body: { paid: true } }).then(() => { notify('success', tr("Marked as paid")); load() }).catch((e) => notify('danger', e.message))}>{tr("Paid")}</Button>}</span></div>)}</div>
                </Card>
            )}
            <Card>
                <h5 className="mb-3">{tr("The team")}</h5>
                <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-gray-200 text-start text-xs text-gray-500 dark:border-gray-700">{['Member', 'Points', 'Trophies', 'Planned', 'Learning', 'Passed', 'This year', 'To approve', 'Prime owed', 'Prime paid', 'Company paid'].map((h, i) => <th key={h} className={cn('py-2 font-semibold', i === 0 ? 'text-start' : 'text-end')}>{tr(h)}</th>)}</tr></thead>
                    <tbody>{t.list.map((r) => <tr key={r.id} className="border-b border-gray-100 last:border-0 dark:border-gray-700/60"><td className="py-2 font-medium">{r.name}</td>{[<b key="p">{r.points}</b>, r.trophies, r.planned, r.learning, r.passed, r.passedThisYear, r.toApprove, num(r.primeOwed), num(r.primePaid), num(r.support)].map((x, i) => <td key={i} className={cn('py-2 text-end', i === 6 && r.toApprove > 0 && 'font-semibold text-amber-600', i === 7 && r.primeOwed > 0 && 'font-semibold text-violet-600')}>{x}</td>)}</tr>)}</tbody></table></div>
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
                <TabList><TabNav value="goals" icon={<TbTargetArrow />}>{tr("My goals")}</TabNav><TabNav value="trophies" icon={<TbTrophy />}>{tr("Trophies")}</TabNav><TabNav value="catalog" icon={<TbBooks />}>{tr("Catalog")}</TabNav><TabNav value="playbook" icon={<TbListCheck />}>{tr("Playbook")}</TabNav>{can.all && <TabNav value="team" icon={<TbUsers />}>{tr("Team")}</TabNav>}</TabList>
                <div className="pt-5">
                    <TabContent value="goals"><Goals g={goals} reload={reload} currency={data.currency} can={can} open={open} setOpen={setOpen} me={data.me} goTrophies={() => setSp({ tab: 'trophies' })} /></TabContent>
                    <TabContent value="trophies"><Trophies data={data} /></TabContent>
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
