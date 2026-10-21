import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanSurvey, surveyState, checkAnswers, summarizeQuestion, toCsv } from './surveysCalc.js'

const base = { subject: ' Client feedback ', questions: [
    { question: 'How was it?', type: 'rating', required: true },
    { question: 'Would you come back?', type: 'yesno' },
    { question: 'What did you like?', type: 'checkbox', options: [{ text: 'Price' }, { text: 'Speed' }, { text: '' }] },
    { question: 'Anything else?', type: 'textarea' },
] }

test('a survey is checked and trimmed', () => {
    const s = cleanSurvey(base)
    assert.equal(s.subject, 'Client feedback')
    assert.equal(s.questions.length, 4)
    assert.deepEqual(s.questions[1].options.map((o) => o.text), ['Yes', 'No'])
    assert.equal(s.questions[2].options.length, 2) // the empty option is dropped
    assert.throws(() => cleanSurvey({ subject: '', questions: base.questions }), /title/)
    assert.throws(() => cleanSurvey({ subject: 'x', questions: [] }), /at least one question/)
    assert.throws(() => cleanSurvey({ subject: 'x', questions: [{ question: 'Pick', type: 'radio', options: [{ text: 'only one' }] }] }), /at least two answers/)
    assert.throws(() => cleanSurvey({ ...base, startsAt: '2026-05-02', endsAt: '2026-05-01' }), /cannot close before/)
    assert.throws(() => cleanSurvey({ ...base, redirectUrl: 'nope' }), /https/)
})

test('open, scheduled, closed or off', () => {
    const now = new Date('2026-06-15')
    assert.equal(surveyState({ active: true }, now), 'open')
    assert.equal(surveyState({ active: false }, now), 'off')
    assert.equal(surveyState({ active: true, startsAt: '2026-07-01' }, now), 'scheduled')
    assert.equal(surveyState({ active: true, endsAt: '2026-06-01' }, now), 'closed')
})

test('answers are checked against the questions', () => {
    const qs = [
        { id: 'q1', question: 'Rate', type: 'rating', required: true, options: [] },
        { id: 'q2', question: 'Pick', type: 'radio', required: false, options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
        { id: 'q3', question: 'Many', type: 'checkbox', required: false, options: [{ id: 'x', text: 'X' }, { id: 'y', text: 'Y' }] },
        { id: 'q4', question: 'Say', type: 'input', required: false, options: [] },
    ]
    const rows = checkAnswers(qs, { q1: 4, q2: 'b', q3: ['x', 'y'], q4: '  hello ' })
    assert.equal(rows.length, 5)
    assert.equal(rows.find((r) => r.questionId === 'q4').answer, 'hello')
    assert.throws(() => checkAnswers(qs, {}), /Please answer/)
    assert.throws(() => checkAnswers(qs, { q1: 9 }), /1 to 5/)
    assert.throws(() => checkAnswers(qs, { q1: 3, q2: 'zzz' }), /not one of the choices/)
    assert.equal(checkAnswers(qs, { q1: 3 }).length, 1) // optional questions can stay empty
})

test('results: choices in percent, rating average, text newest first', () => {
    const choice = { id: 'q2', question: 'Pick', type: 'radio', required: false, options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] }
    const s = summarizeQuestion(choice, [{ resultSetId: '1', optionId: 'a' }, { resultSetId: '2', optionId: 'a' }, { resultSetId: '3', optionId: 'b' }])
    assert.equal(s.responders, 3); assert.equal(s.options[0].count, 2); assert.equal(s.options[0].pct, 67)
    const r = summarizeQuestion({ id: 'q1', question: 'Rate', type: 'rating', options: [] }, [{ resultSetId: '1', answer: '5' }, { resultSetId: '2', answer: '4' }, { resultSetId: '3', answer: '4' }])
    assert.equal(r.average, 4.3); assert.deepEqual(r.distribution, [0, 0, 0, 2, 1])
    const t = summarizeQuestion({ id: 'q4', question: 'Say', type: 'input', options: [] }, [{ resultSetId: '1', answer: 'old', createdAt: '2026-01-01' }, { resultSetId: '2', answer: 'new', createdAt: '2026-02-01' }])
    assert.equal(t.answers[0].text, 'new')
})

test('csv: one line per response', () => {
    const csv = toCsv([{ id: 'q1', question: 'Rate, please' }, { id: 'q2', question: 'Pick' }], [{ id: 'r1', createdAt: '2026-03-04T10:30:00Z' }], [{ resultSetId: 'r1', questionId: 'q1', answer: '5' }, { resultSetId: 'r1', questionId: 'q2', answer: 'A' }, { resultSetId: 'r1', questionId: 'q2', answer: 'B' }])
    assert.equal(csv.split('\n')[0], 'Date,"Rate, please",Pick')
    assert.equal(csv.split('\n')[1], '2026-03-04 10:30,5,A | B')
})
