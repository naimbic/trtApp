/**
 * Role permissions are stored in CrmRole.permissionsRaw either as JSON ({ feature: [capabilities] })
 * (roles created in this app) or PHP-serialized (imported from Perfex tblroles.permissions).
 * Always returns a plain { feature: string[] } object.
 */
export function parseRolePermissions(raw) {
    if (!raw) return {}
    const text = String(raw).trim()
    if (text.startsWith('{') || text.startsWith('[')) {
        try {
            const j = JSON.parse(text)
            return normalize(j)
        } catch {
            return {}
        }
    }
    try {
        return normalize(phpUnserialize(text))
    } catch {
        return {}
    }
}

const normalize = (o) => {
    const out = {}
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out
    for (const [feature, caps] of Object.entries(o)) {
        const list = Array.isArray(caps) ? caps : caps && typeof caps === 'object' ? Object.values(caps) : []
        const clean = [...new Set(list.map(String).filter(Boolean))]
        if (clean.length) out[feature] = clean
    }
    return out
}

/** Minimal PHP unserialize for arrays/strings/ints/bools/null (enough for Perfex permissions). */
export function phpUnserialize(input) {
    const buf = Buffer.from(input, 'utf8')
    let pos = 0
    const readUntil = (ch) => {
        const end = buf.indexOf(ch, pos)
        if (end < 0) throw new Error('bad serialize')
        const s = buf.toString('utf8', pos, end)
        pos = end + 1
        return s
    }
    const parse = () => {
        const type = String.fromCharCode(buf[pos])
        pos += 2 // type + ':' (or ';' for N)
        if (type === 'N') return null
        if (type === 'i' || type === 'd') return Number(readUntil(0x3b))
        if (type === 'b') return readUntil(0x3b) === '1'
        if (type === 's') {
            const len = Number(readUntil(0x3a))
            pos += 1 // opening quote
            const s = buf.toString('utf8', pos, pos + len)
            pos += len + 2 // closing quote + ';'
            return s
        }
        if (type === 'a') {
            const n = Number(readUntil(0x3a))
            pos += 1 // '{'
            const o = {}
            for (let i = 0; i < n; i++) {
                const k = parse()
                o[k] = parse()
            }
            pos += 1 // '}'
            return o
        }
        throw new Error(`unsupported type ${type}`)
    }
    return parse()
}

/** { feature: [caps] } -> [{ feature, capability }] rows for crm_staff_permissions. */
export const toPermissionRows = (perms) => Object.entries(perms).flatMap(([feature, caps]) => caps.map((capability) => ({ feature, capability })))
