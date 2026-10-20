import { useCallback, useEffect, useState } from 'react'
import StaffRing from '@/components/crm/StaffRing'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbHierarchy2, TbBookmark, TbArrowLeft, TbTag, TbUser, TbCircleDashed, TbCalendarDue, TbFlag, TbBriefcase, TbCalendar, TbTrash, TbPencil, TbPlayerPlay, TbPlayerStop, TbCheck, TbX, TbMessage, TbFile, TbClock, TbPlus, TbListCheck } from 'react-icons/tb'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import Timeline from '@/components/ui/Timeline'
import classNames from '@/utils/classNames'
import { api, notify } from '../kit/api'
import { STATUS, PRIORITY, statusOf, prioOf, initials, duration } from './shared'
import { tr } from '@/utils/t'

const portal = { menuPortalTarget: document.body, menuPosition: 'fixed', styles: { menuPortal: (b) => ({ ...b, zIndex: 10000 }) } }
const STATUS_PILL = { 1: 'bg-amber-200 dark:bg-amber-200', 4: 'bg-sky-200 dark:bg-sky-200', 3: 'bg-purple-200 dark:bg-purple-200', 2: 'bg-orange-200 dark:bg-orange-200', 5: 'bg-emerald-200 dark:bg-emerald-200' }
const PRIO_TEXT = { 1: 'text-purple-500', 2: 'text-orange-500', 3: 'text-red-500', 4: 'text-red-600' }
const day = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : null)

/** A row of the properties grid: icon, label, value. */
const Prop = ({ icon, label, children }) => (
    <div className="flex min-h-[44px] items-center gap-3">
        <div className="flex w-[130px] shrink-0 items-center gap-2 font-semibold text-gray-500"><span className="text-xl">{icon}</span>{label}</div>
        <div className="min-w-0 flex-1">{children}</div>
    </div>
)

const TABS = [['comments', tr('Comments'), <TbMessage key="c" />], ['subtasks', tr('Subtasks'), <TbHierarchy2 key="s" />], ['checklist', tr('Checklist'), <TbListCheck key="l" />], ['files', tr('Attachments'), <TbFile key="f" />], ['time', tr('Time'), <TbClock key="t" />]]

