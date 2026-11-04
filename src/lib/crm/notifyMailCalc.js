/** The pure part of the team emails (no database): texts in five languages, dates as people read them and the HTML of the message. */
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const TONES = { info: '#2563eb', success: '#059669', warn: '#d97706', danger: '#dc2626' }

export const T = {
    english: { hello: 'Hello {name},', open: 'Open it in the CRM', help: 'If the button does not work, copy this link into your browser:', regards: 'Kind regards,', reminder: 'Reminder', yourNote: 'Your note', deadline: 'Task deadline', deadlineIntro: 'This task is due soon.', reminderIntro: 'You asked to be reminded about this.', what: 'What', when: 'When', who: 'Who', status: 'Status', priority: 'Priority', start: 'Start', due: 'Due', assigned: 'Assigned to', createdBy: 'Created by', linked: 'Linked to', company: 'Company', contact: 'Contact', email: 'Email', phone: 'Phone', source: 'Source', language: 'Language', lastContact: 'Last contact', client: 'Client', department: 'Department', number: 'Number', total: 'Total', date: 'Date', dueDate: 'Due date', validUntil: 'Valid until', openUntil: 'Open until', ends: 'Ends', amount: 'Amount', category: 'Category', city: 'City', subject: 'Subject', deadlineDate: 'Deadline', progress: 'Checklist', members: 'Team', kinds: { task: 'Task', lead: 'Lead', customer: 'Client', client: 'Client', ticket: 'Ticket', project: 'Project', invoice: 'Invoice', estimate: 'Estimate', proposal: 'Proposal', contract: 'Contract', expense: 'Expense', note: 'Note' }, priorities: { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }, projectStatus: { 1: 'Not started', 2: 'In progress', 3: 'On hold', 4: 'Finished', 5: 'Cancelled' } },
    french: { hello: 'Bonjour {name},', open: 'Ouvrir dans le CRM', help: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :', regards: 'Cordialement,', reminder: 'Rappel', yourNote: 'Votre note', deadline: 'Échéance de tâche', deadlineIntro: 'Cette tâche arrive bientôt à échéance.', reminderIntro: 'Vous avez demandé à être rappelé(e) à ce sujet.', what: 'Quoi', when: 'Quand', who: 'Qui', status: 'Statut', priority: 'Priorité', start: 'Début', due: 'Échéance', assigned: 'Assignée à', createdBy: 'Créée par', linked: 'Liée à', company: 'Société', contact: 'Contact', email: 'E-mail', phone: 'Téléphone', source: 'Source', language: 'Langue', lastContact: 'Dernier contact', client: 'Client', department: 'Département', number: 'Numéro', total: 'Total', date: 'Date', dueDate: "Date d'échéance", validUntil: "Valable jusqu'au", openUntil: "Ouverte jusqu'au", ends: 'Fin', amount: 'Montant', category: 'Catégorie', city: 'Ville', subject: 'Sujet', deadlineDate: 'Date limite', progress: 'Liste de contrôle', members: 'Équipe', kinds: { task: 'Tâche', lead: 'Lead', customer: 'Client', client: 'Client', ticket: 'Ticket', project: 'Projet', invoice: 'Facture', estimate: 'Devis', proposal: 'Proposition', contract: 'Contrat', expense: 'Dépense', note: 'Note' }, priorities: { 1: 'Basse', 2: 'Moyenne', 3: 'Haute', 4: 'Urgente' }, projectStatus: { 1: 'Non démarré', 2: 'En cours', 3: 'En pause', 4: 'Terminé', 5: 'Annulé' } },
    spanish: { hello: 'Hola {name},', open: 'Abrir en el CRM', help: 'Si el botón no funciona, copie este enlace en su navegador:', regards: 'Saludos cordiales,', reminder: 'Recordatorio', yourNote: 'Su nota', deadline: 'Fecha límite de tarea', deadlineIntro: 'Esta tarea vence pronto.', reminderIntro: 'Usted pidió que se lo recordáramos.', what: 'Qué', when: 'Cuándo', who: 'Quién', status: 'Estado', priority: 'Prioridad', start: 'Inicio', due: 'Vence', assigned: 'Asignada a', createdBy: 'Creada por', linked: 'Vinculada a', company: 'Empresa', contact: 'Contacto', email: 'Correo', phone: 'Teléfono', source: 'Origen', language: 'Idioma', lastContact: 'Último contacto', client: 'Cliente', department: 'Departamento', number: 'Número', total: 'Total', date: 'Fecha', dueDate: 'Vencimiento', validUntil: 'Válido hasta', openUntil: 'Abierta hasta', ends: 'Fin', amount: 'Importe', category: 'Categoría', city: 'Ciudad', subject: 'Asunto', deadlineDate: 'Fecha límite', progress: 'Lista de control', members: 'Equipo', kinds: { task: 'Tarea', lead: 'Lead', customer: 'Cliente', client: 'Cliente', ticket: 'Ticket', project: 'Proyecto', invoice: 'Factura', estimate: 'Presupuesto', proposal: 'Propuesta', contract: 'Contrato', expense: 'Gasto', note: 'Nota' }, priorities: { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Urgente' }, projectStatus: { 1: 'Sin empezar', 2: 'En curso', 3: 'En pausa', 4: 'Terminado', 5: 'Cancelado' } },
    japanese: { hello: '{name} 様', open: 'CRMで開く', help: 'ボタンが動かない場合は、このリンクをブラウザにコピーしてください：', regards: '敬具', reminder: 'リマインダー', yourNote: 'あなたのメモ', deadline: 'タスクの期限', deadlineIntro: 'このタスクの期限が近づいています。', reminderIntro: 'この件についてリマインドを依頼されていました。', what: '内容', when: '日時', who: '担当', status: 'ステータス', priority: '優先度', start: '開始', due: '期限', assigned: '担当者', createdBy: '作成者', linked: '関連先', company: '会社', contact: '連絡先', email: 'メール', phone: '電話', source: '流入元', language: '言語', lastContact: '最終連絡', client: '顧客', department: '部署', number: '番号', total: '合計', date: '日付', dueDate: '支払期限', validUntil: '有効期限', openUntil: '公開期限', ends: '終了', amount: '金額', category: 'カテゴリ', city: '市区町村', subject: '件名', deadlineDate: '締切', progress: 'チェックリスト', members: 'チーム', kinds: { task: 'タスク', lead: 'リード', customer: '顧客', client: '顧客', ticket: 'チケット', project: 'プロジェクト', invoice: '請求書', estimate: '見積書', proposal: '提案書', contract: '契約', expense: '経費', note: 'メモ' }, priorities: { 1: '低', 2: '中', 3: '高', 4: '緊急' }, projectStatus: { 1: '未着手', 2: '進行中', 3: '保留', 4: '完了', 5: 'キャンセル' } },
    arabic: { hello: 'مرحباً {name}،', open: 'افتح في النظام', help: 'إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:', regards: 'مع أطيب التحيات،', reminder: 'تذكير', yourNote: 'ملاحظتك', deadline: 'موعد المهمة', deadlineIntro: 'موعد هذه المهمة قريب.', reminderIntro: 'طلبتَ أن نذكّرك بهذا.', what: 'ماذا', when: 'متى', who: 'من', status: 'الحالة', priority: 'الأولوية', start: 'البداية', due: 'الموعد', assigned: 'مسندة إلى', createdBy: 'أنشأها', linked: 'مرتبطة بـ', company: 'الشركة', contact: 'جهة الاتصال', email: 'البريد', phone: 'الهاتف', source: 'المصدر', language: 'اللغة', lastContact: 'آخر تواصل', client: 'العميل', department: 'القسم', number: 'الرقم', total: 'الإجمالي', date: 'التاريخ', dueDate: 'تاريخ الاستحقاق', validUntil: 'صالح حتى', openUntil: 'مفتوح حتى', ends: 'النهاية', amount: 'المبلغ', category: 'الفئة', city: 'المدينة', subject: 'الموضوع', deadlineDate: 'الموعد النهائي', progress: 'قائمة المراجعة', members: 'الفريق', kinds: { task: 'مهمة', lead: 'عميل محتمل', customer: 'عميل', client: 'عميل', ticket: 'تذكرة', project: 'مشروع', invoice: 'فاتورة', estimate: 'عرض سعر', proposal: 'مقترح', contract: 'عقد', expense: 'مصروف', note: 'ملاحظة' }, priorities: { 1: 'منخفضة', 2: 'متوسطة', 3: 'عالية', 4: 'عاجلة' }, projectStatus: { 1: 'لم يبدأ', 2: 'قيد التنفيذ', 3: 'متوقف', 4: 'منتهٍ', 5: 'ملغى' } },
}
// more headings
Object.assign(T.english, { proposalExpired: 'Proposal expired', proposalExpiredIntro: 'Nobody answered before the “open until” date: the proposal is now marked Expired and the contact was told by email.' })
Object.assign(T.french, { proposalExpired: 'Proposition expirée', proposalExpiredIntro: "Personne n'a répondu avant la date « ouverte jusqu'au » : la proposition est maintenant Expirée et le contact a été prévenu par e-mail." })
Object.assign(T.spanish, { proposalExpired: 'Propuesta vencida', proposalExpiredIntro: 'Nadie respondió antes de la fecha «abierta hasta»: la propuesta pasa a Vencida y el contacto fue avisado por correo.' })
Object.assign(T.japanese, { proposalExpired: '提案書の期限切れ', proposalExpiredIntro: '「公開期限」までに返答がなかったため、提案書は期限切れになり、連絡先にメールでお知らせしました。' })
Object.assign(T.arabic, { proposalExpired: 'انتهت صلاحية المقترح', proposalExpiredIntro: 'لم يردّ أحد قبل تاريخ «مفتوح حتى»: أصبح المقترح منتهي الصلاحية وتم إبلاغ جهة الاتصال بالبريد.' })
// the other categories of notices (Telegram, WhatsApp) and the sentences that open them
Object.assign(T.english.kinds, { reminder: 'Reminder', mention: 'Mention', comment: 'Comment', calendar: 'Calendar', event: 'Event', request: 'Client request', idea: 'Client idea', signup: 'Sign-up', checklist: 'Checklist step', notification: 'Notification' })
Object.assign(T.french.kinds, { reminder: 'Rappel', mention: 'Mention', comment: 'Commentaire', calendar: 'Agenda', event: 'Événement', request: 'Demande client', idea: 'Idée client', signup: 'Inscription', checklist: 'Étape de liste', notification: 'Notification' })
Object.assign(T.spanish.kinds, { reminder: 'Recordatorio', mention: 'Mención', comment: 'Comentario', calendar: 'Agenda', event: 'Evento', request: 'Solicitud de cliente', idea: 'Idea de cliente', signup: 'Registro', checklist: 'Paso de lista', notification: 'Notificación' })
Object.assign(T.japanese.kinds, { reminder: 'リマインダー', mention: 'メンション', comment: 'コメント', calendar: 'カレンダー', event: 'イベント', request: '顧客リクエスト', idea: '顧客アイデア', signup: '登録申請', checklist: 'チェックリスト項目', notification: '通知' })
Object.assign(T.arabic.kinds, { reminder: 'تذكير', mention: 'إشارة', comment: 'تعليق', calendar: 'التقويم', event: 'حدث', request: 'طلب عميل', idea: 'فكرة عميل', signup: 'تسجيل', checklist: 'خطوة قائمة', notification: 'إشعار' })
Object.assign(T.english, { mentionedYou: '{name} mentioned you', commented: '{name} commented', gaveStep: '{name} gave you a checklist step', startsIn: 'Starts in {when}', appointment: 'Appointment', signupAsked: 'Asked for an account', clientWrote: 'Update from a client', ideaUpdate: 'Update on an idea', lowLevel: 'Low', whatLabel: 'What' })
Object.assign(T.french, { mentionedYou: '{name} vous a mentionné(e)', commented: '{name} a commenté', gaveStep: '{name} vous a confié une étape', startsIn: 'Commence dans {when}', appointment: 'Rendez-vous', signupAsked: 'Demande de compte', clientWrote: 'Nouveau message d’un client', ideaUpdate: 'Mise à jour d’une idée', lowLevel: 'Basse', whatLabel: 'Quoi' })
Object.assign(T.spanish, { mentionedYou: '{name} le ha mencionado', commented: '{name} ha comentado', gaveStep: '{name} le asignó un paso', startsIn: 'Empieza en {when}', appointment: 'Cita', signupAsked: 'Solicitud de cuenta', clientWrote: 'Novedad de un cliente', ideaUpdate: 'Novedad en una idea', lowLevel: 'Baja', whatLabel: 'Qué' })
Object.assign(T.japanese, { mentionedYou: '{name} さんがあなたをメンションしました', commented: '{name} さんがコメントしました', gaveStep: '{name} さんがチェックリスト項目を割り当てました', startsIn: '{when} 後に開始', appointment: '予約', signupAsked: 'アカウント申請', clientWrote: '顧客からの更新', ideaUpdate: 'アイデアの更新', lowLevel: '低', whatLabel: '内容' })
Object.assign(T.arabic, { mentionedYou: 'أشار إليك {name}', commented: 'علّق {name}', gaveStep: 'أسند إليك {name} خطوة', startsIn: 'يبدأ بعد {when}', appointment: 'موعد', signupAsked: 'طلب حساب', clientWrote: 'جديد من عميل', ideaUpdate: 'جديد في فكرة', lowLevel: 'منخفضة', whatLabel: 'ماذا' })
Object.assign(T.english, { openOnline: 'View and reply', newCommentOn: 'New comment on {doc}', commentBy: '{name} wrote' })
Object.assign(T.french, { openOnline: 'Voir et répondre', newCommentOn: 'Nouveau commentaire sur {doc}', commentBy: '{name} a écrit' })
Object.assign(T.spanish, { openOnline: 'Ver y responder', newCommentOn: 'Nuevo comentario en {doc}', commentBy: '{name} ha escrito' })
Object.assign(T.japanese, { openOnline: '確認して返信', newCommentOn: '{doc} に新しいコメント', commentBy: '{name} さんからのメッセージ' })
Object.assign(T.arabic, { openOnline: 'عرض والرد', newCommentOn: 'تعليق جديد على {doc}', commentBy: 'كتب {name}' })
export const textsFor = (language) => T[language] || T.english

export const nameOf = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
export const strip = (h, n = 400) => String(h || '').replace(/<br\s*\/?>|<\/p>|<\/div>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n)
const LOCALE = { english: 'en-GB', french: 'fr-FR', spanish: 'es-ES', japanese: 'ja-JP', arabic: 'ar-MA' }

/** Date (and time) as people read it, in the company time zone and the language of the person. */
export const when = (d, { time = true, language = 'english', tz = 'UTC' } = {}) => {
    if (!d) return ''
    const x = new Date(d)
    if (Number.isNaN(+x)) return ''
    return new Intl.DateTimeFormat(LOCALE[language] || 'en-GB', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}) }).format(x)
}

