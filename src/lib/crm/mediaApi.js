import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { PermissionError, requirePermission, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import spaces, { BUCKET } from '@/lib/spaces'
import { processUpload, putMedia, deleteMedia, publicUrl, MediaError } from '@/lib/media'

const plain = (v) => JSON.parse(JSON.stringify(v))
const OID = /^[0-9a-f]{24}$/i
const fail = (message, status = 400) => { throw new PermissionError(message, status) }

// Which Perfex feature controls attachments of each record type.
const REL_FEATURE = { customer: 'customers', client: 'customers', invoice: 'invoices', estimate: 'estimates', proposal: 'proposals', contract: 'contracts', project: 'projects', task: 'tasks', ticket: 'tickets', lead: 'leads', expense: 'expenses' }

async function who() {
    const session = await auth()
    if (!session?.user?.id) throw new PermissionError('Unauthorized', 401)
    const authority = session.user.authority || []
    const staffId = await getStaffId(session)
    const name = session.user.name || session.user.email
    return { session, authority, staffId, name, admin: isCrmAdmin(authority) }
}

function relAccess(ctx, relType, cap) {
    if (!relType) return true
    const feature = REL_FEATURE[relType]
    if (!feature) fail('Unknown record type')
    if (!(hasCap(ctx.authority, feature, cap) || (cap === 'view' && hasCap(ctx.authority, feature, 'view_own')))) throw new PermissionError('You do not have access to these files', 403)
    return true
}

const shape = (m) => ({
    id: m.id, name: m.name, isFolder: m.isFolder, parentId: m.parentId, url: m.url, mime: m.mime, kind: m.kind, size: m.size, originalSize: m.originalSize,
    width: m.width, height: m.height, purpose: m.purpose, relType: m.relType, relId: m.relId, visibleToClient: m.visibleToClient,
    uploaderName: m.uploaderName, uploadedBy: m.uploadedBy, createdAt: m.createdAt,
})

/** Folder contents (or attachments of one record), newest first, folders on top. */
export async function listMedia({ parentId, query, relType, relId, kind, foldersOnly, pageIndex = 1, pageSize = 60 } = {}) {
    const ctx = await who()
    if (foldersOnly) return plain({ list: (await prisma.crmMedia.findMany({ where: { isFolder: true, relType: null }, orderBy: { name: 'asc' }, take: 500 })).map(shape), total: 0, path: [] })
    relAccess(ctx, relType, 'view')
    const where = relType ? { relType, relId } : { relType: null, ...(query || kind ? {} : { parentId: OID.test(parentId || '') ? parentId : null }) }
    if (kind) where.kind = kind
    if (query) where.name = { contains: query, mode: 'insensitive' }
    if (relType && !OID.test(relId || '')) fail('relId is required')
    const [rows, total] = await Promise.all([
        prisma.crmMedia.findMany({ where, orderBy: [{ isFolder: 'desc' }, { createdAt: 'desc' }], skip: (pageIndex - 1) * pageSize, take: pageSize }),
        prisma.crmMedia.count({ where }),
    ])
    let path = []
    if (!relType && OID.test(parentId || '') && !query) {
        let cur = await prisma.crmMedia.findUnique({ where: { id: parentId } })
        const seen = new Set()
        while (cur && !seen.has(cur.id)) { seen.add(cur.id); path.unshift({ id: cur.id, name: cur.name }); cur = cur.parentId ? await prisma.crmMedia.findUnique({ where: { id: cur.parentId } }) : null }
    }
    return plain({ list: rows.map(shape), total, path })
}

export async function mediaStats() {
    await who()
    const rows = await prisma.crmMedia.findMany({ where: { isFolder: false }, select: { size: true, originalSize: true, kind: true } })
    const byKind = {}
    let size = 0, original = 0
    for (const r of rows) { size += r.size || 0; original += r.originalSize || r.size || 0; byKind[r.kind || 'other'] = (byKind[r.kind || 'other'] || 0) + 1 }
    return { files: rows.length, size, saved: Math.max(0, original - size), byKind }
}

/** Upload one or more files from a multipart form: files[], parentId, relType, relId, visibleToClient. */
export async function uploadMedia(formData) {
    const ctx = await who()
    const files = formData.getAll('files').filter((f) => f && typeof f !== 'string')
    if (!files.length) fail('Choose at least one file')
    if (files.length > 20) fail('Up to 20 files at once')
    const relType = formData.get('relType') || null
    const relId = formData.get('relId') || null
    const parentId = OID.test(formData.get('parentId') || '') ? formData.get('parentId') : null
    if (relType) { relAccess(ctx, relType, 'edit'); if (!OID.test(relId || '')) fail('relId is required') }
    if (parentId && !(await prisma.crmMedia.findFirst({ where: { id: parentId, isFolder: true } }))) fail('Folder not found', 404)
    const visibleToClient = formData.get('visibleToClient') === 'true'
    const purpose = relType ? 'attachment' : 'library'
    const saved = [], errors = []
    for (const file of files) {
        try {
            const p = await processUpload(file, { purpose })
            const { key, url } = await putMedia(p, relType ? `attachments/${relType}` : 'library')
            const row = await prisma.crmMedia.create({ data: { name: p.name, key, url, mime: p.contentType, kind: p.kind, size: p.size, originalSize: p.originalSize, width: p.width, height: p.height, purpose, parentId: relType ? null : parentId, relType, relId: relType ? relId : null, visibleToClient, uploadedBy: ctx.staffId || undefined, uploaderName: ctx.name } })
            saved.push(shape(row))
        } catch (e) {
            if (e instanceof MediaError) errors.push({ name: file.name, error: e.message })
            else { console.error('[media] upload failed', e); errors.push({ name: file.name, error: 'Upload failed, try again' }) }
        }
    }
    return plain({ saved, errors })
}

async function descendants(id) {
    const ids = [], keys = []
    const queue = [id]
    while (queue.length) {
        const cur = queue.shift()
        const kids = await prisma.crmMedia.findMany({ where: { parentId: cur } })
        for (const k of kids) { ids.push(k.id); if (k.isFolder) queue.push(k.id); else if (k.key) keys.push(k.key) }
    }
    return { ids, keys }
}

export async function mediaAction(body) {
    const ctx = await who()
    const { action } = body
    if (action === 'createFolder') {
        const name = String(body.name || '').trim().slice(0, 80)
        if (!name) fail('Give the folder a name')
        const parentId = OID.test(body.parentId || '') ? body.parentId : null
        const dup = await prisma.crmMedia.findFirst({ where: { parentId, isFolder: true, name: { equals: name, mode: 'insensitive' }, relType: null } })
        if (dup) fail('A folder with this name already exists here')
        const row = await prisma.crmMedia.create({ data: { name, isFolder: true, parentId, relType: null, relId: null, key: null, url: null, kind: 'folder', purpose: 'library', uploadedBy: ctx.staffId || undefined, uploaderName: ctx.name } })
        return plain(shape(row))
    }
    const id = body.id
    if (!OID.test(id || '')) fail('Invalid item')
    const item = await prisma.crmMedia.findUnique({ where: { id } })
    if (!item) fail('Item not found', 404)
    const owns = ctx.admin || (item.uploadedBy && item.uploadedBy === ctx.staffId)
    if (item.relType) relAccess(ctx, item.relType, 'edit')
    else if (!owns) throw new PermissionError('Only the person who uploaded this can change it', 403)

    if (action === 'rename') {
        const name = String(body.name || '').trim().slice(0, 120)
        if (!name) fail('Name is required')
        return plain(shape(await prisma.crmMedia.update({ where: { id }, data: { name } })))
    }
    if (action === 'move') {
        const parentId = OID.test(body.parentId || '') ? body.parentId : null
        if (parentId) {
            if (parentId === id) fail('A folder cannot go inside itself')
            const target = await prisma.crmMedia.findFirst({ where: { id: parentId, isFolder: true } })
            if (!target) fail('Destination folder not found', 404)
            if (item.isFolder) { const { ids } = await descendants(id); if (ids.includes(parentId)) fail('A folder cannot go inside one of its own folders') }
        }
        return plain(shape(await prisma.crmMedia.update({ where: { id }, data: { parentId } })))
    }
    if (action === 'setVisibility') return plain(shape(await prisma.crmMedia.update({ where: { id }, data: { visibleToClient: !!body.visibleToClient } })))
    if (action === 'delete') {
        const sub = item.isFolder ? await descendants(id) : { ids: [], keys: [] }
        await deleteMedia([item.key, ...sub.keys], { allowAny: true })
        await prisma.crmMedia.deleteMany({ where: { id: { in: [id, ...sub.ids] } } })
        return { success: true, removed: 1 + sub.ids.length }
    }
    fail('Unknown action')
}

/* ---------- bring what is already in the Space into the file manager ---------- */
const EXT_KIND = {
    jpg: ['image', 'image/jpeg'], jpeg: ['image', 'image/jpeg'], png: ['image', 'image/png'], webp: ['image', 'image/webp'], gif: ['image', 'image/gif'], avif: ['image', 'image/avif'],
    svg: ['image', 'image/svg+xml'], bmp: ['image', 'image/bmp'], ico: ['image', 'image/x-icon'], tif: ['image', 'image/tiff'], tiff: ['image', 'image/tiff'], heic: ['image', 'image/heic'],
    pdf: ['pdf', 'application/pdf'], doc: ['doc', 'application/msword'], docx: ['doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], rtf: ['doc', 'application/rtf'], odt: ['doc', 'application/vnd.oasis.opendocument.text'],
    txt: ['text', 'text/plain'], md: ['text', 'text/markdown'], json: ['text', 'application/json'], csv: ['sheet', 'text/csv'], xls: ['sheet', 'application/vnd.ms-excel'],
    xlsx: ['sheet', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], ods: ['sheet', 'application/vnd.oasis.opendocument.spreadsheet'],
    ppt: ['slides', 'application/vnd.ms-powerpoint'], pptx: ['slides', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    zip: ['archive', 'application/zip'], rar: ['archive', 'application/vnd.rar'], '7z': ['archive', 'application/x-7z-compressed'], gz: ['archive', 'application/gzip'],
    mp4: ['video', 'video/mp4'], mov: ['video', 'video/quicktime'], webm: ['video', 'video/webm'], mp3: ['audio', 'audio/mpeg'], wav: ['audio', 'audio/wav'], m4a: ['audio', 'audio/mp4'],
}
let lastSync = 0
let syncing = null

async function listAllObjects() {
    const out = []
    let token
    do {
        const r = await spaces.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1000, ContinuationToken: token }))
        for (const o of r.Contents || []) out.push({ key: o.Key, size: o.Size || 0, at: o.LastModified })
        token = r.IsTruncated ? r.NextContinuationToken : undefined
    } while (token)
    return out
}

