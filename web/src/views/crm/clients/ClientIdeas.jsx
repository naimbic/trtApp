import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TbBulb, TbSparkles, TbPlus, TbSearch, TbEye, TbEyeOff, TbMessageCircle, TbChecklist, TbCoin, TbUsers, TbExternalLink, TbTargetArrow, TbChevronDown, TbRobot, TbCheck, TbFlame, TbBolt } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Segment from '@/components/ui/Segment'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import FoldSection from '@/components/crm/FoldSection'
import OfferEditor, { offerSummary } from './OfferEditor'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import { CommentTools, CommentEdit, ReplyQuote, ReplyingTo, CommentThread } from '@/components/crm/CommentParts'
import cn from '@/utils/classNames'
import { Link } from 'react-router'
import { api, notify } from '../kit/api'
import { useLocaleStore } from '@/store/localeStore'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
export const STATUS = {
    draft: ['Draft', 'bg-gray-400'], proposed: ['Proposed', 'bg-blue-500'], interested: ['Interested', 'bg-sky-500'], approved: ['Approved', 'bg-emerald-500'],
    doing: ['In progress', 'bg-amber-500'], done: ['Done', 'bg-green-700'], declined: ['Declined', 'bg-rose-500'],
}
/** A category as a small coloured label: its colour tints the background, its name is translated when it is one that comes with the app. */
const Cat = ({ cat, code }) => {
    const c = cat || { name: code || 'Other', color: '#6b7280' }
    return <span className="max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${c.color}22`, color: c.color }}>{tr(c.name)}</span>
}
const catOf = (cats, code) => (cats || []).find((c) => c.code === code)
const LEVEL = { 1: 'Low', 2: 'Medium', 3: 'High' }
const money = (n, cur) => `${Number(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} ${cur?.symbol || cur?.name || ''}`.trim()
/** Low / Medium / High as small tags. The colour follows the meaning: a high impact is good (green), a high effort or priority needs attention (red). */
const TONE = {
    gray: 'bg-gray-100 text-gray-600 ring-gray-300 dark:bg-gray-600/40 dark:text-gray-200', sky: 'bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-200',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200', amber: 'bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200', rose: 'bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-500/20 dark:text-rose-200',
}
const LEVEL_TONE = { impact: { 1: 'gray', 2: 'sky', 3: 'emerald' }, effort: { 1: 'emerald', 2: 'amber', 3: 'rose' }, priority: { 1: 'gray', 2: 'sky', 3: 'rose' } }
const LevelTags = ({ kind, value, onChange }) => (
    <div className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} aria-pressed={value === n} className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition', value === n ? `${TONE[LEVEL_TONE[kind][n]]} ring-1` : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700')}>{tr(LEVEL[n])}</button>
        ))}
    </div>
)

const Dots = ({ n, color }) => <span className="inline-flex gap-0.5">{[1, 2, 3].map((k) => <i key={k} className={cn('h-1.5 w-1.5 rounded-full', k <= n ? color : 'bg-gray-200 dark:bg-gray-600')} />)}</span>

