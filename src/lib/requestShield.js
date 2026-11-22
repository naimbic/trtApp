/* Pure rules of the request shield (src/proxy.js), kept apart so they can be tested.
   1. Cross-site requests: a browser on another website may not make a signed-in person's browser change things here.
   2. Floods: someone who is not signed in gets a ceiling on how many changes they may send per minute. */

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

// Addresses other websites and servers are meant to call: they check a key, a signed link or a token of their own.
const CROSS_SITE_OK = [/^\/api\/v1\//, /^\/api\/oauth\//, /^\/api\/platform\//, /^\/api\/crm\/public\//, /^\/api\/(submissions|404-log)(\/|$)/, /^\/api\/redirects\/check(\/|$)/]
// Machines that send many messages from one address (the sites, WhatsApp): they have their own limits.
const FLOOD_OK = [/^\/api\/v1\//, /^\/api\/oauth\//, /^\/api\/platform\//, /^\/api\/(submissions|404-log)(\/|$)/, /^\/api\/crm\/public\/whatsapp(\/|$)/]

const hostOf = (v) => { try { return new URL(String(v).includes('://') ? v : `http://${v}`).hostname.toLowerCase() } catch { return '' } }

/** True when the request is a change coming from a page of another website. `allowed` = extra origins that may call (the app's own address, the registered sites). */
export function crossSiteWrite({ method, path, origin, host, allowed = [], hasKey = false }) {
    if (SAFE.has(String(method).toUpperCase())) return false
    if (hasKey) return false // a key in the header is not something a browser adds by itself
    if (!origin) return false // no Origin: not a browser on another site (servers, tools)
    if (CROSS_SITE_OK.some((r) => r.test(path))) return false
    const from = hostOf(origin)
    if (!from) return true // "null" or unreadable origin (a sandboxed page): refuse
    if (from === hostOf(host)) return false
    return !allowed.some((a) => hostOf(a) === from)
}

/** True when this request counts against the "not signed in" ceiling. */
export function countsAsAnonymousWrite({ method, path, signedIn }) {
    if (SAFE.has(String(method).toUpperCase())) return false
    if (signedIn) return false // a key header does not count: anyone can add one, and the addresses that take keys are listed above
    return !FLOOD_OK.some((r) => r.test(path))
}
