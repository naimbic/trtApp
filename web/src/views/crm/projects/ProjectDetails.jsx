import { useCallback, useEffect, useState } from 'react'
import RichView from '@/components/crm/RichView'
import RichEditor from '@/components/crm/RichEditor'
import { Link, useNavigate, useParams } from 'react-router'
import { TbLayoutKanban, TbFileInfo, TbChecklist, TbPaperclip, TbMessages, TbNotes, TbCalendarStats, TbSettings, TbTrash, TbClock, TbFlag } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import Switcher from '@/components/ui/Switcher'
import Timeline from '@/components/ui/Timeline'
import FileIcon from '@/components/crm/FileIcon'
import dayjs from 'dayjs'
import cn from '@/utils/classNames'
import { api, notify, useCan } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import TaskList from '../tasks/TaskList'
import { People, initials } from '../tasks/shared'
import { STATUS, BILLING, StatusTag, Bar, fmt, hours, useStaff } from './shared'
import { tr, trn } from '@/utils/t'
import { KpiCard } from '../kit/KpiCard'

const NAV = [
    { value: 'overview', label: tr("Overview"), icon: <TbFileInfo /> },
    { value: 'tasks', label: tr("Tasks"), icon: <TbChecklist /> },
    { value: 'files', label: tr("Files"), icon: <TbPaperclip /> },
    { value: 'discussions', label: tr("Discussions"), icon: <TbMessages /> },
    { value: 'notes', label: tr("Notes"), icon: <TbNotes /> },
    { value: 'activity', label: tr("Activity"), icon: <TbCalendarStats /> },
    { value: 'settings', label: tr("Settings"), icon: <TbSettings /> },
]
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const Row = ({ label, children }) => <div><span className="font-semibold heading-text">{label}: </span><span className="font-semibold">{children}</span></div>
const kindOf = (t = '') => (t.startsWith('image') ? 'image' : t.includes('pdf') ? 'pdf' : t.includes('sheet') || t.includes('excel') ? 'sheet' : t.includes('zip') ? 'archive' : t.includes('word') || t.includes('text') ? 'doc' : 'file')

const Stat = ({ icon, label, value, tone = 'blue' }) => <KpiCard icon={icon} label={label} value={value} tone={tone} />

