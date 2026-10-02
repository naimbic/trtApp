'use server'

import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'

const splitName = (name = '') => {
    const parts = String(name).trim().split(/\s+/)
    return { firstName: parts.shift() || '', lastName: parts.join(' ') }
}

/**
 * Replicates Perfex leads_model->convert_to_customer():
 *  - creates a client from the lead (company falls back to the lead name),
 *  - creates the primary contact (lead name split into first/last, email, phone, title),
 *  - marks the lead converted (clientId, dateConverted, junk/lost cleared) and logs the activity,
 *  - optionally copies lead notes to the new client.
 */
export async function convertLeadToClient(leadId, { contactData = {}, includeLeadNotes = false } = {}) {
    const session = await requirePermission('customers', 'create')
    const staffId = await getStaffId(session)

    const lead = await prisma.crmLead.findUnique({ where: { id: leadId } })
    if (!lead) return { success: false, message: 'Lead not found' }
    if (lead.clientId) return { success: false, message: 'Lead already converted' }

    const names = splitName(lead.name)

    const client = await prisma.crmClient.create({
        data: {
            company: lead.company || lead.name,
            phoneNumber: lead.phoneNumber,
            country: lead.country,
            zip: lead.zip,
            city: lead.city,
            state: lead.state,
            address: lead.address,
            website: lead.website,
            defaultLanguage: lead.defaultLanguage,
            leadId: lead.id,
            active: true,
            registrationConfirmed: true,
            addedFrom: staffId || undefined,
        },
    })

    const contact = await prisma.crmContact.create({
        data: {
            clientId: client.id,
            isPrimary: true,
            firstName: contactData.firstName ?? names.firstName,
            lastName: contactData.lastName ?? names.lastName,
            email: contactData.email ?? lead.email,
            phoneNumber: contactData.phoneNumber ?? lead.phoneNumber,
            title: contactData.title ?? lead.title,
            active: true,
        },
    })

    // Perfex moves the lead to the "Customer" status when it exists.
    const customerStatus = await prisma.crmLeadStatus.findFirst({
        where: { name: { equals: 'Customer', mode: 'insensitive' } },
        select: { id: true },
    })

    const now = new Date()
    await prisma.crmLead.update({
        where: { id: lead.id },
        data: {
            clientId: client.id,
            dateConverted: now,
            junk: false,
            lost: false,
            ...(customerStatus ? { statusId: customerStatus.id, lastStatusChange: now } : {}),
        },
    })

    await prisma.crmLeadActivityLog.create({
        data: {
            leadId: lead.id,
            description: 'not_lead_activity_converted',
            additionalData: JSON.stringify([session.user.name || '', client.company]),
            staffId: staffId || undefined,
            fullName: session.user.name || null,
        },
    })

    if (includeLeadNotes) {
        try {
            // Notes live in the admin domain (polymorphic relType/relId); copy lead notes to the client.
            if (prisma.crmNote) {
                const notes = await prisma.crmNote.findMany({ where: { relType: 'lead', relId: lead.id } })
                for (const n of notes) {
                    const { id, createdAt, updatedAt, legacyId, ...rest } = n
                    await prisma.crmNote.create({ data: { ...rest, relType: 'customer', relId: client.id } })
                }
            }
        } catch (e) {
            console.error('convertLeadToClient: copying notes failed', e)
        }
    }

    return { success: true, clientId: client.id, contactId: contact.id }
}

export default convertLeadToClient