export const money = (n, cur) => (n == null ? '' : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n)}${cur ? ` ${cur}` : ''}`)


/** The message (the part inside the CRM email shell): a coloured bar, the title, a short intro, the details table, an extract, the button. */
export function richMessage({ baseUrl = '', L, name, tone = 'info', heading, intro, card, quote, quoteLabel, link, buttonLabel }) {
    const accent = TONES[tone] || TONES.info
    const esc = (x) => escapeHtml(x).replace(/\{/g, '&#123;').replace(/\}/g, '&#125;') // braces of the person's text are not merge fields
    const p = (t) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:#374151;">${t}</p>`
    let h = `<div style="width:44px;height:4px;border-radius:2px;background:${accent};margin:0 0 18px;"></div>`
    h += `<h1 style="margin:0 0 6px;font-family:${FONT};font-size:23px;line-height:1.3;font-weight:700;color:#111827;">${esc(heading)}</h1>`
    if (card?.kind) h += `<p style="margin:0 0 18px;font-family:${FONT};font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:${accent};">${esc(L.kinds[card.kind] || card.kind)}</p>`
    if (name) h += p(esc(L.hello.replace('{name}', name)))
    if (intro) h += p(esc(intro))
    if (card?.title) h += `<p style="margin:0 0 14px;font-family:${FONT};font-size:18px;line-height:1.4;font-weight:700;color:#111827;">${esc(card.title)}</p>`
    if (quote) h += `<div style="margin:0 0 18px;padding:14px 16px;background-color:#f9fafb;border-left:4px solid ${accent};border-radius:6px;font-family:${FONT};font-size:14px;line-height:1.6;color:#374151;">${quoteLabel ? `<div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:4px;">${esc(quoteLabel)}</div>` : ''}${esc(quote).replace(/\n/g, '<br/>')}</div>`
    if (card?.rows?.length) {
        h += `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 22px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">`
        h += card.rows.map(([k, v], i) => `<tr><td style="padding:10px 16px;${i ? 'border-top:1px solid #e5e7eb;' : ''}font-family:${FONT};font-size:13px;color:#6b7280;width:38%;vertical-align:top;">${esc(k)}</td><td style="padding:10px 16px;${i ? 'border-top:1px solid #e5e7eb;' : ''}font-family:${FONT};font-size:14px;font-weight:600;color:#111827;vertical-align:top;">${esc(v)}</td></tr>`).join('')
        h += `</table>`
    }
    if (card?.excerpt) h += `<div style="margin:0 0 22px;padding:12px 16px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;font-family:${FONT};font-size:14px;line-height:1.6;color:#4b5563;">${esc(card.excerpt)}${card.excerpt.length >= 400 ? '…' : ''}</div>`
    if (link) {
        const url = /^https?:/i.test(link) ? link : `${baseUrl}${link}`
        h += `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:9px;background-color:${accent};"><a href="${esc(url)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(buttonLabel || L.open)}</a></td></tr></table>`
        h += `<p style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:1.6;color:#9ca3af;">${esc(L.help)}<br/><span style="word-break:break-all;">${esc(url)}</span></p>`
    }
    h += `<p style="margin:26px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:#374151;">${esc(L.regards)}<br/><strong>{companyname}</strong></p>`
    return language_dir(L, h)
}
const language_dir = (L, h) => (L === T.arabic ? `<div dir="rtl" style="direction:rtl;text-align:right;">${h}</div>` : h)