async function runSync() {
    const objects = (await listAllObjects()).filter((o) => !o.key.startsWith(`trtcrm/_healthcheck/`))
    const listed = new Map(objects.map((o) => [o.key, o]))
    const indexed = await prisma.crmMedia.findMany({ where: { isFolder: false, key: { not: null } }, select: { id: true, key: true } })
    const known = new Set(indexed.map((r) => r.key))

    // index entries whose object is gone from the Space
    const stale = indexed.filter((r) => !listed.has(r.key)).map((r) => r.id)
    if (stale.length) await prisma.crmMedia.deleteMany({ where: { id: { in: stale } } })

    // folders created for Space paths, found by (parent, name)
    const folderCache = new Map()
    const folderFor = async (segments) => {
        let parentId = null
        let path = ''
        for (const name of segments) {
            path += `/${name}`
            if (!folderCache.has(path)) {
                let f = await prisma.crmMedia.findFirst({ where: { isFolder: true, parentId, name, relType: null } })
                if (!f) f = await prisma.crmMedia.create({ data: { name, isFolder: true, parentId, relType: null, relId: null, key: null, url: null, kind: 'folder', purpose: 'space', uploaderName: 'Space' } })
                folderCache.set(path, f.id)
            }
            parentId = folderCache.get(path)
        }
        return parentId
    }

    let added = 0
    for (const o of objects) {
        if (known.has(o.key) || o.key.endsWith('/')) continue
        const parts = o.key.split('/').filter(Boolean)
        const name = parts.pop()
        const ext = (name.split('.').pop() || '').toLowerCase()
        const [kind, mime] = EXT_KIND[ext] || ['other', 'application/octet-stream']
        const parentId = parts.length ? await folderFor(parts) : null
        await prisma.crmMedia.create({ data: { name, isFolder: false, parentId, key: o.key, url: publicUrl(o.key), mime, kind, size: o.size, originalSize: null, width: null, height: null, purpose: 'imported', relType: null, relId: null, visibleToClient: false, uploaderName: 'Space', createdAt: o.at || new Date() } })
        added++
    }
    lastSync = Date.now()
    return { added, removed: stale.length, total: objects.length }
}

/** Syncs the index with the bucket (at most once a minute unless forced). */
export async function syncFromSpace({ force = false } = {}) {
    await who()
    if (!force && Date.now() - lastSync < 60000) return { skipped: true, added: 0, removed: 0 }
    syncing ??= runSync().finally(() => { syncing = null })
    return syncing
}
