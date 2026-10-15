import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { TbCalendar, TbChecklist, TbFlag, TbPaperclip } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Table from '@/components/ui/Table'
import { portal } from './api'
import { StatusTag, Bar, Empty } from './ui'
import { useI18n } from './i18n'

const { Tr, Th, Td, THead, TBody } = Table

export const Projects = () => {
    const { t, date } = useI18n()
    const [d, setD] = useState(null)
    useEffect(() => { portal('/projects').then(setD).catch(() => setD({ list: [] })) }, [])
    return (
        <div>
            <div className="mb-4"><h3>{t('Projects')}</h3><p className="text-sm text-gray-500">{t('The work we are doing for you.')}</p></div>
            {!d ? <Card><Skeleton height={120} /></Card> : d.list.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {d.list.map((p) => (
                        <Card key={p.id} bodyClass="h-full">
                            <div className="flex h-full flex-col justify-between gap-4">
                                <div className="flex items-start justify-between gap-2"><Link to={`/portal/projects/${p.id}`}><h6 className="font-bold hover:text-primary">{p.name}</h6></Link><StatusTag label={p.statusLabel} /></div>
                                <div className="text-sm text-gray-500"><TbCalendar className="mr-1 inline" />{date(p.startDate)} → {date(p.deadline)}</div>
                                <div><Bar value={p.progress} /><div className="mt-2 flex items-center justify-between text-xs text-gray-500"><span>{t('{n}% complete', { n: p.progress })}</span><span><TbChecklist className="mr-1 inline" />{t('{done} / {total} tasks', { done: p.done, total: p.tasks })}</span></div></div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : <Card><Empty>{t('No projects yet.')}</Empty></Card>}
        </div>
    )
}

export const ProjectDetail = () => {
    const { t, date } = useI18n()
    const { id } = useParams()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => { portal(`/projects/${id}`).then(setD).catch((e) => setError(e.message)) }, [id])
    if (error) return <Card><div className="text-red-500">{error}</div><Link to="/portal/projects" className="mt-3 inline-block text-primary">{t('Back to projects')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { project: p } = d
    return (
        <div className="flex flex-col gap-4">
            <div><div className="mb-1 text-sm text-gray-500"><Link to="/portal/projects" className="hover:text-primary">{t('Projects')}</Link></div><div className="flex flex-wrap items-center gap-3"><h3>{p.name}</h3><StatusTag label={p.statusLabel} /></div></div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <h5 className="mb-3">{t('About this project')}</h5>
                    {p.description ? <div className="prose max-w-full whitespace-pre-line dark:prose-invert" dangerouslySetInnerHTML={{ __html: /<[a-z][\s\S]*>/i.test(p.description) ? p.description.replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '') : p.description.replace(/&/g, '&amp;').replace(/</g, '&lt;') }} /> : <p className="text-gray-500">{t('No description.')}</p>}
                </Card>
                <Card bordered={false} className="bg-gray-100 shadow-none dark:bg-gray-800">
                    <h5>{t('Schedule')}</h5>
                    <div className="mt-5 flex flex-col gap-4 text-sm">
                        <div><span className="font-semibold heading-text">{t('Start')}: </span>{date(p.startDate)}</div>
                        <div><span className="font-semibold heading-text">{t('Due')}: </span>{date(p.deadline)}</div>
                        <div className="flex flex-col gap-2"><span className="font-semibold heading-text">{t('Completion')}</span><Bar value={p.progress} /></div>
                    </div>
                </Card>
            </div>
            {d.milestones.length > 0 && (
                <Card><h5 className="mb-3"><TbFlag className="mr-1 inline" />{t('Milestones')}</h5><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.milestones.map((m) => <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"><span className="h-8 w-1.5 rounded-full" style={{ background: m.color || '#64748b' }} /><div><div className="font-semibold">{m.name}</div><div className="text-xs text-gray-500">{m.dueDate ? t('Due {date}', { date: date(m.dueDate) }) : t('No due date')}</div></div></div>)}</div></Card>
            )}
            <Card bodyClass="p-0 sm:p-0">
                <div className="px-6 pt-5"><h5><TbChecklist className="mr-1 inline" />{t('Tasks shared with you')}</h5></div>
                {d.tasks.length ? <div className="overflow-x-auto"><Table><THead><Tr><Th>{t('Task')}</Th><Th>{t('Status')}</Th><Th>{t('Due')}</Th></Tr></THead><TBody>{d.tasks.map((t) => <Tr key={t.id}><Td className="font-semibold">{t.name}</Td><Td><StatusTag label={t.statusLabel} /></Td><Td>{date(t.dueDate)}</Td></Tr>)}</TBody></Table></div> : <Empty>{t('No tasks are shared with you for this project.')}</Empty>}
            </Card>
            {d.files.length > 0 && <Card><h5 className="mb-3"><TbPaperclip className="mr-1 inline" />{t('Files')}</h5><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{d.files.map((f) => <div key={f.id} className="truncate rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">{f.name}<div className="text-xs text-gray-500">{date(f.date)}</div></div>)}</div></Card>}
        </div>
    )
}