/* ---------------------------------------------- the short notices of Telegram and WhatsApp ---------------------------------------------- */
const PRIORITY_DOT = { 1: '🟢', 2: '🟡', 3: '🟠', 4: '🔴' }
const KIND_DOT = { reminder: '🟡', mention: '🔵', comment: '🔵', calendar: '🟣', event: '🟣', request: '🟠', idea: '🟣', signup: '🟤', checklist: '🔵', lead: '🟠', customer: '🔵', proposal: '🟣', invoice: '🟠', estimate: '🟣', contract: '🟤', ticket: '🟠', project: '🔵', expense: '🟤', note: '🟡' }
/** The dot in front of a notice: the level of a task or ticket (green, yellow, orange, red), else the colour of its category. */
export const dotFor = ({ priority, kind } = {}) => PRIORITY_DOT[Number(priority)] || KIND_DOT[kind] || '⚪'

/** The level (1 low .. 4 urgent) of a priority written as a name ("Urgent", "Haute", "Medium"...). */
export function levelOf(name) {
    const n = String(name ?? '').toLowerCase()
    if (/^[1-4]$/.test(n)) return Number(n)
    if (/urgent|critical|critique|emergency|urgence|عاج/.test(n)) return 4
    if (/high|haut|alta|elev|élev|高|عالية/.test(n)) return 3
    if (/medium|moyen|normal|media|中|متوسط/.test(n)) return 2
    if (/low|bas|baj|低|منخفض/.test(n)) return 1
    return 0
}

