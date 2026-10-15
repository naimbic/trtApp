import prisma from '@/lib/prisma'
import { processUpload, putMedia, MediaError } from '@/lib/media'

/** At most this many files per message. */
export const MAX_FILES = 10

/** What the screens receive for one attachment. */
export const attachmentOut = (a) => ({ id: a.id, name: a.fileName, type: a.fileType || '', url: a.url || null, size: a.size || 0, image: String(a.fileType || '').startsWith('image/'), missing: !!a.missing })

/** Checks and optimises every file first, so a bad file stops the whole message before anything is saved. */
export async function prepareFiles(files) {
    const list = (files || []).filter((f) => f && typeof f !== 'string' && f.size > 0)
    if (list.length > MAX_FILES) throw new MediaError(`Up to ${MAX_FILES} files per message`)
    const out = []
    for (const f of list) out.push(await processUpload(f, { purpose: 'attachment' }))
    return out
}

/** Stores prepared files in the Space and links them to the ticket (and to the reply, when there is one). */
export async function saveTicketFiles({ ticketId, replyId = null, prepared, uploaderId = null, uploaderName = null }) {
    const saved = []
    for (const p of prepared) {
        const { key, url } = await putMedia(p, 'attachments/ticket')
        const media = await prisma.crmMedia.create({ data: { name: p.name, key, url, mime: p.contentType, kind: p.kind, size: p.size, originalSize: p.originalSize, width: p.width, height: p.height, purpose: 'attachment', relType: 'ticket', relId: ticketId, visibleToClient: true, uploadedBy: uploaderId || undefined, uploaderName } })
        const row = await prisma.crmTicketAttachment.create({ data: { ticketId, replyId, fileName: p.name, fileType: p.contentType, mediaId: media.id, url, size: p.size } })
        saved.push(row)
    }
    return saved
}

/** Reads a request that is either plain JSON or multipart (`data` = JSON text, `files` = the files). */
export async function readMessageBody(request) {
    if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
        const fd = await request.formData()
        let body = {}
        try { body = JSON.parse(fd.get('data') || '{}') } catch { /* keep empty */ }
        return { body, files: fd.getAll('files') }
    }
    return { body: await request.json().catch(() => ({})), files: [] }
}
