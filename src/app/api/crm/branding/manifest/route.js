import { NextResponse } from 'next/server'
import { getBranding } from '@/lib/crm/settings/settingsApi'

export const dynamic = 'force-dynamic'

// Public: the web app manifest, so the app can be installed on a phone or a computer with the platform's own name and icon.
export async function GET() {
    const { name } = await getBranding()
    const icon = (size, purpose) => ({ src: `/api/crm/branding/pwa-icon?size=${size}${purpose === 'maskable' ? '&maskable=1' : ''}`, sizes: `${size}x${size}`, type: 'image/png', purpose })
    return NextResponse.json({
        name, short_name: String(name).slice(0, 12), description: `${name}: clients, invoices, tasks, chat and projects in one place`,
        id: '/', start_url: '/?source=pwa', scope: '/', display: 'standalone', orientation: 'any', background_color: '#0b0b0b', theme_color: '#0b0b0b',
        icons: [icon(192, 'any'), icon(512, 'any'), icon(512, 'maskable')],
        shortcuts: [{ name: 'Chat', url: '/crm/chat' }, { name: 'Tasks', url: '/crm/tasks-board' }, { name: 'Calendar', url: '/calendar' }],
    }, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=300' } })
}
