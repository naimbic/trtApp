import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import spaces, { BUCKET, CDN_URL } from '@/lib/spaces'
import prisma from '@/lib/prisma'
import sharp from 'sharp'
import crypto from 'crypto'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

// Dangerous file extensions that should never be uploaded
const BLOCKED_EXTENSIONS = new Set([
    'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'vbs', 'vbe',
    'js', 'jse', 'ws', 'wsf', 'wsc', 'wsh', 'ps1', 'ps2', 'psc1',
    'psc2', 'reg', 'inf', 'lnk', 'sct', 'shb', 'shs', 'cpl', 'hta',
    'dll', 'sys', 'drv', 'ocx', 'cgi', 'bin', 'app', 'action',
    'command', 'workflow', 'sh', 'bash', 'csh', 'ksh', 'out', 'run',
    // pages and scripts a browser would run when the file is opened from the storage address
    'html', 'htm', 'xhtml', 'shtml', 'svg', 'svgz', 'xml', 'xsl', 'mjs', 'php', 'phtml', 'jsp', 'asp', 'aspx', 'py', 'pl', 'rb', 'jar', 'apk', 'dmg', 'swf',
])
const RISKY_TYPES = /html|svg|xml|javascript|ecmascript|x-sh|x-php/i

// Resize limits per folder
const SIZE_PRESETS = {
    avatars: { width: 256, height: 256, fit: 'cover' },
    products: { width: 800, height: 800, fit: 'inside' },
    default: { width: 1200, height: 1200, fit: 'inside' },
}

// Map MIME types to file manager fileType
function getFileType(mime, name) {
    if (mime.startsWith('image/')) return 'jpeg'
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const map = {
        pdf: 'pdf', doc: 'doc', docx: 'doc', xls: 'xls', xlsx: 'xls',
        ppt: 'ppt', pptx: 'ppt', fig: 'figma', zip: 'zip', rar: 'zip',
        mp4: 'video', mov: 'video', mp3: 'audio', wav: 'audio',
        csv: 'csv', txt: 'text', json: 'text', svg: 'image',
    }
    return map[ext] || 'file'
}

export async function POST(request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file')
        const folder = String(formData.get('folder') || 'uploads').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'uploads' // one plain folder name, never a path
        const quality = parseInt(formData.get('quality') || '80', 10)
        const saveToDb = formData.get('saveToDb') === 'true'
        const parentFolder = formData.get('parentFolder') || null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
        }

        // Block dangerous file types
        const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
        if (typeof file === 'string' || BLOCKED_EXTENSIONS.has(fileExt) || !/^[a-z0-9]{1,8}$/.test(fileExt) || RISKY_TYPES.test(file.type || '')) {
            return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer())
        const isImage = IMAGE_TYPES.includes(file.type)
        let uploadBuffer = rawBuffer
        let contentType = file.type
        let ext = file.name.split('.').pop()?.toLowerCase() || 'bin'

        // Optimize images to WebP (except for file-manager general uploads)
        if (isImage && folder !== 'files') {
            const preset = SIZE_PRESETS[folder] || SIZE_PRESETS.default
            uploadBuffer = await sharp(rawBuffer)
                .resize(preset.width, preset.height, {
                    fit: preset.fit,
                    withoutEnlargement: true,
                })
                .webp({ quality: Math.min(Math.max(quality, 10), 100) })
                .toBuffer()
            contentType = 'image/webp'
            ext = 'webp'
        }

        const hash = crypto.randomBytes(8).toString('hex')
        const key = `${folder}/${session.user.id}-${hash}.${ext}`

        await spaces.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: uploadBuffer,
                ContentType: contentType,
                ACL: 'public-read',
                CacheControl: 'public, max-age=31536000, immutable',
            }),
        )

        const url = `${CDN_URL}/${key}`

        // Save file record to DB for file manager
        let fileRecord = null
        if (saveToDb) {
            fileRecord = await prisma.file.create({
                data: {
                    name: file.name,
                    fileType: getFileType(file.type, file.name),
                    size: uploadBuffer.length,
                    url,
                    folder: parentFolder,
                    uploadedBy: session.user.id,
                },
            })
        }

        return NextResponse.json({
            success: true,
            url,
            size: uploadBuffer.length,
            originalSize: rawBuffer.length,
            saved: Math.round((1 - uploadBuffer.length / rawBuffer.length) * 100),
            fileId: fileRecord?.id || null,
        })
    } catch (error) {
        console.error('POST /api/upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
