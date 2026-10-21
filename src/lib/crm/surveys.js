import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { requirePermission, hasCap } from '@/lib/crm/permissions'
import { shortLink } from '@/lib/crm/shortLinks'
import { cleanSurvey, surveyState, checkAnswers, summarizeQuestion, toCsv, storedType } from '@/lib/crm/surveysCalc'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })
const newHash = () => crypto.randomBytes(12).toString('hex')

/** A survey's questions as the screens use them: [{ id, question, required, type, options: [{ id, text }] }] (first box of each question). */
async function loadQuestions(surveyId) {
    const qs = await prisma.crmFormQuestion.findMany({ where: { relType: 'survey', relId: surveyId }, orderBy: [{ questionOrder: 'asc' }, { createdAt: 'asc' }], include: { boxes: { orderBy: { createdAt: 'asc' }, include: { descriptions: { orderBy: { createdAt: 'asc' } } } } } })
    return qs.map((q) => {
        const box = q.boxes[0]
        let type = box?.boxType || 'input'
        const options = (box?.descriptions || []).map((d) => ({ id: d.id, text: d.description || '' }))
        if (type === 'radio' && options.length === 2 && options[0].text === 'Yes' && options[1].text === 'No') type = 'yesno'
        return { id: q.id, question: q.question || '', required: !!q.required, type, boxId: box?.id || null, options }
    })
}

const linkOf = async (s) => shortLink({ prefix: 'sv', relType: 'survey', relId: s.id, label: s.subject, target: `/api/crm/public/survey/${s.hash}` })

async function withHash(s) {
    if (s.hash) return s
    return prisma.crmSurvey.update({ where: { id: s.id }, data: { hash: newHash() } })
}

/** Every survey with its state, number of questions and responses, and the link to share. */
export async function surveysBoard() {
    const session = await requirePermission('surveys', 'view')
    const authority = session.user.authority || []
    const rows = await prisma.crmSurvey.findMany({ orderBy: { createdAt: 'desc' }, take: 300 })
    const [qCounts, rCounts] = await Promise.all([
        prisma.crmFormQuestion.groupBy({ by: ['relId'], where: { relType: 'survey' }, _count: { _all: true } }).catch(() => []),
        prisma.crmSurveyResultSet.groupBy({ by: ['surveyId'], _count: { _all: true }, _max: { createdAt: true } }).catch(() => []),
    ])
    const qc = Object.fromEntries(qCounts.map((x) => [x.relId, x._count._all]))
    const rc = Object.fromEntries(rCounts.map((x) => [x.surveyId, { n: x._count._all, last: x._max.createdAt }]))
    const surveys = []
    for (const r of rows) {
        const s = await withHash(r)
        surveys.push({
            id: s.id, subject: s.subject, description: s.description || '', active: s.active !== false, state: surveyState(s), startsAt: s.startsAt || null, endsAt: s.endsAt || null,
            onlyForLoggedIn: !!s.onlyForLoggedIn, ipRestrict: !!s.ipRestrict, questions: qc[s.id] || 0, responses: rc[s.id]?.n || 0, lastResponse: rc[s.id]?.last || null, createdAt: s.createdAt,
            link: await linkOf(s).catch(() => ''),
        })
    }
    return { surveys, can: { create: hasCap(authority, 'surveys', 'create'), edit: hasCap(authority, 'surveys', 'edit'), delete: hasCap(authority, 'surveys', 'delete') } }
}

export async function getSurveyForEdit(id) {
    await requirePermission('surveys', 'view')
    const s = await prisma.crmSurvey.findUnique({ where: { id } })
    if (!s) throw httpError('Survey not found', 404)
    return { id: s.id, subject: s.subject, description: s.description || '', thankYou: s.thankYou || '', redirectUrl: s.redirectUrl || '', active: s.active !== false, onlyForLoggedIn: !!s.onlyForLoggedIn, ipRestrict: !!s.ipRestrict, startsAt: s.startsAt, endsAt: s.endsAt, questions: (await loadQuestions(id)).map(({ boxId, ...q }) => q) }
}