const IdeaCard = ({ i, cur, cats, onOpen }) => (
    <button type="button" onClick={() => onOpen(i)} className="block w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-start transition hover:border-primary/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Cat cat={catOf(cats, i.category)} code={i.category} />
            {i.source === 'ai' && <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"><TbSparkles />AI</span>}
            <span className="ms-auto" title={i.visible ? tr("The client can see it") : tr("Only the team can see it")}>{i.visible ? <TbEye className="text-emerald-500" /> : <TbEyeOff className="text-gray-400" />}</span>
        </div>
        <div className="line-clamp-3 text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{i.title}</div>
        {i.gain && <div className="mt-1 line-clamp-2 text-xs text-gray-500 [overflow-wrap:anywhere]">{i.gain}</div>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-gray-400">
            <span className="flex items-center gap-2" title={`${tr("Impact")}: ${tr(LEVEL[i.impact])} · ${tr("Effort")}: ${tr(LEVEL[i.effort])}`}><span className="flex items-center gap-1"><TbFlame className="text-emerald-500" /><Dots n={i.impact} color="bg-emerald-500" /></span><span className="flex items-center gap-1"><TbBolt className="text-amber-500" /><Dots n={i.effort} color="bg-amber-500" /></span></span>
            <span className="flex items-center gap-2">{i.price != null && <b className="max-w-[120px] truncate text-gray-600 dark:text-gray-300" title={money(i.price, cur)}>{money(i.price, cur)}</b>}{i.taskId && <TbChecklist title={tr("A task was made from it")} />}{i.comments > 0 && <span className="flex items-center gap-0.5"><TbMessageCircle />{i.comments}</span>}</span>
        </div>
        {(i.answer || i.dueDate) && <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">{i.answer && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-500/10">{tr("Client")}: {tr(STATUS[i.answer]?.[0] || i.answer)}</span>}{i.dueDate && <span className="text-gray-400">{tr("Answer by")} {dayjs(i.dueDate).format('DD MMM')}</span>}</div>}
    </button>
)

/* ------------------------------------------------------------ the idea */
const blank = { title: '', body: '', category: 'grow', status: 'draft', visible: false, priority: 2, impact: 2, effort: 2, gain: '', price: '', offer: null, currencyId: '', dueDate: '', tags: '', assigneeIds: [] }

const IdeaDialog = ({ idea, data, clientId, onClose, onChanged }) => {
    const [v, setV] = useState(null)
    const [sec, setSec] = useState('idea')
    const [comments, setComments] = useState([])
    const [text, setText] = useState('')
    const [internal, setInternal] = useState(false)
    const [replyTo, setReplyTo] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [busy, setBusy] = useState('')
    const [del, setDel] = useState(false)
    const isNew = !!idea && !idea.id
    const can = data.can
    const readOnly = isNew ? !can.create : !can.edit
    useEffect(() => {
        if (!idea) return
        setV({ ...blank, ...idea, price: idea.price ?? '', currencyId: idea.currencyId || '', dueDate: idea.dueDate ? dayjs(idea.dueDate).format('YYYY-MM-DD') : '', tags: (idea.tags || []).join(', '), assigneeIds: idea.assigneeIds || [], body: idea.body || '', gain: idea.gain || '' })
        setSec('idea'); setComments([]); setText(''); setInternal(false); setReplyTo(null); setEditingId(null)
        if (idea.id) api(`/api/crm/client-ideas/${idea.id}/comments?clientId=${clientId}`).then((r) => setComments(r.list)).catch(() => {})
    }, [idea, clientId])
    if (!idea || !v) return null
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const toggle = (k) => setSec((s) => (s === k ? '' : k))
    const staffOpts = data.staff.map((s) => ({ value: s.id, label: s.name }))
    const curOpts = [{ value: '', label: '—' }, ...data.currencies.map((c) => ({ value: c.id, label: c.symbol || c.name }))]
    const statusOpts = Object.entries(STATUS).map(([value, [label]]) => ({ value, label: tr(label) }))
    const body = () => ({ clientId, ...v, price: v.price === '' ? null : Number(v.price), currencyId: v.currencyId || null, dueDate: v.dueDate || null, tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean) })
    const save = async () => {
        if (!v.title.trim()) { setSec('idea'); return notify('danger', tr("Give the idea a title")) }
        setBusy('save')
        try {
            const r = isNew ? await api('/api/crm/client-ideas', { method: 'POST', body: body() }) : await api(`/api/crm/client-ideas/${idea.id}`, { method: 'PUT', body: body() })
            notify('success', r.mailed ? tr("Saved. {n} email(s) sent to the client.", { n: r.mailed }) : tr("Saved"))
            onChanged(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const remove = async () => { setBusy('del'); try { await api(`/api/crm/client-ideas/${idea.id}?clientId=${clientId}`, { method: 'DELETE' }); onChanged(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(''); setDel(false) } }
    const say = async () => {
        if (!text.trim()) return
        setBusy('say')
        try { const r = await api(`/api/crm/client-ideas/${idea.id}/comments`, { method: 'POST', body: { clientId, body: text, internal, replyToId: replyTo?.id } }); setComments((c) => [...c, r.comment]); setText(''); setReplyTo(null); onChanged() } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const reloadComments = () => api(`/api/crm/client-ideas/${idea.id}/comments?clientId=${clientId}`).then((r) => setComments(r.list)).catch(() => {})
    const removeComment = async (c) => { try { await api(`/api/crm/client-ideas/${idea.id}/comments?clientId=${clientId}&commentId=${c.id}`, { method: 'DELETE' }); await reloadComments(); onChanged() } catch (e) { notify('danger', e.message) } }
    const task = async () => { setBusy('task'); try { const r = await api(`/api/crm/client-ideas/${idea.id}/task`, { method: 'POST', body: { clientId } }); notify('success', r.existing ? tr("The task already exists") : tr("Task created")); onChanged(); window.open(`/crm/tasks/${r.taskId}`, '_blank') } catch (e) { notify('danger', e.message) } finally { setBusy('') } }
    const proposing = v.status === 'proposed' && !idea.proposedAt
    return (
        <>
            <Dialog isOpen onClose={onClose} onRequestClose={onClose} width={700} height="min(calc(100vh - 48px), 820px)" contentClassName="flex flex-col overflow-hidden">
                <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 pr-10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-lg text-white"><TbBulb /></span>
                    <h5 className="mr-auto">{isNew ? tr("New idea") : tr("Idea")}</h5>
                    <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white', STATUS[v.status]?.[1])}>{tr(STATUS[v.status]?.[0])}</span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    <fieldset disabled={readOnly || !!busy} className="contents">
                        <FoldSection icon={<TbBulb />} tone="blue" title={tr("The idea")} summary={`${tr(catOf(data.categories, v.category)?.name || 'Other')} · ${v.title || tr("No title yet")}`} open={sec === 'idea'} onToggle={() => toggle('idea')}>
                            <div className="mb-3 flex flex-wrap gap-1.5">
                                {data.categories.filter((c) => c.isActive || c.code === v.category).map((c) => <button key={c.code} type="button" onClick={() => set({ category: c.code })} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition', v.category === c.code ? 'border-transparent text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600')} style={v.category === c.code ? { background: c.color } : undefined}>{tr(c.name)}</button>)}
                            </div>
                            <div className="mb-3"><L>{tr("Title")}</L><Input autoComplete="off" placeholder={tr("What we propose, in one line")} value={v.title} onChange={(e) => set({ title: e.target.value })} /></div>
                            <L>{tr("Description")}</L>
                            <RichEditor minHeight={150} disabled={readOnly} value={v.body} onChange={(html) => set({ body: html })} placeholder={tr("Why it matters for this client, the steps, what we do and what they do")} />
                            {idea.sources?.length > 0 && <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-700/40"><b className="mb-1 block text-gray-500">{tr("Sources found by the AI")}</b>{idea.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 truncate text-primary hover:underline"><TbExternalLink className="shrink-0" />{s}</a>)}</div>}
                        </FoldSection>
                        <FoldSection icon={<TbCoin />} tone="emerald" title={tr("Value")} summary={`${tr("Impact")} ${tr(LEVEL[v.impact])} · ${tr("Effort")} ${tr(LEVEL[v.effort])}${v.offer ? ` · ${offerSummary(v.offer, data.currencies.find((c) => c.id === v.currencyId))}` : v.price !== '' ? ` · ${money(v.price, data.currencies.find((c) => c.id === v.currencyId))}` : ''}`} open={sec === 'value'} onToggle={() => toggle('value')}>
                            <div className="mb-3 grid gap-3 sm:grid-cols-3">
                                {[['impact', tr("Impact for the client")], ['effort', tr("Effort for us")], ['priority', tr("Priority")]].map(([k, label]) => (
                                    <div key={k}><L>{label}</L><LevelTags kind={k} value={v[k]} onChange={(x) => set({ [k]: x })} /></div>
                                ))}
                            </div>
                            <div className="mb-3"><L>{tr("What the client gains")}</L><Input placeholder={tr("In one sentence, with the assumption")} maxLength={300} value={v.gain} onChange={(e) => set({ gain: e.target.value })} /></div>
                            <div className="mb-3 rounded-xl border border-emerald-200 p-3 dark:border-emerald-500/30">
                                <OfferEditor offer={v.offer} onChange={(offer) => set({ offer })} price={v.price} onPrice={(price) => set({ price })} currency={data.currencies.find((c) => c.id === v.currencyId)} readOnly={readOnly} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div><L>{tr("Currency")}</L><Select size="sm" isSearchable={false} options={curOpts} value={curOpts.find((o) => o.value === v.currencyId)} onChange={(o) => set({ currencyId: o.value })} /></div>
                                <div><L>{tr("Answer by")}</L><Input type="date" value={v.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></div>
                            </div>
                        </FoldSection>
                        <FoldSection icon={<TbTargetArrow />} tone="violet" title={tr("Status and client")} summary={`${tr(STATUS[v.status]?.[0])} · ${v.visible ? tr("Visible to the client") : tr("Team only")}`} open={sec === 'status'} onToggle={() => toggle('status')}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div><L>{tr("Status")}</L><Select size="sm" isSearchable={false} options={statusOpts} value={statusOpts.find((o) => o.value === v.status)} onChange={(o) => set({ status: o.value, ...(o.value === 'draft' ? { visible: false } : {}) })} /></div>
                                <label className="flex items-end gap-2 pb-1 text-sm"><Switcher checked={v.visible} disabled={v.status === 'draft'} onChange={(c) => set({ visible: c })} />{tr("Visible to the client")}</label>
                            </div>
                            {proposing && <p className="mt-3 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{tr("Saving with the status Proposed shows the idea in the client area and emails the client's contacts.")}</p>}
                            {v.status === 'draft' && <p className="mt-3 text-xs text-gray-500">{tr("A draft stays inside the team. Move it to Proposed when it is ready for the client.")}</p>}
                            {idea.answer && <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-sm dark:bg-gray-700/40"><b>{tr("Client answer")}:</b> {tr(STATUS[idea.answer]?.[0] || idea.answer)}{idea.answeredBy ? ` · ${idea.answeredBy}` : ''}{idea.answeredAt ? ` · ${dayjs(idea.answeredAt).format('DD MMM YYYY')}` : ''}</div>}
                        </FoldSection>
                        <FoldSection icon={<TbUsers />} tone="amber" title={tr("Team and work")} summary={v.assigneeIds.length ? tr("{n} person(s)", { n: v.assigneeIds.length }) : tr("Nobody yet")} open={sec === 'team'} onToggle={() => toggle('team')}>
                            <L>{tr("Who works on it")}</L>
                            <Select isMulti isClearable placeholder={tr("Assign team members…")} options={staffOpts} value={staffOpts.filter((o) => v.assigneeIds.includes(o.value))} onChange={(opts) => set({ assigneeIds: (opts || []).map((o) => o.value) })} />
                            <div className="mt-3"><L>{tr("Tags")}</L><Input placeholder={tr("seo, ads, site (separated by commas)")} value={v.tags} onChange={(e) => set({ tags: e.target.value })} /></div>
                            {!isNew && <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" icon={<TbChecklist />} loading={busy === 'task'} disabled={readOnly} onClick={task}>{idea.taskId ? tr("Open its task") : tr("Make a task of it")}</Button><span className="text-xs text-gray-500">{tr("The task is linked to this client and given to the people above.")}</span></div>}
                        </FoldSection>
                        {!isNew && (
                            <FoldSection icon={<TbMessageCircle />} tone="rose" title={tr("Discussion")} summary={comments.length ? tr("{n} message(s)", { n: comments.length }) : tr("No message yet")} open={sec === 'talk'} onToggle={() => toggle('talk')}>
                                <div className="space-y-3">
                                    <CommentThread comments={comments} render={(c) => (
                                        <div key={c.id} className="group relative flex gap-2.5">
                                            <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white', c.authorKind === 'client' ? 'bg-blue-500' : c.internal ? 'bg-amber-500' : 'bg-gray-500')}>{(c.authorName || '?')[0]?.toUpperCase()}</span>
                                            <div className={cn('min-w-0 flex-1 rounded-xl p-2.5 text-sm', c.authorKind === 'client' ? 'bg-blue-50 dark:bg-blue-500/10' : c.internal ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-gray-50 dark:bg-gray-700/40')}>
                                                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="truncate text-gray-700 dark:text-gray-200">{c.authorName || (c.authorKind === 'client' ? tr("Client") : tr("Team"))}</b>{c.authorKind === 'client' && <span className="rounded bg-blue-100 px-1.5 text-blue-700">{tr("Client")}</span>}{c.internal && <span className="rounded bg-amber-100 px-1.5 text-amber-700">{tr("Team only")}</span>}<span className="ms-auto shrink-0">{dayjs(c.createdAt).format('DD MMM HH:mm')}{c.edited ? ` · ${tr('edited')}` : ''}</span></div>
                                                <ReplyQuote r={c.replyTo} />
                                                {editingId === c.id
                                                    ? <CommentEdit initial={c.body} onCancel={() => setEditingId(null)} onSave={async (t) => { await api(`/api/crm/client-ideas/${idea.id}/comments`, { method: 'PUT', body: { clientId, commentId: c.id, body: t } }); setEditingId(null); await reloadComments() }} />
                                                    : <RichView html={c.body} />}
                                            </div>
                                            {editingId !== c.id && can.edit && <CommentTools onReply={() => { setReplyTo({ id: c.id, name: c.authorName || tr('Client') }); setText((x) => x || (c.authorKind === 'staff' && c.authorName ? `@${c.authorName} ` : '')) }} onEdit={c.mine ? () => setEditingId(c.id) : null} onDelete={c.canDelete ? () => removeComment(c) : null} />}
                                        </div>
                                    )} />
                                    {!comments.length && <p className="py-2 text-center text-xs text-gray-400">{tr("Questions and answers between you and the client appear here.")}</p>}
                                </div>
                                {can.edit && (
                                    <div className="mt-3 space-y-2">
                                        <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                                        <RichEditor minHeight={80} extraMentions={data.contacts || []} placeholder={internal || !v.visible ? tr("A note for the team only…") : tr("Write to the client — use @ to mention a contact")} value={text} onChange={setText} />
                                        <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs text-gray-500"><Switcher checked={internal || !v.visible} disabled={!v.visible} onChange={setInternal} />{tr("Team only")}</label><Button size="sm" variant="solid" loading={busy === 'say'} disabled={!text.trim()} onClick={say}>{tr("Send")}</Button></div>
                                    </div>
                                )}
                            </FoldSection>
                        )}
                    </fieldset>
                </div>
                <div className="mt-3 flex shrink-0 items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    {!isNew && can.delete && <Button type="button" variant="plain" className="text-red-500" onClick={() => setDel(true)}>{tr("Delete")}</Button>}
                    <div className="ms-auto flex gap-2"><Button onClick={onClose}>{readOnly ? tr("Close") : tr("Cancel")}</Button>{!readOnly && <Button variant="solid" loading={busy === 'save'} onClick={save}>{isNew ? tr("Create idea") : tr("Save changes")}</Button>}</div>
                </div>
            </Dialog>
            <ConfirmDialog isOpen={del} type="danger" title={tr("Delete this idea?")} confirmText={tr("Delete")} onClose={() => setDel(false)} onRequestClose={() => setDel(false)} onCancel={() => setDel(false)} onConfirm={remove}><p>{tr("The idea and its messages are removed. The client will not see it any more.")}</p></ConfirmDialog>
        </>
    )
}

/* ------------------------------------------------------------ the AI helper */
const FOCUS = [['mixed', 'Grow and save'], ['grow', 'Grow the business'], ['save', 'Save money']]

const AiDialog = ({ open, clientId, data, onClose, onChanged }) => {
    const lang = useLocaleStore((x) => x.currentLang) || 'en'
    const [st, setSt] = useState(null)
    const [f, setF] = useState({ focus: 'mixed', count: 5, competitors: '', note: '', web: true })
    const [busy, setBusy] = useState('')
    const [res, setRes] = useState(null)
    const [pick, setPick] = useState({})
    useEffect(() => {
        if (!open) return
        setRes(null); setSt(null)
        api(`/api/crm/client-ideas/ai?clientId=${clientId}`).then(setSt).catch((e) => setSt({ ready: false, error: e.message }))
    }, [open, clientId])
    if (!open) return null
    const run = async () => {
        setBusy('run')
        try {
            const r = await api('/api/crm/client-ideas/ai', { method: 'POST', body: { clientId, ...f, lang } })
            setRes(r); setPick(Object.fromEntries(r.ideas.map((i, k) => [k, !i.duplicate])))
            onChanged()
        } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const add = async () => {
        const ideas = res.ideas.filter((_, k) => pick[k])
        setBusy('add')
        try { const r = await api('/api/crm/client-ideas/ai/add', { method: 'POST', body: { clientId, ideas } }); notify('success', tr("{n} idea(s) added as drafts", { n: r.created })); onChanged(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const chosen = res ? res.ideas.filter((_, k) => pick[k]).length : 0
    return (
        <Dialog isOpen onClose={onClose} onRequestClose={onClose} width={760} height="min(calc(100vh - 48px), 860px)" contentClassName="flex flex-col overflow-hidden">
            <div className="mb-3 flex shrink-0 items-center gap-2 pr-10"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-lg text-white"><TbSparkles /></span><div><h5>{tr("AI research")}</h5><p className="text-xs text-gray-500">{data.client.company}</p></div></div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {!st ? <p className="py-8 text-center text-gray-400">{tr("Loading…")}</p> : !st.ready ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-900/20">{st.error || tr("No AI key yet. Add one in Settings → AI, then come back.")}</div>
                ) : (
                    <>
                        {!res && (
                            <>
                                <div className="rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-500/10">
                                    <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-violet-700 dark:text-violet-300"><TbRobot />{tr("What the helper does")}</p>
                                    <ul className="list-disc space-y-0.5 ps-5 text-xs text-gray-600 dark:text-gray-300">
                                        <li>{tr("Reads what we sold this client, its projects, support subjects, proposals and the ideas already written.")}</li>
                                        <li>{st.webSearch ? tr("Searches the web for its business and its closest competitors, and compares them with the client.") : tr("Cannot search the web with this provider: add the competitors below, or choose Claude in Settings → AI for live research.")}</li>
                                        <li>{tr("Proposes only ideas we can deliver with our services and prices, each with its evidence, plan, gain and effort.")}</li>
                                        <li>{tr("Nothing goes to the client: you pick the ideas and they become drafts.")}</li>
                                    </ul>
                                    <p className="mt-2 text-[11px] text-gray-500">{tr("Sent to {ai}: the company name, website and industry, what we invoiced and sold, project and support subjects. No contact names, emails or phone numbers.", { ai: `${st.provider} · ${st.model}` })}</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div><L>{tr("Look for")}</L><Select size="sm" isSearchable={false} options={FOCUS.map(([value, label]) => ({ value, label: tr(label) }))} value={{ value: f.focus, label: tr(FOCUS.find((x) => x[0] === f.focus)[1]) }} onChange={(o) => setF({ ...f, focus: o.value })} /></div>
                                    <div><L>{tr("How many ideas")}</L><Segment value={f.count} onChange={(c) => setF({ ...f, count: Array.isArray(c) ? c[0] : c })} size="sm" className="w-full">{[3, 5, 8].map((n) => <Segment.Item key={n} value={n} className="flex-1">{n}</Segment.Item>)}</Segment></div>
                                </div>
                                <div><L>{tr("Competitors to compare with (optional, one per line: a name or a website)")}</L><Input textArea rows={2} value={f.competitors} onChange={(e) => setF({ ...f, competitors: e.target.value })} /></div>
                                <div><L>{tr("Anything the AI should know or focus on (optional)")}</L><Input textArea rows={2} placeholder={tr("For example: they want more calls from Google, their budget is small")} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
                                <label className="flex items-center gap-2 text-sm"><Switcher checked={f.web && st.webSearch} disabled={!st.webSearch} onChange={(c) => setF({ ...f, web: c })} />{tr("Search the web (competitors, market, what is new)")}</label>
                            </>
                        )}
                        {busy === 'run' && <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-700/40">{tr("Researching… this can take up to two minutes when the AI searches the web.")}</div>}
                        {res && (
                            <>
                                <div className="rounded-xl border border-blue-200 p-3 dark:border-blue-500/30"><b className="mb-1 block text-sm">{tr("The business")}</b><p className="whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{res.research.summary || '—'}</p></div>
                                {res.research.competitors.length > 0 && (
                                    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"><b className="mb-2 block text-sm">{tr("Competitor benchmark")}</b>
                                        <div className="grid gap-2 sm:grid-cols-2">{res.research.competitors.map((c) => <div key={c.name} className="rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-700/40"><div className="font-semibold">{c.url ? <a href={c.url} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">{c.name}</a> : c.name}</div>{c.strengths && <div className="mt-1 text-gray-600 dark:text-gray-300"><b>{tr("They do well")}:</b> {c.strengths}</div>}{c.gap && <div className="mt-1 text-emerald-700 dark:text-emerald-400"><b>{tr("Our opening")}:</b> {c.gap}</div>}</div>)}</div>
                                    </div>
                                )}
                                <b className="block text-sm">{tr("Ideas")} <span className="font-normal text-gray-400">({res.ideas.length})</span></b>
                                {res.ideas.map((i, k) => (
                                    <label key={k} className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 transition', pick[k] ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700', i.duplicate && 'opacity-60')}>
                                        <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded border text-xs', pick[k] ? 'border-primary bg-primary text-white' : 'border-gray-300')}>{pick[k] && <TbCheck />}</span>
                                        <input type="checkbox" className="hidden" checked={!!pick[k]} onChange={(e) => setPick({ ...pick, [k]: e.target.checked })} />
                                        <span className="min-w-0 flex-1 text-sm">
                                            <span className="flex flex-wrap items-center gap-1.5"><b>{i.title}</b><Cat cat={catOf(data.categories, i.category)} code={i.category} />{i.duplicate && <span className="rounded bg-gray-200 px-1.5 text-[10px]">{tr("Already on the board")}</span>}</span>
                                            {i.why && <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300"><b>{tr("Why")}:</b> {i.why}</span>}
                                            {i.gain && <span className="mt-0.5 block text-xs text-emerald-700 dark:text-emerald-400"><b>{tr("Gain")}:</b> {i.gain}</span>}
                                            {i.plan?.length > 0 && <ol className="mt-1 list-decimal ps-5 text-xs text-gray-500">{i.plan.map((p, n) => <li key={n}>{p}</li>)}</ol>}
                                            <span className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-gray-500"><span>{tr("Impact")} <Dots n={i.impact} color="bg-emerald-500" /></span><span>{tr("Effort")} <Dots n={i.effort} color="bg-amber-500" /></span>{i.service && <span>{tr("Our service")}: <b>{i.service}</b></span>}{i.price != null && <span>{tr("Price")}: <b>{i.price}</b></span>}{i.kpi && <span>{tr("Measure")}: {i.kpi}</span>}</span>
                                            {i.sources?.length > 0 && <span className="mt-1 flex flex-wrap gap-2 text-[11px]">{i.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} className="flex items-center gap-0.5 text-primary hover:underline"><TbExternalLink />{(() => { try { return new URL(s).hostname } catch { return s } })()}</a>)}</span>}
                                        </span>
                                    </label>
                                ))}
                                {!res.ideas.length && <p className="py-4 text-center text-sm text-gray-400">{tr("The AI found nothing worth proposing. Add more context and try again.")}</p>}
                            </>
                        )}
                    </>
                )}
            </div>
            <div className="mt-3 flex shrink-0 items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                {res && <Button variant="plain" onClick={() => setRes(null)}>{tr("Search again")}</Button>}
                <div className="ms-auto flex gap-2"><Button onClick={onClose}>{tr("Close")}</Button>
                    {st?.ready && !res && <Button variant="solid" icon={<TbSparkles />} loading={busy === 'run'} onClick={run}>{tr("Research")}</Button>}
                    {res && <Button variant="solid" loading={busy === 'add'} disabled={!chosen} onClick={add}>{tr("Add {n} as drafts", { n: chosen })}</Button>}
                </div>
            </div>
        </Dialog>
    )
}

/* ------------------------------------------------------------ the tab */
const ClientIdeas = ({ clientId, openId }) => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [sel, setSel] = useState(null)
    const [ai, setAi] = useState(false)
    const [q, setQ] = useState('')
    const [cat, setCat] = useState('')
    const [bench, setBench] = useState(false)
    const load = useCallback(() => api(`/api/crm/client-ideas?clientId=${clientId}`).then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [clientId])
    useEffect(() => { load() }, [load])
    useEffect(() => { if (openId && d) { const i = d.list.find((x) => x.id === openId); if (i) setSel(i) } }, [openId, d])
    const cur = useMemo(() => Object.fromEntries((d?.currencies || []).map((c) => [c.id, c])), [d])
    const shown = useMemo(() => (d?.list || []).filter((i) => (!cat || i.category === cat) && (!q || `${i.title} ${i.gain}`.toLowerCase().includes(q.toLowerCase()))), [d, q, cat])
    if (error) return <p className="py-10 text-center text-red-500">{error}</p>
    if (!d) return <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p>
    const onDragEnd = async ({ draggableId, destination, source }) => {
        if (!destination || !d.can.edit) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return
        const before = d
        const status = destination.droppableId
        const moved = d.list.find((i) => i.id === draggableId)
        const others = d.list.filter((i) => i.id !== draggableId)
        const col = others.filter((i) => i.status === status)
        col.splice(destination.index, 0, { ...moved, status, visible: status === 'draft' ? false : moved.visible || (status === 'proposed' && !moved.proposedAt) })
        setD({ ...d, list: [...others.filter((i) => i.status !== status), ...col] })
        try {
            const r = await api(`/api/crm/client-ideas/${draggableId}/move`, { method: 'POST', body: { clientId, status, index: destination.index } })
            if (r.mailed) notify('success', tr("The client was emailed ({n})", { n: r.mailed }))
            load()
        } catch (e) { setD(before); notify('danger', e.message) }
    }
    const catOpts = [{ value: '', label: tr("All categories") }, ...d.categories.map((c) => ({ value: c.code, label: tr(c.name) }))]
    const waiting = d.list.filter((i) => i.status === 'proposed').length
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search ideas")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <div className="w-48"><Select size="sm" isSearchable={false} options={catOpts} value={catOpts.find((o) => o.value === cat)} onChange={(o) => setCat(o.value)} /></div>
                {d.can.edit && <Link to="/crm/idea-categories" className="text-xs text-primary hover:underline">{tr("Edit categories")}</Link>}
                <span className="text-xs text-gray-400">{d.list.length} {tr("ideas")}{waiting ? ` · ${waiting} ${tr("waiting for the client")}` : ''}</span>
                <div className="ms-auto flex gap-2">
                    {d.can.create && <Button size="sm" icon={<TbSparkles />} className="!border-violet-300 !bg-violet-50 !text-violet-700 hover:!bg-violet-100 dark:!bg-violet-500/10 dark:!text-violet-300" onClick={() => setAi(true)}>{tr("AI research")}</Button>}
                    {d.can.create && <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => setSel({ ...blank })}>{tr("New idea")}</Button>}
                </div>
            </div>
            {d.research && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-500/5">
                    <button type="button" onClick={() => setBench((b) => !b)} className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm"><TbSparkles className="text-violet-500" /><b>{tr("Last AI research")}</b><span className="text-xs text-gray-400">{dayjs(d.research.createdAt).format('DD MMM YYYY')}{d.research.webSearch ? ` · ${tr("with web search")}` : ''}</span><span className="min-w-0 flex-1 truncate text-xs text-gray-500">{!bench && d.research.summary}</span><TbChevronDown className={cn('shrink-0 text-gray-400 transition', bench && 'rotate-180')} /></button>
                    {bench && <div className="space-y-2 px-3 pb-3 text-sm"><p className="whitespace-pre-line text-gray-600 dark:text-gray-300">{d.research.summary}</p>{d.research.competitors?.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{d.research.competitors.map((c) => <div key={c.name} className="rounded-lg bg-white p-2.5 text-xs dark:bg-gray-800"><b>{c.name}</b>{c.strengths && <div className="mt-0.5 text-gray-500">{c.strengths}</div>}{c.gap && <div className="mt-0.5 text-emerald-700 dark:text-emerald-400">{c.gap}</div>}</div>)}</div>}</div>}
                </div>
            )}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {Object.entries(STATUS).map(([s, [label, dot]]) => {
                        const items = shown.filter((i) => i.status === s)
                        return (
                            <Droppable key={s} droppableId={s} isDropDisabled={!d.can.edit}>
                                {(prov, snap) => (
                                    <div ref={prov.innerRef} {...prov.droppableProps} className={cn('w-[250px] shrink-0 rounded-2xl p-2.5 transition-colors', snap.isDraggingOver ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-gray-50 dark:bg-gray-800/60')}>
                                        <div className="mb-2 flex items-center justify-between px-1"><span className="flex items-center gap-2 text-sm font-semibold"><i className={cn('h-2.5 w-2.5 rounded-full', dot)} /><Link to={`/crm/status/ideas/${s}`} title={tr("Open the page of this status")} className="hover:underline">{tr(label)}</Link></span><span className="rounded-full bg-white px-2 text-xs text-gray-500 dark:bg-gray-700">{items.length}</span></div>
                                        <div className="min-h-[60px] space-y-2">
                                            {items.map((i, idx) => (
                                                <Draggable key={i.id} draggableId={i.id} index={idx} isDragDisabled={!d.can.edit}>
                                                    {(p, sn) => <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={cn(sn.isDragging && 'rotate-1 shadow-xl')}><IdeaCard i={i} cur={cur[i.currencyId]} cats={d.categories} onOpen={setSel} /></div>}
                                                </Draggable>
                                            ))}
                                            {prov.placeholder}
                                            {!items.length && !snap.isDraggingOver && <p className="py-4 text-center text-xs text-gray-400">—</p>}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        )
                    })}
                </div>
            </DragDropContext>
            {!d.list.length && <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600"><TbBulb className="mx-auto mb-2 text-3xl text-blue-400" />{tr("No idea for this client yet. Write one, or let the AI study the client and its competitors and suggest what is worth proposing.")}</div>}
            <IdeaDialog idea={sel} data={d} clientId={clientId} onClose={() => setSel(null)} onChanged={load} />
            <AiDialog open={ai} clientId={clientId} data={d} onClose={() => setAi(false)} onChanged={load} />
        </div>
    )
}

export default ClientIdeas
