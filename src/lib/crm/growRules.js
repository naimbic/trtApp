// The rules of the Grow routine: figures in, ideas out. Pure (no database, no clock of its own), so they can be tested.
// Each idea: { key, title, body, category, period, priority (1 low .. 3 high), tags }. `key` + the period stamp stop the same advice from being written twice.
// Texts exist in English and French (the other languages show English); the AI part of the routine answers in any language.

const T = (en, fr) => ({ en, fr })
const pick = (t, lang) => t[lang] || t.en
const money = (n, cur) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ')}${cur ? ` ${cur}` : ''}`

/** The stamp of a period: the day, the ISO week or the month. A rule writes one idea per stamp. */
export function stamp(period, d = new Date()) {
    const day = d.toISOString().slice(0, 10)
    if (period === 'daily') return day
    if (period === 'monthly') return day.slice(0, 7)
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const dow = t.getUTCDay() || 7
    t.setUTCDate(t.getUTCDate() + 4 - dow)
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
    return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, '0')}`
}

const RULES = [
    // ------------------------------------------------------------------ daily
    { key: 'leads-never-contacted', period: 'daily', when: (f) => (f.leads?.attention?.neverContacted || 0) > 0,
      make: (f, l) => ({ category: 'leads', priority: 3, tags: ['follow-up'], title: pick(T(`Contact the ${f.leads.attention.neverContacted} lead(s) nobody has contacted yet`, `Contacter les ${f.leads.attention.neverContacted} prospect(s) jamais contactés`), l),
          body: pick(T('The first hours decide who wins a lead. Open Leads, sort by newest, and give each one a call or a message today. Log what happened in the lead (a note, a mail or a meeting) and set its next step in "DO:".', 'Les premières heures décident qui gagne un prospect. Ouvrez Prospects, triez par date, et appelez ou écrivez à chacun aujourd\'hui. Notez ce qui s\'est passé dans le prospect et fixez la suite dans « DO: ».'), l) }) },
    { key: 'leads-no-owner', period: 'daily', when: (f) => (f.leads?.attention?.openWithoutOwner || 0) > 0,
      make: (f, l) => ({ category: 'leads', priority: 3, tags: ['assign'], title: pick(T(`Give an owner to ${f.leads.attention.openWithoutOwner} open lead(s)`, `Attribuer un responsable à ${f.leads.attention.openWithoutOwner} prospect(s) ouverts`), l),
          body: pick(T('A lead with no owner is a lead nobody follows. Assign each one today (Leads → open the lead → Assigned to).', 'Un prospect sans responsable n\'est suivi par personne. Attribuez chacun aujourd\'hui (Prospects → ouvrir → Assigné à).'), l) }) },
    { key: 'tasks-overdue', period: 'daily', when: (f) => (f.tasks?.overdue || 0) > 0,
      make: (f, l) => ({ category: 'team', priority: f.tasks.overdue >= 10 ? 3 : 2, tags: ['tasks'], title: pick(T(`Clear or re-plan the ${f.tasks.overdue} overdue task(s)`, `Terminer ou replanifier les ${f.tasks.overdue} tâche(s) en retard`), l),
          body: pick(T(`${(f.tasks.overdueByPerson || []).slice(0, 3).map((p) => `${p.name}: ${p.count}`).join(' · ') || 'See the Team tasks page'}. For each one: finish it, split it, or move its date and tell the client. An overdue task nobody talks about becomes a lost client.`, `${(f.tasks.overdueByPerson || []).slice(0, 3).map((p) => `${p.name} : ${p.count}`).join(' · ') || 'Voir la page Tâches de l\'équipe'}. Pour chacune : la finir, la découper ou décaler la date et prévenir le client.`), l) }) },
    { key: 'tickets-waiting', period: 'daily', when: (f) => (f.tickets?.waitingOver24h || 0) > 0,
      make: (f, l) => ({ category: 'ops', priority: 3, tags: ['support'], title: pick(T(`${f.tickets.waitingOver24h} support request(s) wait for a reply for more than 24 hours`, `${f.tickets.waitingOver24h} demande(s) de support attendent une réponse depuis plus de 24 h`), l),
          body: pick(T('A fast first answer, even "we are on it", keeps the client calm. Answer these first thing today.', 'Une première réponse rapide, même « nous nous en occupons », rassure le client. Répondez-leur en premier aujourd\'hui.'), l) }) },
    { key: 'invoices-overdue', period: 'daily', when: (f) => (f.clients?.clientsWithOverdue?.count || 0) > 0,
      make: (f, l) => ({ category: 'income', priority: 3, tags: ['cash'], title: pick(T(`Chase the ${f.clients.clientsWithOverdue.count} client(s) with overdue invoices (${money(f.clients.clientsWithOverdue.totalOverdue, f.income?.mainCurrency)})`, `Relancer les ${f.clients.clientsWithOverdue.count} client(s) avec factures en retard (${money(f.clients.clientsWithOverdue.totalOverdue, f.income?.mainCurrency)})`), l),
          body: pick(T(`${(f.clients.clientsWithOverdue.top || []).slice(0, 3).map((c) => `${c.company || c.name || c.client}: ${money(c.overdue)}`).join(' · ')}. Send a friendly reminder with the payment link, then call if there is no answer in 2 days.`, `${(f.clients.clientsWithOverdue.top || []).slice(0, 3).map((c) => `${c.company || c.name || c.client} : ${money(c.overdue)}`).join(' · ')}. Envoyez un rappel aimable avec le lien de paiement, puis appelez sans réponse sous 2 jours.`), l) }) },
    // ------------------------------------------------------------------ weekly
    { key: 'leads-stale', period: 'weekly', when: (f) => (f.leads?.attention?.noContactFor30Days || 0) > 0,
      make: (f, l) => ({ category: 'leads', priority: 2, tags: ['follow-up'], title: pick(T(`Wake up ${f.leads.attention.noContactFor30Days} lead(s) not contacted for 30 days`, `Réveiller ${f.leads.attention.noContactFor30Days} prospect(s) sans contact depuis 30 jours`), l),
          body: pick(T('Send a short, useful message (a case study, a quick audit, a question) instead of "just checking in". If nothing after two attempts, mark them Lost so the pipeline stays honest.', 'Envoyez un message court et utile (étude de cas, mini-audit, question) plutôt que « je reviens vers vous ». Sans réponse après deux essais, marquez-les Perdus pour garder un pipeline honnête.'), l) }) },
    { key: 'leads-old-open', period: 'weekly', when: (f) => (f.leads?.attention?.openOlderThan90Days || 0) > 0,
      make: (f, l) => ({ category: 'leads', priority: 1, tags: ['cleanup'], title: pick(T(`Decide about ${f.leads.attention.openOlderThan90Days} lead(s) open for more than 90 days`, `Trancher sur ${f.leads.attention.openOlderThan90Days} prospect(s) ouverts depuis plus de 90 jours`), l),
          body: pick(T('Old open leads hide the real ones. For each: one last offer, a new date to talk, or Lost.', 'Les vieux prospects ouverts cachent les vrais. Pour chacun : une dernière offre, une nouvelle date d\'échange, ou Perdu.'), l) }) },
    { key: 'proposals-waiting', period: 'weekly', when: (f) => (f.proposals?.sentNoAnswerOver7d || 0) > 0,
      make: (f, l) => ({ category: 'sales', priority: 3, tags: ['proposal'], title: pick(T(`Follow up ${f.proposals.sentNoAnswerOver7d} proposal(s) sent more than 7 days ago with no answer`, `Relancer ${f.proposals.sentNoAnswerOver7d} proposition(s) envoyées il y a plus de 7 jours sans réponse`), l),
          body: pick(T('Most deals are lost by silence, not by "no". Call, ask what is blocking, offer a 15-minute walkthrough, and offer a smaller first step if the budget is the issue.', 'La plupart des affaires se perdent par le silence, pas par un « non ». Appelez, demandez ce qui bloque, proposez 15 minutes de présentation, et un premier pas plus petit si le budget est le frein.'), l) }) },
    { key: 'best-source', period: 'weekly', when: (f) => (f.leads?.sources || []).filter((s) => s.total >= 5).length >= 2,
      make: (f, l) => {
          const list = f.leads.sources.filter((s) => s.total >= 5).sort((a, b) => b.conversionRatePct - a.conversionRatePct)
          const best = list[0], worst = list[list.length - 1]
          return { category: 'marketing', priority: 2, tags: ['sources'], title: pick(T(`"${best.name}" converts best (${best.conversionRatePct}%): put more effort there`, `« ${best.name} » convertit le mieux (${best.conversionRatePct} %) : y investir davantage`), l),
              body: pick(T(`Best: ${best.name} ${best.conversionRatePct}% of ${best.total}. Weakest: ${worst.name} ${worst.conversionRatePct}% of ${worst.total}. Move time and budget from the weakest source to the best one this week, and check again in a month.`, `Meilleure : ${best.name} ${best.conversionRatePct} % sur ${best.total}. Plus faible : ${worst.name} ${worst.conversionRatePct} % sur ${worst.total}. Déplacez du temps et du budget de la plus faible vers la meilleure cette semaine, et vérifiez dans un mois.`), l) }
      } },
    { key: 'dormant-clients', period: 'weekly', when: (f) => (f.clients?.dormantOverAYear?.count || 0) > 0,
      make: (f, l) => ({ category: 'income', priority: 2, tags: ['reactivation'], title: pick(T(`Reactivate ${f.clients.dormantOverAYear.count} client(s) who did not buy for over a year`, `Réactiver ${f.clients.dormantOverAYear.count} client(s) inactifs depuis plus d'un an`), l),
          body: pick(T(`${(f.clients.dormantOverAYear.biggestPast || []).slice(0, 3).map((c) => c.company || c.name || c.client).join(', ')}. Past clients buy again more easily than new ones: send a "what is new for your business" message with one concrete offer (audit, maintenance plan, new campaign).`, `${(f.clients.dormantOverAYear.biggestPast || []).slice(0, 3).map((c) => c.company || c.name || c.client).join(', ')}. Un ancien client rachète plus facilement qu'un nouveau : envoyez un message « du nouveau pour votre activité » avec une offre concrète (audit, contrat de maintenance, nouvelle campagne).`), l) }) },
    { key: 'client-concentration', period: 'weekly', when: (f) => (f.clients?.top5SharePct || 0) >= 70,
      make: (f, l) => ({ category: 'income', priority: 2, tags: ['risk'], title: pick(T(`${f.clients.top5SharePct}% of the income comes from 5 clients: reduce the risk`, `${f.clients.top5SharePct} % du chiffre d'affaires vient de 5 clients : réduire le risque`), l),
          body: pick(T('If one of them leaves, the month is hurt. Set a target of new clients per month, keep a pipeline of 10+ qualified leads, and offer your best clients a longer contract.', 'Si l\'un d\'eux part, le mois est touché. Fixez un objectif de nouveaux clients par mois, gardez 10+ prospects qualifiés en pipeline et proposez un contrat plus long à vos meilleurs clients.'), l) }) },
    // ------------------------------------------------------------------ monthly
    { key: 'income-trend', period: 'monthly', when: (f) => f.income?.yearToDate && f.income.yearToDate.changePct !== null,
      make: (f, l) => {
          const y = f.income.yearToDate, up = y.changePct >= 0
          return { category: 'income', priority: up ? 1 : 3, tags: ['review'], title: up ? pick(T(`Income is ${y.changePct}% above last year so far: decide how to reinvest`, `Le chiffre d'affaires est ${y.changePct} % au-dessus de l'an dernier : décider comment réinvestir`), l) : pick(T(`Income is ${Math.abs(y.changePct)}% below last year so far: make a recovery plan`, `Le chiffre d'affaires est ${Math.abs(y.changePct)} % sous l'an dernier : faire un plan de redressement`), l),
              body: pick(T(`Invoiced this year to date: ${money(y.invoiced, f.income.mainCurrency)} against ${money(y.samePeriodLastYear, f.income.mainCurrency)} the same period last year. ${up ? 'Put part of it into the team (training, tools) and into one new offer.' : 'Look at which clients and services dropped, call the top 10 clients, and launch one short offer this month.'}`, `Facturé depuis janvier : ${money(y.invoiced, f.income.mainCurrency)} contre ${money(y.samePeriodLastYear, f.income.mainCurrency)} à la même date l'an dernier. ${up ? 'Investissez une partie dans l\'équipe (formation, outils) et dans une nouvelle offre.' : 'Regardez quels clients et services ont baissé, appelez les 10 premiers clients et lancez une offre courte ce mois-ci.'}`), l) }
      } },
    { key: 'recurring-revenue', period: 'monthly', when: () => true,
      make: (f, l) => ({ category: 'income', priority: 2, tags: ['retainer', 'recurring'], title: pick(T('Offer a monthly maintenance / growth plan to every active client', 'Proposer un contrat mensuel de maintenance / croissance à chaque client actif'), l),
          body: pick(T('Recurring revenue makes the month predictable. Package it simply: hosting + updates + backups + monthly report (basic), plus ads or SEO management (growth). Offer it to your 5 best clients this month and to every new project at delivery.', 'Le revenu récurrent rend le mois prévisible. Packagez simplement : hébergement + mises à jour + sauvegardes + rapport mensuel (basique), plus gestion des pubs ou du SEO (croissance). Proposez-le à vos 5 meilleurs clients ce mois-ci et à chaque nouveau projet à la livraison.'), l) }) },
    { key: 'review-pricing', period: 'monthly', when: () => true,
      make: (f, l) => ({ category: 'sales', priority: 1, tags: ['pricing'], title: pick(T('Review your prices and your best-selling service', 'Revoir vos prix et votre service le plus vendu'), l),
          body: pick(T('Once a month: which service sells most and which one is the most profitable? Raise prices on the first, turn the second into a fixed-price package, and stop or fix the least profitable one.', 'Une fois par mois : quel service se vend le plus et lequel est le plus rentable ? Augmentez le prix du premier, transformez le second en forfait, et arrêtez ou corrigez le moins rentable.'), l) }) },
    { key: 'team-skills', period: 'monthly', when: (f) => (f.team?.withoutGoal || 0) > 0,
      make: (f, l) => ({ category: 'skills', priority: 2, tags: ['training'], title: pick(T(`${f.team.withoutGoal} team member(s) have no learning goal: agree on one each`, `${f.team.withoutGoal} membre(s) de l'équipe n'ont aucun objectif de formation : en convenir un chacun`), l),
          body: pick(T('A certification or a language level each quarter keeps the team sharp and gives you offers to sell (Google Ads, GA4, Meta, SEO, AI). Sit down with each person, pick one goal from My growth, and decide the support and the bonus.', 'Une certification ou un niveau de langue par trimestre garde l\'équipe affûtée et vous donne des offres à vendre (Google Ads, GA4, Meta, SEO, IA). Voyez chacun, choisissez un objectif dans Ma progression et décidez du soutien et de la prime.'), l) }) },
    { key: 'what-is-new', period: 'monthly', when: () => true,
      make: (f, l) => ({ category: 'tech', priority: 1, tags: ['watch'], title: pick(T('Take one hour to watch what is new in digital and pick one thing to test', 'Prendre une heure pour suivre les nouveautés du digital et choisir une chose à tester'), l),
          body: pick(T('Read the official blogs (Google Ads & Analytics, Meta for Business, Search Engine Land) and one AI newsletter. Choose ONE new feature or tool, test it on one project this month, and share the result with the team.', 'Lisez les blogs officiels (Google Ads & Analytics, Meta for Business, Search Engine Land) et une newsletter IA. Choisissez UNE nouveauté, testez-la sur un projet ce mois-ci et partagez le résultat avec l\'équipe.'), l) }) },
]

/** The ideas the figures call for in this period ('daily' | 'weekly' | 'monthly'). */
export function ruleIdeas(period, figures, { lang = 'en', now = new Date() } = {}) {
    const s = stamp(period, now), out = []
    for (const r of RULES.filter((x) => x.period === period)) {
        let go = false
        try { go = !!r.when(figures || {}) } catch { go = false }
        if (!go) continue
        try { out.push({ ...r.make(figures || {}, lang), period, key: r.key, fingerprint: `rule:${r.key}:${s}` }) } catch { /* a rule that cannot read the figures is skipped */ }
    }
    return out
}

export const RULE_KEYS = RULES.map((r) => r.key)
