/**
 * Who is told when a lead or a client writes by email. Pure: the rights come in through `can(auth, feature, cap)` and
 * `scope(auth, feature)` ('all' | 'own' | null) so it works the same in the app and in the tests.
 *   - the people of the record (assigned, followers, author / the client's account managers) and the mailbox's responsible person,
 *     as long as they may open the Mails tab and see the record;
 *   - every other active person who may SEND mails on that kind of record (Roles > Lead mails / Client mails > Send), sees the
 *     record (View all, or one of its people, or a public lead) and may open its Mails tab.
 * Nobody without the Mails tab right is told. The responsible person and the team come first (the first one is asked to answer).
 */
export function mailAudience({ isLead, own = [], responsible = null, isPublic = false, people = [], can, scope }) {
    const feature = isLead ? 'leads' : 'customers'
    const tab = isLead ? 'lead_tabs' : 'client_tabs'
    const mails = isLead ? 'lead_mails' : 'client_mails'
    const related = new Set(own.filter(Boolean))
    const ok = new Set()
    for (const m of people) {
        if (!m.auth?.length) continue
        if (!can(m.auth, tab, 'tab_mails')) continue
        const near = related.has(m.id) || m.id === responsible
        const sees = scope(m.auth, feature) === 'all' || related.has(m.id) || (isLead && isPublic)
        if (!sees) continue
        if (near || can(m.auth, mails, 'send')) ok.add(m.id)
    }
    const first = [responsible, ...own].filter((i) => i && ok.has(i))
    return [...new Set([...first, ...ok])]
}
