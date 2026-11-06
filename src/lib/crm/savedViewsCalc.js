// The state a list page saves in a view. No database: tested on its own.
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
/** The state a page wrote, kept to plain JSON of a sane size. */
export function cleanState(state) {
    let json
    try { json = JSON.stringify(state ?? {}) } catch { throw fail('That view cannot be saved') }
    if (!state || typeof state !== 'object' || Array.isArray(state) || json.length > 4000) throw fail('That view is too big to save')
    return JSON.parse(json)
}