/** Create (no id) or update a survey with all its questions. The questions that were taken out are deleted with their answers. */
export async function saveSurvey(body) {
    const id = body?.id || null
    await requirePermission('surveys', id ? 'edit' : 'create')
    const c = cleanSurvey(body)
    const { questions, ...data } = c
    let survey
    if (id) {
        if (!(await prisma.crmSurvey.findUnique({ where: { id }, select: { id: true } }))) throw httpError('Survey not found', 404)
        survey = await prisma.crmSurvey.update({ where: { id }, data })
    } else {
        survey = await prisma.crmSurvey.create({ data: { ...data, hash: newHash() } })
    }
    const existing = await loadQuestions(survey.id)
    const keep = new Set(questions.map((q) => q.id).filter(Boolean))
    for (const old of existing.filter((q) => !keep.has(q.id))) await removeQuestion(old)
    for (const q of questions) {
        const type = storedType(q.type)
        const cur = q.id ? existing.find((x) => x.id === q.id) : null
        let questionId = cur?.id, boxId = cur?.boxId
        if (cur) await prisma.crmFormQuestion.update({ where: { id: cur.id }, data: { question: q.question, required: q.required, questionOrder: q.order } })
        else questionId = (await prisma.crmFormQuestion.create({ data: { relType: 'survey', relId: survey.id, question: q.question, required: q.required, questionOrder: q.order } })).id
        if (boxId) await prisma.crmFormQuestionBox.update({ where: { id: boxId }, data: { boxType: type } })
        else boxId = (await prisma.crmFormQuestionBox.create({ data: { boxType: type, questionId } })).id
        // the answers to choose from: keep the ones that still exist (so past answers stay linked), add the new, drop the removed
        const have = await prisma.crmFormQuestionBoxDescription.findMany({ where: { boxId } })
        const kept = new Set(q.options.map((o) => o.id).filter(Boolean))
        for (const d of have.filter((x) => !kept.has(x.id))) { await prisma.crmSurveyResult.deleteMany({ where: { boxDescriptionId: d.id } }); await prisma.crmFormQuestionBoxDescription.delete({ where: { id: d.id } }) }
        for (const o of q.options) {
            if (o.id && have.some((x) => x.id === o.id)) await prisma.crmFormQuestionBoxDescription.update({ where: { id: o.id }, data: { description: o.text } })
            else await prisma.crmFormQuestionBoxDescription.create({ data: { description: o.text, boxId, questionId } })
        }
    }
    return { id: survey.id }
}

async function removeQuestion(q) {
    await prisma.crmSurveyResult.deleteMany({ where: { questionId: q.id } })
    const boxes = await prisma.crmFormQuestionBox.findMany({ where: { questionId: q.id }, select: { id: true } })
    await prisma.crmFormQuestionBoxDescription.deleteMany({ where: { boxId: { in: boxes.map((b) => b.id) } } })
    await prisma.crmFormQuestionBox.deleteMany({ where: { questionId: q.id } })
    await prisma.crmFormQuestion.delete({ where: { id: q.id } })
}

export async function deleteSurvey(id) {
    await requirePermission('surveys', 'delete')
    if (!(await prisma.crmSurvey.findUnique({ where: { id }, select: { id: true } }))) throw httpError('Survey not found', 404)
    for (const q of await loadQuestions(id)) await removeQuestion(q)
    await prisma.crmSurveyResult.deleteMany({ where: { surveyId: id } })
    await prisma.crmSurveyResultSet.deleteMany({ where: { surveyId: id } })
    await prisma.crmSurveySendLog.deleteMany({ where: { surveyId: id } })
    await prisma.crmShortLink.deleteMany({ where: { relType: 'survey', relId: id } }).catch(() => {})
    await prisma.crmSurvey.delete({ where: { id } })
    return { success: true }
}

