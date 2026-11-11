// The prompts of the email assistant and the clean-up of its answers. Free of the database and the network: tested alone.
export const EMAIL_ACTIONS = ['write', 'reply', 'improve', 'shorten', 'fix', 'translate', 'subject']
export const TONES = { friendly: 'warm and friendly', formal: 'formal and polite', short: 'short and direct', persuasive: 'persuasive but honest', neutral: 'clear and professional' }

export const LIMITS = { instruction: 2000, text: 20000, context: 8000 }

const RULES = [
    'Write only what goes in the email, nothing before or after it.',
    'Plain text, no markdown, no asterisks, no headings, short paragraphs separated by a blank line.',
    'Do not write the subject line (unless asked for a subject), do not add a signature, a sign-off with a name or placeholders such as [Name] or [Company]: the signature of the company is added automatically.',
    'Greet the person by name only if the name is given in the context, otherwise use a simple greeting.',
    'Never invent facts, prices, dates, promises or links that you were not given.',
    'Keep the facts, names, numbers and links of the text you are given exactly as they are.',
]

export function buildEmailPrompt({ action, instruction = '', text = '', tone = 'neutral', language = '', context = '', company = '', instructions = '', systemPrompt = '' }) {
    if (!EMAIL_ACTIONS.includes(action)) throw Object.assign(new Error('Unknown action'), { status: 400 })
    const lang = String(language || '').trim()
    const t = TONES[tone] || TONES.neutral
    const system = [
        `You help the team of ${company || 'a company'} write emails to its leads and customers.`,
        ...RULES.map((r) => `- ${r}`),
        lang ? `Write in ${lang}.` : 'Write in the language of the text you are given or of the last mail of the context (the language of the instruction otherwise).',
        systemPrompt ? `General instructions of the company: ${systemPrompt}` : '',
        instructions ? `How the company writes its emails (follow it): ${instructions}` : '',
    ].filter(Boolean).join('\n')
    const ctx = context ? `\n\nContext (the person and the last mails; use it, do not repeat it):\n${context}` : ''
    let user
    if (action === 'write') user = `Write a new email. Tone: ${t}.\n\nWhat the email must say:\n${instruction || '(no instruction: write a short, polite follow-up)'}${text ? `\n\nText already written (start from it):\n${text}` : ''}${ctx}`
    else if (action === 'reply') user = `Write the reply to the last mail received. Tone: ${t}.${instruction ? `\n\nWhat the reply must say:\n${instruction}` : ''}${ctx}`
    else if (action === 'improve') user = `Improve this email: clearer, better worded, same meaning and same facts. Tone: ${t}.${instruction ? `\nAlso: ${instruction}` : ''}\n\nEmail:\n${text}${ctx}`
    else if (action === 'shorten') user = `Shorten this email, keep every important fact. Tone: ${t}.\n\nEmail:\n${text}`
    else if (action === 'fix') user = `Fix only the spelling, grammar and punctuation of this email. Change nothing else.\n\nEmail:\n${text}`
    else if (action === 'translate') user = `Translate this email into ${lang || 'English'}. Keep the tone, the facts and the links.\n\nEmail:\n${text}`
    else user = `Suggest one subject line (at most 70 characters) for this email. Answer with the subject only.\n\nEmail:\n${text || instruction}${ctx}`
    return { system, user }
}

/** Needs text to work on? (the actions that change a text) */
export const needsText = (action) => ['improve', 'shorten', 'fix', 'translate', 'subject'].includes(action)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The answer cleaned (code fences, markdown marks, a "Subject:" line the model added anyway) and as HTML paragraphs. */
export function cleanAnswer(raw, { subject = false } = {}) {
    let t = String(raw || '').replace(/\r/g, '').trim()
    t = t.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    if (subject) return { text: t.split('\n')[0].replace(/^(subject|objet|asunto)\s*:\s*/i, '').replace(/^["'“]|["'”]$/g, '').trim().slice(0, 120), html: '' }
    t = t.replace(/^(subject|objet|asunto)\s*:.*\n+/i, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').trim()
    const html = t.split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('')
    return { text: t, html }
}