const ProjectDetails = () => {
    const { id } = useParams()
    const nav = useNavigate()
    const can = useCan()
    const staff = useStaff()
    const [data, setData] = useState(null)
    const [tab, setTab] = useState('overview')
    const [note, setNote] = useState('')
    const [form, setForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirmDel, setConfirmDel] = useState(false)

    const load = useCallback(async () => {
        try {
            const d = await api(`/api/crm/work/projects/${id}`)
            setData(d)
            const p = d.project
            setForm({ name: p.name, description: p.description, status: p.status, clientId: p.clientId, billingType: p.billingType, startDate: p.startDate ? new Date(p.startDate) : null, deadline: p.deadline ? new Date(p.deadline) : null, progressFromTasks: p.progressFromTasks, progress: p.manualProgress ?? 0, projectCost: p.projectCost ?? '', projectRatePerHour: p.projectRatePerHour ?? '', estimatedHours: p.estimatedHours ?? '', memberIds: p.memberIds })
        } catch (e) { notify('danger', e.message); nav('/crm/projects/list') }
    }, [id, nav])
    useEffect(() => { setData(null); setTab('overview'); load() }, [load])

    if (!data || !form) return <Container><div className="flex justify-center py-20"><Spinner size={40} /></div></Container>
    const { project: p, stats } = data
    const set = (x) => setForm((f) => ({ ...f, ...x }))
    const opts = staff.map((s) => ({ value: s.id, label: s.name }))
    const save = async () => {
        setSaving(true)
        try {
            await api(`/api/crm/work/projects/${id}`, { method: 'PUT', body: { ...form, startDate: form.startDate ? dayjs(form.startDate).format('YYYY-MM-DD') : null, deadline: form.deadline ? dayjs(form.deadline).format('YYYY-MM-DD') : null } })
            notify('success', tr("Project saved")); await load(); setTab('overview')
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const addNote = async () => { try { await api(`/api/crm/work/projects/${id}/notes`, { method: 'POST', body: { content: note } }); setNote(''); load() } catch (e) { notify('danger', e.message) } }
    const delNote = async (nid) => { try { await api(`/api/crm/work/projects/${id}/notes?noteId=${nid}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) } }
    const del = async () => { setConfirmDel(false); try { await api(`/api/crm/work/projects/${id}`, { method: 'DELETE' }); notify('success', tr("Project deleted")); nav('/crm/projects/list') } catch (e) { notify('danger', e.message) } }

    const days = {}
    for (const a of data.activity) (days[dayjs(a.date).format('YYYY-MM-DD')] ||= []).push(a)

    return (
        <Container>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div><div className="mb-1 text-sm text-gray-500"><Link to="/crm/projects/list" className="hover:text-primary">{tr("Projects")}</Link></div><h3>{p.name}</h3></div>
                    <StatusTag status={p.status} />
                </div>
                <div className="flex gap-2"><Button icon={<TbLayoutKanban />} onClick={() => nav(`/crm/projects/${id}/board`)}>{tr("Scrum board")}</Button>{data.can.edit && <Button variant="solid" onClick={() => setTab('settings')}>{tr("Edit")}</Button>}</div>
            </div>

            <div className="flex flex-col gap-6 xl:flex-row xl:gap-12">
                <div className="xl:w-[250px] xl:shrink-0">
                    <div className="flex gap-2 overflow-x-auto xl:flex-col">
                        {NAV.map((n) => (
                            <button key={n.value} onClick={() => setTab(n.value)} className={cn('flex w-full items-center gap-2 whitespace-nowrap rounded-full border-2 border-transparent px-3.5 py-2.5 font-semibold text-gray-900 transition-colors dark:text-white', tab === n.value ? 'border-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}>
                                <span className="text-xl">{n.icon}</span><span>{n.label}</span>
                                {n.value === 'tasks' && stats.tasksTotal > 0 && <span className="ml-auto text-xs text-gray-500">{stats.tasksDone}/{stats.tasksTotal}</span>}
                                {n.value === 'files' && stats.files > 0 && <span className="ml-auto text-xs text-gray-500">{stats.files}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    {tab === 'overview' && (
                        <div className="flex flex-auto flex-col gap-12 lg:flex-row">
                            <div className="min-w-0 flex-1">
                                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <Stat icon={<TbChecklist />} label={tr("Tasks done")} value={`${stats.tasksDone} / ${stats.tasksTotal}`} />
                                    <Stat icon={<TbClock />} label={tr("Time logged")} value={hours(stats.seconds)} />
                                    <Stat icon={<TbPaperclip />} label={tr("Files")} value={stats.files} />
                                    <Stat icon={<TbFlag />} label={tr("Milestones")} value={data.milestones.length} />
                                </div>
                                {p.description ? <RichView html={p.description} /> : <p className="text-gray-500">{tr("No description yet.")}{data.can.edit && <button className="ml-1 text-primary" onClick={() => setTab('settings')}>{tr("Add one")}</button>}</p>}
                                {data.milestones.length > 0 && (
                                    <div className="mt-8"><h5 className="mb-3">{tr("Milestones")}</h5>
                                        <div className="grid gap-3 sm:grid-cols-2">{data.milestones.map((m) => <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"><span className="h-8 w-1.5 rounded-full" style={{ background: m.color || '#64748b' }} /><div className="flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs text-gray-500">{m.dueDate ? tr("Due {v1}", { v1: fmt(m.dueDate) }) : tr("No due date")}</div></div><span className="text-xs text-gray-500">{trn(m.tasks, "task")}</span></div>)}</div>
                                    </div>
                                )}
                            </div>
                            <div className="lg:w-[350px] lg:min-w-[320px]">
                                <Card bordered={false} className="bg-gray-100 shadow-none dark:bg-gray-800">
                                    <h5>{tr("Client information")}</h5>
                                    <div className="mt-6 flex flex-col gap-4">
                                        <Row label={tr("Client")}>{p.client ? <Link className="hover:text-primary" to={`/crm/clients/${p.client.id}`}>{p.client.company}</Link> : '—'}</Row>
                                        <div className="flex flex-col gap-3"><div className="font-semibold heading-text">{tr("Project manager:")}</div>{p.addedBy ? <div className="flex items-center gap-2"><Avatar size={25} shape="circle" src={p.addedBy.image || undefined}>{initials(p.addedBy.name)}</Avatar><span className="font-semibold">{p.addedBy.name}</span></div> : '—'}</div>
                                        <div className="flex flex-col gap-3"><div className="font-semibold heading-text">{tr("Team:")}</div>{p.members.length ? p.members.map((m) => <div key={m.id} className="flex items-center gap-2"><Avatar size={25} shape="circle" src={m.image || undefined}>{initials(m.name)}</Avatar><span className="font-semibold">{m.name}</span></div>) : <span className="text-gray-500">{tr("Nobody yet")}</span>}</div>
                                    </div>
                                </Card>
                                <Card bordered={false} className="mt-6 bg-gray-100 shadow-none dark:bg-gray-800">
                                    <h5>{tr("Schedule")}</h5>
                                    <div className="mt-6 flex flex-col gap-4">
                                        <Row label={tr("Start date")}>{fmt(p.startDate, 'ddd, DD MMM YYYY')}</Row>
                                        <Row label={tr("Due date")}><span className={p.overdue ? 'text-red-500' : ''}>{fmt(p.deadline, 'ddd, DD MMM YYYY')}</span></Row>
                                        {p.dateFinished && p.status === 4 && <Row label={tr("Finished")}>{fmt(p.dateFinished, 'ddd, DD MMM YYYY')}</Row>}
                                        <div className="flex items-center gap-2"><span className="font-semibold heading-text">{tr("Status:")}</span><StatusTag status={p.status} /></div>
                                        <div className="flex flex-col gap-3"><span className="font-semibold heading-text">{tr("Completion:")}</span><Bar value={p.progress} /></div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {tab === 'tasks' && <TaskList projectId={id} />}

                    {tab === 'files' && (
                        <div>
                            <h5 className="mb-4">{tr("Files")}</h5>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {data.files.map((f) => (
                                    <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3.5 py-4 dark:border-transparent dark:bg-gray-800">
                                        <FileIcon kind={kindOf(f.type)} className="text-3xl" />
                                        <div className="min-w-0"><div className="heading-text truncate font-bold" title={f.name}>{f.name}</div><div className="text-xs text-gray-500">{f.by?.name || '—'} · {fmt(f.date, 'DD MMM YYYY')}{f.client ? tr(" · client") : ''}</div></div>
                                    </div>
                                ))}
                            </div>
                            {!data.files.length && <p className="text-gray-500">{tr("No files were attached to this project.")}</p>}
                            {data.files.length > 0 && <p className="mt-4 text-xs text-gray-500">{tr("Files from the old Perfex are listed by name; their contents stayed on the old server and are not in the File manager.")}</p>}
                        </div>
                    )}

                    {tab === 'discussions' && (
                        <div>
                            <h5 className="mb-4">{tr("Discussions")}</h5>
                            <div className="space-y-3">
                                {data.discussions.map((d) => (
                                    <Card key={d.id}><div className="flex items-start justify-between gap-3"><div><div className="font-semibold heading-text">{d.subject}</div>{d.description && <div className="mt-1 line-clamp-2 text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: d.description.replace(/<[^>]+>/g, ' ') }} />}</div><div className="shrink-0 text-right text-xs text-gray-500">{d.by?.name || '—'}<br />{fmt(d.date, 'DD MMM YYYY')}</div></div></Card>
                                ))}
                            </div>
                            {!data.discussions.length && <p className="text-gray-500">{tr("No discussions yet.")}</p>}
                        </div>
                    )}

                    {tab === 'notes' && (
                        <div className="max-w-2xl space-y-4">
                            <h5>{tr("Notes")}</h5>
                            <div className="space-y-2"><RichEditor minHeight={90} placeholder={tr("Write a private note for the team")} value={note} onChange={setNote} /><Button size="sm" variant="solid" disabled={!note.trim()} onClick={addNote}>{tr("Add note")}</Button></div>
                            {data.notes.map((n) => (
                                <div key={n.id} className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{n.by?.name || tr("Unknown")}</span><span>{fmt(n.date, 'DD MMM YYYY, HH:mm')}{(n.mine || data.can.delete) && <button className="ml-2 text-red-500" onClick={() => delNote(n.id)}>{tr("delete")}</button>}</span></div>
                                    <RichView html={n.content} />
                                </div>
                            ))}
                            {!data.notes.length && <p className="text-gray-500">{tr("No notes yet.")}</p>}
                        </div>
                    )}

                    {tab === 'activity' && (
                        <div>
                            {Object.entries(days).map(([day, list]) => (
                                <div key={day} className="mb-8">
                                    <div className="mb-4 font-semibold uppercase">{dayjs(day).format('dddd, DD MMMM YYYY')}</div>
                                    <Timeline>{list.map((a) => <Timeline.Item key={a.id}><div className="mt-1 text-sm"><span className="font-semibold heading-text">{a.by || tr("System")}</span> <span className="text-gray-600 dark:text-gray-300">{a.text}</span><div className="text-xs text-gray-400">{dayjs(a.date).format('HH:mm')}</div></div></Timeline.Item>)}</Timeline>
                                </div>
                            ))}
                            {!data.activity.length && <p className="text-gray-500">{tr("No activity yet.")}</p>}
                        </div>
                    )}

                    {tab === 'settings' && (
                        <div className="max-w-3xl space-y-4">
                            <h5>{tr("Project settings")}</h5>
                            <div><L>{tr("Project name")}</L><Input disabled={!data.can.edit} value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div><L>{tr("Client")}</L><RelationSelect resource="clients" value={form.clientId} disabled={!data.can.edit} onChange={(x) => set({ clientId: x || null })} /></div>
                                <div><L>{tr("Status")}</L><Select isDisabled={!data.can.edit} options={STATUS.map((s) => ({ value: s.value, label: s.label }))} value={STATUS.filter((s) => s.value === +form.status).map((s) => ({ value: s.value, label: s.label }))[0]} onChange={(o) => set({ status: o.value })} /></div>
                                <div><L>{tr("Start date")}</L><DatePicker disabled={!data.can.edit} value={form.startDate} onChange={(d) => set({ startDate: d })} /></div>
                                <div><L>{tr("Deadline")}</L><DatePicker disabled={!data.can.edit} value={form.deadline} onChange={(d) => set({ deadline: d })} /></div>
                                <div><L>{tr("Billing")}</L><Select isDisabled={!data.can.edit} options={BILLING} value={BILLING.find((b) => b.value === +form.billingType)} onChange={(o) => set({ billingType: o.value })} /></div>
                                <div><L>{tr("Team")}</L><Select isMulti isDisabled={!data.can.edit} options={opts} value={opts.filter((o) => form.memberIds.includes(o.value))} onChange={(o) => set({ memberIds: (o || []).map((x) => x.value) })} /></div>
                                {+form.billingType === 1 && <div><L>{tr("Total rate")}</L><Input type="number" disabled={!data.can.edit} value={form.projectCost} onChange={(e) => set({ projectCost: e.target.value })} /></div>}
                                {+form.billingType === 2 && <div><L>{tr("Rate per hour")}</L><Input type="number" disabled={!data.can.edit} value={form.projectRatePerHour} onChange={(e) => set({ projectRatePerHour: e.target.value })} /></div>}
                                <div><L>{tr("Estimated hours")}</L><Input type="number" disabled={!data.can.edit} value={form.estimatedHours} onChange={(e) => set({ estimatedHours: e.target.value })} /></div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"><span>{tr("Calculate progress from the tasks")}</span><Switcher disabled={!data.can.edit} checked={form.progressFromTasks} onChange={(c) => set({ progressFromTasks: c })} /></div>
                            {!form.progressFromTasks && <div><L>{tr("Progress (%)")}</L><Input type="number" min={0} max={100} disabled={!data.can.edit} value={form.progress} onChange={(e) => set({ progress: e.target.value })} /></div>}
                            <div><L>{tr("Description")}</L><RichEditor minHeight={140} disabled={!data.can.edit} value={form.description} onChange={(html) => set({ description: html })} /></div>
                            <div className="flex items-center gap-2 pt-2">
                                {data.can.delete && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirmDel(true)}>{tr("Delete project")}</Button>}
                                {data.can.edit && <div className="ml-auto flex gap-2"><Button onClick={() => { setTab('overview'); load() }}>{tr("Cancel")}</Button><Button variant="solid" loading={saving} onClick={save}>{tr("Save changes")}</Button></div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr("Delete this project?")} confirmText={tr("Delete")} onClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={del}>
                <p>{tr("The project, its milestones, files list, notes and all")} {trn(stats.tasksTotal, "task")} {tr("are removed for good.")}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default ProjectDetails
