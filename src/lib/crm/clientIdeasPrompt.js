// The words of the AI helper for client ideas: the prompt, and the reading of its answer. No database, no framework: tested on its own.
export const CATEGORIES = ['grow', 'save', 'marketing', 'sales', 'tech', 'ops', 'brand', 'other']
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
export const LANGS = { en: 'English', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' }
export const FOCUS = {
    grow: 'ideas that bring this client more customers, more sales or more revenue',
    save: 'ideas that cut this client\'s costs or wasted spend (ads, tools, manual work)',
    mixed: 'the best mix of ideas that grow the business and ideas that save money',
}
export const PROJECT = { 1: 'not started', 2: 'in progress', 3: 'on hold', 4: 'finished', 5: 'cancelled' }
export const PROPOSAL = { 1: 'open', 2: 'declined', 3: 'accepted', 4: 'sent', 5: 'revised', 6: 'draft' }
export const url = (u) => { const t = String(u || '').trim(); if (!t || /^(?!https?:)[a-z][a-z0-9+.-]*:(?!\d)/i.test(t)) return ''; try { const x = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); return /^https?:$/.test(x.protocol) ? x.href.slice(0, 300) : '' } catch { return '' } }

/** The system prompt: who the AI is, the skills it must use, and the quality bar. */
export function buildSystem({ about, lang = 'en', web = false, categories = CATEGORIES }) {
    return `You are a senior growth strategist working for a digital agency, preparing proposals for ONE of its clients. ${about ? `About the agency (written by its owner): ${String(about).slice(0, 1500)}` : ''}
Your skills, used in this order:
1. BUSINESS UNDERSTANDING: from the client's website, industry and what we already sold them, say what the business does, who buys from it and how it likely earns money.
2. ACTIVITY AUDIT: look at what we have already done for them (invoiced services, projects, support subjects, proposals) and what they have NOT bought yet. Find gaps, not repetitions.
3. COMPETITOR BENCHMARK: ${web ? 'search the web for the 3 to 5 closest competitors of this client in its market (use the competitors given, if any). For each, note what they do better (offers, ads, SEO, social, site, pricing, tools) and a gap the client can exploit.' : 'web search is not available, so use only the competitors given and clearly mark anything you cannot verify as "to check". Never invent a competitor.'}
4. SERVICE FIT: each idea must be something this agency can deliver, using the services and prices we sell when one fits (quote that service name). Do not suggest what we cannot do.
5. IMPACT AND EFFORT: say what the client gains, with an honest range and the assumption behind it. Never present a guess as a fact. Use ONLY the figures given for the client's own numbers.
6. PRIORITISE: put the ideas with high impact and low effort first, and say why this one now.
Quality bar: every idea must rest on a specific observation about THIS client or ITS market, quoted in "why". Reject generic advice ("improve SEO", "be active on social media", "make a better website") unless you say exactly what, where and why. Do not repeat the ideas already written (even reworded). Fewer, sharper ideas beat many weak ones. Give a source URL whenever a claim comes from the web.
Answer in ${LANGS[lang] || 'English'}. Return ONLY one JSON object (no text around it, no markdown fence) with this shape:
{"summary": "the client's business in 3 to 5 sentences, with what you could not verify", "competitors": [{"name": "", "url": "", "strengths": "", "gap": "what the client can do about it"}], "ideas": [{"title": "max 120 chars", "category": "${categories.join('|')}", "why": "the specific observation, max 400 chars", "plan": ["step 1", "step 2", "step 3"], "gain": "what the client gains, one sentence with the assumption", "impact": 1-3, "effort": 1-3, "service": "our service name that fits, or empty", "price": number or null, "kpi": "how we will measure it", "sources": ["https://..."], "confidence": 1-3}]}`
}

export function buildUser({ context, focus = 'mixed', count = 5, competitors = [], note = '' }) {
    return `Today: ${new Date().toISOString().slice(0, 10)}.
Goal: ${FOCUS[focus] || FOCUS.mixed}. Write at most ${count} ideas.
${competitors.length ? `Competitors named by the team: ${competitors.join(', ')}.\n` : ''}${note ? `The team asks: ${note.slice(0, 500)}\n` : ''}Client data (JSON):\n${JSON.stringify(context)}`
}

/** The answer of the AI as { summary, competitors, ideas }, or throws when it cannot be read. */
export function parseResearch(text, categories = CATEGORIES) {
    const a = String(text || '').indexOf('{'), b = String(text || '').lastIndexOf('}')
    let j
    try { j = JSON.parse(String(text).slice(a, b + 1)) } catch { throw fail('The AI answer could not be read. Try again.', 424) }
    const s = (v, n) => String(v ?? '').trim().slice(0, n)
    const n13 = (v) => Math.min(3, Math.max(1, parseInt(v, 10) || 2))
    const links = (v) => (Array.isArray(v) ? v : []).map((x) => url(x)).filter(Boolean).slice(0, 5)
    const ideas = (Array.isArray(j.ideas) ? j.ideas : []).map((x) => ({
        title: s(x.title, 200), category: categories.includes(x.category) ? x.category : categories.includes('other') ? 'other' : categories[0], why: s(x.why, 600),
        plan: (Array.isArray(x.plan) ? x.plan : []).map((p) => s(p, 300)).filter(Boolean).slice(0, 8), gain: s(x.gain, 300),
        impact: n13(x.impact), effort: n13(x.effort), service: s(x.service, 120), price: Number.isFinite(Number(x.price)) && x.price !== null && x.price !== '' ? Math.max(0, Number(x.price)) : null,
        kpi: s(x.kpi, 200), sources: links(x.sources), confidence: n13(x.confidence),
    })).filter((x) => x.title)
    const competitors = (Array.isArray(j.competitors) ? j.competitors : []).map((c) => ({ name: s(c.name, 120), url: url(c.url), strengths: s(c.strengths, 400), gap: s(c.gap, 400) })).filter((c) => c.name).slice(0, 8)
    return { summary: s(j.summary, 1500), competitors, ideas }
}

const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** The rich text body written from an AI idea: why, the steps, the measure. */
export function bodyOf(i) {
    return [i.why && `<p><strong>Why:</strong> ${esc(i.why)}</p>`, i.plan?.length && `<p><strong>Plan:</strong></p><ol>${i.plan.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`, i.kpi && `<p><strong>How we measure it:</strong> ${esc(i.kpi)}</p>`, i.service && `<p><strong>Our service:</strong> ${esc(i.service)}</p>`].filter(Boolean).join('')
}
