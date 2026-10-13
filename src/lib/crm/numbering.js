import prisma from '@/lib/prisma'
import { formatDocumentNumber } from '@/lib/crm/sales/calc'

let cache = { at: 0, padding: 6 }
/** `number_padding_prefixes` option (cached for a minute). Perfex default is 6; TRT uses 3. */
export async function numberPadding() {
    if (Date.now() - cache.at < 60000) return cache.padding
    const o = await prisma.crmOption.findUnique({ where: { name: 'number_padding_prefixes' } })
    cache = { at: Date.now(), padding: Number(o?.value) > 0 ? Number(o.value) : 6 }
    return cache.padding
}

/** Display number of an invoice/estimate/credit note row ({prefix, number, numberFormat, date, status}). */
export const docNumberOf = (r, padding, draftStatus = 6) => formatDocumentNumber({ prefix: r.prefix, number: r.number, numberFormat: r.numberFormat ?? 1, date: r.date, padding, draft: draftStatus != null && r.status === draftStatus })
