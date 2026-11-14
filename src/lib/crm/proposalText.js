// The text a new proposal starts with, in the language of the client or lead it is for (the Language box of the lead or client).
// On the document the items table comes first and this text is printed under it.
const T = {
    english: ['Hello,', 'Thank you for your interest. Please find our offer above.', 'We look forward to working with you.'],
    french: ['Bonjour,', 'Merci pour votre intérêt. Veuillez trouver notre offre ci-dessus.', 'Nous serions ravis de travailler avec vous.'],
    spanish: ['Hola,', 'Gracias por su interés. Arriba encontrará nuestra oferta.', 'Esperamos trabajar con usted.'],
    german: ['Guten Tag,', 'vielen Dank für Ihr Interesse. Oben finden Sie unser Angebot.', 'Wir freuen uns auf die Zusammenarbeit mit Ihnen.'],
    italian: ['Buongiorno,', 'Grazie per il suo interesse. Qui sopra trova la nostra offerta.', 'Saremo lieti di lavorare con lei.'],
    portuguese: ['Olá,', 'Obrigado pelo seu interesse. Segue acima a nossa proposta.', 'Esperamos trabalhar consigo.'],
    dutch: ['Hallo,', 'Bedankt voor uw interesse. Hierboven vindt u ons voorstel.', 'We kijken ernaar uit om met u samen te werken.'],
    turkish: ['Merhaba,', 'İlginiz için teşekkür ederiz. Teklifimizi yukarıda bulabilirsiniz.', 'Sizinle çalışmayı dört gözle bekliyoruz.'],
    russian: ['Здравствуйте,', 'Благодарим за интерес. Выше вы найдёте наше предложение.', 'Будем рады сотрудничеству с вами.'],
    arabic: ['مرحباً،', 'شكراً لاهتمامكم. تجدون عرضنا أعلاه.', 'نتطلع إلى العمل معكم.'],
    japanese: ['こんにちは。', 'お問い合わせいただきありがとうございます。上記に弊社のご提案を記載しております。', 'ご一緒にお仕事ができることを楽しみにしております。'],
}
const OLD = {
    english: ['Hello,', 'Thank you for your interest. Please find our offer below.', 'We look forward to working with you.'],
    french: ['Bonjour,', 'Merci pour votre intérêt. Veuillez trouver notre offre ci-dessous.', 'Nous serions ravis de travailler avec vous.'],
    spanish: ['Hola,', 'Gracias por su interés. A continuación encontrará nuestra oferta.', 'Esperamos trabajar con usted.'],
    german: ['Guten Tag,', 'vielen Dank für Ihr Interesse. Nachfolgend finden Sie unser Angebot.', 'Wir freuen uns auf die Zusammenarbeit mit Ihnen.'],
    italian: ['Buongiorno,', 'Grazie per il suo interesse. Di seguito trova la nostra offerta.', 'Saremo lieti di lavorare con lei.'],
    portuguese: ['Olá,', 'Obrigado pelo seu interesse. Segue abaixo a nossa proposta.', 'Esperamos trabalhar consigo.'],
    dutch: ['Hallo,', 'Bedankt voor uw interesse. Hieronder vindt u ons voorstel.', 'We kijken ernaar uit om met u samen te werken.'],
    turkish: ['Merhaba,', 'İlginiz için teşekkür ederiz. Teklifimizi aşağıda bulabilirsiniz.', 'Sizinle çalışmayı dört gözle bekliyoruz.'],
    russian: ['Здравствуйте,', 'Благодарим за интерес. Ниже вы найдёте наше предложение.', 'Будем рады сотрудничеству с вами.'],
    arabic: ['مرحباً،', 'شكراً لاهتمامكم. تجدون عرضنا أدناه.', 'نتطلع إلى العمل معكم.'],
    japanese: ['こんにちは。', 'お問い合わせいただきありがとうございます。以下に弊社のご提案を記載いたします。', 'ご一緒にお仕事ができることを楽しみにしております。'],
}
const html = ([hello, offer, bye]) => `<p>${hello}</p><p>${offer}</p><p>${bye}</p>`
// the starting text of before (the items table sat in the middle of it): still recognised as "nobody edited it"
const oldHtml = ([hello, offer, bye]) => `<p>${hello}</p><p>${offer}</p><p>{proposal_items}</p><p>${bye}</p>`

/** The starting text in a language ('french', 'english'…); English when the language is unknown. */
export const proposalText = (language) => html(T[String(language || '').toLowerCase()] || T.english)
/** True while the text is still one of the starting texts (nobody edited it), so it can follow the language of the client or lead. */
export const isStartingText = (content) => { const flat = String(content || '').replace(/\s+/g, ''); return Object.values(T).some((t) => html(t).replace(/\s+/g, '') === flat) || Object.values(OLD).some((t) => oldHtml(t).replace(/\s+/g, '') === flat) }