/** A copy with the same questions, closed until you turn it on, without any answers. */
export async function duplicateSurvey(id) {
    await requirePermission('surveys', 'create')
    const s = await getSurveyForEdit(id)
    const copy = await saveSurvey({ ...s, id: null, subject: `${s.subject} (copy)`, active: false, questions: s.questions.map((q) => ({ ...q, id: null, options: q.options.map((o) => ({ text: o.text })) })) })
    return copy
}

/** Switch a survey on or off without opening it. */
export async function setSurveyActive(id, active) {
    await requirePermission('surveys', 'edit')
    await prisma.crmSurvey.update({ where: { id }, data: { active: !!active } })
    return { success: true }
}

export async function surveyResults(id) {
    await requirePermission('surveys', 'view')
    const s = await prisma.crmSurvey.findUnique({ where: { id } })
    if (!s) throw httpError('Survey not found', 404)
    const [questions, sets, rows] = await Promise.all([loadQuestions(id), prisma.crmSurveyResultSet.count({ where: { surveyId: id } }), prisma.crmSurveyResult.findMany({ where: { surveyId: id } })])
    const mapped = rows.map((r) => ({ resultSetId: r.resultSetId, questionId: r.questionId, optionId: r.boxDescriptionId, answer: r.answer, createdAt: r.createdAt }))
    return { survey: { id: s.id, subject: s.subject }, responses: sets, questions: questions.map((q) => summarizeQuestion(q, mapped.filter((r) => r.questionId === q.id))) }
}

export async function surveyCsv(id) {
    await requirePermission('surveys', 'view')
    const s = await prisma.crmSurvey.findUnique({ where: { id } })
    if (!s) throw httpError('Survey not found', 404)
    const [questions, sets, rows] = await Promise.all([loadQuestions(id), prisma.crmSurveyResultSet.findMany({ where: { surveyId: id }, orderBy: { createdAt: 'asc' } }), prisma.crmSurveyResult.findMany({ where: { surveyId: id } })])
    return { name: `${s.subject.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'survey'}.csv`, csv: toCsv(questions, sets, rows.map((r) => ({ resultSetId: r.resultSetId, questionId: r.questionId, answer: r.answer }))) }
}

/* ---------- the public page ---------- */

/** The survey a visitor may answer, by its secret hash (null when it does not exist). */
export async function publicSurvey(hash) {
    if (!/^[a-f0-9]{8,64}$/i.test(String(hash || ''))) return null
    const s = await prisma.crmSurvey.findFirst({ where: { hash } })
    if (!s) return null
    return { survey: s, state: surveyState(s), questions: await loadQuestions(s.id) }
}

export async function submitSurvey(hash, answers, { ip = null, userAgent = null } = {}) {
    const found = await publicSurvey(hash)
    if (!found) throw httpError('Survey not found', 404)
    const { survey, state, questions } = found
    if (state !== 'open') throw httpError(state === 'scheduled' ? 'This survey is not open yet' : 'This survey is closed', 403)
    if (survey.onlyForLoggedIn && !(await auth())?.user?.id) throw httpError('Sign in to answer this survey', 403)
    if (survey.ipRestrict && ip && (await prisma.crmSurveyResultSet.findFirst({ where: { surveyId: survey.id, ip }, select: { id: true } }))) throw httpError('This device has already answered this survey', 409)
    const rows = checkAnswers(questions, answers || {})
    if (!rows.length) throw httpError('Answer at least one question')
    const set = await prisma.crmSurveyResultSet.create({ data: { surveyId: survey.id, ip, userAgent: userAgent ? String(userAgent).slice(0, 300) : null } })
    for (const r of rows) {
        const q = questions.find((x) => x.id === r.questionId)
        await prisma.crmSurveyResult.create({ data: { surveyId: survey.id, questionId: r.questionId, boxId: q?.boxId || null, boxDescriptionId: r.optionId || null, resultSetId: set.id, answer: r.answer ?? null } })
    }
    return { success: true, thankYou: survey.thankYou || '', redirectUrl: survey.redirectUrl || '' }
}

