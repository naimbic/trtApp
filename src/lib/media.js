import crypto from 'node:crypto'
import sharp from 'sharp'
import { PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import spaces, { BUCKET, CDN_URL } from '@/lib/spaces'
import prisma from '@/lib/prisma'

/**
 * Everything that touches the Space: validation, image optimisation (always WebP), upload and deletion.
 * Keys are `trtcrm/<folder>/<yyyy>/<mm>/<random>.<ext>`; originals are never stored, only the optimised copy.
 */
export const PREFIX = 'trtcrm'
const MB = 1024 * 1024

export const LIMITS = { image: 20 * MB, file: 50 * MB }

// What each kind of image is resized to. `fit: cover` crops to the exact box (avatars), `inside` only shrinks.
export const PRESETS = {
    avatar: { w: 512, h: 512, fit: 'cover', quality: 82 },
    logo: { w: 900, h: 400, fit: 'inside', quality: 90, nearLossless: true },
    signature: { w: 700, h: 300, fit: 'inside', quality: 90, nearLossless: true },
    cover: { w: 1600, h: 600, fit: 'cover', quality: 80 },
    favicon: { w: 192, h: 192, fit: 'contain', quality: 92, nearLossless: true, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    attachment: { w: 2400, h: 2400, fit: 'inside', quality: 82 },
    library: { w: 2400, h: 2400, fit: 'inside', quality: 82 },
}

const FILE_TYPES = {
    pdf: ['pdf', 'application/pdf'], doc: ['doc', 'application/msword'], docx: ['doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    rtf: ['doc', 'application/rtf'], odt: ['doc', 'application/vnd.oasis.opendocument.text'], txt: ['text', 'text/plain'], csv: ['sheet', 'text/csv'],
    xls: ['sheet', 'application/vnd.ms-excel'], xlsx: ['sheet', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], ods: ['sheet', 'application/vnd.oasis.opendocument.spreadsheet'],
    ppt: ['slides', 'application/vnd.ms-powerpoint'], pptx: ['slides', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'], odp: ['slides', 'application/vnd.oasis.opendocument.presentation'],
    zip: ['archive', 'application/zip'], rar: ['archive', 'application/vnd.rar'], '7z': ['archive', 'application/x-7z-compressed'],
    mp4: ['video', 'video/mp4'], mov: ['video', 'video/quicktime'], webm: ['video', 'video/webm'], mp3: ['audio', 'audio/mpeg'], wav: ['audio', 'audio/wav'], m4a: ['audio', 'audio/mp4'],
}
const IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'heif'])

let cfgCache = { at: 0, allowed: null, maxMb: null }
/** Settings → General → Files: allowed extensions and the largest upload (cached for 30 s). */
async function uploadConfig() {
    if (Date.now() - cfgCache.at < 30000) return cfgCache
    const rows = await prisma.crmOption.findMany({ where: { name: { in: ['allowed_files', 'media_max_file_size_upload'] } } }).catch(() => [])
    const m = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    const list = String(m.allowed_files || '').split(/[,;\s]+/).map((x) => x.replace(/^\./, '').toLowerCase()).filter(Boolean)
    cfgCache = { at: Date.now(), allowed: list.length ? new Set(list) : null, maxMb: Number(m.media_max_file_size_upload) > 0 ? Number(m.media_max_file_size_upload) : null }
    return cfgCache
}

export class MediaError extends Error {
    constructor(message, status = 400) { super(message); this.status = status }
}

export const publicUrl = (key) => `${CDN_URL}/${String(key).split('/').map(encodeURIComponent).join('/')}`
export const keyFromUrl = (url) => (url && url.startsWith(`${CDN_URL}/${PREFIX}/`) ? url.slice(CDN_URL.length + 1) : null)

const safeName = (name) => String(name || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file'
const extOf = (name) => (String(name).split('.').pop() || '').toLowerCase()

/**
 * Validates and optimises one uploaded File. Returns { buffer, contentType, ext, kind, width, height, size, originalSize, name }.
 * Images become WebP (EXIF-rotated, metadata stripped, never enlarged, animated GIFs stay animated); other files are
 * checked by extension and, for PDFs, by signature.
 */
export async function processUpload(file, { purpose = 'library', imageOnly = false } = {}) {
    if (!file || typeof file.arrayBuffer !== 'function') throw new MediaError('No file received')
    const name = safeName(file.name)
    const ext = extOf(name)
    const cfg = await uploadConfig()
    if (cfg.allowed && !cfg.allowed.has(ext) && !(ext === 'jpg' && cfg.allowed.has('jpeg')) && !(ext === 'jpeg' && cfg.allowed.has('jpg'))) throw new MediaError(`".${ext || 'unknown'}" files are not allowed in Settings → General → Files`)
    if (cfg.maxMb && file.size > cfg.maxMb * MB) throw new MediaError(`"${name}" is larger than ${cfg.maxMb} MB (Settings → General → Files)`)
    const raw = Buffer.from(await file.arrayBuffer())
    if (!raw.length) throw new MediaError(`"${name}" is empty`)

    let meta = null
    try { meta = await sharp(raw, { failOn: 'none', limitInputPixels: 100e6 }).metadata() } catch { /* not an image */ }
    const isImage = !!meta && IMAGE_FORMATS.has(meta.format)

    if (isImage) {
        if (raw.length > LIMITS.image) throw new MediaError(`"${name}" is too large (images up to ${LIMITS.image / MB} MB)`)
        const preset = PRESETS[purpose] || PRESETS.library
        const animated = (meta.pages || 1) > 1 && ['gif', 'webp'].includes(meta.format)
        let pipeline = sharp(raw, { failOn: 'none', animated, limitInputPixels: 100e6 }).rotate()
        pipeline = pipeline.resize({ width: preset.w, height: preset.h, fit: preset.fit, position: 'attention', background: preset.background, withoutEnlargement: preset.fit === 'inside' })
        const out = await pipeline.webp({ quality: preset.quality, effort: 5, smartSubsample: true, alphaQuality: 100, ...(preset.nearLossless ? { nearLossless: true } : {}) }).toBuffer({ resolveWithObject: true })
        // keep the original if it was already a smaller WebP and needed no resize
        let buffer = out.data, width = out.info.width, height = out.info.height
        if (meta.format === 'webp' && raw.length <= buffer.length && (meta.width || 0) <= preset.w && (meta.height || 0) <= preset.h) { buffer = raw; width = meta.width; height = meta.height }
        return { buffer, contentType: 'image/webp', ext: 'webp', kind: 'image', width, height, size: buffer.length, originalSize: raw.length, name: name.replace(/\.[^.]+$/, '') + '.webp' }
    }

    if (imageOnly) throw new MediaError('Please choose an image (JPG, PNG, WebP, GIF or AVIF)')
    if (!FILE_TYPES[ext]) throw new MediaError(`".${ext || 'unknown'}" files are not allowed. Allowed: images, PDF, Office documents, CSV, TXT, ZIP/RAR/7Z, MP4/MOV/WEBM, MP3/WAV`)
    if (raw.length > LIMITS.file) throw new MediaError(`"${name}" is too large (files up to ${LIMITS.file / MB} MB)`)
    if (ext === 'pdf' && raw.subarray(0, 5).toString() !== '%PDF-') throw new MediaError(`"${name}" is not a valid PDF`)
    const [kind, contentType] = FILE_TYPES[ext]
    return { buffer: raw, contentType, ext, kind, width: null, height: null, size: raw.length, originalSize: raw.length, name }
}

/** Uploads a processed file; returns { key, url }. */
export async function putMedia(processed, folder = 'library') {
    const d = new Date()
    const key = `${PREFIX}/${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomBytes(12).toString('hex')}.${processed.ext}`
    await spaces.send(new PutObjectCommand({
        Bucket: BUCKET, Key: key, Body: processed.buffer, ContentType: processed.contentType, ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
        ContentDisposition: processed.kind === 'image' ? 'inline' : `inline; filename*=UTF-8''${encodeURIComponent(processed.name)}`,
    }))
    return { key, url: publicUrl(key) }
}

/** Removes objects from the Space. Keys under our prefix by default; `allowAny` is for files that were already in the Space before the CRM (listed in the file manager). */
export async function deleteMedia(keys, { allowAny = false } = {}) {
    const list = [...new Set((Array.isArray(keys) ? keys : [keys]).filter((k) => k && (allowAny || k.startsWith(`${PREFIX}/`))))]
    if (!list.length) return
    if (list.length === 1) { await spaces.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: list[0] })); return }
    for (let i = 0; i < list.length; i += 900) await spaces.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: list.slice(i, i + 900).map((Key) => ({ Key })), Quiet: true } }))
}

