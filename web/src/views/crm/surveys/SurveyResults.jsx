/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbDownload } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const Bar = ({ label, count, pct, color = '#3b82f6' }) => (
    <div className="mb-2">
        <div className="mb-0.5 flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate">{label}</span><span className="shrink-0 text-xs text-gray-500">{count} · {pct}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
)

/** What people answered, question by question. */
const SurveyResults = ({ surveyId, onClose }) => {
    const [d, setD] = useState(null)
    useEffect(() => { setD(null); if (surveyId) api(`/api/crm/surveys-board/${surveyId}/results`).then(setD).catch((e) => { notify('danger', e.message); onClose() }) }, [surveyId]) // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <Dialog isOpen={!!surveyId} width={760} onClose={onClose} onRequestClose={onClose}>
            <div className="mb-4 flex items-center gap-3 pr-10">
                <div className="min-w-0 flex-1"><h5 className="truncate">{d?.survey.subject || tr('Results')}</h5>{d && <div className="text-sm text-gray-500">{tr('{n} responses', { n: d.responses })}</div>}</div>
                {d && d.responses > 0 && <Button size="sm" icon={<TbDownload />} onClick={() => { window.location.href = `/api/crm/surveys-board/${surveyId}/csv` }}>{tr('Export CSV')}</Button>}
            </div>
            {!d ? <div className="py-12 text-center text-gray-400">{tr('Loading…')}</div> : (
                <div className="max-h-[66vh] overflow-y-auto pr-1">
                    {d.responses === 0 && <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-700/40">{tr('No answers yet. Share the link to collect some.')}</div>}
                    {d.questions.map((q, i) => (
                        <section key={q.id} className="border-t border-gray-100 py-4 first:border-0 dark:border-gray-700">
                            <h6 className="mb-2 text-[15px] font-extrabold">{i + 1}. {q.question}<span className="ml-2 text-xs font-normal text-gray-400">{tr('{n} answered', { n: q.responders })}</span></h6>
                            {q.options && q.options.map((o) => <Bar key={o.id} label={o.text} count={o.count} pct={o.pct} />)}
                            {q.type === 'rating' && (
                                <div className="flex items-center gap-6">
                                    <div className="text-center"><div className="text-4xl font-extrabold">{q.average ?? '–'}</div><div className="text-xs text-gray-400">{tr('out of 5')}</div></div>
                                    <div className="min-w-0 flex-1">{[5, 4, 3, 2, 1].map((n) => <Bar key={n} label={`${n} ★`} count={q.distribution[n - 1]} pct={q.responders ? Math.round((q.distribution[n - 1] / q.responders) * 100) : 0} color="#f59e0b" />)}</div>
                                </div>
                            )}
                            {q.answers && (q.answers.length ? q.answers.slice(0, 12).map((a, k) => <div key={k} className="mb-1.5 rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700/40">{a.text}<span className="ml-2 text-xs text-gray-400">{dayjs(a.date).format('DD MMM')}</span></div>) : <div className="text-sm text-gray-400">{tr('No answers')}</div>)}
                            {q.answers && q.answers.length > 12 && <div className="text-xs text-gray-400">{tr('{n} more in the CSV export', { n: q.answers.length - 12 })}</div>}
                        </section>
                    ))}
                </div>
            )}
        </Dialog>
    )
}

export default SurveyResults
