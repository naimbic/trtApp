import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { TbChecklist, TbPaperclip, TbMessageCircle, TbUpload, TbFile, TbCalendar, TbUsers, TbArrowBackUp } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Table from '@/components/ui/Table'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import { CommentThread } from '@/components/crm/CommentParts'
import { portal, portalUpload } from './api'
import { StatusTag, Bar, Empty } from './ui'
import { useI18n } from './i18n'
import { usePortal } from './PortalApp'

const { Tr, Th, Td, THead, TBody } = Table
const FILTERS = [['open', 'Open'], ['done', 'Done'], ['all', 'All']]
const size = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1024))} KB`)

/** The tasks the team shares with the client. */
export const Tasks = () => {
    const { t, date } = useI18n()
    const [d, setD] = useState(null)
    const [f, setF] = useState('open')
    useEffect(() => { portal('/tasks').then(setD).catch(() => setD({ list: [] })) }, [])
    const list = (d?.list || []).filter((x) => (f === 'all' ? true : f === 'done' ? x.status === 5 : x.status !== 5))
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{t('Tasks')}</h3><p className="text-sm text-gray-500">{t('The tasks we share with you: follow them, write to us and send us files.')}</p></div>
                <div className="flex gap-1.5">{FILTERS.map(([k, label]) => <button key={k} type="button" onClick={() => setF(k)} className={`rounded-full px-3 py-1 text-sm font-semibold transition ${f === k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>{t(label)}</button>)}</div>
            </div>
            {!d ? <Card><Skeleton height={120} /></Card> : list.length ? (
                <Card bodyClass="p-0 sm:p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <THead><Tr><Th>{t('Task')}</Th><Th>{t('Project')}</Th><Th>{t('Status')}</Th><Th>{t('Due')}</Th><Th>{t('Progress')}</Th><Th /></Tr></THead>
                            <TBody>
                                {list.map((x) => (
                                    <Tr key={x.id}>
                                        <Td className="font-semibold"><Link to={`/portal/tasks/${x.id}`} className="hover:text-primary">{x.name}</Link></Td>
                                        <Td className="text-gray-500">{x.project || '—'}</Td>
                                        <Td><StatusTag label={x.statusLabel} /></Td>
                                        <Td className="whitespace-nowrap">{date(x.dueDate)}</Td>
                                        <Td className="w-40">{x.progress != null ? <Bar value={x.progress} /> : <span className="text-gray-400">—</span>}</Td>
                                        <Td className="whitespace-nowrap text-end text-xs text-gray-500">{x.messages > 0 && <span><TbMessageCircle className="me-0.5 inline" />{x.messages}</span>}</Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </Card>
            ) : <Card><Empty>{t('No task is shared with you here yet.')}</Empty></Card>}
        </div>
    )
}

/** One shared task: what it is, how far it is, the files, and the conversation with the team. */
export const TaskDetail = () => {
    const { t, date } = useI18n()
    const { id } = useParams()
    const { me } = usePortal()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [text, setText] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [busy, setBusy] = useState('')
    const [msg, setMsg] = useState(null)
    const fileRef = useRef(null)
    const load = useCallback(() => portal(`/tasks/${id}`).then(setD).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])
    if (error) return <Card><div className="text-red-500">{error}</div><Link to="/portal/tasks" className="mt-3 inline-block text-primary">{t('Back to tasks')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { task: k } = d
    const send = async () => {
        setBusy('send')
        try { await portal(`/tasks/${id}`, { method: 'POST', body: { content: text, replyToId: replyTo?.id } }); setText(''); setReplyTo(null); setMsg({ ok: true, text: t('Message sent') }); await load() } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy('') }
    }
    const upload = async (list) => {
        if (!list.length) return
        setBusy('files')
        try { const fd = new FormData(); list.forEach((f) => fd.append('files', f)); await portalUpload(`/tasks/${id}/files`, fd); setMsg({ ok: true, text: t('Files added') }); await load() } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy('') }
    }
    const html = /<[a-z][\s\S]*>/i.test(k.description || '')
    return (
        <div className="flex flex-col gap-4">
            <div>
                <div className="mb-1 text-sm text-gray-500"><Link to="/portal/tasks" className="hover:text-primary">{t('Tasks')}</Link>{k.project ? ` · ${k.project}` : ''}</div>
                <div className="flex flex-wrap items-center gap-3"><h3>{k.name}</h3><StatusTag label={k.statusLabel} /></div>
            </div>
            {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <h5 className="mb-3"><TbChecklist className="me-1 inline" />{t('About this task')}</h5>
                    {k.description ? (html ? <RichView html={k.description} /> : <p className="whitespace-pre-line">{k.description}</p>) : <p className="text-gray-500">{t('No description yet.')}</p>}
                </Card>
                <Card bordered={false} className="bg-gray-100 shadow-none dark:bg-gray-800">
                    <h5>{t('Schedule')}</h5>
                    <div className="mt-4 flex flex-col gap-3 text-sm">
                        <div><TbCalendar className="me-1 inline" /><span className="font-semibold heading-text">{t('Start')}: </span>{date(k.startDate)}</div>
                        <div><TbCalendar className="me-1 inline" /><span className="font-semibold heading-text">{t('Due')}: </span>{date(k.dueDate)}</div>
                        {k.finishedAt && k.status === 5 && <div><span className="font-semibold heading-text">{t('Finished')}: </span>{date(k.finishedAt)}</div>}
                        <div><span className="font-semibold heading-text">{t('Priority')}: </span>{t(k.priorityLabel)}</div>
                        {k.team.length > 0 && <div><TbUsers className="me-1 inline" /><span className="font-semibold heading-text">{t('Our team')}: </span>{k.team.join(', ')}</div>}
                        {k.progress != null && <div className="flex flex-col gap-2"><span className="font-semibold heading-text">{k.steps ? t('{done} of {total} steps done', { done: k.steps.done, total: k.steps.total }) : t('Progress')}</span><Bar value={k.progress} /></div>}
                    </div>
                </Card>
            </div>
            <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h5><TbPaperclip className="me-1 inline" />{t('Files')}</h5>
                    {d.canWrite && <><Button size="sm" icon={<TbUpload />} loading={busy === 'files'} onClick={() => fileRef.current?.click()}>{t('Add files')}</Button><input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { upload([...e.target.files]); e.target.value = '' }} /></>}
                </div>
                {d.files.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {d.files.map((f) => (
                            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg bg-gray-50 p-2.5 text-sm transition hover:bg-gray-100 dark:bg-gray-700/40">
                                {f.kind === 'image' ? <img src={f.url} alt="" loading="lazy" className="size-9 shrink-0 rounded object-cover" /> : <TbFile className="size-9 shrink-0 text-gray-400" />}
                                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{f.name}</span><span className="text-xs text-gray-500">{size(f.size)} · {f.fromClient ? t('Sent by you') : t('Shared by our team')} · {date(f.createdAt)}</span></span>
                            </a>
                        ))}
                    </div>
                ) : <p className="text-sm text-gray-500">{t('No file yet.')}</p>}
            </Card>
            <Card>
                <h5 className="mb-3"><TbMessageCircle className="me-1 inline" />{t('Conversation')}</h5>
                {d.canWrite && (
                    <div className="mb-4 flex flex-col gap-2">
                        {replyTo && <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary"><TbArrowBackUp />{t('Replying to {name}', { name: replyTo.name })}<button type="button" className="ms-auto" onClick={() => setReplyTo(null)}>×</button></div>}
                        <RichEditor minHeight={80} value={text} placeholder={t('Write a message to our team')} onChange={setText} mentions={false} images={false} />
                        <div className="flex justify-end"><Button variant="solid" loading={busy === 'send'} disabled={!text.trim()} onClick={send}>{t('Send')}</Button></div>
                    </div>
                )}
                <div className="space-y-3">
                    <CommentThread comments={d.comments} render={(c) => (
                        <div className={`flex gap-2.5 ${c.mine ? 'flex-row-reverse' : ''}`}>
                            <div className={`min-w-0 max-w-[92%] flex-1 rounded-xl p-3 text-sm ${c.fromClient ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
                                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="truncate text-gray-700 dark:text-gray-200">{c.mine ? t('You') : c.fromClient ? c.authorName : `${c.authorName} · ${t('Our team')}`}</b><span>{date(c.createdAt, 'DD MMM YYYY, HH:mm')}</span>{d.canWrite && <button type="button" className="text-primary hover:underline" onClick={() => setReplyTo({ id: c.id, name: c.mine ? t('You') : c.authorName })}>{t('Reply')}</button>}</div>
                                <RichView mentions={false} html={c.content} />
                            </div>
                        </div>
                    )} />
                    {!d.comments.length && <p className="py-2 text-sm text-gray-500">{t('No message yet. Write to us here.')}</p>}
                </div>
            </Card>
            {me?.preview && <p className="text-xs text-gray-400">{t('This is a preview: nothing is saved')}</p>}
        </div>
    )
}
