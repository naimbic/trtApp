// Pure rules of the lead email integration (no database, no network): which emails are leads, and what the form in them says.
// Website contact-form emails look like "Label: value" lines (or a table of label / value cells). Fields are recognised by
// their label in English, French, Spanish and Arabic; anything else is kept in the lead's description so no information is lost.

const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim()

/** lead field -> the labels (already normalised) that mean it */
export const SYNONYMS = {
    name: ['name', 'full name', 'your name', 'nom', 'nom complet', 'nom et prenom', 'votre nom', 'nombre', 'nombre completo', 'الاسم', 'الاسم الكامل', 'contact', 'contact name', 'customer name', 'client'],
    firstName: ['first name', 'firstname', 'prenom', 'votre prenom', 'nombre de pila'],
    lastName: ['last name', 'lastname', 'surname', 'family name', 'nom de famille', 'apellido'],
    email: ['email', 'e mail', 'mail', 'your email', 'email address', 'adresse email', 'adresse e mail', 'courriel', 'votre email', 'correo', 'correo electronico', 'البريد الالكتروني', 'البريد'],
    phone: ['phone', 'telephone', 'tel', 'phone number', 'mobile', 'mobile number', 'cell', 'whatsapp', 'gsm', 'numero de telephone', 'votre telephone', 'telefono', 'الهاتف', 'رقم الهاتف', 'الجوال'],
    company: ['company', 'company name', 'societe', 'entreprise', 'nom de l entreprise', 'organization', 'organisation', 'business', 'empresa', 'الشركة'],
    website: ['website', 'web site', 'site web', 'site internet', 'url', 'site', 'your website', 'sitio web', 'الموقع'],
    title: ['job title', 'position', 'poste', 'fonction', 'title', 'cargo'],
    city: ['city', 'ville', 'ciudad', 'المدينة'],
    country: ['country', 'pays', 'pais', 'البلد'],
    message: ['message', 'your message', 'votre message', 'comments', 'comment', 'commentaire', 'commentaires', 'details', 'description', 'project', 'votre projet', 'your project', 'besoin', 'votre besoin', 'demande', 'request', 'inquiry', 'enquiry', 'mensaje', 'notes', 'note', 'الرسالة', 'التفاصيل'],
    service: ['service', 'services', 'service s', 'service souhaite', 'services souhaites', 'subject', 'objet', 'sujet', 'asunto', 'interested in', 'interesse par', 'type de service', 'service requested'],
}
const LOOKUP = Object.entries(SYNONYMS).flatMap(([field, labels]) => labels.map((l) => [l, field]))

/** The owner's own labels: one line per field, "Name = Your name, Full name". Returns a Map of normalised label -> field. */
export function customLabels(text) {
    const map = new Map()
    for (const line of String(text || '').split(/\r?\n/)) {
        const [field, rest] = line.split('=')
        const f = (field || '').trim()
        if (!f || !rest) continue
        const key = Object.keys(SYNONYMS).find((k) => strip(k) === strip(f)) || (strip(f) === 'phone number' ? 'phone' : null)
        if (!key) continue
        for (const l of rest.split(',')) if (strip(l)) map.set(strip(l), key)
    }
    return map
}

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' }
/** The readable text of an email: the plain part when there is one, otherwise the HTML with its table cells turned into "Label: value". */
export function emailText(text, html) {
    const t = String(text || '').trim()
    if (t && /[:：=]/.test(t)) return t
    const h = String(html || '')
    if (!h) return t
    return h
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
        .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ': ')
        .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENT[m])
        .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
}

// a label is followed by a colon or an equals sign ("Nom: Ali", "Nom = Ali")
const LABEL_LINE = /^[\s*_•·>\-–—]*([^:：=\n]{2,45}?)\s*[:：=]\s*(.*)$/

