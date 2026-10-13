// One-off cleanup of the imported Perfex lead pipeline: statuses were channel names, not stages.
// Backs everything up to data-backups/ first. Usage: node scripts/fix-lead-pipeline.mjs [--apply]
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const p = new PrismaClient()
const apply = process.argv.includes('--apply')
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const statuses = await p.crmLeadStatus.findMany({ orderBy: { statusOrder: 'asc' } })
const sources = await p.crmLeadSource.findMany()
const leads = await p.crmLead.findMany({ select: { id: true, statusId: true, sourceId: true, lastLeadStatusId: true, lost: true, junk: true } })
const byName = (n) => statuses.find((s) => norm(s.name) === norm(n))

// the stages we keep (renamed in place so existing ids and links survive) and the new ones
const PIPELINE = [
    { key: 'new', name: 'New', color: '#3b82f6', from: 'Marketing', isDefault: true },
    { key: 'contacted', name: 'Contacted', color: '#8b5cf6' },
    { key: 'callback', name: 'À rappeler', color: '#f59e0b', from: 'À rappeler' },
    { key: 'waiting', name: 'En attente', color: '#64748b', from: 'En Attente' },
    { key: 'planned', name: 'Planifié', color: '#06b6d4', from: 'planifie' },
    { key: 'proposal', name: 'Proposal sent', color: '#f97316' },
    { key: 'customer', name: 'Customer', color: '#22c55e' },
]
// channel-like statuses: their leads are plain "new" leads; the channel moves to the lead source where it adds information
const CHANNEL_SOURCE = { 'Live Chat / BOT': 'Live Chat / BOT', 'Social Media': 'Social Media', WhatsApp: 'WhatsApp', 'Via XY': 'Via XY', 'Popups / Forms': 'Popups / Forms', Google: 'Google', Livraison: 'Livraison', 'POS TACTILE': 'POS TACTILE', 'AI Platforms': 'AI Platforms' }

const plan = { keep: [], channelToNew: [], dropped: [], lostFromPerdu: 0, sourcesCreated: [], sourceChanges: 0 }
const backup = { at: new Date().toISOString(), statuses, sources, leads }
writeFileSync(`data-backups/lead-pipeline-${Date.now()}.json`, JSON.stringify(backup, null, 2))

if (apply) {
    // 1. stages: rename/reorder existing, create missing
    const ids = {}
    for (const [i, st] of PIPELINE.entries()) {
        const old = st.from ? byName(st.from) : null
        const data = { name: st.name, color: st.color, statusOrder: i + 1, isDefault: !!st.isDefault }
        ids[st.key] = old ? (await p.crmLeadStatus.update({ where: { id: old.id }, data })).id : (await p.crmLeadStatus.create({ data })).id
    }
    const keepIds = new Set(Object.values(ids))
    const perdu = byName('perdu')
    // 2. sources used as channels
    const srcId = {}
    const srcFor = async (name) => {
        const hit = sources.find((s) => norm(s.name) === norm(name)) || (await p.crmLeadSource.findFirst({ where: { name } }))
        if (hit) return hit.id
        if (srcId[name]) return srcId[name]
        const c = await p.crmLeadSource.create({ data: { name } })
        plan.sourcesCreated.push(name)
        return (srcId[name] = c.id)
    }
    const nameOf = Object.fromEntries(statuses.map((s) => [s.id, s.name]))
    const srcName = Object.fromEntries(sources.map((s) => [s.id, s.name]))
    for (const l of leads) {
        const oldName = nameOf[l.statusId]
        const data = {}
        const notes = []
        if (l.statusId && !keepIds.has(l.statusId)) {
            if (perdu && l.statusId === perdu.id) { data.lost = true; data.lastLeadStatusId = ids.new; notes.push('Status "perdu" became Lost') }
            data.statusId = ids.new
            const chan = CHANNEL_SOURCE[oldName]
            if (chan) {
                const target = await srcFor(chan)
                if (target !== l.sourceId) { data.sourceId = target; plan.sourceChanges++; notes.push(`Source ${srcName[l.sourceId] || 'none'} → ${chan}`) }
            }
            notes.push(`Status ${oldName} → New`)
            plan.channelToNew.push(l.id)
        }
        if (l.lastLeadStatusId && !keepIds.has(l.lastLeadStatusId) && !data.lastLeadStatusId) data.lastLeadStatusId = ids.new
        if (Object.keys(data).length) await p.crmLead.update({ where: { id: l.id }, data })
        if (notes.length) await p.crmLeadActivityLog.create({ data: { leadId: l.id, description: `Pipeline cleanup: ${notes.join('; ')}`, customActivity: true, fullName: 'System' } })
    }
    // 3. lead capture forms / mailbox integrations that defaulted new leads to an old status
    for (const m of ['crmWebToLead', 'crmLeadEmailIntegration']) {
        const rows = await p[m].findMany({ where: { leadStatusId: { not: null } }, select: { id: true, leadStatusId: true } }).catch(() => [])
        for (const r of rows) if (!keepIds.has(r.leadStatusId)) await p[m].update({ where: { id: r.id }, data: { leadStatusId: ids.new } })
    }
    // 4. drop the channel statuses
    for (const s of statuses) if (!keepIds.has(s.id)) { await p.crmLeadStatus.delete({ where: { id: s.id } }); plan.dropped.push(s.name) }
}
console.log(apply ? 'applied' : 'dry run (add --apply)', { ...plan, channelToNew: plan.channelToNew.length })
await p.$disconnect()
