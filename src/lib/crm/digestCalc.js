// The daily summary email: its text. No database, no clock: tested on its own.
const L = {
    english: { subject: 'Your day', hello: 'Good morning', news: 'New for you', tasks: 'Tasks due or late', reminders: 'Reminders today', meetings: 'Meetings today', open: 'Open the CRM', foot: 'You get one summary a day instead of one email for each event. Change it in your profile, Notifications.', more: 'and {n} more' },
    french: { subject: 'Votre journée', hello: 'Bonjour', news: 'Nouveau pour vous', tasks: 'Tâches à faire ou en retard', reminders: "Rappels d'aujourd'hui", meetings: "Réunions d'aujourd'hui", open: 'Ouvrir le CRM', foot: 'Vous recevez un résumé par jour au lieu d’un email par événement. Changez-le dans votre profil, Notifications.', more: 'et {n} autres' },
    spanish: { subject: 'Tu día', hello: 'Buenos días', news: 'Novedades para ti', tasks: 'Tareas para hoy o atrasadas', reminders: 'Recordatorios de hoy', meetings: 'Reuniones de hoy', open: 'Abrir el CRM', foot: 'Recibes un resumen al día en lugar de un email por evento. Cámbialo en tu perfil, Notificaciones.', more: 'y {n} más' },
    japanese: { subject: '今日のまとめ', hello: 'おはようございます', news: 'あなた宛ての新着', tasks: '期限のタスク・遅れ', reminders: '今日のリマインダー', meetings: '今日の予定', open: 'CRMを開く', foot: 'イベントごとのメールの代わりに、1日1通のまとめを受け取ります。プロフィールの通知で変更できます。', more: '他{n}件' },
    arabic: { subject: 'يومك', hello: 'صباح الخير', news: 'جديد لك', tasks: 'مهام مستحقة أو متأخرة', reminders: 'تذكيرات اليوم', meetings: 'اجتماعات اليوم', open: 'فتح النظام', foot: 'تصلك رسالة ملخص واحدة يومياً بدل رسالة لكل حدث. غيّر ذلك من ملفك الشخصي، الإشعارات.', more: 'و{n} أخرى' },
}
export const digestTexts = (language) => L[language] || L.english
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** What goes in the email: sections { news, tasks, reminders, meetings } are lists of { text, sub?, link? }; returns { subject, html, empty }. */
export function buildDigest({ language = 'english', name = '', company = '', base = '', sections = {}, limit = 8 } = {}) {
    const t = digestTexts(language)
    const keys = ['news', 'tasks', 'reminders', 'meetings'].filter((k) => (sections[k] || []).length)
    if (!keys.length) return { subject: t.subject, html: '', empty: true }
    const dir = language === 'arabic' ? 'rtl' : 'ltr'
    const block = (k) => {
        const list = sections[k]
        const rows = list.slice(0, limit).map((i) => `<li style="margin:4px 0">${i.link ? `<a href="${esc(base + i.link)}" style="color:#4f46e5;text-decoration:none">${esc(i.text)}</a>` : esc(i.text)}${i.sub ? ` <span style="color:#888">· ${esc(i.sub)}</span>` : ''}</li>`).join('')
        return `<h4 style="margin:18px 0 4px;font-size:14px">${esc(t[k])} <span style="color:#888;font-weight:400">(${list.length})</span></h4><ul style="margin:0;padding-inline-start:18px">${rows}</ul>${list.length > limit ? `<div style="color:#888;font-size:12px">${esc(t.more.replace('{n}', list.length - limit))}</div>` : ''}`
    }
    const html = `<div dir="${dir}" style="font-family:system-ui,Segoe UI,sans-serif;max-width:560px;margin:auto;color:#222"><h2 style="margin:0 0 4px">${esc(t.hello)}${name ? ` ${esc(name)}` : ''}</h2><div style="color:#888;font-size:13px">${esc(company)}</div>${keys.map(block).join('')}<p style="margin:22px 0 6px"><a href="${esc(`${base}/crm/notifications`)}" style="background:#4f46e5;color:#fff;padding:9px 16px;border-radius:10px;text-decoration:none;font-weight:600">${esc(t.open)}</a></p><p style="color:#999;font-size:11px">${esc(t.foot)}</p></div>`
    return { subject: `${t.subject}${company ? ` · ${company}` : ''}`, html, empty: false }
}
