/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbBug, TbPlug, TbAdjustments, TbHelpCircle, TbDots, TbPlus, TbSearch, TbMessageCircle, TbChecklist, TbPaperclip, TbTrash, TbUsers, TbExternalLink, TbFlag, TbPhoto, TbArrowsExchange, TbEye, TbEyeOff } from 'react-icons/tb'
import Pipeline from '@/components/crm/Pipeline'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import FoldSection from '@/components/crm/FoldSection'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import { CommentTools, CommentEdit, ReplyQuote, ReplyingTo, CommentThread } from '@/components/crm/CommentParts'
import cn from '@/utils/classNames'
import { api, notify, upload, formatBytes } from '../kit/api'
import { tr } from '@/utils/t'

export const TYPE_ICON = { bug: <TbBug />, integration: <TbPlug />, change: <TbAdjustments />, question: <TbHelpCircle />, other: <TbFlag /> }
const TYPE_TONE = { bug: 'bg-rose-100 text-rose-700', integration: 'bg-indigo-100 text-indigo-700', change: 'bg-amber-100 text-amber-700', question: 'bg-sky-100 text-sky-700', other: 'bg-gray-100 text-gray-600' }
const PRIO_COLOR = { 1: '#9ca3af', 2: '#3b82f6', 3: '#f97316', 4: '#ef4444' }
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const blank = { title: '', body: '', type: 'bug', priority: 2, status: 'new', visible: true, url: '', dueDate: '', assigneeIds: [], attachments: [] }

/** "Status: New → Planned" line of the conversation. */
export const SystemLine = ({ s, labels }) => <div className="my-1 text-center text-xs text-gray-400">{tr('Status')}: <b>{tr(labels[s.from] || s.from)}</b> → <b>{tr(labels[s.to] || s.to)}</b></div>

