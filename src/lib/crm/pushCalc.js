// What a push notification says. No database, no network: tested on its own.

/** A short, safe notification: title and body cut to what a phone shows, a link that stays inside the app. */
export function buildPayload({ title, body = '', url = '/', tag = '', icon = true, force = false } = {}) {
    const clean = (s, n) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n)
    const safeUrl = String(url || '/').startsWith('/') && !String(url).startsWith('//') ? String(url).slice(0, 300) : '/'
    return { title: clean(title, 80) || 'trtCRM', body: clean(body, 180), url: safeUrl, tag: clean(tag, 60) || undefined, icon: icon ? '/api/crm/branding/pwa-icon?size=192' : undefined, badge: '/api/crm/branding/pwa-icon?size=96', force: force || undefined }
}

/** Is this subscription from the browser well formed (an https push service address and both keys)? */
export function validSubscription(sub) {
    if (!sub || typeof sub !== 'object') return false
    const { endpoint, keys } = sub
    if (typeof endpoint !== 'string' || !/^https:\/\/[^\s]{10,500}$/.test(endpoint)) return false
    return typeof keys?.p256dh === 'string' && keys.p256dh.length > 20 && keys.p256dh.length < 200 && typeof keys?.auth === 'string' && keys.auth.length > 8 && keys.auth.length < 100
}

/** Is a push service answer "this device is gone" (the subscription is removed)? */
export const isGone = (status) => status === 404 || status === 410
