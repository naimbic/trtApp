/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbClipboardList, TbMessage2, TbCircleCheck, TbClockPause, TbPlus, TbDots, TbPencil, TbCopy, TbTrash, TbChartBar, TbLink, TbExternalLink, TbBulb } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Segment from '@/components/ui/Segment'
import Dropdown from '@/components/ui/Dropdown'
import Switcher from '@/components/ui/Switcher'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { api, notify } from '../kit/api'
import SurveyDialog from './SurveyDialog'
import SurveyResults from './SurveyResults'
import { tr } from '@/utils/t'

const STATE = {
    open: { label: 'Open', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
    closed: { label: 'Closed', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
    off: { label: 'Off', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
}
const IDEAS = ['How did we do? (after a project)', 'Customer satisfaction, 1 to 5', 'What should we improve?', 'Team pulse: how was your week?']

const copyText = async (t) => { try { await navigator.clipboard.writeText(t); notify('success', tr('Link copied')) } catch { notify('warning', tr('Copy failed: select and copy the link by hand')) } }

const SurveyCard = ({ s, can, onEdit, onResults, onDuplicate, onDelete, onToggle }) => {
    const st = STATE[s.state] || STATE.off
    return (
        <section className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xl text-primary"><TbClipboardList /></span>
                <div className="min-w-0 flex-1">
                    <h4 className="truncate pr-6 text-[15px] font-extrabold">{s.subject}</h4>
                    <div className="truncate text-xs text-gray-400">{tr('{n} questions', { n: s.questions })} · {s.endsAt ? tr('closes {d}', { d: dayjs(s.endsAt).format('DD MMM') }) : tr('no end date')}</div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${st.cls}`}>{tr(st.label)}</span>
            </div>
            {(can.edit || can.delete || can.create) && (
                <div className="absolute right-2 top-12 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <Dropdown placement="bottom-end" renderTitle={<button type="button" aria-label={tr('Options')} className="flex size-7 items-center justify-center rounded-full bg-white text-lg text-gray-500 shadow-sm hover:bg-gray-100 dark:bg-gray-700"><TbDots /></button>}>
                        {can.edit && <Dropdown.Item eventKey="e" onClick={onEdit}><span className="flex items-center"><TbPencil className="mr-2 text-lg" />{tr('Edit')}</span></Dropdown.Item>}
                        {can.create && <Dropdown.Item eventKey="d" onClick={onDuplicate}><span className="flex items-center"><TbCopy className="mr-2 text-lg" />{tr('Duplicate')}</span></Dropdown.Item>}
                        <Dropdown.Item eventKey="o" onClick={() => window.open(s.link, '_blank', 'noopener')}><span className="flex items-center"><TbExternalLink className="mr-2 text-lg" />{tr('Open the public page')}</span></Dropdown.Item>
                        {can.delete && <Dropdown.Item eventKey="x" onClick={onDelete}><span className="flex items-center text-red-500"><TbTrash className="mr-2 text-lg" />{tr('Delete')}</span></Dropdown.Item>}
                    </Dropdown>
                </div>
            )}
            {s.description && <p className="mt-3 line-clamp-2 text-sm text-gray-500">{s.description}</p>}
            <div className="mt-4 flex items-end justify-between">
                <div><div className="text-3xl font-extrabold tabular-nums">{s.responses}</div><div className="text-xs text-gray-400">{s.lastResponse ? tr('responses · last {d}', { d: dayjs(s.lastResponse).format('DD MMM') }) : tr('responses')}</div></div>
                {can.edit && <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">{tr('Open for answers')}<Switcher checked={s.active} onChange={(c) => onToggle(c)} /></label>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <Button size="xs" variant="solid" icon={<TbChartBar />} onClick={onResults}>{tr('Results')}</Button>
                <Button size="xs" icon={<TbLink />} onClick={() => copyText(s.link)}>{tr('Copy link')}</Button>
            </div>
        </section>
    )
}

/** Surveys: build one with questions, share its link, read the results. */
const SurveysPage = () => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('all')
    const [dlg, setDlg] = useState({ open: false, id: null })
    const [results, setResults] = useState(null)
    const [del, setDel] = useState(null)
    const load = useCallback(() => { api('/api/crm/surveys-board').then((x) => { setD(x); setError('') }).catch((e) => setError(e.message)) }, [])
    useEffect(() => { load() }, [load])
    const list = d?.surveys || []
    const shown = useMemo(() => (filter === 'all' ? list : list.filter((s) => (filter === 'open' ? s.state === 'open' : s.state !== 'open'))), [list, filter])
    const total = list.reduce((n, s) => n + s.responses, 0)
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); load() } catch (e) { notify('danger', e.message) } }
    return (
        <Container>
            <InvoiceHead
                title={tr('Surveys')}
                stats={[
                    { icon: <TbClipboardList />, label: tr('Surveys'), value: d ? String(list.length) : '–' },
                    { icon: <TbCircleCheck />, label: tr('Open now'), value: d ? String(list.filter((s) => s.state === 'open').length) : '–' },
                    { icon: <TbMessage2 />, label: tr('Responses'), value: d ? String(total) : '–' },
                    { icon: <TbClockPause />, label: tr('Closed or off'), value: d ? String(list.filter((s) => s.state !== 'open' && s.state !== 'scheduled').length) : '–' },
                ]}
            />
            <div className="cx-tools">
                <Segment size="sm" value={filter} onChange={(v) => v && setFilter(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="all">{tr('All')}</Segment.Item><Segment.Item value="open">{tr('Open')}</Segment.Item><Segment.Item value="other">{tr('Closed or off')}</Segment.Item>
                </Segment>
                {d?.can.create && <Button size="sm" variant="solid" className="ml-auto" icon={<TbPlus />} onClick={() => setDlg({ open: true, id: null })}>{tr('New survey')}</Button>}
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((s) => (
                    <SurveyCard key={s.id} s={s} can={d.can} onEdit={() => setDlg({ open: true, id: s.id })} onResults={() => setResults(s.id)}
                        onDuplicate={() => run(() => api(`/api/crm/surveys-board/${s.id}/duplicate`, { method: 'POST' }), tr('Survey duplicated (it is off until you open it)'))}
                        onDelete={() => setDel(s)} onToggle={(c) => run(() => api(`/api/crm/surveys-board/${s.id}/active`, { method: 'POST', body: { active: c } }))} />
                ))}
            </div>
            {d && !list.length && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 dark:border-gray-600">
                    <div className="mb-3 flex items-center gap-2 font-bold"><TbBulb className="text-xl text-amber-500" />{tr('No surveys yet. A few ideas to start from:')}</div>
                    <ul className="list-disc pl-6 text-sm text-gray-500">{IDEAS.map((i) => <li key={i}>{tr(i)}</li>)}</ul>
                    <p className="mt-3 text-sm text-gray-500">{tr('Build it with single choice, multiple choice, yes / no, 1 to 5 rating and text questions, then share the link by email, chat or WhatsApp.')}</p>
                </div>
            )}
            {d && list.length > 0 && !shown.length && <div className="py-10 text-center text-gray-400">{tr('Nothing here')}</div>}
            {!d && !error && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            <SurveyDialog open={dlg.open} surveyId={dlg.id} onClose={() => setDlg({ open: false, id: null })} onSaved={load} />
            <SurveyResults surveyId={results} onClose={() => setResults(null)} />
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this survey?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const s = del; setDel(null); run(() => api(`/api/crm/surveys-board/${s.id}`, { method: 'DELETE' }), tr('Survey deleted')) }}>
                <p>{del && tr('"{name}" and its {n} responses will be deleted.', { name: del.subject, n: del.responses })}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default SurveysPage
