// The prompts of the contract writer and the clean-up of its answers. Free of the database and the network: tested alone.
import { cleanHtml } from '../richText.js'

export const CONTRACT_ACTIONS = ['write', 'improve', 'translate']
export const LIMITS = { instruction: 3000, text: 60000 }

/** The merge fields a contract text may carry, and what each one is replaced with. */
export const MERGE_FIELDS = {
    contract_subject: 'the subject (title) of the contract',
    contract_datestart: 'the start date',
    contract_dateend: 'the end date',
    contract_contract_value: 'the value (price) of the contract, with its currency',
    contract_type: 'the type of contract',
    contract_id: 'the number of the contract',
    contract_today: "today's date",
    client_company: 'the name of the client',
    client_street: 'the street address of the client',
    client_city: 'the city of the client',
    client_vat_number: 'the VAT number of the client',
    company_name: 'the name of our company (the provider)',
    address: 'the address of our company',
    vat_number_with_label: 'the VAT number of our company, with its label',
}

const RULES = [
    'Answer with the text of the contract only, as HTML: <h2> for the title of each article (numbered: "1. Purpose"), <p> for paragraphs, <ul><li> or <ol><li> for lists, <strong> for what matters, <table> only when a table is really needed. No <html>, <head>, <body>, <h1>, no styles, no markdown, no code fences, nothing before or after the text.',
    'Do not write the title of the contract, the block naming the two parties, the date line or the signature block: the letterhead, the two parties and the signatures are added by the contract itself. Start at the first article.',
    'Never write a real name, address, amount or date. Wherever one is needed use the merge field, written exactly with its braces. A merge field is replaced by the real value when the client opens the contract.',
    'Use only the merge fields of the list. Never invent another one and never use square-bracket placeholders such as [Name].',
    'Write clear, balanced and complete articles, in plain professional wording, as a careful business would. Do not add notes, comments or a disclaimer.',
    'Do not name a country, a law or a court unless the request does: write "the law of the country where the provider is registered" instead.',
]

export function buildContractPrompt({ action = 'write', instruction = '', text = '', language = '', type = '', company = '', systemPrompt = '' }) {
    if (!CONTRACT_ACTIONS.includes(action)) throw Object.assign(new Error('Unknown action'), { status: 400 })
    const lang = String(language || '').trim()
    const system = [
        `You draft contract texts for ${company || 'a company'}, which reuses them as templates for many clients.`,
        ...RULES.map((r) => `- ${r}`),
        `Merge fields:\n${Object.entries(MERGE_FIELDS).map(([k, v]) => `{${k}} = ${v}`).join('\n')}`,
        lang ? `Write in ${lang}.` : 'Write in the language of the request (or of the text you are given).',
        systemPrompt ? `General instructions of the company: ${systemPrompt}` : '',
    ].filter(Boolean).join('\n')
    const kind = type ? `\nType of contract: ${type}.` : ''
    let user
    if (action === 'write') user = `Write the text of a contract.${kind}\n\nWhat it is about:\n${instruction || '(no details: write a general service agreement)'}${text ? `\n\nText already written (start from it, keep what is good):\n${text}` : ''}`
    else if (action === 'improve') user = `Improve this contract text: clearer, complete, well ordered, same meaning. Keep every merge field exactly as it is.${instruction ? `\nAlso: ${instruction}` : ''}${kind}\n\nText:\n${text}`
    else user = `Translate this contract text into ${lang || 'English'}. Keep the structure and every merge field exactly as it is (do not translate what is inside the braces).\n\nText:\n${text}`
    return { system, user }
}

/** The answer as safe HTML for the editor: no code fence, no document shell, markdown turned into headings and paragraphs when the model ignored the format. */
export function cleanContractAnswer(raw) {
    let t = String(raw || '').replace(/\r/g, '').trim()
    t = t.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    t = t.replace(/<!doctype[^>]*>/gi, '').replace(/<\/?(html|body)[^>]*>/gi, '').replace(/<head[\s\S]*?<\/head>/gi, '').trim()
    if (!/<(p|h[1-6]|ul|ol|table)\b/i.test(t)) {
        // plain text or markdown: one block per blank line; "## Title" or "1. Title" alone on a line is a heading
        t = t.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
            const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            const h = /^#{1,6}\s+(.+)$/.exec(b)
            if (h && !b.includes('\n')) return `<h2>${esc(h[1])}</h2>`
            const lines = b.split('\n')
            if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`
            return `<p>${esc(b).replace(/\n/g, '<br>')}</p>`
        }).join('')
    }
    return cleanHtml(t.replace(/<h1\b/gi, '<h2').replace(/<\/h1>/gi, '</h2>')).replace(/>\s+</g, '><').trim()
}
