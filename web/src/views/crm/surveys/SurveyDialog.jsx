/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbPlus, TbTrash, TbArrowUp, TbArrowDown } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import Select from '@/components/ui/Select'
import { api, notify } from '../kit/api'
import { QUESTION_TYPES, isChoice } from '@/lib/crm/surveysCalc'
import { tr } from '@/utils/t'

const newQuestion = () => ({ id: null, key: Math.random().toString(36).slice(2), question: '', type: 'radio', required: false, options: [{ id: null, text: '' }, { id: null, text: '' }] })
const blank = () => ({ id: null, subject: '', description: '', thankYou: '', redirectUrl: '', active: true, onlyForLoggedIn: false, ipRestrict: true, startsAt: '', endsAt: '', questions: [newQuestion()] })
const Label = ({ children, hint }) => <div className="mb-1.5 flex items-baseline justify-between gap-2"><label className="form-label block">{children}</label>{hint && <span className="text-xs text-gray-400">{hint}</span>}</div>

/** Create or edit a survey: the introduction, who and when, and the questions. surveyId = null creates one. */
const SurveyDialog = ({ open, surveyId, onClose, onSaved }) => {
    const [v, setV] = useState(blank())
    const [busy, setBusy] = useState(false)
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        if (!open) return
        if (!surveyId) { setV(blank()); return }
        setLoading(true)
        api(`/api/crm/surveys-board/${surveyId}`).then((s) => setV({ ...s, startsAt: s.startsAt ? dayjs(s.startsAt).format('YYYY-MM-DD') : '', endsAt: s.endsAt ? dayjs(s.endsAt).format('YYYY-MM-DD') : '', questions: s.questions.map((q) => ({ ...q, key: q.id })) })).catch((e) => { notify('danger', e.message); onClose() }).finally(() => setLoading(false))
    }, [open, surveyId]) // eslint-disable-line react-hooks/exhaustive-deps
    const set = (patch) => setV((x) => ({ ...x, ...patch }))
    const setQ = (i, patch) => set({ questions: v.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) })
    const move = (i, d) => { const a = [...v.questions]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set({ questions: a }) }
    const setOpt = (i, k, text) => setQ(i, { options: v.questions[i].options.map((o, j) => (j === k ? { ...o, text } : o)) })
    const typeOptions = QUESTION_TYPES.map((t) => ({ value: t.key, label: tr(t.label) }))
    const save = async () => {
        setBusy(true)
        try {
            const body = { ...v, startsAt: v.startsAt || null, endsAt: v.endsAt || null, questions: v.questions.map(({ key, ...q }) => q) } // eslint-disable-line no-unused-vars
            await api(surveyId ? `/api/crm/surveys-board/${surveyId}` : '/api/crm/surveys-board', { method: surveyId ? 'PUT' : 'POST', body })
            notify('success', surveyId ? tr('Survey saved') : tr('Survey created')); onSaved?.(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={820} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4 pr-10">{surveyId ? tr('Edit survey') : tr('New survey')}</h5>
            {loading ? <div className="py-12 text-center text-gray-400">{tr('Loading…')}</div> : (
                <div className="max-h-[68vh] overflow-y-auto pr-1">
                    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2"><Label>{tr('Title')}</Label><Input autoFocus value={v.subject} onChange={(e) => set({ subject: e.target.value })} placeholder={tr('For example: How did we do?')} /></div>
                        <div><Label hint={tr('Shown above the questions')}>{tr('Introduction')}</Label><Input textArea rows={3} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
                        <div><Label hint={tr('Shown after sending')}>{tr('Thank you message')}</Label><Input textArea rows={3} value={v.thankYou} onChange={(e) => set({ thankYou: e.target.value })} placeholder={tr('Your answers were sent.')} /></div>
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div><Label>{tr('Opens on')}</Label><Input type="date" value={v.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></div>
                        <div><Label>{tr('Closes on')}</Label><Input type="date" value={v.endsAt} min={v.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} /></div>
                        <div className="md:col-span-2"><Label hint={tr('Optional')}>{tr('Go to this address afterwards')}</Label><Input value={v.redirectUrl} onChange={(e) => set({ redirectUrl: e.target.value })} placeholder="https://" /></div>
                        <label className="flex items-center gap-2 text-sm font-semibold"><Switcher checked={v.active} onChange={(c) => set({ active: c })} />{tr('Open for answers')}</label>
                        <label className="flex items-center gap-2 text-sm font-semibold"><Switcher checked={v.ipRestrict} onChange={(c) => set({ ipRestrict: c })} />{tr('One answer per device')}</label>
                        <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2"><Switcher checked={v.onlyForLoggedIn} onChange={(c) => set({ onlyForLoggedIn: c })} />{tr('Only for people signed in to the CRM')}</label>
                    </div>

                    <Label hint={tr('{n} questions', { n: v.questions.length })}>{tr('Questions')}</Label>
                    <div className="flex flex-col gap-3">
                        {v.questions.map((q, i) => (
                            <div key={q.key} className="rounded-2xl border border-gray-200 p-3 dark:border-gray-700">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-bold dark:bg-gray-700">{i + 1}</span>
                                    <div className="min-w-[200px] flex-1"><Input size="sm" value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} placeholder={tr('Your question')} /></div>
                                    <div className="w-44"><Select size="sm" isSearchable={false} options={typeOptions} value={typeOptions.find((o) => o.value === q.type)} onChange={(o) => setQ(i, { type: o.value, ...(isChoice(o.value) && q.options.length < 2 ? { options: [{ id: null, text: '' }, { id: null, text: '' }] } : {}) })} /></div>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold"><Switcher checked={q.required} onChange={(c) => setQ(i, { required: c })} />{tr('Required')}</label>
                                    <div className="flex items-center">
                                        <button type="button" className="p-1 text-gray-400 hover:text-gray-700" aria-label={tr('Move up')} onClick={() => move(i, -1)}><TbArrowUp /></button>
                                        <button type="button" className="p-1 text-gray-400 hover:text-gray-700" aria-label={tr('Move down')} onClick={() => move(i, 1)}><TbArrowDown /></button>
                                        <button type="button" className="p-1 text-gray-400 hover:text-red-500" aria-label={tr('Delete')} onClick={() => set({ questions: v.questions.filter((_, j) => j !== i) })}><TbTrash /></button>
                                    </div>
                                </div>
                                {(q.type === 'radio' || q.type === 'checkbox') && (
                                    <div className="mt-2 flex flex-col gap-1.5 pl-9">
                                        {q.options.map((o, k) => (
                                            <div key={o.id || k} className="flex items-center gap-2">
                                                <span className={`size-3.5 shrink-0 border border-gray-300 ${q.type === 'radio' ? 'rounded-full' : 'rounded-sm'}`} />
                                                <div className="max-w-sm flex-1"><Input size="sm" value={o.text} onChange={(e) => setOpt(i, k, e.target.value)} placeholder={tr('Answer {n}', { n: k + 1 })} /></div>
                                                {q.options.length > 2 && <button type="button" className="text-gray-400 hover:text-red-500" aria-label={tr('Remove')} onClick={() => setQ(i, { options: q.options.filter((_, j) => j !== k) })}><TbTrash /></button>}
                                            </div>
                                        ))}
                                        <div><Button size="xs" variant="plain" icon={<TbPlus />} onClick={() => setQ(i, { options: [...q.options, { id: null, text: '' }] })}>{tr('Add an answer')}</Button></div>
                                    </div>
                                )}
                                {q.type === 'yesno' && <p className="mt-2 pl-9 text-xs text-gray-400">{tr('The answers are Yes and No.')}</p>}
                                {q.type === 'rating' && <p className="mt-2 pl-9 text-xs text-gray-400">{tr('The person picks from 1 (poor) to 5 (great).')}</p>}
                            </div>
                        ))}
                        <div><Button size="sm" icon={<TbPlus />} onClick={() => set({ questions: [...v.questions, newQuestion()] })}>{tr('Add a question')}</Button></div>
                    </div>
                </div>
            )}
            <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button><Button variant="solid" loading={busy} disabled={loading} onClick={save}>{surveyId ? tr('Save changes') : tr('Create survey')}</Button></div>
        </Dialog>
    )
}

export default SurveyDialog