/** Convenience for single images (avatars, logos): process + upload. */
export async function uploadImage(file, purpose, folder = purpose) {
    const p = await processUpload(file, { purpose, imageOnly: true })
    const { key, url } = await putMedia(p, folder)
    return { key, url, width: p.width, height: p.height, size: p.size, originalSize: p.originalSize }
}

/** Reads the body of an image POST: a multipart `file`, or JSON `{ mediaId }` (a picture picked from the file manager). */
export async function readImageInput(request) {
    if ((request.headers.get('content-type') || '').includes('application/json')) return { mediaId: (await request.json().catch(() => ({}))).mediaId }
    return { file: (await request.formData()).get('file') }
}

/** Upload `{ file }` (optimised to WebP) or reuse a file-manager picture `{ mediaId }`. */
export async function resolveImage({ file, mediaId } = {}, purpose, folder = purpose) {
    if (mediaId) {
        const m = /^[a-f0-9]{24}$/i.test(String(mediaId)) ? await prisma.crmMedia.findUnique({ where: { id: String(mediaId) } }) : null
        if (!m || m.isFolder || m.kind !== 'image' || !m.url) throw new MediaError('Choose an image from the file manager')
        return { url: m.url, size: m.size, originalSize: m.originalSize ?? m.size, fromLibrary: true }
    }
    return uploadImage(file, purpose, folder)
}

/** Deletes a stored picture unless the file manager still lists it (so replacing an avatar never deletes a library file). */
export async function dropImage(...urls) {
    const keys = []
    for (const u of urls) {
        const key = keyFromUrl(u)
        if (key && !(await prisma.crmMedia.findFirst({ where: { key }, select: { id: true } }))) keys.push(key)
    }
    if (keys.length) await deleteMedia(keys)
}
