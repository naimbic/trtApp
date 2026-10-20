// Task statuses: the five codes are fixed (they are stored on every task), but each one can be renamed and recoloured.
export const TASK_STATUS_ORDER = [1, 4, 3, 2, 5] // the order of the board columns
export const TASK_STATUS_DEFAULTS = {
    1: { name: 'Not started', color: '#9ca3af' },
    4: { name: 'In progress', color: '#3b82f6' },
    3: { name: 'Testing', color: '#8b5cf6' },
    2: { name: 'Awaiting feedback', color: '#f59e0b' },
    5: { name: 'Complete', color: '#10b981' },
}
const HEX = /^#[0-9a-fA-F]{6}$/

/** The saved settings (a JSON text or an object) filled with the defaults: [{ value, name, color, custom }] in board order. */
export function mergeTaskStatuses(stored) {
    let s = stored
    if (typeof s === 'string') { try { s = JSON.parse(s) } catch { s = {} } }
    if (!s || typeof s !== 'object') s = {}
    return TASK_STATUS_ORDER.map((value) => {
        const d = TASK_STATUS_DEFAULTS[value]
        const name = typeof s[value]?.name === 'string' && s[value].name.trim() ? s[value].name.trim().slice(0, 40) : d.name
        const color = HEX.test(s[value]?.color || '') ? s[value].color.toLowerCase() : d.color
        return { value, name, color, custom: name !== d.name || color !== d.color }
    })
}

/** What the settings screen sends -> what is stored (a checked object). Throws a message the person can read. */
export function cleanTaskStatuses(body) {
    const out = {}
    for (const value of TASK_STATUS_ORDER) {
        const row = body?.[value] ?? (Array.isArray(body) ? body.find((x) => +x.value === value) : null)
        const d = TASK_STATUS_DEFAULTS[value]
        const name = String(row?.name ?? d.name).trim().slice(0, 40) || d.name
        const color = String(row?.color ?? d.color).trim()
        if (!HEX.test(color)) throw Object.assign(new Error('A status colour must look like #3b82f6'), { status: 400 })
        out[value] = { name, color: color.toLowerCase() }
    }
    const names = Object.values(out).map((x) => x.name.toLowerCase())
    if (new Set(names).size !== names.length) throw Object.assign(new Error('Two statuses cannot have the same name'), { status: 400 })
    return out
}
