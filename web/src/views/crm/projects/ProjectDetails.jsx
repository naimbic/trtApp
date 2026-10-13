import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TbFileInfo, TbChecklist, TbPaperclip, TbMessages, TbNotes, TbCalendarStats, TbSettings, TbTrash, TbClock, TbFlag } from 'react-icons/tb'
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
import TasksBoard from '../tasks/TasksBoard'
import { People, initials } from '../tasks/shared'
import { STATUS, BILLING, StatusTag, Bar, fmt, hours, useStaff } from './shared'

const NAV = [
    { value: 'overview', label: 'Overview', icon: <TbFileInfo /> },
    { value: 'tasks', label: 'Tasks', icon: <TbChecklist /> },
    { value: 'files', label: 'Files', icon: <TbPaperclip /> },
    { value: 'discussions', label: 'Discussions', icon: <TbMessages /> },
    { value: 'notes', label: 'Notes', icon: <TbNotes /> },
    { value: 'activity', label: 'Activity', icon: <TbCalendarStats /> },
    { value: 'settings', label: 'Settings', icon: <TbSettings /> },
]
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const Row = ({ label, children }) => <div><span className="font-semibold heading-text">{label}: </span><span className="font-semibold">{children}</span></div>
const kindOf = (t = '') => (t.startsWith('image') ? 'image' : t.includes('pdf') ? 'pdf' : t.includes('sheet') || t.includes('excel') ? 'sheet' : t.includes('zip') ? 'archive' : t.includes('word') || t.includes('text') ? 'doc' : 'file')

