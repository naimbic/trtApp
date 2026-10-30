// Pure rules of the lead email integration (no database, no network): which emails are leads, and what the form in them says.
// Website contact-form emails look like "Label: value" lines (or a table of label / value cells). Fields are recognised by
// their label in English, French, Spanish and Arabic; anything else is kept in the lead's description so no information is lost.

/** A label made comparable in any language: accents and Arabic diacritics removed, Arabic letter variants unified, only letters and digits kept (Japanese, Chinese, Arabic, Cyrillic... included). */
const strip = (s) => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '').normalize('NFC')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim()

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

// the same fields in more languages (Japanese, Arabic, Spanish, English variants, German, Italian, Portuguese, Chinese, Turkish, Russian, Dutch)
const MORE = {
    name: ['お名前', '氏名', '名前', 'ご氏名', 'ご担当者名', '担当者名', 'お名前 フルネーム', '姓名', '您的姓名', '姓名 name', 'الاسم الكريم', 'اسمك', 'الاسم الثلاثي', 'اسم العميل', 'اسم الشخص', 'nombre y apellidos', 'nombre y apellido', 'su nombre', 'tu nombre', 'nome', 'nome completo', 'il tuo nome', 'ihr name', 'vollstandiger name', 'name vorname', 'ad soyad', 'adiniz', 'имя', 'фио', 'ваше имя', 'naam', 'volledige naam', 'contact person', 'full name name', 'prospect', 'lead name'],
    firstName: ['名', 'ファーストネーム', 'めい', 'vorname', 'nome proprio', 'ad', 'имя first', 'الاسم الاول', 'الاسم الأول'],
    lastName: ['姓', 'せい', 'ファミリーネーム', 'nachname', 'cognome', 'sobrenome', 'soyad', 'фамилия', 'اسم العائلة', 'اللقب', 'الاسم الاخير', 'الاسم الأخير'],
    email: ['メールアドレス', 'メール', 'eメール', 'e メール', 'email アドレス', '电子邮件', '邮箱', '电子邮箱', 'البريد الالكتروني', 'البريد الإلكتروني', 'بريدك الالكتروني', 'عنوان البريد الالكتروني', 'ايميل', 'الايميل', 'correo electronico', 'su correo', 'tu correo', 'e mail address', 'email adresse', 'e mail adresse', 'indirizzo email', 'endereco de email', 'e posta', 'электронная почта', 'почта', 'e mailadres'],
    phone: ['電話番号', '電話', 'お電話番号', 'tel 電話番号', '携帯電話', '携帯', '携帯番号', 'ご連絡先電話番号', '电话', '手机', '电话号码', 'رقم الهاتف', 'رقم الجوال', 'رقم الموبايل', 'الهاتف', 'الجوال', 'الموبايل', 'رقم واتساب', 'واتساب', 'هاتف', 'telefono', 'numero de telefono', 'celular', 'movil', 'telefon', 'telefonnummer', 'handy', 'telefone', 'numero di telefono', 'телефон', 'номер телефона', 'telefoonnummer', 'phone number whatsapp'],
    company: ['会社名', '会社', '御社名', '企業名', '法人名', '貴社名', '組織名', '団体名', 'ご所属', '所属', '公司', '公司名称', '企业名称', 'اسم الشركة', 'الشركة', 'المؤسسة', 'اسم المؤسسة', 'الجهة', 'اسم الجهة', 'compania', 'nombre de la empresa', 'nombre empresa', 'razon social', 'organizacion', 'unternehmen', 'firma', 'firmenname', 'azienda', 'ragione sociale', 'empresa nome', 'nome da empresa', 'sirket', 'sirket adi', 'компания', 'организация', 'bedrijf', 'bedrijfsnaam'],
    website: ['ウェブサイト', 'webサイト', 'web サイト', 'ホームページ', 'サイトurl', 'サイト url', 'ウェブサイトurl', 'url', '網站', '网站', '网址', 'الموقع الالكتروني', 'الموقع الإلكتروني', 'موقعك', 'رابط الموقع', 'الموقع', 'موقع الويب', 'pagina web', 'sitio', 'sitio web', 'webseite', 'homepage', 'sito web', 'sito', 'site da web', 'web sitesi', 'сайт', 'веб сайт', 'website url'],
    title: ['役職', 'ご役職', '職位', 'وظيفة', 'المنصب', 'المسمى الوظيفي', 'puesto', 'cargo', 'stellung', 'posizione', 'должность'],
    city: ['都市', '市区町村', '所在地', 'お住まい', '城市', 'المدينة', 'ciudad', 'stadt', 'citta', 'cidade', 'sehir', 'город', 'stad'],
    country: ['国', '国名', '国家', 'البلد', 'الدولة', 'pais', 'land', 'paese', 'страна'],
    message: ['メッセージ', 'お問い合わせ内容', 'お問合せ内容', 'お問い合わせ', 'ご質問', 'ご質問内容', 'ご要望', 'ご相談内容', '内容', '詳細', 'ご用件', 'ご依頼内容', 'ご依頼', '備考', 'コメント', '留言', '信息', '消息', '咨询内容', 'الرسالة', 'رسالتك', 'نص الرسالة', 'التفاصيل', 'تفاصيل الطلب', 'تفاصيل المشروع', 'الطلب', 'طلبك', 'ملاحظات', 'استفسارك', 'استفسار', 'تعليق', 'mensaje', 'su mensaje', 'tu mensaje', 'consulta', 'detalles', 'detalle', 'comentarios', 'observaciones', 'nachricht', 'ihre nachricht', 'anliegen', 'messaggio', 'il tuo messaggio', 'mensagem', 'sua mensagem', 'mesaj', 'mesajiniz', 'сообщение', 'ваше сообщение', 'bericht', 'uw bericht', 'project details', 'how can we help', 'tell us more', 'additional information', 'notes'],
    service: ['サービス', 'ご希望のサービス', 'ご利用予定のサービス', 'ご興味のあるサービス', 'お問い合わせ種別', 'お問い合わせの種類', '件名', '服务', '服務', '所需服务', 'الخدمات', 'الخدمة', 'الخدمة المطلوبة', 'الخدمات المطلوبة', 'نوع الخدمة', 'موضوع الرسالة', 'الموضوع', 'servicios', 'servicio', 'servicio solicitado', 'servicios solicitados', 'asunto', 'dienstleistung', 'dienstleistungen', 'betreff', 'servizi', 'servizio', 'oggetto', 'servicos', 'servico', 'assunto', 'hizmet', 'hizmetler', 'konu', 'услуги', 'услуга', 'тема', 'diensten', 'dienst', 'onderwerp', 'service requested', 'services requested', 'services needed', 'interested services', 'what do you need'],
}
const KO = { name: ['이름', '성함', '담당자', '담당자명'], email: ['이메일', '메일', '이메일 주소'], phone: ['전화번호', '연락처', '휴대폰', '휴대폰 번호', '전화'], company: ['회사', '회사명', '기업명', '업체명'], website: ['웹사이트', '홈페이지', '사이트'], message: ['메시지', '문의내용', '문의 내용', '내용', '문의'], service: ['서비스', '제목', '희망 서비스'] }
for (const [f, ls] of Object.entries(KO)) MORE[f] = [...(MORE[f] || []), ...ls]
for (const [f, ls] of Object.entries(MORE)) SYNONYMS[f] = [...new Set([...(SYNONYMS[f] || []), ...ls])]
// every label is compared through the same normalisation as the labels of the emails
const LOOKUP = Object.entries(SYNONYMS).flatMap(([field, labels]) => labels.map((l) => [strip(l), field]))

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
    const h = String(html || '')
    if (!h) return t
    const fromHtml = h
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
        .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ': ')
        .replace(/<h[1-6][^>]*>/gi, '\n## ') // a section title (in any language) is marked so it never sticks to the value before it
        .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENT[m])
        .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
    // a plain part that is only the HTML flattened (table cells without any separator) tells less than the HTML itself: keep the one with more "Label: value" lines
    if (t && /[:：=]/.test(t) && pairs(t).length >= pairs(fromHtml).length) return t
    return fromHtml
}