/** Splits the text into [label, value] pairs: a label starts a pair, the lines after it (until the next label) belong to its value. */
export function pairs(text) {
    const out = []
    let cur = null
    for (const raw of String(text || '').split(/\r?\n/)) {
        const line = raw.replace(/\s+$/, '')
        const m = LABEL_LINE.exec(line)
        // a label is short and starts like a word, so "Note: see https://x" works and "https://x" alone does not
        if (m && !/^https?$/i.test(m[1].trim()) && strip(m[1]).length >= 2 && strip(m[1]).split(' ').length <= 5) { cur = [m[1].trim(), m[2].trim()]; out.push(cur); continue }
        if (cur && line.trim()) cur[1] = cur[1] ? `${cur[1]}\n${line.trim()}` : line.trim()
    }
    return out.filter(([, v]) => v !== '')
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

/** What the form says: { fields: {name, email, phone, ...}, extras: [[label, value]], pairCount } */
export function parseForm(text, custom = new Map()) {
    const fields = {}
    const extras = []
    const ps = pairs(text)
    for (const [label, value] of ps) {
        const k = strip(label)
        const field = custom.get(k) || LOOKUP.find(([l]) => l === k)?.[1]
        if (field && !fields[field]) fields[field] = value
        else if (field && fields[field] !== value) extras.push([label, value])
        else if (!field) extras.push([label, value])
    }
    if (!fields.name && (fields.firstName || fields.lastName)) fields.name = [fields.firstName, fields.lastName].filter(Boolean).join(' ')
    if (fields.email) { const m = EMAIL.exec(fields.email); fields.email = m ? m[0].toLowerCase() : '' }
    if (fields.website && !/^https?:\/\//i.test(fields.website) && /\./.test(fields.website)) fields.website = fields.website.split(/\s/)[0]
    return { fields, extras, pairCount: ps.length }
}

const list = (s) => String(s || '').split(/[,\n;]/).map((x) => x.trim().toLowerCase()).filter(Boolean)

/**
 * Is this email a lead? Every filter that is filled in must match (any one word of its list is enough).
 * `msg` = { fromAddress, fromName, replyTo, subject, text }. With "requireForm" the email also needs an address and two labelled lines.
 */
export function judge(msg, cfg, parsed) {
    const from = `${msg.fromAddress || ''} ${msg.fromName || ''} ${msg.replyTo || ''}`.toLowerCase()
    const subject = String(msg.subject || '').toLowerCase()
    const body = String(msg.text || '').toLowerCase()
    const f = list(cfg.fromFilter), s = list(cfg.subjectFilter), b = list(cfg.bodyFilter)
    if (f.length && !f.some((x) => from.includes(x))) return { ok: false, reason: 'Sender does not match the filter' }
    if (s.length && !s.some((x) => subject.includes(x))) return { ok: false, reason: 'Subject does not match the filter' }
    if (b.length && !b.some((x) => body.includes(x))) return { ok: false, reason: 'Text does not match the filter' }
    if (cfg.requireForm !== false) {
        const hasAddress = !!(parsed.fields.email || msg.replyTo)
        if (!hasAddress) return { ok: false, reason: 'No contact email address found in the form' }
        if (parsed.pairCount < 2) return { ok: false, reason: 'Does not look like a form (fewer than two "Label: value" lines)' }
    }
    return { ok: true }
}

/** The lead to create from an email. Contact address: the form's, else the Reply-To, else the sender. */
export function buildLead(msg, parsed) {
    const f = parsed.fields
    const email = f.email || (EMAIL.exec(msg.replyTo || '') || [])[0] || (EMAIL.exec(msg.fromAddress || '') || [])[0] || ''
    const local = email.split('@')[0].replace(/[._-]+/g, ' ')
    const name = (f.name || msg.replyName || msg.fromName || local || 'Website enquiry').trim().slice(0, 120)
    const lines = []
    if (f.message) lines.push(f.message)
    const more = [...(f.service ? [['Service', f.service]] : []), ...parsed.extras]
    if (more.length) lines.push(more.map(([l, v]) => `${l}: ${v.replace(/\n+/g, ' ')}`).join('\n'))
    if (msg.subject) lines.push(`Email subject: ${msg.subject}`)
    return {
        name, email: email.toLowerCase() || null, phone: f.phone || null, company: f.company || null, website: f.website || null,
        title: f.title || null, city: f.city || null, description: lines.join('\n\n').slice(0, 5000) || null,
    }
}

/** Phone numbers compared without spaces, dots or a leading + / 00. */
export const digits = (p) => String(p || '').replace(/\D+/g, '').replace(/^00/, '')
