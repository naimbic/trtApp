import sharp from 'sharp'
import { NextResponse } from 'next/server'
import { getBranding } from '@/lib/crm/settings/settingsApi'

export const dynamic = 'force-dynamic'

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Public: the icon of the installed app, a square PNG. The favicon chosen in Settings → General when there is one, else a tile with the first letter of the platform name.
export async function GET(request) {
    const q = request.nextUrl.searchParams
    const size = [96, 180, 192, 512].includes(Number(q.get('size'))) ? Number(q.get('size')) : 192
    const maskable = q.get('maskable') === '1'
    const { name, favicon } = await getBranding()
    const pad = maskable ? Math.round(size * 0.2) : Math.round(size * 0.08) // a maskable icon keeps its picture inside the safe zone
    const inner = size - pad * 2
    let png
    try {
        if (favicon) {
            const res = await fetch(favicon, { signal: AbortSignal.timeout(6000) })
            if (res.ok) {
                const logo = await sharp(Buffer.from(await res.arrayBuffer()), { limitInputPixels: 50e6 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
                png = await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } }).composite([{ input: logo, top: pad, left: pad }]).png().toBuffer()
            }
        }
    } catch { /* fall back to the letter tile */ }
    if (!png) {
        const letter = esc(String(name || 'T').trim()[0]?.toUpperCase() || 'T')
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#2563eb"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${Math.round(size * 0.56)}" fill="#fff">${letter}</text></svg>`
        png = await sharp(Buffer.from(svg)).png().toBuffer()
    }
    return new NextResponse(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } })
}
