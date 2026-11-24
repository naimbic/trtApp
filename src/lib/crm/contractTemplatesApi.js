import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { pdfSettings } from '@/lib/crm/docStyle'

/* Contract templates (Contracts, Templates): a ready wording with merge fields that a new contract starts from.
   Who may: seeing and using them = see contracts; adding, changing, deleting = the same right on contracts. */
const trouble = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const MAX = 400000 // a contract text, pictures are links: far below this
const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

const row = (t, types, withText) => ({
    id: t.id, name: t.name, description: t.description || '', typeId: t.contractTypeId || null, type: types[t.contractTypeId] || '', active: t.isActive !== false,
    words: plain(t.content).split(' ').filter(Boolean).length, excerpt: plain(t.content).slice(0, 180), updatedAt: t.updatedAt,
    ...(withText ? { content: t.content || '' } : {}),
})
const typeNames = async () => Object.fromEntries((await prisma.crmContractType.findMany({ select: { id: true, name: true } })).map((t) => [t.id, t.name]))

export async function listContractTemplates() {
    await requirePermission('contracts', 'view')
    const [list, types] = await Promise.all([prisma.crmContractTemplate.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], take: 500 }), typeNames()])
    return { list: list.map((t) => row(t, types, false)) }
}

export async function getContractTemplate(id) {
    await requirePermission('contracts', 'view')
    const t = oid(id) ? await prisma.crmContractTemplate.findUnique({ where: { id } }) : null
    if (!t) throw trouble('Template not found', 404)
    return row(t, await typeNames(), true)
}

export async function saveContractTemplate(body = {}, id = null) {
    const session = await requirePermission('contracts', id ? 'edit' : 'create')
    const name = String(body.name || '').trim().slice(0, 120)
    if (!name) throw trouble('Name the template')
    const content = String(body.content ?? '')
    if (content.length > MAX) throw trouble('This text is too long for a template')
    if (!plain(content)) throw trouble('Write the text of the template')
    if (await prisma.crmContractTemplate.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(id ? { NOT: { id } } : {}) }, select: { id: true } })) throw trouble('A template with that name already exists')
    const typeId = oid(body.typeId)
    if (typeId && !(await prisma.crmContractType.findUnique({ where: { id: typeId }, select: { id: true } }))) throw trouble('Contract type not found', 404)
    const data = { name, description: String(body.description || '').trim().slice(0, 300) || null, content, contractTypeId: typeId, isActive: body.active !== false }
    if (id) {
        if (!oid(id) || !(await prisma.crmContractTemplate.findUnique({ where: { id }, select: { id: true } }))) throw trouble('Template not found', 404)
        await prisma.crmContractTemplate.update({ where: { id }, data })
        return { success: true, id }
    }
    const all = await prisma.crmContractTemplate.findMany({ select: { sortOrder: true }, take: 500 })
    const t = await prisma.crmContractTemplate.create({ data: { ...data, sortOrder: Math.max(-1, ...all.map((x) => x.sortOrder ?? -1)) + 1, addedFrom: (await getStaffId(session)) || undefined } })
    return { success: true, id: t.id }
}

export async function deleteContractTemplate(id) {
    await requirePermission('contracts', 'delete')
    if (!oid(id) || !(await prisma.crmContractTemplate.findUnique({ where: { id }, select: { id: true } }))) throw trouble('Template not found', 404)
    await prisma.crmContractTemplate.delete({ where: { id } }) // contracts written from it keep their own text
    return { success: true }
}

