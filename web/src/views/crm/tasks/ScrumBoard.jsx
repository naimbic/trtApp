import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TbPlus, TbPaperclip, TbMessageCircle, TbCalendar, TbExternalLink, TbList } from 'react-icons/tb'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import IconText from '@/components/shared/IconText'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import dayjs from 'dayjs'
import { api, notify } from '../kit/api'
import { STATUS, prioOf } from './shared'
import { tr } from '@/utils/t'

const LABEL = ['bg-sky-200 dark:bg-sky-200', 'bg-amber-200 dark:bg-amber-200', 'bg-purple-200 dark:bg-purple-200', 'bg-emerald-200 dark:bg-emerald-200', 'bg-rose-200 dark:bg-rose-200', 'bg-orange-200 dark:bg-orange-200']
const labelCls = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return `${LABEL[h % LABEL.length]} dark:text-gray-900` }
const PRIO_TAG = { 1: 'bg-purple-200 dark:bg-purple-200', 3: 'bg-red-200 dark:bg-red-200', 4: 'bg-red-300 dark:bg-red-300' }
// status order of the columns, like the template's To Do / In Progress / To Review / Completed
const COLUMNS = [1, 4, 3, 2, 5]

const Ticket = ({ t, innerRef, onOpen, ...rest }) => (
    <Card ref={innerRef} clickable className="mb-4 rounded-lg border-0 hover:shadow-lg" bodyClass="p-4" onClick={() => onOpen(t.id)} {...rest}>
        <div className="mb-2 text-base font-bold heading-text">{t.name}</div>
        {(t.tags.length > 0 || PRIO_TAG[t.priority]) && (
            <div>
                {PRIO_TAG[t.priority] && <Tag className={`mb-2 mr-2 rtl:ml-2 ${PRIO_TAG[t.priority]} dark:text-gray-900`}>{prioOf(t.priority).label}</Tag>}
                {t.tags.map((l) => <Tag key={l} className={`mb-2 mr-2 rtl:ml-2 ${labelCls(l)}`}>{l}</Tag>)}
            </div>
        )}
        <div className="mt-3 flex items-center justify-between">
            <UsersAvatarGroup avatarProps={{ size: 25 }} imgKey="image" users={t.assignees} />
            <div className="flex items-center gap-2">
                {t.dueDate && <IconText className="gap-1 text-xs" icon={<TbCalendar />}>{dayjs(t.dueDate).format('DD MMM')}</IconText>}
                {t.comments > 0 && <IconText className="gap-1 font-semibold" icon={<TbMessageCircle className="text-base" />}>{t.comments}</IconText>}
                {t.files > 0 && <IconText className="gap-1 text-base" icon={<TbPaperclip />}>{t.files}</IconText>}
            </div>
        </div>
    </Card>
)

const AddCard = ({ onCreate }) => {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const ref = useRef(null)
    useEffect(() => { if (open) ref.current?.focus() }, [open])
    const go = () => { const v = name.trim(); if (!v) return; onCreate(v); setName(''); setOpen(false) }
    if (!open) return <div className="px-4 pb-4"><Button block size="sm" variant="plain" icon={<TbPlus />} onClick={() => setOpen(true)}>{tr('Add task')}</Button></div>
    return <div className="px-4 pb-4"><Input ref={ref} size="sm" value={name} placeholder={tr('Task name')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(); if (e.key === 'Escape') setOpen(false) }} onBlur={() => { if (!name.trim()) setOpen(false) }} /></div>
}

