// Surveys: question types, the checks on a survey before it is saved, the checks on the answers, and the results. Pure functions.

/** type: how the question is answered. The stored box type is radio | checkbox | input | textarea | rating. */
export const QUESTION_TYPES = [
    { key: 'radio', label: 'Single choice', hint: 'Pick one answer', choices: true },
    { key: 'checkbox', label: 'Multiple choice', hint: 'Pick several answers', choices: true },
    { key: 'yesno', label: 'Yes / No', hint: 'Two answers', choices: true, stored: 'radio' },
    { key: 'rating', label: 'Rating 1 to 5', hint: 'Stars from poor to great', choices: false },
    { key: 'input', label: 'Short answer', hint: 'A line of text', choices: false },
    { key: 'textarea', label: 'Long answer', hint: 'A paragraph of text', choices: false },
]
export const storedType = (t) => QUESTION_TYPES.find((x) => x.key === t)?.stored || t
export const isChoice = (t) => ['radio', 'checkbox', 'yesno'].includes(t)
export const MAX_QUESTIONS = 40
export const MAX_OPTIONS = 20

const fail = (message) => Object.assign(new Error(message), { status: 400 })

/** The survey a person sent, checked and trimmed. Throws a message they can read. */
export function cleanSurvey(b = {}) {
    const subject = String(b.subject || '').trim().slice(0, 150)
    if (!subject) throw fail('Give the survey a title')
    const questions = (Array.isArray(b.questions) ? b.questions : []).map((q, i) => {
        const text = String(q?.question || '').trim().slice(0, 300)
        const type = QUESTION_TYPES.some((t) => t.key === q?.type) ? q.type : 'radio'
        let options = isChoice(type) ? (Array.isArray(q?.options) ? q.options : []).map((o) => ({ id: o?.id || null, text: String(o?.text || '').trim().slice(0, 150) })).filter((o) => o.text) : []
        if (type === 'yesno') options = [{ id: options[0]?.id || null, text: 'Yes' }, { id: options[1]?.id || null, text: 'No' }]
        return { id: q?.id || null, question: text, required: !!q?.required, type, options, order: i + 1 }
    }).filter((q) => q.question)
    if (!questions.length) throw fail('Add at least one question')
    if (questions.length > MAX_QUESTIONS) throw fail(`A survey can have up to ${MAX_QUESTIONS} questions`)
    for (const q of questions) {
        if (isChoice(q.type) && q.options.length < 2) throw fail(`"${q.question}" needs at least two answers to choose from`)
        if (q.options.length > MAX_OPTIONS) throw fail(`A question can have up to ${MAX_OPTIONS} answers`)
    }
    const date = (v) => { if (!v) return null; const d = new Date(v); if (Number.isNaN(+d)) throw fail('A date is not valid'); return d }
    const startsAt = date(b.startsAt), endsAt = date(b.endsAt)
    if (startsAt && endsAt && +endsAt < +startsAt) throw fail('The survey cannot close before it opens')
    const url = String(b.redirectUrl || '').trim()
    if (url && !/^https?:\/\/[^\s]+$/i.test(url)) throw fail('The address to go to afterwards must start with https://')
    return {
        subject, description: String(b.description || '').trim().slice(0, 2000) || null, thankYou: String(b.thankYou || '').trim().slice(0, 1000) || null, redirectUrl: url || null,
        active: b.active !== false, onlyForLoggedIn: !!b.onlyForLoggedIn, ipRestrict: !!b.ipRestrict, startsAt, endsAt, questions,
    }
}

/** open | scheduled | closed | off, from the Active switch and the dates. */
export function surveyState(s, now = new Date()) {
    if (s.active === false) return 'off'
    if (s.startsAt && +now < +new Date(s.startsAt)) return 'scheduled'
    if (s.endsAt && +now > +new Date(s.endsAt)) return 'closed'
    return 'open'
}

/**
 * The answers a person sent, checked against the survey: questions = [{ id, type, required, options: [{ id }] }], answers = { questionId: value }.
 * Returns the rows to store: [{ questionId, optionId?, answer? }]. Throws a message they can read.
 */
export function checkAnswers(questions, answers = {}) {
    const rows = []
    for (const q of questions) {
        const v = answers[q.id]
        const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)
        if (empty) { if (q.required) throw fail(`Please answer: ${q.question}`); continue }
        if (q.type === 'radio' || q.type === 'yesno') {
            const o = q.options.find((x) => x.id === String(v)); if (!o) throw fail(`That answer is not one of the choices: ${q.question}`)
            rows.push({ questionId: q.id, optionId: o.id, answer: o.text })
        } else if (q.type === 'checkbox') {
            const list = [...new Set((Array.isArray(v) ? v : [v]).map(String))]
            for (const id of list) { const o = q.options.find((x) => x.id === id); if (!o) throw fail(`That answer is not one of the choices: ${q.question}`); rows.push({ questionId: q.id, optionId: o.id, answer: o.text }) }
        } else if (q.type === 'rating') {
            const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 5) throw fail(`The rating is from 1 to 5: ${q.question}`)
            rows.push({ questionId: q.id, answer: String(n) })
        } else {
            rows.push({ questionId: q.id, answer: String(v).trim().slice(0, 2000) })
        }
    }
    return rows
}

/** One question's results from the stored rows [{ resultSetId, optionId, answer, createdAt }]. */
export function summarizeQuestion(q, rows) {
    const responders = new Set(rows.map((r) => r.resultSetId)).size
    const out = { id: q.id, question: q.question, type: q.type, required: q.required, responders }
    if (isChoice(q.type)) {
        out.options = q.options.map((o) => { const count = rows.filter((r) => r.optionId === o.id).length; return { id: o.id, text: o.text, count, pct: responders ? Math.round((count / responders) * 100) : 0 } })
    } else if (q.type === 'rating') {
        const vals = rows.map((r) => Number(r.answer)).filter((n) => n >= 1 && n <= 5)
        out.average = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
        out.distribution = [1, 2, 3, 4, 5].map((n) => vals.filter((x) => x === n).length)
    } else {
        out.answers = [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 100).map((r) => ({ text: r.answer, date: r.createdAt }))
    }
    return out
}

/** CSV text of the responses: a header with the questions, one line per response. */
export function toCsv(questions, resultSets, rows) {
    const esc = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const lines = [['Date', ...questions.map((q) => q.question)].map(esc).join(',')]
    for (const rs of resultSets) {
        const mine = rows.filter((r) => r.resultSetId === rs.id)
        lines.push([new Date(rs.createdAt).toISOString().slice(0, 16).replace('T', ' '), ...questions.map((q) => mine.filter((r) => r.questionId === q.id).map((r) => r.answer).join(' | '))].map(esc).join(','))
    }
    return lines.join('\n')
}