/** One task, laid out like the template's issue page: properties, description, tabs, and the activity panel on the right. */
const TaskPage = () => {
    const { id } = useParams()
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [staff, setStaff] = useState([])
    const [error, setError] = useState('')
    const [tab, setTab] = useState('comments')
    const [titleEdit, setTitleEdit] = useState(null)
    const [descEdit, setDescEdit] = useState(null)
    const [comment, setComment] = useState('')
    const [item, setItem] = useState('')
    const [subName, setSubName] = useState('')
    const [tag, setTag] = useState('')
    const [confirmDel, setConfirmDel] = useState(false)
    const [, setTick] = useState(0)

    const load = useCallback(() => api(`/api/crm/work/tasks/${id}`).then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])
    useEffect(() => { api('/api/crm/work/tasks/lookups').then((l) => setStaff(l.staff)).catch(() => {}) }, [])
    useEffect(() => { if (!d?.running) return; const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t) }, [d?.running])

    if (error && !d) return <AdaptiveCard><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => nav('/crm/my-tasks')}>{tr('Back to tasks')}</Button></AdaptiveCard>
    if (!d) return <AdaptiveCard><div className="py-20 text-center text-gray-400">{tr('Loading…')}</div></AdaptiveCard>

    const { task: t, can } = d
    const e = can.edit
    const opt = staff.map((s) => ({ value: s.id, label: s.name }))
    const body = (patch) => ({
        name: t.name, description: t.description, status: t.status, priority: t.priority, startDate: day(t.startDate), dueDate: day(t.dueDate), relType: t.relType, relId: t.relId, milestoneId: t.milestoneId,
        isPublic: t.isPublic, billable: t.billable, visibleToClient: t.visibleToClient, hourlyRate: t.hourlyRate, recurring: t.recurring, recurringType: t.recurringType, repeatEvery: t.repeatEvery, totalCycles: t.totalCycles,
        assigneeIds: t.assigneeIds, followerIds: t.followerIds, tags: t.tags, ...patch,
    })
    const save = async (patch, ok) => { try { await api(`/api/crm/work/tasks/${id}`, { method: 'PUT', body: body(patch) }); if (ok) notify('success', ok); await load() } catch (er) { notify('danger', er.message) } }
    const post = async (path, b, ok) => { try { await api(`/api/crm/work/tasks/${id}/${path}`, { method: 'POST', body: b }); if (ok) notify('success', ok); await load() } catch (er) { notify('danger', er.message) } }
    const delComment = async (c) => { try { await api(`/api/crm/work/tasks/${id}/comments?commentId=${c.id}`, { method: 'DELETE' }); await load() } catch (er) { notify('danger', er.message) } }
    const remove = async () => { setConfirmDel(false); try { await api(`/api/crm/work/tasks/${id}`, { method: 'DELETE' }); notify('success', tr('Task deleted')); nav(t.rel?.type === 'project' ? `/crm/projects/${t.relId}` : '/crm/my-tasks') } catch (er) { notify('danger', er.message) } }
    const subs = Array.isArray(d.subtasks) ? d.subtasks : []
    const addSub = async () => {
        const name = subName.trim()
        if (!name) return
        setSubName('')
        try { await api('/api/crm/work/tasks', { method: 'POST', body: { name, status: 1, priority: t.priority, parentId: id, assigneeIds: t.assigneeIds } }); await load() } catch (er) { notify('danger', er.message) }
    }
    const toggleSub = async (x) => { try { await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: x.status === 5 ? 1 : 5, ids: [x.id] } }); await load() } catch (er) { notify('danger', er.message) } }
    const keepAsTemplate = async () => { try { await api('/api/crm/work/task-templates', { method: 'POST', body: { fromTask: id } }); notify('success', tr('Saved as a template')) } catch (er) { notify('danger', er.message) } }
    const addTag = () => { const v = tag.trim(); setTag(''); if (v && !t.tags.includes(v)) save({ tags: [...t.tags, v] }) }
    const runningSecs = d.running ? Math.max(0, Math.round((Date.now() - +new Date(d.running.startTime)) / 1000)) : 0
    const back = () => nav(t.rel?.type === 'project' ? `/crm/projects/${t.relId}` : '/crm/my-tasks')

    const activityIcon = { created: <TbPlus />, finished: <TbCheck />, comment: <TbMessage />, timer: <TbClock />, checklist: <TbListCheck /> }
    const activityText = (a) => ({
        created: tr('created the task'), finished: tr('completed the task'), comment: tr('commented'),
        timer: tr('tracked {time}', { time: duration(a.seconds || 0) }), checklist: tr('finished a checklist item'),
    }[a.type])

    return (
        <AdaptiveCard>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Button size="xs" variant="plain" icon={<TbArrowLeft className="rtl:rotate-180" />} onClick={back} />
                        <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200">{t.code}</Tag>
                        {t.rel?.href && <Link to={t.rel.href} className="text-sm font-semibold text-primary hover:underline">{t.rel.label}</Link>}
                        {t.milestone?.name && <span className="text-sm text-gray-400">· {t.milestone.name}</span>}
                        <div className="ml-auto flex gap-2">
                            {e && <Button size="xs" variant="plain" icon={<TbBookmark />} onClick={keepAsTemplate}>{tr('Save as template')}</Button>}
                            {t.rel?.type === 'project' && <Button size="xs" onClick={() => nav(`/crm/projects/${t.relId}/board`)}>{tr('Scrum board')}</Button>}
                            {can.delete && <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirmDel(true)} />}
                        </div>
                    </div>
                    {d.parent && <div className="mb-1 text-sm text-gray-500">{tr('Subtask of')} <Link to={`/crm/tasks/${d.parent.id}`} className="font-semibold text-primary hover:underline">{d.parent.name}</Link></div>}
                    {titleEdit !== null ? (
                        <div className="flex items-center gap-2"><Input autoFocus value={titleEdit} maxLength={200} onChange={(ev) => setTitleEdit(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter' && titleEdit.trim()) { save({ name: titleEdit }); setTitleEdit(null) } if (ev.key === 'Escape') setTitleEdit(null) }} /><Button size="sm" variant="solid" icon={<TbCheck />} onClick={() => { if (titleEdit.trim()) { save({ name: titleEdit }); setTitleEdit(null) } }} /><Button size="sm" icon={<TbX />} onClick={() => setTitleEdit(null)} /></div>
                    ) : (
                        <h3 className="flex items-start gap-2 break-words">{t.name}{e && <button type="button" className="mt-1 text-base text-gray-300 hover:text-primary" onClick={() => setTitleEdit(t.name)}><TbPencil /></button>}</h3>
                    )}

                    <div className="mt-6 grid gap-x-8 gap-y-2 xl:grid-cols-2">
                        <Prop icon={<TbTag />} label={tr('Label')}>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {t.tags.map((x) => <Tag key={x} className="bg-amber-200 dark:bg-amber-200 dark:text-gray-900">{x}{e && <button type="button" className="ml-1" onClick={() => save({ tags: t.tags.filter((y) => y !== x) })}><TbX /></button>}</Tag>)}
                                {e && <input value={tag} placeholder={tr('Add a label')} onChange={(ev) => setTag(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addTag() } }} onBlur={addTag} className="min-w-[90px] flex-1 rounded bg-transparent px-1 py-0.5 text-sm outline-none" />}
                                {!e && !t.tags.length && <span className="text-gray-400">-</span>}
                            </div>
                        </Prop>
                        <Prop icon={<TbUser />} label={tr('Assigned to')}>
                            {e ? <Select size="sm" isMulti {...portal} options={opt} value={opt.filter((o) => t.assigneeIds.includes(o.value))} onChange={(os) => save({ assigneeIds: (os || []).map((o) => o.value) })} />
                                : <div className="flex -space-x-1.5">{t.assignees.map((p) => <StaffRing key={p.id} id={p.id} name={p.name} size={28}><Avatar size={28} shape="circle" src={p.image || undefined} className="ring-2 ring-white dark:ring-gray-800">{initials(p.name)}</Avatar></StaffRing>)}{!t.assignees.length && '-'}</div>}
                        </Prop>
                        <Prop icon={<TbCircleDashed />} label={tr('Status')}>
                            {e && t.canFinish !== false ? <Select size="sm" isSearchable={false} {...portal} options={STATUS.map((s) => ({ value: s.value, label: s.label }))} value={{ value: t.status, label: statusOf(t.status).label }} onChange={(o) => save({ status: o.value })} /> : <Tag className={classNames(STATUS_PILL[t.status], 'dark:text-gray-900')}>{statusOf(t.status).label}</Tag>}
                        </Prop>
                        <Prop icon={<TbCalendarDue />} label={tr('Due date')}>
                            {e ? <Input size="sm" type="date" value={day(t.dueDate) || ''} onChange={(ev) => save({ dueDate: ev.target.value || null })} /> : <span className="font-semibold">{t.dueDate ? dayjs(t.dueDate).format('MMMM DD') : '-'}</span>}
                        </Prop>
                        <Prop icon={<TbFlag />} label={tr('Priority')}>
                            {e ? <Select size="sm" isSearchable={false} {...portal} options={PRIORITY.map((s) => ({ value: s.value, label: s.label }))} value={{ value: t.priority, label: prioOf(t.priority).label }} onChange={(o) => save({ priority: o.value })} /> : <span className={classNames('flex items-center gap-1.5 font-semibold', PRIO_TEXT[t.priority])}><TbFlag />{prioOf(t.priority).label}</span>}
                        </Prop>
                        <Prop icon={<TbCalendar />} label={tr('Start date')}>
                            {e ? <Input size="sm" type="date" value={day(t.startDate) || ''} onChange={(ev) => save({ startDate: ev.target.value || null })} /> : <span className="font-semibold">{t.startDate ? dayjs(t.startDate).format('MMMM DD') : '-'}</span>}
                        </Prop>
                        {d.milestones.length > 0 && (
                            <Prop icon={<TbBriefcase />} label={tr('Milestone')}>
                                {e ? <Select size="sm" isClearable {...portal} options={d.milestones.map((m) => ({ value: m.id, label: m.name }))} value={d.milestones.filter((m) => m.id === t.milestoneId).map((m) => ({ value: m.id, label: m.name }))[0] || null} onChange={(o) => save({ milestoneId: o?.value || null })} /> : <span>{t.milestone?.name || '-'}</span>}
                            </Prop>
                        )}
                    </div>

                    <div className="mt-8">
                        <div className="mb-3 flex items-center justify-between"><h5>{tr('Description')}</h5>{e && descEdit === null && <Button size="xs" icon={<TbPencil />} onClick={() => setDescEdit(t.description)}>{tr('Edit')}</Button>}</div>
                        {descEdit !== null ? (
                            <div className="flex flex-col gap-2"><Input textArea rows={8} value={descEdit} onChange={(ev) => setDescEdit(ev.target.value)} /><div className="flex justify-end gap-2"><Button size="sm" onClick={() => setDescEdit(null)}>{tr('Cancel')}</Button><Button size="sm" variant="solid" onClick={() => { save({ description: descEdit }, tr('Saved')); setDescEdit(null) }}>{tr('Save')}</Button></div></div>
                        ) : t.description ? <div className="whitespace-pre-line text-sm leading-relaxed">{t.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')}</div> : <p className="text-sm text-gray-400">{tr('No description yet.')}</p>}
                    </div>

                    <div className="mt-8">
                        <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
                            {TABS.map(([k, label]) => (
                                <button key={k} type="button" onClick={() => setTab(k)} className={classNames('-mb-px border-b-2 px-1 pb-3 text-sm font-semibold transition', tab === k ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}>
                                    {label}{k === 'subtasks' && subs.length > 0 && <span className="ml-1.5 text-xs opacity-70">{subs.filter((x) => x.status === 5).length}/{subs.length}</span>}{k === 'comments' && d.comments.length > 0 && <span className="ml-1.5 text-xs opacity-70">{d.comments.length}</span>}{k === 'checklist' && d.checklist.length > 0 && <span className="ml-1.5 text-xs opacity-70">{d.checklist.filter((c) => c.finished).length}/{d.checklist.length}</span>}
                                </button>
                            ))}
                        </div>
                        <div className="pt-5">
                            {tab === 'comments' && (
                                <div className="space-y-5">
                                    {d.comments.map((c) => (
                                        <div key={c.id} className="flex gap-3">
                                            <StaffRing id={c.staff?.id} name={c.staff?.name} size={36}><Avatar size={36} shape="circle" src={c.staff?.image || undefined}>{initials(c.staff?.name || (c.fromClient ? tr('Client') : '?'))}</Avatar></StaffRing>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 text-sm"><span className="font-bold heading-text">{c.staff?.name || (c.fromClient ? tr('Client') : tr('Unknown'))}</span><span className="text-gray-400">|</span><span className="text-gray-400">{dayjs(c.createdAt).format('DD MMM YYYY')}</span>{(c.mine || can.delete) && <button type="button" className="ml-auto text-gray-300 hover:text-red-500" onClick={() => delComment(c)}><TbTrash /></button>}</div>
                                                <div className="mt-1 whitespace-pre-line text-sm">{c.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {!d.comments.length && <p className="text-sm text-gray-400">{tr('No comments yet.')}</p>}
                                    <div className="flex flex-col gap-2"><Input textArea rows={3} value={comment} placeholder={tr('Write a comment')} onChange={(ev) => setComment(ev.target.value)} /><div className="flex justify-end"><Button variant="solid" disabled={!comment.trim()} onClick={() => post('comments', { content: comment }).then(() => setComment(''))}>{tr('Comment')}</Button></div></div>
                                </div>
                            )}
                            {tab === 'subtasks' && (
                                <div className="space-y-1">
                                    {subs.length > 0 && <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(subs.filter((x) => x.status === 5).length / subs.length) * 100}%` }} /></div>}
                                    {subs.map((x) => (
                                        <div key={x.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                            <input type="checkbox" checked={x.status === 5} disabled={!x.canFinish} title={x.canFinish ? undefined : tr('Only the people assigned to this task, or who created it, can change its status')} onChange={() => toggleSub(x)} />
                                            <Link to={`/crm/tasks/${x.id}`} className={classNames('min-w-0 flex-1 truncate text-sm font-semibold hover:text-primary', x.status === 5 && 'text-gray-400 line-through')}>{x.name}</Link>
                                            <div className="flex -space-x-1.5">{x.assignees.slice(0, 3).map((p) => <StaffRing key={p.id} id={p.id} name={p.name} size={22}><Avatar size={22} shape="circle" src={p.image || undefined} className="ring-2 ring-white dark:ring-gray-800">{initials(p.name)}</Avatar></StaffRing>)}</div>
                                            {x.dueDate && <span className="w-14 shrink-0 text-end text-xs text-gray-500">{dayjs(x.dueDate).format('DD MMM')}</span>}
                                        </div>
                                    ))}
                                    {!subs.length && <p className="text-sm text-gray-400">{tr('No subtasks yet. Break the task into smaller tasks, each with its own people and due date.')}</p>}
                                    {e && <form className="flex gap-2 pt-2" onSubmit={(ev) => { ev.preventDefault(); addSub() }}><Input size="sm" value={subName} placeholder={tr('Add a subtask')} onChange={(ev) => setSubName(ev.target.value)} /><Button size="sm" type="submit" icon={<TbPlus />}>{tr('Add')}</Button></form>}
                                </div>
                            )}
                            {tab === 'checklist' && (
                                <div className="space-y-2">
                                    {d.checklist.map((c) => (
                                        <label key={c.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                            <input type="checkbox" checked={c.finished} disabled={!e} onChange={(ev) => post('checklist', { action: 'toggle', itemId: c.id, finished: ev.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                                            <span className={classNames('flex-1 text-sm', c.finished && 'text-gray-400 line-through')}>{c.description}</span>
                                            {e && <button type="button" className="text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100" onClick={(ev) => { ev.preventDefault(); post('checklist', { action: 'delete', itemId: c.id }) }}><TbTrash /></button>}
                                        </label>
                                    ))}
                                    {!d.checklist.length && <p className="text-sm text-gray-400">{tr('No checklist items yet.')}</p>}
                                    {e && <form className="flex gap-2 pt-2" onSubmit={(ev) => { ev.preventDefault(); if (item.trim()) post('checklist', { action: 'add', description: item }).then(() => setItem('')) }}><Input size="sm" value={item} placeholder={tr('Add an item')} onChange={(ev) => setItem(ev.target.value)} /><Button size="sm" variant="solid" type="submit" disabled={!item.trim()}>{tr('Add')}</Button></form>}
                                </div>
                            )}
                            {tab === 'files' && <AttachmentsPanel relType="task" relId={id} canEdit={e} />}
                            {tab === 'time' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                                        <div><div className="text-sm text-gray-500">{tr('Total tracked')}</div><div className="text-xl font-bold">{duration(d.totalSeconds)}</div></div>
                                        {d.running ? <Button variant="solid" color="red-500" icon={<TbPlayerStop />} onClick={() => post('timer', { action: 'stop' }, tr('Timer stopped'))}>{tr('Stop ·')} {duration(runningSecs)}</Button> : <Button variant="solid" icon={<TbPlayerPlay />} onClick={() => post('timer', { action: 'start' }, tr('Timer started'))}>{tr('Start timer')}</Button>}
                                    </div>
                                    {d.timers.map((x) => <div key={x.id} className="flex items-center justify-between text-sm"><span><span className="font-medium">{x.staff?.name || '—'}</span><span className="ml-2 text-gray-500">{dayjs(x.startTime).format('DD MMM, HH:mm')}{x.endTime ? ` → ${dayjs(x.endTime).format('HH:mm')}` : tr(' · running')}</span></span><span className="font-semibold">{duration(x.seconds)}</span></div>)}
                                    {!d.timers.length && <p className="text-sm text-gray-400">{tr('No time logged yet.')}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className="lg:border-l lg:border-gray-200 lg:pl-8 lg:dark:border-gray-700 rtl:lg:border-l-0 rtl:lg:border-r rtl:lg:pl-0 rtl:lg:pr-8">
                    <h5 className="mb-6">{tr('Activity')}</h5>
                    <Timeline>
                        {d.activity.map((a, i) => (
                            <Timeline.Item key={`${a.type}${i}`} media={<Avatar size={25} shape="circle" src={a.staff?.image || undefined} className="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100">{a.staff ? initials(a.staff.name) : activityIcon[a.type]}</Avatar>}>
                                <div className="mt-0.5">
                                    <div className="text-sm font-semibold heading-text">{a.staff?.name || tr('Someone')}</div>
                                    <div className="text-xs text-gray-400">{dayjs(a.at).format('DD MMM, HH:mm')}</div>
                                    <div className="mt-1 text-sm text-gray-500">{activityText(a)}</div>
                                    {a.text && <div className="mt-2 rounded-xl bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700/50">{a.text}</div>}
                                </div>
                            </Timeline.Item>
                        ))}
                    </Timeline>
                </aside>
            </div>

            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr('Delete this task?')} confirmText={tr('Delete')} onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{tr('The task, its comments and its timesheets are removed for good.')}</p>
            </ConfirmDialog>
        </AdaptiveCard>
    )
}

export default TaskPage