const Stat = ({ icon, label, value }) => <div className="rounded-xl bg-gray-100 p-4 dark:bg-gray-800"><div className="flex items-center gap-2 text-sm text-gray-500">{icon}{label}</div><div className="mt-1 text-xl font-bold heading-text">{value}</div></div>

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
            notify('success', 'Project saved'); await load(); setTab('overview')
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const addNote = async () => { try { await api(`/api/crm/work/projects/${id}/notes`, { method: 'POST', body: { content: note } }); setNote(''); load() } catch (e) { notify('danger', e.message) } }
    const delNote = async (nid) => { try { await api(`/api/crm/work/projects/${id}/notes?noteId=${nid}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) } }
    const del = async () => { setConfirmDel(false); try { await api(`/api/crm/work/projects/${id}`, { method: 'DELETE' }); notify('success', 'Project deleted'); nav('/crm/projects/list') } catch (e) { notify('danger', e.message) } }

    const days = {}
    for (const a of data.activity) (days[dayjs(a.date).format('YYYY-MM-DD')] ||= []).push(a)

    return (
        <Container>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div><div className="mb-1 text-sm text-gray-500"><Link to="/crm/projects/list" className="hover:text-primary">Projects</Link></div><h3>{p.name}</h3></div>
                    <StatusTag status={p.status} />
                </div>
                {data.can.edit && <Button variant="solid" onClick={() => setTab('settings')}>Edit</Button>}
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
                                    <Stat icon={<TbChecklist />} label="Tasks done" value={`${stats.tasksDone} / ${stats.tasksTotal}`} />
                                    <Stat icon={<TbClock />} label="Time logged" value={hours(stats.seconds)} />
                                    <Stat icon={<TbPaperclip />} label="Files" value={stats.files} />
                                    <Stat icon={<TbFlag />} label="Milestones" value={data.milestones.length} />
                                </div>
                                {p.description ? <div className="prose max-w-full whitespace-pre-line dark:prose-invert" dangerouslySetInnerHTML={{ __html: /<[a-z][\s\S]*>/i.test(p.description) ? p.description.replace(/<script[\s\S]*?<\/script>/gi, '') : p.description.replace(/&/g, '&amp;').replace(/</g, '&lt;') }} /> : <p className="text-gray-500">No description yet.{data.can.edit && <button className="ml-1 text-primary" onClick={() => setTab('settings')}>Add one</button>}</p>}
                                {data.milestones.length > 0 && (
                                    <div className="mt-8"><h5 className="mb-3">Milestones</h5>
                                        <div className="grid gap-3 sm:grid-cols-2">{data.milestones.map((m) => <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"><span className="h-8 w-1.5 rounded-full" style={{ background: m.color || '#64748b' }} /><div className="flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs text-gray-500">{m.dueDate ? `Due ${fmt(m.dueDate)}` : 'No due date'}</div></div><span className="text-xs text-gray-500">{m.tasks} task{m.tasks === 1 ? '' : 's'}</span></div>)}</div>
                                    </div>
                                )}
                            </div>
                            <div className="lg:w-[350px] lg:min-w-[320px]">
                                <Card bordered={false} className="bg-gray-100 shadow-none dark:bg-gray-800">
                                    <h5>Client information</h5>
                                    <div className="mt-6 flex flex-col gap-4">
                                        <Row label="Client">{p.client ? <Link className="hover:text-primary" to={`/crm/clients/${p.client.id}`}>{p.client.company}</Link> : '—'}</Row>
                                        <div className="flex flex-col gap-3"><div className="font-semibold heading-text">Project manager:</div>{p.addedBy ? <div className="flex items-center gap-2"><Avatar size={25} shape="circle" src={p.addedBy.image || undefined}>{initials(p.addedBy.name)}</Avatar><span className="font-semibold">{p.addedBy.name}</span></div> : '—'}</div>
                                        <div className="flex flex-col gap-3"><div className="font-semibold heading-text">Team:</div>{p.members.length ? p.members.map((m) => <div key={m.id} className="flex items-center gap-2"><Avatar size={25} shape="circle" src={m.image || undefined}>{initials(m.name)}</Avatar><span className="font-semibold">{m.name}</span></div>) : <span className="text-gray-500">Nobody yet</span>}</div>
                                    </div>
                                </Card>
                                <Card bordered={false} className="mt-6 bg-gray-100 shadow-none dark:bg-gray-800">
                                    <h5>Schedule</h5>
                                    <div className="mt-6 flex flex-col gap-4">
                                        <Row label="Start date">{fmt(p.startDate, 'ddd, DD MMM YYYY')}</Row>
                                        <Row label="Due date"><span className={p.overdue ? 'text-red-500' : ''}>{fmt(p.deadline, 'ddd, DD MMM YYYY')}</span></Row>
                                        {p.dateFinished && p.status === 4 && <Row label="Finished">{fmt(p.dateFinished, 'ddd, DD MMM YYYY')}</Row>}
                                        <div className="flex items-center gap-2"><span className="font-semibold heading-text">Status:</span><StatusTag status={p.status} /></div>
                                        <div className="flex flex-col gap-3"><span className="font-semibold heading-text">Completion:</span><Bar value={p.progress} /></div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {tab === 'tasks' && <TasksBoard projectId={id} />}

                    {tab === 'files' && (
                        <div>
                            <h5 className="mb-4">Files</h5>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {data.files.map((f) => (
                                    <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3.5 py-4 dark:border-transparent dark:bg-gray-800">
                                        <FileIcon kind={kindOf(f.type)} className="text-3xl" />
                                        <div className="min-w-0"><div className="heading-text truncate font-bold" title={f.name}>{f.name}</div><div className="text-xs text-gray-500">{f.by?.name || '—'} · {fmt(f.date, 'DD MMM YYYY')}{f.client ? ' · client' : ''}</div></div>
                                    </div>
                                ))}
                            </div>
                            {!data.files.length && <p className="text-gray-500">No files were attached to this project.</p>}
                            {data.files.length > 0 && <p className="mt-4 text-xs text-gray-500">Files from the old Perfex are listed by name; their contents stayed on the old server and are not in the File manager.</p>}
                        </div>
                    )}

                    {tab === 'discussions' && (
                        <div>
                            <h5 className="mb-4">Discussions</h5>
                            <div className="space-y-3">
                                {data.discussions.map((d) => (
                                    <Card key={d.id}><div className="flex items-start justify-between gap-3"><div><div className="font-semibold heading-text">{d.subject}</div>{d.description && <div className="mt-1 line-clamp-2 text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: d.description.replace(/<[^>]+>/g, ' ') }} />}</div><div className="shrink-0 text-right text-xs text-gray-500">{d.by?.name || '—'}<br />{fmt(d.date, 'DD MMM YYYY')}</div></div></Card>
                                ))}
                            </div>
                            {!data.discussions.length && <p className="text-gray-500">No discussions yet.</p>}
                        </div>
                    )}

                    {tab === 'notes' && (
                        <div className="max-w-2xl space-y-4">
                            <h5>Notes</h5>
                            <div className="space-y-2"><Input textArea rows={3} placeholder="Write a private note for the team" value={note} onChange={(e) => setNote(e.target.value)} /><Button size="sm" variant="solid" disabled={!note.trim()} onClick={addNote}>Add note</Button></div>
                            {data.notes.map((n) => (
                                <div key={n.id} className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{n.by?.name || 'Unknown'}</span><span>{fmt(n.date, 'DD MMM YYYY, HH:mm')}{(n.mine || data.can.delete) && <button className="ml-2 text-red-500" onClick={() => delNote(n.id)}>delete</button>}</span></div>
                                    <div className="whitespace-pre-line">{n.content}</div>
                                </div>
                            ))}
                            {!data.notes.length && <p className="text-gray-500">No notes yet.</p>}
                        </div>
                    )}

                    {tab === 'activity' && (
                        <div>
                            {Object.entries(days).map(([day, list]) => (
                                <div key={day} className="mb-8">
                                    <div className="mb-4 font-semibold uppercase">{dayjs(day).format('dddd, DD MMMM YYYY')}</div>
                                    <Timeline>{list.map((a) => <Timeline.Item key={a.id}><div className="mt-1 text-sm"><span className="font-semibold heading-text">{a.by || 'System'}</span> <span className="text-gray-600 dark:text-gray-300">{a.text}</span><div className="text-xs text-gray-400">{dayjs(a.date).format('HH:mm')}</div></div></Timeline.Item>)}</Timeline>
                                </div>
                            ))}
                            {!data.activity.length && <p className="text-gray-500">No activity yet.</p>}
                        </div>
                    )}

                    {tab === 'settings' && (
                        <div className="max-w-3xl space-y-4">
                            <h5>Project settings</h5>
                            <div><L>Project name</L><Input disabled={!data.can.edit} value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div><L>Client</L><RelationSelect resource="clients" value={form.clientId} disabled={!data.can.edit} onChange={(x) => set({ clientId: x || null })} /></div>
                                <div><L>Status</L><Select isDisabled={!data.can.edit} options={STATUS.map((s) => ({ value: s.value, label: s.label }))} value={STATUS.filter((s) => s.value === +form.status).map((s) => ({ value: s.value, label: s.label }))[0]} onChange={(o) => set({ status: o.value })} /></div>
                                <div><L>Start date</L><DatePicker disabled={!data.can.edit} value={form.startDate} onChange={(d) => set({ startDate: d })} /></div>
                                <div><L>Deadline</L><DatePicker disabled={!data.can.edit} value={form.deadline} onChange={(d) => set({ deadline: d })} /></div>
                                <div><L>Billing</L><Select isDisabled={!data.can.edit} options={BILLING} value={BILLING.find((b) => b.value === +form.billingType)} onChange={(o) => set({ billingType: o.value })} /></div>
                                <div><L>Team</L><Select isMulti isDisabled={!data.can.edit} options={opts} value={opts.filter((o) => form.memberIds.includes(o.value))} onChange={(o) => set({ memberIds: (o || []).map((x) => x.value) })} /></div>
                                {+form.billingType === 1 && <div><L>Total rate</L><Input type="number" disabled={!data.can.edit} value={form.projectCost} onChange={(e) => set({ projectCost: e.target.value })} /></div>}
                                {+form.billingType === 2 && <div><L>Rate per hour</L><Input type="number" disabled={!data.can.edit} value={form.projectRatePerHour} onChange={(e) => set({ projectRatePerHour: e.target.value })} /></div>}
                                <div><L>Estimated hours</L><Input type="number" disabled={!data.can.edit} value={form.estimatedHours} onChange={(e) => set({ estimatedHours: e.target.value })} /></div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"><span>Calculate progress from the tasks</span><Switcher disabled={!data.can.edit} checked={form.progressFromTasks} onChange={(c) => set({ progressFromTasks: c })} /></div>
                            {!form.progressFromTasks && <div><L>Progress (%)</L><Input type="number" min={0} max={100} disabled={!data.can.edit} value={form.progress} onChange={(e) => set({ progress: e.target.value })} /></div>}
                            <div><L>Description</L><Input textArea rows={6} disabled={!data.can.edit} value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>
                            <div className="flex items-center gap-2 pt-2">
                                {data.can.delete && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirmDel(true)}>Delete project</Button>}
                                {data.can.edit && <div className="ml-auto flex gap-2"><Button onClick={() => { setTab('overview'); load() }}>Cancel</Button><Button variant="solid" loading={saving} onClick={save}>Save changes</Button></div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialog isOpen={confirmDel} type="danger" title="Delete this project?" confirmText="Delete" onClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={del}>
                <p>The project, its milestones, files list, notes and all {stats.tasksTotal} task{stats.tasksTotal === 1 ? '' : 's'} are removed for good.</p>
            </ConfirmDialog>
        </Container>
    )
}

export default ProjectDetails