const RequestDialog = ({ request, data, clientId, onClose, onChanged }) => {
    const [v, setV] = useState(null)
    const [sec, setSec] = useState('req')
    const [comments, setComments] = useState([])
    const [text, setText] = useState('')
    const [internal, setInternal] = useState(false)
    const [replyTo, setReplyTo] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [busy, setBusy] = useState('')
    const [del, setDel] = useState(false)
    const isNew = !!request && !request.id
    const can = data.can
    const readOnly = isNew ? !can.create : !can.edit
    const labels = Object.fromEntries(data.statuses.map((s) => [s.key, s.name]))
    useEffect(() => {
        if (!request) return
        setV({ ...blank, ...request, body: request.body || '', url: request.url || '', dueDate: request.dueDate ? dayjs(request.dueDate).format('YYYY-MM-DD') : '', assigneeIds: request.assigneeIds || [], attachments: request.attachments || [] })
        setSec(request.id ? 'talk' : 'req'); setComments([]); setText(''); setInternal(false); setReplyTo(null); setEditingId(null)
        if (request.id) api(`/api/crm/client-requests/${request.id}/comments?clientId=${clientId}`).then((r) => setComments(r.list)).catch(() => {})
    }, [request, clientId])
    if (!request || !v) return null
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const toggle = (k) => setSec((s) => (s === k ? '' : k))
    const staffOpts = data.staff.map((s) => ({ value: s.id, label: s.name }))
    const statusOpts = data.statuses.map((s) => ({ value: s.key, label: tr(s.name) }))
    const reload = () => api(`/api/crm/client-requests/${request.id}/comments?clientId=${clientId}`).then((r) => setComments(r.list)).catch(() => {})
    const save = async () => {
        if (!v.title.trim()) { setSec('req'); return notify('danger', tr('Give the request a title')) }
        setBusy('save')
        try {
            const body = { clientId, ...v, dueDate: v.dueDate || null }
            const r = isNew ? await api('/api/crm/client-requests', { method: 'POST', body }) : await api(`/api/crm/client-requests/${request.id}`, { method: 'PUT', body })
            notify('success', r.mailed ? tr('Saved. {n} email(s) sent to the client.', { n: r.mailed }) : tr('Saved'))
            onChanged(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const remove = async () => { setBusy('del'); try { await api(`/api/crm/client-requests/${request.id}?clientId=${clientId}`, { method: 'DELETE' }); onChanged(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(''); setDel(false) } }
    const say = async () => {
        if (!text.replace(/<[^>]*>/g, '').trim() && !/<img/i.test(text)) return
        setBusy('say')
        try { const r = await api(`/api/crm/client-requests/${request.id}/comments`, { method: 'POST', body: { clientId, body: text, internal, replyToId: replyTo?.id } }); setComments((c) => [...c, r.comment]); setText(''); setReplyTo(null); onChanged() } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const removeComment = async (c) => { try { await api(`/api/crm/client-requests/${request.id}/comments?clientId=${clientId}&commentId=${c.id}`, { method: 'DELETE' }); await reload(); onChanged() } catch (e) { notify('danger', e.message) } }
    const task = async () => { setBusy('task'); try { const r = await api(`/api/crm/client-requests/${request.id}/task`, { method: 'POST', body: { clientId } }); notify('success', r.existing ? tr('The task already exists') : tr('Task created')); onChanged(); window.open(`/crm/tasks/${r.taskId}`, '_blank') } catch (e) { notify('danger', e.message) } finally { setBusy('') } }
    const addFiles = async (files) => {
        setBusy('file')
        try { const got = []; for (const f of files) { const fd = new FormData(); fd.append('file', f); got.push(await upload('/api/crm/client-requests/upload', fd)) } set({ attachments: [...v.attachments, ...got].slice(0, 20) }) } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const st = data.statuses.find((s) => s.key === v.status)
    return (
        <>
            <Dialog isOpen onClose={onClose} onRequestClose={onClose} width={700} height="min(calc(100vh - 48px), 840px)" contentClassName="flex flex-col overflow-hidden">
                <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 pr-10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-500 text-lg text-white">{TYPE_ICON[v.type]}</span>
                    <h5 className="mr-auto">{isNew ? tr('New request') : <>{request.code} <span className="font-normal text-gray-500">· {tr(data.types[v.type])}</span></>}</h5>
                    {!isNew && request.source === 'client' && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{tr('From the client')}</span>}
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: st?.color }}>{tr(st?.name || '')}</span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    <fieldset disabled={readOnly || !!busy} className="contents">
                        <FoldSection icon={<TbFlag />} tone="rose" title={tr('The request')} summary={`${tr(data.types[v.type])} · ${v.title || tr('No title yet')}`} open={sec === 'req'} onToggle={() => toggle('req')}>
                            <div className="space-y-3">
                                <div><L>{tr('Title')}</L><Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder={tr('What is wrong, or what do we need?')} /></div>
                                <div><L>{tr('Kind of request')}</L><div className="flex flex-wrap gap-1.5">{Object.entries(data.types).map(([k, label]) => <button key={k} type="button" onClick={() => set({ type: k })} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition', v.type === k ? `${TYPE_TONE[k]} ring-current` : 'bg-white text-gray-500 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600')}>{TYPE_ICON[k]}{tr(label)}</button>)}</div></div>
                                <div><L>{tr('Priority')}</L><div className="flex gap-1.5">{Object.entries(data.priorities).map(([k, label]) => <button key={k} type="button" onClick={() => set({ priority: +k })} className={cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition', v.priority === +k ? 'text-white ring-transparent' : 'bg-white text-gray-500 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600')} style={v.priority === +k ? { background: PRIO_COLOR[k] } : undefined}>{tr(label)}</button>)}</div></div>
                                <div><L>{tr('Details: steps to reproduce, what you expected, what to integrate')}</L><RichEditor minHeight={140} value={v.body} onChange={(html) => set({ body: html })} placeholder={tr('Describe it so that someone who was not there can understand')} /></div>
                                <div><L>{tr('Page address or website')}</L><Input value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" /></div>
                            </div>
                        </FoldSection>
                        <FoldSection icon={<TbPhoto />} tone="blue" title={tr('Screenshots and files')} summary={v.attachments.length ? tr('{n} attached', { n: v.attachments.length }) : ''} open={sec === 'files'} onToggle={() => toggle('files')}>
                            <label className="mb-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600"><TbPaperclip />{tr('Add a screenshot or a file')}<input type="file" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = '' }} /></label>
                            <div className="space-y-1.5">{v.attachments.map((a) => (
                                <div key={a.url} className="flex items-center gap-2 rounded-lg border border-gray-200 p-1.5 text-sm dark:border-gray-700">
                                    {a.kind === 'image' ? <img loading="lazy" decoding="async" src={a.url} alt="" className="size-10 shrink-0 rounded-md object-cover" /> : <TbPaperclip className="mx-2 shrink-0 text-gray-400" />}
                                    <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-semibold hover:underline">{a.name}</a><span className="text-xs text-gray-400">{formatBytes(a.size)}</span>
                                    {!readOnly && <button type="button" aria-label={tr('Remove')} onClick={() => set({ attachments: v.attachments.filter((x) => x.url !== a.url) })} className="text-gray-400 hover:text-red-500"><TbTrash /></button>}
                                </div>
                            ))}</div>
                        </FoldSection>
                        <FoldSection icon={<TbUsers />} tone="violet" title={tr('Status and team')} summary={`${tr(st?.name || '')} · ${v.visible ? tr('Visible to the client') : tr('Team only')}`} open={sec === 'team'} onToggle={() => toggle('team')}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div><L>{tr('Status')}</L><Select size="sm" isSearchable={false} options={statusOpts} value={statusOpts.find((o) => o.value === v.status)} onChange={(o) => set({ status: o.value })} /></div>
                                <div><L>{tr('Due date')}</L><Input size="sm" type="date" value={v.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></div>
                            </div>
                            <div className="mt-3"><L>{tr('Assigned to')}</L><Select isMulti isClearable placeholder={tr('Assign team members…')} options={staffOpts} value={staffOpts.filter((o) => v.assigneeIds.includes(o.value))} onChange={(opts) => set({ assigneeIds: (opts || []).map((o) => o.value) })} /></div>
                            <label className="mt-3 flex items-center gap-2 text-sm"><Switcher checked={v.visible} onChange={(c) => set({ visible: c })} />{v.visible ? <TbEye /> : <TbEyeOff />}{tr('Visible to the client')}</label>
                            <p className="mt-1 text-xs text-gray-500">{tr('The client sees the status, the messages and the files, and is told by email and on the phone when the status changes.')}</p>
                        </FoldSection>
                        {!isNew && (
                            <FoldSection icon={<TbMessageCircle />} tone="emerald" title={tr('Follow-up')} summary={comments.filter((c) => !c.system).length ? tr('{n} message(s)', { n: comments.filter((c) => !c.system).length }) : tr('No message yet')} open={sec === 'talk'} onToggle={() => toggle('talk')}>
                                <div className="space-y-3">
                                    <CommentThread comments={comments} render={(c) => c.system ? <SystemLine key={c.id} s={c.system} labels={labels} /> : (
                                        <div key={c.id} className="group relative flex gap-2.5">
                                            <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white', c.authorKind === 'client' ? 'bg-blue-500' : c.internal ? 'bg-amber-500' : 'bg-gray-500')}>{(c.authorName || '?')[0]?.toUpperCase()}</span>
                                            <div className={cn('min-w-0 flex-1 rounded-xl p-2.5 text-sm', c.authorKind === 'client' ? 'bg-blue-50 dark:bg-blue-500/10' : c.internal ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-gray-50 dark:bg-gray-700/40')}>
                                                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="truncate text-gray-700 dark:text-gray-200">{c.authorName || (c.authorKind === 'client' ? tr('Client') : tr('Team'))}</b>{c.authorKind === 'client' && <span className="rounded bg-blue-100 px-1.5 text-blue-700">{tr('Client')}</span>}{c.internal && <span className="rounded bg-amber-100 px-1.5 text-amber-700">{tr('Team only')}</span>}<span>{dayjs(c.createdAt).format('DD MMM, HH:mm')}{c.edited ? ` · ${tr('edited')}` : ''}</span></div>
                                                <ReplyQuote r={c.replyTo} />
                                                {editingId === c.id
                                                    ? <CommentEdit initial={c.body} onCancel={() => setEditingId(null)} onSave={async (t) => { await api(`/api/crm/client-requests/${request.id}/comments`, { method: 'PUT', body: { clientId, commentId: c.id, body: t } }); setEditingId(null); await reload() }} />
                                                    : <RichView html={c.body} />}
                                            </div>
                                            {editingId !== c.id && can.edit && <CommentTools onReply={() => { setReplyTo({ id: c.id, name: c.authorName || tr('Client') }); setText((x) => x || (c.authorKind === 'staff' && c.authorName ? `@${c.authorName} ` : '')) }} onEdit={c.mine ? () => setEditingId(c.id) : null} onDelete={c.canDelete ? () => removeComment(c) : null} />}
                                        </div>
                                    )} />
                                    {!comments.length && <p className="py-2 text-center text-xs text-gray-400">{tr('Questions, answers and status changes between you and the client appear here.')}</p>}
                                </div>
                                {can.edit && (
                                    <div className="mt-3 space-y-2">
                                        <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                                        <RichEditor minHeight={80} extraMentions={data.contacts || []} placeholder={internal || !v.visible ? tr('A note for the team only…') : tr('Write to the client — use @ to mention a contact')} value={text} onChange={setText} />
                                        <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs text-gray-500"><Switcher checked={internal || !v.visible} disabled={!v.visible} onChange={setInternal} />{tr('Team only')}</label><Button size="sm" variant="solid" loading={busy === 'say'} onClick={say}>{tr('Send')}</Button></div>
                                    </div>
                                )}
                            </FoldSection>
                        )}
                    </fieldset>
                </div>
                <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    {!isNew && can.delete && <Button type="button" variant="plain" className="text-red-500" onClick={() => setDel(true)}>{tr('Delete')}</Button>}
                    {!isNew && can.edit && <Button type="button" size="sm" icon={<TbChecklist />} loading={busy === 'task'} onClick={task}>{request.taskId ? tr('Open the task') : tr('Make a task')}</Button>}
                    <div className="ms-auto flex gap-2"><Button onClick={onClose}>{readOnly ? tr('Close') : tr('Cancel')}</Button>{!readOnly && <Button variant="solid" loading={busy === 'save'} onClick={save}>{isNew ? tr('Create request') : tr('Save changes')}</Button>}</div>
                </div>
            </Dialog>
            <ConfirmDialog isOpen={del} type="danger" title={tr('Delete this request?')} confirmText={tr('Delete')} onClose={() => setDel(false)} onRequestClose={() => setDel(false)} onCancel={() => setDel(false)} onConfirm={remove}><p>{tr('The request and its messages are removed. The client will not see it any more.')}</p></ConfirmDialog>
        </>
    )
}

/** Requests of one client: errors to report, code integrations, changes and questions, followed on a board the client also sees. */
const ClientRequests = ({ clientId, openId = '' }) => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [q, setQ] = useState('')
    const [sel, setSel] = useState(null)
    const load = useCallback(() => api(`/api/crm/client-requests?clientId=${clientId}`).then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [clientId])
    useEffect(() => { load() }, [load])
    useEffect(() => { if (openId && d) { const r = d.list.find((x) => x.id === openId); if (r) setSel(r) } }, [openId, d?.list?.length]) // eslint-disable-line react-hooks/exhaustive-deps
    const shown = useMemo(() => (d?.list || []).filter((r) => !q.trim() || `${r.title} ${r.code} ${r.createdByName}`.toLowerCase().includes(q.trim().toLowerCase())), [d, q])
    if (error) return <p className="py-10 text-center text-gray-400">{error}</p>
    if (!d) return <p className="py-10 text-center text-gray-400">{tr('Loading…')}</p>
    const person = (id) => d.staff.find((s) => s.id === id)
    const move = async (it, to) => { try { const r = await api(`/api/crm/client-requests/${it.id}/move`, { method: 'POST', body: { clientId, status: to } }); if (r.mailed) notify('success', tr('{n} email(s) sent to the client.', { n: r.mailed })); load() } catch (e) { notify('danger', e.message); load() } }
    const columns = d.statuses.map((s) => ({
        id: s.key, name: tr(s.name), color: s.color, count: shown.filter((r) => r.status === s.key).length,
        items: shown.filter((r) => r.status === s.key).map((r) => ({
            id: r.id, title: r.title, sub: `${r.code} · ${tr(d.types[r.type])}`, date: r.dueDate ? dayjs(r.dueDate).format('DD MMM') : dayjs(r.createdAt).format('DD MMM'), overdue: !!r.dueDate && dayjs(r.dueDate).isBefore(dayjs(), 'day') && !['done', 'declined'].includes(r.status),
            label: tr(d.priorities[r.priority]), labelPill: PRIO_COLOR[r.priority], comments: r.comments,
            people: <span className="flex -space-x-1.5">{(r.assigneeIds || []).slice(0, 3).map((id) => <span key={id} title={person(id)?.name} className="grid size-6 place-items-center rounded-full bg-gray-300 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">{(person(id)?.name || '?')[0]}</span>)}{r.source === 'client' && <span className="ms-1.5 rounded bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">{tr('Client')}</span>}</span>,
        })),
    }))
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <span className="text-sm text-gray-500">{d.list.filter((r) => !['done', 'declined'].includes(r.status)).length} {tr('open')}</span>
                {d.can.create && <Button size="sm" variant="solid" className="ms-auto" icon={<TbPlus />} onClick={() => setSel({ ...blank })}>{tr('New request')}</Button>}
            </div>
            <Pipeline
                columns={columns}
                canDrag={() => !!d.can.edit}
                onOpen={(it) => setSel(d.list.find((r) => r.id === it.id))}
                onAdd={d.can.create ? (c) => setSel({ ...blank, status: c.id }) : undefined}
                onMoveTo={d.can.edit ? (it, to) => move(it, to) : undefined}
                onMove={({ item, to }) => move(item, to)}
                emptyText={tr('No request yet')}
            />
            <RequestDialog request={sel} data={d} clientId={clientId} onClose={() => setSel(null)} onChanged={load} />
        </div>
    )
}

export default ClientRequests