// a label is followed by a colon or an equals sign ("Nom: Ali", "Nom = Ali")
const KNOWN = new Set(LOOKUP.map(([l]) => l))
// technical lines of a form notification: they stay in the email (the lead's Mails tab) but not in the description
const IGNORE = new Set(['ip', 'adresse ip', 'ip address', 'navigateur', 'browser', 'user agent', 'recu le', 'received', 'received on', 'date', 'heure'])
const LABEL_LINE = /^[\s*_•·>\-–—]*([^:：=\n]{2,45}?)\s*[:：=]\s*(.*)$/

/** Splits the text into [label, value] pairs: a label starts a pair, the lines after it (until the next label) belong to its value. */
export function pairs(text) {
    const out = []
    let cur = null
    const lines = String(text || '').split(/\r?\n/).map((r) => r.replace(/\s+$/, ''))
    for (let n = 0; n < lines.length; n++) {
        const line = lines[n]
        if (/^\s*##\s/.test(line)) { cur = null; continue }
        const m = LABEL_LINE.exec(line)
        // a label is short and starts like a word, so "Note: see https://x" works and "https://x" alone does not
        if (m && !/^https?$/i.test(m[1].trim()) && strip(m[1]).length >= 2 && strip(m[1]).split(' ').length <= 5) { cur = [m[1].trim(), m[2].trim()]; out.push(cur); continue }
        // a label alone on its line ("MESSAGE"): the text under it is its value; a section title in capitals ("PROJET") only ends the previous value
        const bare = strip(line)
        if (!m && bare && line.trim().length <= 40) {
            if (KNOWN.has(bare)) { cur = [line.trim(), '']; out.push(cur); continue }
            if (line.trim() === line.trim().toUpperCase() && /[A-ZÀ-Ý]/.test(line) && bare.split(' ').length <= 3) { cur = null; continue }
            // any language: a short title without punctuation followed by a real sentence is a label over its text
            const next = lines.slice(n + 1).find((x) => x.trim())
            if (cur && line.trim().length <= 30 && bare.split(' ').length <= 3 && !/[.,;!?。、！？]$/.test(line.trim()) && next && next.trim().length >= 15 && !LABEL_LINE.test(next) && !/^\s*##\s/.test(next)) { cur = [line.trim(), '']; out.push(cur); continue }
        }
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
    const loose = [] // pairs whose label is not known (any language): their value can still be recognised by what it looks like
    for (const [label, value] of ps) {
        const k = strip(label)
        const field = custom.get(k) || LOOKUP.find(([l]) => l === k)?.[1]
        if (!field && IGNORE.has(k)) continue
        if (field && !fields[field]) fields[field] = value
        else if (field && fields[field] !== value) extras.push([label, value])
        else if (!field) loose.push([label, value])
    }
    // a form in a language we have no word for: an address, a web address, a phone number and the name are recognised by their shape
    const take = (pred) => { const at = loose.findIndex(([l, v]) => pred(v.trim(), strip(l))); return at < 0 ? null : loose.splice(at, 1)[0][1] }
    if (!fields.email) { const v = take((v) => EMAIL.test(v)); if (v) fields.email = v }
    if (!fields.website) { const v = take((v, l) => /^(https?:\/\/|www\.)\S+$/i.test(v) && !/page|source|referr|origin|landing|ページ|صفح|pagina|seite/.test(l)); if (v) fields.website = v }
    if (!fields.phone) { const v = take((v) => /^\+?[\d\s().-]{8,22}$/.test(v) && v.replace(/\D/g, '').length >= 8 && !/^\d{1,3}(\.\d{1,3}){3}$/.test(v)); if (v) fields.phone = v }
    if (!fields.name && !fields.firstName && !fields.lastName) {
        const first = ps.slice(0, 3).map(([l]) => l)
        const v = take((v, l) => first.some((x) => strip(x) === l) && v.length >= 2 && v.length <= 60 && v.split(/\s+/).length <= 4 && !/[\d@]|https?:|www\./i.test(v))
        if (v) fields.name = v
    }
    extras.push(...loose)
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
