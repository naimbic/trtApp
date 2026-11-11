/**
 * Who is told when a lead or a client writes by email. Pure: the rights come in through `can(auth, feature, cap)` and
 * `scope(auth, feature)` ('all' | 'own' | null) so it works the same in the app and in the tests.
 * Everyone who may open the Mails tab of that kind of record (Roles > Lead tabs / Client tabs > Mails) AND sees the record
 * (View all, or one of its people — assigned, followers, author, the client's account managers — or a public lead) is told,
 * whether they may send mails or only read them. Nobody without the Mails tab right is told.
 * The responsible person and the team of the record come first (the first one is asked to answer).
 */
export function mailAudience({ isLead, own = [], responsible = null, isPublic = false, people = [], can, scope }) {
    const feature = isLead ? 'leads' : 'customers'
    const tab = isLead ? 'lead_tabs' : 'client_tabs'
    const related = new Set(own.filter(Boolean))
    const ok = new Set()
    for (const m of people) {
        if (!m.auth?.length) continue
        if (!can(m.auth, tab, 'tab_mails')) continue
        const sees = scope(m.auth, feature) === 'all' || related.has(m.id) || (isLead && isPublic)
        if (sees) ok.add(m.id)
    }
    const first = [responsible, ...own].filter((i) => i && ok.has(i))
    return [...new Set([...first, ...ok])]
}
