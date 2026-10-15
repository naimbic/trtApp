import { tr } from '@/utils/t'

// The API names its own entries in English ("Task: Launch", "Invoice INV-1 due · 500"); show them in the chosen language.
const TITLE_RULES = [
    [/^Task: ([\s\S]*)$/, (m) => tr('Task: {name}', { name: m[1] })],
    [/^Invoice (\S+) due · (.*)$/, (m) => tr('Invoice {number} due · {amount}', { number: m[1], amount: m[2] })],
    [/^Project deadline: ([\s\S]*)$/, (m) => tr('Project deadline: {name}', { name: m[1] })],
    [/^Estimate (\S+) expires$/, (m) => tr('Estimate {number} expires', { number: m[1] })],
    [/^Proposal open till: ([\s\S]*)$/, (m) => tr('Proposal open till: {subject}', { subject: m[1] })],
    [/^Contract ends: ([\s\S]*)$/, (m) => tr('Contract ends: {subject}', { subject: m[1] })],
]
export const localTitle = (t) => { for (const [re, f] of TITLE_RULES) { const m = String(t || '').match(re); if (m) return f(m) } return t }