/* ---- three examples to start from, in the language of the documents (Settings). The parties are printed above the text by the contract itself. */
const art = (n, title, ...ps) => `<h2>${n}. ${title}</h2>${ps.map((p) => (p.startsWith('<') ? p : `<p>${p}</p>`)).join('')}`
const STARTERS = {
    french: [
        { name: 'Contrat de prestation de services', description: 'Mission ponctuelle ou projet : objet, durée, prix, obligations.', content: [
            art(1, 'Objet', 'Le présent contrat a pour objet de définir les conditions dans lesquelles {company_name} (le « Prestataire ») réalise pour {client_company} (le « Client ») la prestation suivante : <strong>{contract_subject}</strong>.'),
            art(2, 'Durée', 'Le contrat prend effet le {contract_datestart} et se termine le {contract_dateend}, sauf renouvellement convenu par écrit entre les parties.'),
            art(3, 'Prix et paiement', 'Le prix de la prestation est fixé à <strong>{contract_contract_value}</strong>.', 'Les factures sont payables à réception, sauf conditions particulières indiquées sur la facture. Tout retard de paiement peut entraîner la suspension de la prestation.'),
            art(4, 'Obligations du Prestataire', '<ul><li>Réaliser la prestation avec soin, dans les règles de l’art ;</li><li>Informer le Client de l’avancement et de toute difficulté ;</li><li>Respecter les délais convenus.</li></ul>'),
            art(5, 'Obligations du Client', '<ul><li>Fournir à temps les informations, contenus et accès nécessaires ;</li><li>Valider les livrables dans un délai raisonnable ;</li><li>Régler les factures aux échéances prévues.</li></ul>'),
            art(6, 'Propriété intellectuelle', 'Les livrables deviennent la propriété du Client après paiement complet du prix. Le Prestataire conserve ses outils, méthodes et savoir-faire.'),
            art(7, 'Confidentialité', 'Chaque partie s’engage à garder confidentielles les informations reçues de l’autre partie dans le cadre du contrat, pendant sa durée et deux ans après sa fin.'),
            art(8, 'Résiliation', 'En cas de manquement grave d’une partie, non réparé dans les quinze jours suivant une mise en demeure écrite, l’autre partie peut résilier le contrat. Les prestations déjà réalisées restent dues.'),
            art(9, 'Droit applicable', 'Le présent contrat est soumis au droit du pays du siège du Prestataire. Les parties recherchent d’abord une solution amiable à tout différend.'),
        ].join('') },
        { name: 'Contrat de maintenance', description: 'Abonnement mensuel ou annuel : périmètre, délais d’intervention, tarif.', content: [
            art(1, 'Objet', '{company_name} assure pour {client_company} la maintenance décrite ci-dessous : <strong>{contract_subject}</strong>.'),
            art(2, 'Périmètre', '<ul><li>Mises à jour et corrections ;</li><li>Sauvegardes régulières ;</li><li>Surveillance et sécurité ;</li><li>Assistance par email et téléphone aux heures ouvrées.</li></ul>', 'Toute demande hors périmètre fait l’objet d’un devis séparé.'),
            art(3, 'Délais d’intervention', 'Les demandes sont prises en charge sous un jour ouvré. Les incidents bloquants sont traités en priorité.'),
            art(4, 'Durée et renouvellement', 'Le contrat court du {contract_datestart} au {contract_dateend}. Il se renouvelle par accord écrit des parties avant son terme.'),
            art(5, 'Tarif', 'Le montant de la maintenance est de <strong>{contract_contract_value}</strong> pour la période, payable selon l’échéancier des factures.'),
            art(6, 'Responsabilité', 'Le Prestataire est tenu à une obligation de moyens. Sa responsabilité est limitée au montant payé par le Client pour la période en cours.'),
            art(7, 'Résiliation', 'Chaque partie peut mettre fin au contrat avec un préavis écrit de trente jours. Les sommes dues jusqu’à la date d’effet restent acquises.'),
        ].join('') },
        { name: 'Accord de confidentialité', description: 'Avant un échange d’informations sensibles avec un client ou un partenaire.', content: [
            art(1, 'Objet', '{company_name} et {client_company} souhaitent échanger des informations dans le cadre de : <strong>{contract_subject}</strong>. Le présent accord fixe les règles de confidentialité applicables.'),
            art(2, 'Informations confidentielles', 'Sont confidentielles toutes les informations, écrites ou orales, communiquées par une partie à l’autre, quel qu’en soit le support, à l’exception de celles déjà publiques ou connues de la partie qui les reçoit.'),
            art(3, 'Engagements', '<ul><li>Ne pas divulguer les informations à des tiers sans accord écrit ;</li><li>Ne les utiliser que pour l’objet du présent accord ;</li><li>Les protéger avec le même soin que ses propres informations confidentielles.</li></ul>'),
            art(4, 'Durée', 'L’accord prend effet le {contract_datestart}. Les obligations de confidentialité restent en vigueur pendant trois ans après la fin des échanges.'),
            art(5, 'Restitution', 'À la demande de la partie qui les a communiquées, les informations et leurs copies sont restituées ou détruites.'),
        ].join('') },
    ],
    english: [
        { name: 'Service agreement', description: 'A one-off job or a project: scope, term, price, duties.', content: [
            art(1, 'Purpose', 'This agreement sets out the terms on which {company_name} (the “Provider”) carries out the following service for {client_company} (the “Client”): <strong>{contract_subject}</strong>.'),
            art(2, 'Term', 'The agreement starts on {contract_datestart} and ends on {contract_dateend}, unless the parties agree in writing to renew it.'),
            art(3, 'Price and payment', 'The price of the service is <strong>{contract_contract_value}</strong>.', 'Invoices are payable on receipt unless the invoice says otherwise. Late payment may lead to the service being paused.'),
            art(4, 'Duties of the Provider', '<ul><li>Carry out the service with care and to professional standards;</li><li>Keep the Client informed of progress and of any difficulty;</li><li>Meet the agreed deadlines.</li></ul>'),
            art(5, 'Duties of the Client', '<ul><li>Provide the information, content and access needed, on time;</li><li>Approve deliverables within a reasonable time;</li><li>Pay invoices when they fall due.</li></ul>'),
            art(6, 'Intellectual property', 'Deliverables belong to the Client once the price is paid in full. The Provider keeps its tools, methods and know-how.'),
            art(7, 'Confidentiality', 'Each party keeps confidential the information it receives from the other under this agreement, during its term and for two years after it ends.'),
            art(8, 'Termination', 'If a party seriously fails to meet its duties and does not put it right within fifteen days of a written notice, the other party may end the agreement. Work already done remains payable.'),
            art(9, 'Governing law', 'This agreement is governed by the law of the country where the Provider is registered. The parties first try to settle any dispute amicably.'),
        ].join('') },
        { name: 'Maintenance agreement', description: 'A monthly or yearly plan: scope, response times, fee.', content: [
            art(1, 'Purpose', '{company_name} provides {client_company} with the maintenance described below: <strong>{contract_subject}</strong>.'),
            art(2, 'Scope', '<ul><li>Updates and fixes;</li><li>Regular backups;</li><li>Monitoring and security;</li><li>Support by email and phone during working hours.</li></ul>', 'Any request outside this scope is quoted separately.'),
            art(3, 'Response times', 'Requests are picked up within one working day. Blocking incidents are handled first.'),
            art(4, 'Term and renewal', 'The agreement runs from {contract_datestart} to {contract_dateend}. It is renewed by written agreement of the parties before it ends.'),
            art(5, 'Fee', 'The maintenance fee is <strong>{contract_contract_value}</strong> for the period, payable as invoiced.'),
            art(6, 'Liability', 'The Provider commits to reasonable efforts. Its liability is limited to the amount paid by the Client for the current period.'),
            art(7, 'Termination', 'Either party may end the agreement with thirty days’ written notice. Amounts due up to the end date remain payable.'),
        ].join('') },
        { name: 'Non-disclosure agreement', description: 'Before sharing sensitive information with a client or a partner.', content: [
            art(1, 'Purpose', '{company_name} and {client_company} wish to share information about: <strong>{contract_subject}</strong>. This agreement sets the confidentiality rules that apply.'),
            art(2, 'Confidential information', 'All information, written or spoken, that one party gives the other is confidential, whatever its form, except what is already public or already known to the party receiving it.'),
            art(3, 'Commitments', '<ul><li>Not to disclose the information to third parties without written consent;</li><li>To use it only for the purpose of this agreement;</li><li>To protect it with the same care as its own confidential information.</li></ul>'),
            art(4, 'Term', 'The agreement starts on {contract_datestart}. The confidentiality duties stay in force for three years after the exchanges end.'),
            art(5, 'Return', 'When the party that shared it asks, the information and its copies are returned or destroyed.'),
        ].join('') },
    ],
}

/** Adds the three examples (those whose name is not used yet). */
export async function addStarterTemplates() {
    const session = await requirePermission('contracts', 'create')
    const S = await pdfSettings('contract')
    const staffId = (await getStaffId(session)) || undefined
    const have = new Set((await prisma.crmContractTemplate.findMany({ select: { name: true }, take: 500 })).map((t) => t.name.toLowerCase()))
    let order = have.size, added = 0
    for (const t of STARTERS[S.lang] || STARTERS.english) {
        if (have.has(t.name.toLowerCase())) continue
        await prisma.crmContractTemplate.create({ data: { ...t, isActive: true, sortOrder: order++, addedFrom: staffId } })
        added++
    }
    return { success: true, added }
}