/** One project's tasks as columns by status, in the template's scrum board look. */
const ScrumBoard = () => {
    const params = useParams()
    const nav = useNavigate()
    const [sp, setSp] = useSearchParams()
    const projectId = params.id || sp.get('project') || (() => { try { return localStorage.getItem('scrum.project') || '' } catch { return '' } })()
    const [projects, setProjects] = useState([])
    const [data, setData] = useState({ list: [], can: {} })
    const [me, setMe] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => { api('/api/crm/work/projects?limit=500').then((r) => setProjects(r.list || [])).catch(() => {}); api('/api/crm/work/tasks/lookups').then((l) => setMe(l.me)).catch(() => {}) }, [])
    const load = useCallback(async () => {
        if (!projectId) { setLoading(false); return }
        try { setData(await api(`/api/crm/work/tasks?relType=project&relId=${projectId}&limit=1000`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [projectId])
    useEffect(() => { setLoading(true); load() }, [load])

    const project = projects.find((p) => p.id === projectId)
    const cols = useMemo(() => COLUMNS.map((s) => ({ status: s, title: STATUS.find((x) => x.value === s).label, list: data.list.filter((t) => t.status === s) })), [data.list])
    const people = useMemo(() => { const m = new Map(); data.list.forEach((t) => t.assignees.forEach((a) => m.set(a.id, a))); return [...m.values()] }, [data.list])

    const choose = (id) => { try { localStorage.setItem('scrum.project', id || '') } catch { /* private mode */ } if (params.id) nav(`/crm/projects/${id}/board`); else setSp(id ? { project: id } : {}, { replace: true }) }
    const onDragEnd = async (r) => {
        if (!r.destination || !data.can.edit) return
        const { source: s, destination: d } = r
        if (s.droppableId === d.droppableId && s.index === d.index) return
        const from = cols.find((c) => String(c.status) === s.droppableId), to = cols.find((c) => String(c.status) === d.droppableId)
        const task = from.list[s.index]
        const dest = to.list.filter((t) => t.id !== task.id)
        dest.splice(d.index, 0, { ...task, status: to.status })
        const rest = from.status !== to.status ? from.list.filter((t) => t.id !== task.id) : []
        setData((cur) => ({ ...cur, list: [...cur.list.filter((t) => ![...to.list, ...from.list].some((x) => x.id === t.id)), ...dest, ...rest] }))
        try {
            await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: to.status, ids: dest.map((t) => t.id) } })
            if (from.status !== to.status) await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: from.status, ids: rest.map((t) => t.id) } })
        } catch (e) { notify('danger', e.message) }
        load()
    }
    const create = async (status, name) => {
        try { await api('/api/crm/work/tasks', { method: 'POST', body: { name, status, priority: 2, relType: 'project', relId: projectId, assigneeIds: me ? [me] : [] } }); load() } catch (e) { notify('danger', e.message) }
    }

    return (
        <AdaptiveCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h3 className="truncate">{project?.name || tr('Scrum board')}</h3>
                    <p className="text-sm text-gray-500">{project ? tr('Scrum board') : tr('Pick a project to see its board')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {people.length > 0 && <UsersAvatarGroup className="flex items-center" avatarProps={{ size: 'sm' }} imgKey="image" users={people} />}
                    <div className="w-56"><Select size="sm" isClearable placeholder={tr('Project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} value={projects.filter((p) => p.id === projectId).map((p) => ({ value: p.id, label: p.name }))[0] || null} onChange={(o) => choose(o?.value || '')} /></div>
                    {projectId && <Button size="sm" icon={<TbList />} onClick={() => nav(`/crm/projects/${projectId}`)}>{tr('Project')}</Button>}
                    {projectId && <Button size="sm" icon={<TbExternalLink />} onClick={() => nav('/crm/my-tasks')}>{tr('Tasks')}</Button>}
                </div>
            </div>
            {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}

            {!projectId ? (
                <div className="mt-8 rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-400 dark:border-gray-600">{tr('Choose a project above to open its scrum board.')}</div>
            ) : (
                <div className="mt-6 overflow-x-auto pb-2">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-4">
                            {cols.map((c) => (
                                <div key={c.status} className="board-column mb-3 flex w-[300px] min-w-[300px] max-w-[300px] flex-col rounded-2xl bg-gray-50 dark:bg-gray-900">
                                    <div className="flex items-center justify-between px-5 py-4"><h6>{c.title}</h6><span className="rounded-full bg-gray-200 px-2 text-xs font-semibold text-gray-500 dark:bg-gray-700">{c.list.length}</span></div>
                                    <Droppable droppableId={String(c.status)} type="CONTENT">
                                        {(dp) => (
                                            <div ref={dp.innerRef} {...dp.droppableProps} className="min-h-[60px] px-4">
                                                {c.list.map((t, i) => (
                                                    <Draggable key={t.id} draggableId={t.id} index={i} isDragDisabled={!data.can.edit || t.canFinish === false}>
                                                        {(tp) => <div ref={tp.innerRef} {...tp.draggableProps} {...tp.dragHandleProps}><Ticket t={t} onOpen={(id) => nav(`/crm/tasks/${id}`)} /></div>}
                                                    </Draggable>
                                                ))}
                                                {dp.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                    {data.can.create && <AddCard onCreate={(name) => create(c.status, name)} />}
                                </div>
                            ))}
                        </div>
                    </DragDropContext>
                    {!loading && !data.list.length && <p className="py-6 text-center text-sm text-gray-400">{tr('No task in this project yet. Add one in a column.')}</p>}
                </div>
            )}
        </AdaptiveCard>
    )
}

export default ScrumBoard
