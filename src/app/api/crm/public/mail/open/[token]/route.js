import { recordOpen } from '@/lib/crm/mailTrackApi'

// 1x1 transparent GIF
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

/** The picture at the end of a tracked mail (/api/crm/public/mail/open/<token>). Always answers the picture, whatever happens. */
export async function GET(_request, { params }) {
    const { token } = await params
    try { await recordOpen(String(token || '')) } catch (e) { console.error('[mail open]', e.message) }
    return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Content-Length': String(GIF.length) } })
}