/**
 * The text of a notice: "🔴 TASK · Urgent", what happened, the title, the facts (what, when, who), a short extract, the link.
 *   { L, kind, title, headline, rows: [[label, value]], note, link, priority, priorityLabel }
 */
export function formatNotice({ L, kind, title, headline, rows = [], note, link, priority, priorityLabel } = {}) {
    const cat = String((L || T.english).kinds[kind] || kind || '').toUpperCase()
    const level = priorityLabel || (priority ? (L || T.english).priorities[priority] : '')
    const out = [`${dotFor({ priority, kind })} ${cat}${level ? ` · ${level}` : ''}`]
    if (headline) out.push(headline)
    if (title) out.push(`${title}`)
    for (const [k, v] of rows.slice(0, 7)) if (v) out.push(`${k}: ${v}`)
    if (note) out.push(`“${String(note).replace(/\s+/g, ' ').trim().slice(0, 240)}”`)
    if (link) out.push(link)
    return out.join('\n')
}

/** The record a link of the CRM points to, for the notices that only know a link: /crm/tasks/<id> -> { relType: 'task', relId }. */
export function recordFromLink(link) {
    const m = /\/crm\/(tasks|leads|clients|tickets|projects|proposals|estimates|invoices|contracts|expenses)\/([a-f0-9]{24})/i.exec(String(link || ''))
    if (!m) return null
    const type = { tasks: 'task', leads: 'lead', clients: 'customer', tickets: 'ticket', projects: 'project', proposals: 'proposal', estimates: 'estimate', invoices: 'invoice', contracts: 'contract', expenses: 'expense' }[m[1].toLowerCase()]
    return { relType: type, relId: m[2] }
}
