import crypto from 'node:crypto'
import prisma from '@/lib/prisma'

export const publicBase = () => (process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3200').replace(/\/$/, '')

const slug = (t, max = 28) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '')
const suffix = () => crypto.randomBytes(3).toString('hex').slice(0, 4)

/**
 * Readable short link for a document, created once and reused (e.g. https://crm.example.com/s/inv-fa-090-09-2026-k3x9).
 * `label` is what makes it readable (document number or subject), `target` is where it redirects.
 */
export async function shortLink({ prefix, relType, relId, label, target }) {
    const existing = await prisma.crmShortLink.findFirst({ where: { relType, relId } })
    if (existing) {
        if (existing.target !== target) await prisma.crmShortLink.update({ where: { id: existing.id }, data: { target } })
        return `${publicBase()}/s/${existing.code}`
    }
    const base = `${prefix}-${slug(label) || relType}`
    for (let i = 0; i < 5; i++) {
        const code = `${base}-${suffix()}`
        try {
            await prisma.crmShortLink.create({ data: { code, target, relType, relId } })
            return `${publicBase()}/s/${code}`
        } catch (e) {
            if (e?.code !== 'P2002') throw e
        }
    }
    return `${publicBase()}${target}` // could not allocate a code: fall back to the full link
}

export async function resolveShortLink(code) {
    const row = await prisma.crmShortLink.findUnique({ where: { code } })
    if (!row) return null
    prisma.crmShortLink.update({ where: { id: row.id }, data: { clicks: { increment: 1 } } }).catch(() => {})
    return /^https?:\/\//i.test(row.target) ? row.target : `${publicBase()}${row.target}`
}
