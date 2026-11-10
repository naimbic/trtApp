/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbChartBar, TbCompass, TbPlus, TbSearch, TbSend, TbMessageCircle, TbChecklist, TbPaperclip, TbTrash, TbUsers, TbEye, TbEyeOff, TbLink, TbFileText, TbUpload, TbFolderSymlink, TbExternalLink } from 'react-icons/tb'
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
import { CommentAttach, CommentFiles, EMPTY_EXTRAS, hasExtras } from '@/components/crm/CommentExtras'
import { CommentFoot, CommentEdit, ReplyQuote, ReplyingTo, CommentThread } from '@/components/crm/CommentParts'
import cn from '@/utils/classNames'
import MediaPicker from '@/components/crm/MediaPicker'
import { api, notify, upload, formatBytes, useCan } from '../kit/api'
import { plainOf } from '@/components/crm/ShareButton'
import { SystemLine } from './ClientRequests'
import { tr } from '@/utils/t'

const KIND_ICON = { report: <TbChartBar />, strategy: <TbCompass /> }
const KIND_TONE = { report: 'bg-blue-100 text-blue-700', strategy: 'bg-violet-100 text-violet-700' }
const PRIO_COLOR = { 1: '#9ca3af', 2: '#3b82f6', 3: '#f97316', 4: '#ef4444' }
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const blank = { kind: 'report', title: '', body: '', period: '', status: 'draft', priority: 2, visible: true, dueDate: '', assigneeIds: [], attachments: [], links: [] }
const isLink = (s) => { try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`); return u.hostname.includes('.') } catch { return false } }

const ReportDialog = ({ report, data, clientId, onClose, onChanged, onSend }) => {
    const [v, setV] = useState(null)
    const [sec, setSec] = useState('doc')
    const [comments, setComments] = useState([])
    const [text, setText] = useState('')
    const [extras, setExtras] = useState(EMPTY_EXTRAS)
    const [internal, setInternal] = useState(false)
    const [replyTo, setReplyTo] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [busy, setBusy] = useState('')
    const [del, setDel] = useState(false)
    const [link, setLink] = useState({ url: '', title: '' })
    const [linkOpen, setLinkOpen] = useState(false)
    const [pick, setPick] = useState(false)
    const can_ = useCan()
    const canBrowse = can_('file_manager', 'view')
    const isNew = !!report && !report.id
    const can = data.can
    const fcan = can.files || { view: true, create: true, edit: true, delete: true }
    const readOnly = isNew ? !can.create : !can.edit
    const labels = Object.fromEntries(data.statuses.map((s) => [s.key, s.name]))
    const url = (p = '') => `/api/crm/client-reports/${report.id}/comments?clientId=${clientId}${p}`
    useEffect(() => {
        if (!report) return
        setV({ ...blank, ...report, body: report.body || '', period: report.period || '', dueDate: report.dueDate ? dayjs(report.dueDate).format('YYYY-MM-DD') : '', assigneeIds: report.assigneeIds || [], attachments: report.attachments || [], links: report.links || [] })
        setSec(report.id ? 'talk' : 'doc'); setComments([]); setText(''); setExtras(EMPTY_EXTRAS); setInternal(false); setReplyTo(null); setEditingId(null); setLink({ url: '', title: '' })
        if (report.id) api(`/api/crm/client-reports/${report.id}/comments?clientId=${clientId}`).then((r) => setComments(r.list)).catch(() => {})
    }, [report, clientId])
    if (!report || !v) return null
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const toggle = (k) => setSec((s) => (s === k ? '' : k))
    const staffOpts = data.staff.map((s) => ({ value: s.id, label: s.name }))
    const statusOpts = data.statuses.map((s) => ({ value: s.key, label: tr(s.name) }))
    const reload = () => api(url()).then((r) => setComments(r.list)).catch(() => {})
    const react = async (c, emoji) => { try { await api(`/api/crm/client-reports/${report.id}/comments`, { method: 'POST', body: { clientId, commentId: c.id, react: emoji } }); await reload() } catch (e) { notify('danger', e.message) } }
    const mention = async (c, sid) => { try { await api(`/api/crm/client-reports/${report.id}/comments`, { method: 'POST', body: { clientId, commentId: c.id, mention: sid } }); notify('success', tr('Colleague mentioned')) } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        if (!v.title.trim()) { setSec('doc'); return notify('danger', tr('Give it a title')) }
        setBusy('save')
        try {
            const body = { clientId, ...v, dueDate: v.dueDate || null }
            await api(isNew ? '/api/crm/client-reports' : `/api/crm/client-reports/${report.id}`, { method: isNew ? 'POST' : 'PUT', body })
            notify('success', tr('Saved')); onChanged(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const remove = async () => { setBusy('del'); try { await api(`/api/crm/client-reports/${report.id}?clientId=${clientId}`, { method: 'DELETE' }); onChanged(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(''); setDel(false) } }
    const say = async () => {
        if (!text.replace(/<[^>]*>/g, '').trim() && !/<img/i.test(text) && !hasExtras(extras)) return
        setBusy('say')
        try { const r = await api(`/api/crm/client-reports/${report.id}/comments`, { method: 'POST', body: { clientId, body: text, internal, replyToId: replyTo?.id, ...extras } }); setComments((c) => [...c, r.comment]); setText(''); setExtras(EMPTY_EXTRAS); setReplyTo(null); onChanged() } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const task = async () => { setBusy('task'); try { const r = await api(`/api/crm/client-reports/${report.id}/task`, { method: 'POST', body: { clientId } }); notify('success', tr('Task created')); window.open(`/crm/tasks/${r.taskId}`, '_blank') } catch (e) { notify('danger', e.message) } finally { setBusy('') } }
    const addFiles = async (files) => {
        setBusy('file')
        try { const got = []; for (const f of files) { const fd = new FormData(); fd.append('file', f); got.push(await upload('/api/crm/client-reports/upload', fd)) } set({ attachments: [...v.attachments, ...got].slice(0, 20) }) } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const pickFile = (m) => {
        if (v.attachments.some((x) => x.url === m.url)) return
        set({ attachments: [...v.attachments, { url: m.url, name: m.name, mime: m.mime || '', size: m.size || 0, kind: m.kind || 'file' }].slice(0, 20) })
    }
    const addLink = () => {
        if (!isLink(link.url.trim())) return notify('danger', tr('Enter a valid web address'))
        set({ links: [...v.links, { url: link.url.trim(), title: link.title.trim() }].slice(0, 20) }); setLink({ url: '', title: '' }); setLinkOpen(false)
    }
    const st = data.statuses.find((s) => s.key === v.status)
    const nMsg = comments.filter((c) => !c.system).length
    return (
        <>
            <Dialog isOpen onClose={onClose} onRequestClose={onClose} width={700} height="min(calc(100vh - 48px), 840px)" contentClassName="flex flex-col overflow-hidden">
                <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 pr-10">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl text-lg', KIND_TONE[v.kind])}>{KIND_ICON[v.kind]}</span>
                    <h5 className="mr-auto">{isNew ? (v.kind === 'strategy' ? tr('New strategy') : tr('New report')) : <>{report.code} <span className="font-normal text-gray-500">· {tr(data.kinds[v.kind])}</span></>}</h5>
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: st?.color }}>{tr(st?.name || '')}</span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    <fieldset disabled={readOnly || !!busy} className="contents">
                        <FoldSection icon={<TbFileText />} tone="rose" title={tr('The document')} summary={`${tr(data.kinds[v.kind])} · ${v.title || tr('No title yet')}`} open={sec === 'doc'} onToggle={() => toggle('doc')}>
                            <div className="space-y-3">
                                <div><L>{tr('Title')}</L><Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder={v.kind === 'strategy' ? tr('Strategy for the next quarter') : tr('Monthly report')} /></div>
                                <div><L>{tr('Kind')}</L><div className="flex flex-wrap gap-1.5">{Object.entries(data.kinds).map(([k, label]) => <button key={k} type="button" onClick={() => set({ kind: k })} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition', v.kind === k ? `${KIND_TONE[k]} ring-current` : 'bg-white text-gray-500 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600')}>{KIND_ICON[k]}{tr(label)}</button>)}</div></div>
                                <div><L>{tr('Period it covers (optional)')}</L><Input value={v.period} onChange={(e) => set({ period: e.target.value })} placeholder={tr('October 2026')} /></div>
                                <div><L>{tr('Priority')}</L><div className="flex gap-1.5">{Object.entries(data.priorities).map(([k, label]) => <button key={k} type="button" onClick={() => set({ priority: +k })} className={cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition', v.priority === +k ? 'text-white ring-transparent' : 'bg-white text-gray-500 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600')} style={v.priority === +k ? { background: PRIO_COLOR[k] } : undefined}>{tr(label)}</button>)}</div></div>
                                <div><L>{tr('Content')}</L><RichEditor minHeight={180} value={v.body} onChange={(html) => set({ body: html })} placeholder={v.kind === 'strategy' ? tr('Goals, actions, timing and budget...') : tr('What was done, the results, what comes next...')} /></div>
                            </div>
                        </FoldSection>
                        {fcan.view && <FoldSection icon={<TbPaperclip />} tone="blue" title={tr('Files and links')} summary={[v.attachments.length && tr('{n} file(s)', { n: v.attachments.length }), v.links.length && tr('{n} link(s)', { n: v.links.length })].filter(Boolean).join(' · ')} open={sec === 'files'} onToggle={() => toggle('files')}>
                            {!readOnly && (fcan.create || canBrowse) && (
                                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                                    {fcan.create && <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"><TbUpload className="text-lg" />{busy === 'file' ? tr('Uploading…') : tr('Upload')}<input type="file" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = '' }} /></label>}
                                    {fcan.create && canBrowse && <button type="button" onClick={() => setPick(true)} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"><TbFolderSymlink className="text-lg" />{tr('From the file manager')}</button>}
                                    {fcan.create && <button type="button" onClick={() => setLinkOpen((x) => !x)} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"><TbLink className="text-lg" />{tr('Add a link')}</button>}
                                </div>
                            )}
                            {!v.attachments.length && !v.links.length && <p className="py-3 text-center text-sm text-gray-400">{tr('No files or links yet.')}</p>}
                            <div className="space-y-1.5">{v.attachments.map((a) => (
                                <div key={a.url} className="flex items-center gap-2 rounded-lg border border-gray-200 p-1.5 text-sm dark:border-gray-700">
                                    {a.kind === 'image' ? <img loading="lazy" decoding="async" src={a.url} alt="" className="size-10 shrink-0 rounded-md object-cover" /> : <TbPaperclip className="mx-2 shrink-0 text-gray-400" />}
                                    {!readOnly && fcan.edit
                                        ? <input value={a.name} maxLength={120} aria-label={tr('Name')} onChange={(e) => set({ attachments: v.attachments.map((x) => (x.url === a.url ? { ...x, name: e.target.value } : x)) })} className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-semibold outline-none hover:border-gray-200 focus:border-primary dark:hover:border-gray-600" />
                                        : <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>}
                                    <span className="shrink-0 text-xs text-gray-400">{formatBytes(a.size)}</span>
                                    <a href={a.url} target="_blank" rel="noreferrer" aria-label={tr('Open')} title={tr('Open')} className="grid size-7 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbExternalLink /></a>
                                    {!readOnly && fcan.delete && <button type="button" aria-label={tr('Remove')} title={tr('Remove')} onClick={() => set({ attachments: v.attachments.filter((x) => x.url !== a.url) })} className="grid size-7 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><TbTrash /></button>}
                                </div>
                            ))}</div>
                            <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                                <L>{tr('Links')}</L>
                                <div className="space-y-1.5">{v.links.map((l) => (
                                    <div key={l.url} className="flex items-center gap-2 rounded-lg border border-gray-200 p-1.5 text-sm dark:border-gray-700">
                                        <TbLink className="mx-2 shrink-0 text-gray-400" />
                                        {!readOnly && fcan.edit
                                            ? <input value={l.title} placeholder={l.url} maxLength={120} aria-label={tr('Name')} onChange={(e) => set({ links: v.links.map((x) => (x.url === l.url ? { ...x, title: e.target.value } : x)) })} className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-semibold outline-none placeholder:font-normal hover:border-gray-200 focus:border-primary dark:hover:border-gray-600" />
                                            : <span className="min-w-0 flex-1 truncate font-semibold">{l.title || l.url}</span>}
                                        {l.title && <span className="hidden max-w-[35%] truncate text-xs text-gray-400 sm:block">{l.url}</span>}
                                        <a href={l.url} target="_blank" rel="noreferrer noopener" aria-label={tr('Open')} title={tr('Open')} className="grid size-7 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbExternalLink /></a>
                                        {!readOnly && fcan.delete && <button type="button" aria-label={tr('Remove')} title={tr('Remove')} onClick={() => set({ links: v.links.filter((x) => x.url !== l.url) })} className="grid size-7 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><TbTrash /></button>}
                                    </div>
                                ))}</div>
                                {!readOnly && fcan.create && linkOpen && (
                                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                        <Input size="sm" autoFocus placeholder="https://" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
                                        <Input size="sm" placeholder={tr('Name (optional)')} value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
                                        <Button size="sm" type="button" icon={<TbPlus />} onClick={addLink}>{tr('Add link')}</Button>
                                    </div>
                                )}
                            </div>
                        </FoldSection>}
                        <FoldSection icon={<TbUsers />} tone="violet" title={tr('Status and team')} summary={`${tr(st?.name || '')} · ${v.visible ? tr('Visible to the client') : tr('Team only')}`} open={sec === 'team'} onToggle={() => toggle('team')}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div><L>{tr('Status')}</L><Select size="sm" isSearchable={false} options={statusOpts} value={statusOpts.find((o) => o.value === v.status)} onChange={(o) => set({ status: o.value })} /></div>
                                <div><L>{tr('Due date')}</L><Input size="sm" type="date" value={v.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></div>
                            </div>
                            <div className="mt-3"><L>{tr('Assigned to')}</L><Select isMulti isClearable placeholder={tr('Assign team members…')} options={staffOpts} value={staffOpts.filter((o) => v.assigneeIds.includes(o.value))} onChange={(opts) => set({ assigneeIds: (opts || []).map((o) => o.value) })} /></div>
                            <label className="mt-3 flex items-center gap-2 text-sm"><Switcher checked={v.visible} onChange={(c) => set({ visible: c })} />{v.visible ? <TbEye /> : <TbEyeOff />}{tr('Visible to the client')}</label>
                            {report.sentAt && <p className="mt-2 text-xs text-gray-500">{tr('Sent on {date} to {to}', { date: dayjs(report.sentAt).format('DD MMM YYYY, HH:mm'), to: (report.sentTo || []).join(', ') })}</p>}
                        </FoldSection>
                        {!isNew && (
                            <FoldSection icon={<TbMessageCircle />} tone="emerald" title={tr('Follow-up')} summary={nMsg ? tr('{n} message(s)', { n: nMsg }) : tr('No message yet')} open={sec === 'talk'} onToggle={() => toggle('talk')}>
                                <div className="space-y-3">
                                    <CommentThread comments={comments} render={(c) => c.system ? <SystemLine key={c.id} s={c.system} labels={labels} /> : (
                                        <div key={c.id} className="group relative flex gap-2.5">
                                            <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white', c.internal ? 'bg-amber-500' : 'bg-gray-500')}>{(c.authorName || '?')[0]?.toUpperCase()}</span>
                                            <div className={cn('min-w-0 flex-1 rounded-xl p-2.5 text-sm', c.internal ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-gray-50 dark:bg-gray-700/40')}>
                                                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="truncate text-gray-700 dark:text-gray-200">{c.authorName || tr('Team')}</b>{c.internal && <span className="rounded bg-amber-100 px-1.5 text-amber-700">{tr('Team only')}</span>}<span>{dayjs(c.createdAt).format('DD MMM, HH:mm')}{c.edited ? ` · ${tr('edited')}` : ''}</span></div>
                                                <ReplyQuote r={c.replyTo} />
                                                {editingId === c.id
                                                    ? <CommentEdit initial={c.body} onCancel={() => setEditingId(null)} onSave={async (t) => { await api(`/api/crm/client-reports/${report.id}/comments`, { method: 'PUT', body: { clientId, commentId: c.id, body: t } }); setEditingId(null); await reload() }} />
                                                    : <><RichView html={c.body} /><CommentFiles attachments={c.attachments} links={c.links} /></>}
                                            {editingId !== c.id && can.edit && (
                                                <CommentFoot
                                                    remind={{ relType: 'customer', relId: clientId, tab: `reports&report=${report.id}`, note: plainOf(c.body).slice(0, 140) }}
                                                    reactions={c.reactions}
                                                    onReact={(emoji) => react(c, emoji)}
                                                    onMention={(sid) => mention(c, sid)}
                                                    onReply={() => { setReplyTo({ id: c.id, name: c.authorName || tr('Team') }); setText((x) => x || (c.authorName ? `@${c.authorName} ` : '')) }}
                                                    onEdit={c.mine ? () => setEditingId(c.id) : null}
                                                    onDelete={c.canDelete ? async () => { try { await api(url(`&commentId=${c.id}`), { method: 'DELETE' }); await reload(); onChanged() } catch (e) { notify('danger', e.message) } } : null}
                                                />
                                            )}
                                            </div>
                                        </div>
                                    )} />
                                    {!comments.length && <p className="py-2 text-center text-xs text-gray-400">{tr('Comments and status changes of this document appear here.')}</p>}
                                </div>
                                {can.edit && (
                                    <div className="mt-3 space-y-2">
                                        <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                                        <CommentAttach value={extras} onChange={setExtras} uploadFile={(f) => { const fd = new FormData(); fd.append('file', f); return upload('/api/crm/client-reports/upload', fd) }} onError={(m) => notify('danger', m)} t={tr}>
                                            <RichEditor minHeight={80} extraMentions={data.contacts || []} placeholder={tr('Write a comment — use @ to mention a colleague')} value={text} onChange={setText} />
                                        </CommentAttach>
                                        <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs text-gray-500"><Switcher checked={internal} onChange={setInternal} />{tr('Team only')}</label><Button size="sm" variant="solid" loading={busy === 'say'} onClick={say}>{tr('Send')}</Button></div>
                                    </div>
                                )}
                            </FoldSection>
                        )}
                    </fieldset>
                </div>
                <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    {!isNew && can.delete && <Button type="button" variant="plain" className="text-red-500" onClick={() => setDel(true)}>{tr('Delete')}</Button>}
                    {!isNew && can.edit && <Button type="button" size="sm" icon={<TbChecklist />} loading={busy === 'task'} onClick={task}>{tr('Make a task')}</Button>}
                    {!isNew && can.edit && <Button type="button" size="sm" icon={<TbSend />} onClick={() => onSend(report)}>{tr('Send by email')}</Button>}
                    <div className="ms-auto flex gap-2"><Button onClick={onClose}>{readOnly ? tr('Close') : tr('Cancel')}</Button>{!readOnly && <Button variant="solid" loading={busy === 'save'} onClick={save}>{isNew ? tr('Create') : tr('Save changes')}</Button>}</div>
                </div>
            </Dialog>
            <MediaPicker open={pick} kind="" multiple picked={v.attachments.map((x) => x.url)} onClose={() => setPick(false)} onPick={pickFile} />
            <ConfirmDialog isOpen={del} type="danger" title={tr('Delete this?')} confirmText={tr('Delete')} onClose={() => setDel(false)} onRequestClose={() => setDel(false)} onCancel={() => setDel(false)} onConfirm={remove}><p>{tr('It is removed for good.')}</p></ConfirmDialog>
        </>
    )
}

/** The Reports & Strategies tab of a client: a board of statuses like Requests, with a popup for each document. */
const ClientReports = ({ clientId, openId = '' }) => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [q, setQ] = useState('')
    const [filter, setFilter] = useState('all')
    const [sel, setSel] = useState(null)
    const [send, setSend] = useState(null)
    const [busy, setBusy] = useState(false)
    const load = useCallback(() => api(`/api/crm/client-reports?clientId=${clientId}`).then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [clientId])
    useEffect(() => { load() }, [load])
    useEffect(() => { if (openId && d) { const r = d.list.find((x) => x.id === openId); if (r) setSel(r) } }, [openId, d?.list?.length]) // eslint-disable-line react-hooks/exhaustive-deps
    const shown = useMemo(() => (d?.list || []).filter((r) => (filter === 'all' || r.kind === filter) && (!q.trim() || `${r.title} ${r.code} ${r.period}`.toLowerCase().includes(q.trim().toLowerCase()))), [d, q, filter])
    if (error) return <p className="py-10 text-center text-gray-400">{error}</p>
    if (!d) return <p className="py-10 text-center text-gray-400">{tr('Loading…')}</p>
    const person = (id) => d.staff.find((s) => s.id === id)
    const move = async (it, to) => { try { await api(`/api/crm/client-reports/${it.id}/move`, { method: 'POST', body: { clientId, status: to } }); load() } catch (e) { notify('danger', e.message); load() } }
    const columns = d.statuses.map((s) => ({
        id: s.key, name: tr(s.name), color: s.color, count: shown.filter((r) => r.status === s.key).length,
        items: shown.filter((r) => r.status === s.key).map((r) => ({
            id: r.id, title: r.title, sub: `${r.code} · ${tr(d.kinds[r.kind])}${r.period ? ` · ${r.period}` : ''}`, date: r.dueDate ? dayjs(r.dueDate).format('DD MMM') : dayjs(r.createdAt).format('DD MMM'), overdue: !!r.dueDate && dayjs(r.dueDate).isBefore(dayjs(), 'day') && !['approved', 'declined'].includes(r.status),
            label: tr(d.priorities[r.priority]), labelPill: PRIO_COLOR[r.priority], comments: r.comments,
            people: <span className="flex -space-x-1.5">{(r.assigneeIds || []).slice(0, 3).map((id) => <span key={id} title={person(id)?.name} className="grid size-6 place-items-center rounded-full bg-gray-300 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">{(person(id)?.name || '?')[0]}</span>)}{(r.attachments.length + r.links.length) > 0 && <span className="ms-1.5 inline-flex items-center gap-0.5 text-[10px] text-gray-500"><TbPaperclip />{r.attachments.length + r.links.length}</span>}</span>,
        })),
    }))
    const doSend = async () => {
        setBusy(true)
        try { const r = await api(`/api/crm/client-reports/${send.item.id}/send`, { method: 'POST', body: { clientId, contactIds: send.ids, message: send.message } }); notify('success', tr('Sent to {n} contact(s)', { n: r.sent.length })); setSend(null); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const kinds = [['all', tr('All')], ['report', tr('Reports')], ['strategy', tr('Strategies')]]
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <div className="flex flex-wrap gap-1">{kinds.map(([k, label]) => <button key={k} type="button" onClick={() => setFilter(k)} className={cn('rounded-full px-3 py-1 text-sm font-semibold transition', filter === k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200')}>{label}</button>)}</div>
                {d.can.create && <div className="ms-auto flex gap-2"><Button size="sm" icon={<TbCompass />} onClick={() => setSel({ ...blank, kind: 'strategy' })}>{tr('New strategy')}</Button><Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => setSel({ ...blank, period: dayjs().format('MMMM YYYY') })}>{tr('New report')}</Button></div>}
            </div>
            <Pipeline
                columns={columns}
                canDrag={() => !!d.can.edit}
                onOpen={(it) => setSel(d.list.find((r) => r.id === it.id))}
                onAdd={d.can.create ? (c) => setSel({ ...blank, status: c.id, period: dayjs().format('MMMM YYYY') }) : undefined}
                onMoveTo={d.can.edit ? (it, to) => move(it, to) : undefined}
                onMove={({ item, to }) => move(item, to)}
                emptyText={tr('Nothing here yet')}
            />
            <ReportDialog report={sel} data={d} clientId={clientId} onClose={() => setSel(null)} onChanged={load} onSend={(r) => { const p = d.contacts.find((c) => c.primary && c.email) || d.contacts.find((c) => c.email); setSend({ item: r, ids: p ? [p.id] : [], message: '' }) }} />
            <Dialog isOpen={!!send} width={520} onClose={() => setSend(null)} onRequestClose={() => setSend(null)}>
                <h5 className="mb-1">{tr('Send by email')}</h5>
                <p className="mb-3 text-sm text-gray-500">{send?.item.title}</p>
                {send && (
                    <div className="space-y-3">
                        <div><L>{tr('To')}</L>
                            {d.contacts.filter((c) => c.email).length ? d.contacts.filter((c) => c.email).map((c) => <label key={c.id} className="mb-1 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={send.ids.includes(c.id)} onChange={(e) => setSend({ ...send, ids: e.target.checked ? [...send.ids, c.id] : send.ids.filter((i) => i !== c.id) })} />{c.name} <span className="text-xs text-gray-500">{c.email}</span>{c.primary && <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">{tr('Primary')}</span>}</label>) : <p className="text-sm text-amber-600">{tr('This client has no contact with an email address.')}</p>}
                        </div>
                        <div><L>{tr('A message (optional)')}</L><Input textArea rows={3} value={send.message} onChange={(e) => setSend({ ...send, message: e.target.value })} placeholder={tr('Hello, here is our report for this month...')} /></div>
                    </div>
                )}
                <div className="mt-4 flex justify-end gap-2"><Button size="sm" onClick={() => setSend(null)}>{tr('Cancel')}</Button><Button size="sm" variant="solid" icon={<TbSend />} loading={busy} disabled={!send?.ids.length} onClick={doSend}>{tr('Send')}</Button></div>
            </Dialog>
        </div>
    )
}

export default ClientReports
