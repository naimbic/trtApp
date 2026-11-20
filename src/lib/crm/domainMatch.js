/* Finding the company behind an email address by its domain (name@atlas.ma -> atlas.ma). Pure: nothing here reads the database.
   The mailboxes anybody can open (Gmail, Outlook, Yahoo...) say nothing about a company, so they never match. */
const FREE = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com', 'yahoo.com', 'yahoo.fr', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'gmx.fr', 'gmx.de', 'mail.com', 'yandex.com', 'yandex.ru', 'zoho.com', 'menara.ma', 'laposte.net', 'orange.fr', 'free.fr', 'sfr.fr', 'wanadoo.fr', 'qq.com', '163.com', 'example.com'])

/** The company domain of an email address, or null for a public mailbox or something that is not an address. */
export function companyDomain(email) {
    const m = /^[^\s@]+@([a-z0-9-]+(\.[a-z0-9-]+)+)$/i.exec(String(email || '').trim())
    const d = m ? m[1].toLowerCase() : null
    return d && !FREE.has(d) ? d : null
}

/** The domain of a website as typed in a profile (https://www.atlas.ma/contact -> atlas.ma). */
export function siteDomain(website) {
    const h = String(website || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:\s]/)[0]
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : null
}

/** The same company: the same domain, or one is a part of the other (mail.atlas.ma and atlas.ma). */
export const sameDomain = (a, b) => !!a && !!b && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`))
