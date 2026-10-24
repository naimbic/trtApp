import { useCallback, useEffect, useState } from 'react'
import Mentioned from '@/components/crm/Mentioned'
import { useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbTrash, TbExternalLink, TbPencil, TbCheck, TbX, TbHistory, TbWorld } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Timeline from '@/components/ui/Timeline'
import { api, notify } from '../kit/api'
import { initials } from '../tasks/shared'
import { STATUS, PRIORITY, TYPE, StatusTag, PriorityTag, TypeLabel, eventText } from './shared'
import { opts, pick } from './IssueDialogs'
import { tr } from '@/utils/t'

const portal = { menuPortalTarget: document.body, menuPosition: 'fixed', styles: { menuPortal: (b) => ({ ...b, zIndex: 10000 }) } }
const Field = ({ label, children }) => <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 py-2"><span className="text-sm text-gray-500">{label}</span><div className="min-w-0">{children}</div></div>
const Who = ({ p, size = 24 }) => (p ? <span className="inline-flex items-center gap-2"><Avatar size={size} shape="circle" src={p.image || undefined}>{initials(p.name)}</Avatar><span className="truncate text-sm">{p.name}</span></span> : <span className="text-gray-300">—</span>)

const IssueView = () => {
    const { id } = useParams()
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [lookups, setLookups] = useState({ staff: [], platforms: [], labels: [], can: {} })
    const [error, setError] = useState('')
    const [titleEdit, setTitleEdit] = useState(null)
    const [descEdit, setDescEdit] = useState(null)
    const [comment, setComment] = useState('')
    const [busy, setBusy] = useState(false)
    const [label, setLabel] = useState('')
    const [confirmDel, setConfirmDel] = useState(false)

    const load = useCallback(() => api(`/api/crm/issues/${id}`).then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])
    useEffect(() => { api('/api/crm/issues/lookups').then(setLookups).catch(() => {}) }, [])

    if (error && !d) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => nav('/crm/issues')}>{tr('Back to issues')}</Button></Container>
    if (!d) return <Container><div className="py-20 text-center text-gray-400">{tr('Loading…')}</div></Container>

    const { issue, feed, can } = d
    const save = async (patch, ok) => {
        try { await api(`/api/crm/issues/${id}`, { method: 'PUT', body: patch }); if (ok) notify('success', ok); await load() } catch (e) { notify('danger', e.message) }
    }
    const send = async () => {
        if (!comment.trim()) return
        setBusy(true)
        try { await api(`/api/crm/issues/${id}/comments`, { method: 'POST', body: { content: comment } }); setComment(''); await load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const delComment = async (c) => { try { await api(`/api/crm/issues/${id}/comments?commentId=${c.id}`, { method: 'DELETE' }); await load() } catch (e) { notify('danger', e.message) } }
    const remove = async () => { setConfirmDel(false); try { await api(`/api/crm/issues/${id}`, { method: 'DELETE' }); notify('success', tr('Issue deleted')); nav('/crm/issues') } catch (e) { notify('danger', e.message) } }
    const addLabel = () => { const l = label.trim(); if (!l) return; setLabel(''); if (!issue.labels.includes(l)) save({ labels: [...issue.labels, l] }) }
    const e = can.edit

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-start gap-3">
                <Button size="sm" variant="plain" icon={<TbArrowLeft className="rtl:rotate-180" />} onClick={() => nav('/crm/issues')} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500"><span className="font-mono">#{issue.number}</span><StatusTag status={issue.status} /><PriorityTag priority={issue.priority} /></div>
                    {titleEdit !== null ? (
                        <div className="mt-1 flex items-center gap-2"><Input autoFocus value={titleEdit} maxLength={200} onChange={(ev) => setTitleEdit(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter' && titleEdit.trim()) { save({ title: titleEdit }); setTitleEdit(null) } if (ev.key === 'Escape') setTitleEdit(null) }} /><Button size="sm" variant="solid" icon={<TbCheck />} disabled={!titleEdit.trim()} onClick={() => { save({ title: titleEdit }); setTitleEdit(null) }} /><Button size="sm" icon={<TbX />} onClick={() => setTitleEdit(null)} /></div>
                    ) : (
                        <h3 className="group mt-1 flex items-center gap-2 break-words">{issue.title}{e && <button type="button" className="text-base text-gray-300 hover:text-primary" title={tr('Rename')} onClick={() => setTitleEdit(issue.title)}><TbPencil /></button>}</h3>
                    )}
                </div>
                {can.delete && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirmDel(true)}>{tr('Delete')}</Button>}
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-4 lg:col-span-2">
                    <Card>
                        <div className="mb-3 flex items-center justify-between"><h5>{tr('Description')}</h5>{e && descEdit === null && <Button size="xs" icon={<TbPencil />} onClick={() => setDescEdit(issue.description)}>{tr('Edit')}</Button>}</div>
                        {descEdit !== null ? (
                            <div className="flex flex-col gap-2"><Input textArea rows={8} value={descEdit} onChange={(ev) => setDescEdit(ev.target.value)} /><div className="flex justify-end gap-2"><Button size="sm" onClick={() => setDescEdit(null)}>{tr('Cancel')}</Button><Button size="sm" variant="solid" onClick={() => { save({ description: descEdit }, tr('Saved')); setDescEdit(null) }}>{tr('Save')}</Button></div></div>
                        ) : issue.description ? <p className="whitespace-pre-line text-sm leading-relaxed">{issue.description}</p> : <p className="text-sm text-gray-400">{tr('No description yet.')}</p>}
                    </Card>

                    <Card><h5 className="mb-3">{tr('Files')}</h5><AttachmentsPanel relType="issue" relId={id} canEdit={can.edit} /></Card>

                    <Card>
                        <h5 className="mb-4 flex items-center gap-2"><TbHistory />{tr('Activity')}</h5>
                        <Timeline>
                            {feed.map((f) => (
                                <Timeline.Item key={f.id} media={<Avatar size={25} shape="circle" src={f.staff?.image || undefined}>{initials(f.staff?.name || '?')}</Avatar>}>
                                    {f.kind === 'event' ? (
                                        <p className="my-1 text-sm"><span className="font-semibold text-gray-900 dark:text-gray-100">{f.staff?.name || tr('Someone')}</span> {eventText(f.meta)} <span className="ml-1 text-xs text-gray-400" title={dayjs(f.createdAt).format('YYYY-MM-DD HH:mm')}>{dayjs(f.createdAt).format('DD MMM, HH:mm')}</span></p>
                                    ) : (
                                        <div className="my-1">
                                            <p className="text-sm"><span className="font-semibold text-gray-900 dark:text-gray-100">{f.staff?.name || tr('Someone')}</span> <span className="ml-1 text-xs text-gray-400">{dayjs(f.createdAt).format('DD MMM, HH:mm')}</span>{(f.mine || can.delete) && <button type="button" className="ml-2 text-xs text-gray-300 hover:text-red-500" onClick={() => delComment(f)} title={tr('Delete')}><TbTrash /></button>}</p>
                                            <div className="mt-1 whitespace-pre-line rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700/40"><Mentioned text={f.body} /></div>
                                        </div>
                                    )}
                                </Timeline.Item>
                            ))}
                        </Timeline>
                        <div className="mt-2 flex flex-col gap-2">
                            <Input textArea rows={3} value={comment} placeholder={tr('Write a comment…')} onChange={(ev) => setComment(ev.target.value)} />
                            <div className="flex justify-end"><Button variant="solid" loading={busy} disabled={!comment.trim()} onClick={send}>{tr('Comment')}</Button></div>
                        </div>
                    </Card>
                </div>

                <Card>
                    <h5 className="mb-2">{tr('Details')}</h5>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        <Field label={tr('Status')}>{e ? <Select size="sm" isSearchable={false} {...portal} options={opts(STATUS)} value={pick(STATUS, issue.status)} onChange={(o) => save({ status: o.value })} /> : <StatusTag status={issue.status} />}</Field>
                        <Field label={tr('Priority')}>{e ? <Select size="sm" isSearchable={false} {...portal} options={opts(PRIORITY)} value={pick(PRIORITY, issue.priority)} onChange={(o) => save({ priority: o.value })} /> : <PriorityTag priority={issue.priority} />}</Field>
                        <Field label={tr('Type')}>{e ? <Select size="sm" isSearchable={false} {...portal} options={opts(TYPE)} value={pick(TYPE, issue.type)} onChange={(o) => save({ type: o.value })} /> : <TypeLabel type={issue.type} />}</Field>
                        <Field label={tr('Platform')}>
                            {e ? <Select size="sm" isClearable {...portal} options={opts(lookups.platforms.filter((p) => p.active || p.id === issue.platform?.id))} value={pick(lookups.platforms, issue.platform?.id || null)} onChange={(o) => save({ platformId: o?.value || null })} /> : <span className="text-sm">{issue.platform?.name || '—'}</span>}
                            {issue.platform?.url && <a href={issue.platform.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"><TbWorld />{issue.platform.url.replace(/^https?:\/\//, '')}</a>}
                        </Field>
                        <Field label={tr('Page')}>{e ? <Input size="sm" defaultValue={issue.pageUrl} placeholder="https://" onBlur={(ev) => { if (ev.target.value.trim() !== issue.pageUrl) save({ pageUrl: ev.target.value }) }} /> : issue.pageUrl ? <a href={issue.pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary">{issue.pageUrl}<TbExternalLink /></a> : '—'}</Field>
                        <Field label={tr('Assigned to')}>{e ? <Select size="sm" isMulti {...portal} options={opts(lookups.staff)} value={opts(lookups.staff).filter((o) => issue.assigneeIds.includes(o.value))} onChange={(os) => save({ assigneeIds: (os || []).map((o) => o.value) })} /> : <div className="flex flex-col gap-1">{issue.assignees.map((p) => <Who key={p.id} p={p} />)}{!issue.assignees.length && '—'}</div>}</Field>
                        <Field label={tr('Labels')}>
                            <div className="flex flex-wrap items-center gap-1">
                                {issue.labels.map((l) => <span key={l} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">{l}{e && <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => save({ labels: issue.labels.filter((x) => x !== l) })}><TbX /></button>}</span>)}
                                {e && <input value={label} placeholder={tr('Add a label')} list="issue-labels" onChange={(ev) => setLabel(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addLabel() } }} onBlur={addLabel} className="min-w-[90px] flex-1 rounded bg-transparent px-1 py-0.5 text-xs outline-none" />}
                                <datalist id="issue-labels">{lookups.labels.map((l) => <option key={l} value={l} />)}</datalist>
                            </div>
                        </Field>
                        <Field label={tr('Due date')}>{e ? <Input size="sm" type="date" value={issue.dueDate ? dayjs(issue.dueDate).format('YYYY-MM-DD') : ''} onChange={(ev) => save({ dueDate: ev.target.value || null })} /> : <span className="text-sm">{issue.dueDate ? dayjs(issue.dueDate).format('DD MMM YYYY') : '—'}</span>}</Field>
                        <Field label={tr('Reported by')}><Who p={issue.reporter} /></Field>
                        <Field label={tr('Opened')}><span className="text-sm">{dayjs(issue.createdAt).format('DD MMM YYYY, HH:mm')}</span></Field>
                        {issue.resolvedAt && <Field label={tr('Resolved')}><span className="text-sm">{dayjs(issue.resolvedAt).format('DD MMM YYYY, HH:mm')}</span></Field>}
                    </div>
                </Card>
            </div>

            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr('Delete this issue?')} confirmText={tr('Delete')} onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{tr('The issue, its comments and its history are removed for good.')}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default IssueView
