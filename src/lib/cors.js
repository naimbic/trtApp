import { getAllowedOrigins } from '@/lib/platform/sites'

// Always-allowed origins (the hub's own frontend + local dev).
const STATIC_ORIGINS = [
    'https://trtmaroc.com',
    'http://localhost:3000',
    'http://localhost:3001',
]

// Dynamic origins pulled from the Site registry. Kept as a synchronously
// readable snapshot so corsHeaders() can stay sync for existing callers;
// refresh it (cheap, cached) at the top of ingest routes via refreshCors().
let dynamicOrigins = new Set()

export async function refreshCors() {
    try {
        const origins = await getAllowedOrigins()
        dynamicOrigins = new Set(origins)
    } catch {
        // keep the previous snapshot on failure
    }
    return dynamicOrigins
}

function isAllowed(origin) {
    if (!origin) return false
    return STATIC_ORIGINS.includes(origin) || dynamicOrigins.has(origin)
}

export function corsHeaders(request) {
    const origin = request?.headers?.get('origin') || ''
    const allowed = isAllowed(origin) ? origin : ''
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-trt-key',
        Vary: 'Origin',
    }
}

export function corsResponse(request) {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
}
