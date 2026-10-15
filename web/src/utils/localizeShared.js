import { resources } from '@/lib/crm/resources'
import { GROUPS, SECTIONS } from '@/lib/crm/settings/registry'
import { PERMISSION_GROUPS, CAPABILITIES, EXTRA_LABELS, FEATURE_HINTS } from '@/lib/crm/permissionCatalog'
import { tr } from '@/utils/t'

// The definitions shared with the API (resource fields, settings, permissions) are written in English. Once the language is
// known they are translated in place (labels, headings, hints and option names; keys and values are untouched).
const TEXT_KEYS = new Set(['label', 'plural', 'section', 'title', 'desc', 'hint', 'ph', 'placeholder', 'description', 'text', 'help', 'singular'])
const seen = new WeakSet()

const walk = (v, key) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) {
        // [value, label] pairs
        if (v.length === 2 && typeof v[1] === 'string' && ['string', 'number'].includes(typeof v[0])) v[1] = tr(v[1])
        v.forEach((x) => walk(x, key))
        return
    }
    for (const k of Object.keys(v)) {
        if (typeof v[k] === 'string') { if (TEXT_KEYS.has(k)) v[k] = tr(v[k]) }
        else walk(v[k], k)
    }
}

export function localizeShared() {
    resources.forEach((r) => walk(r))
    walk(GROUPS); walk(SECTIONS); walk(PERMISSION_GROUPS); walk(CAPABILITIES)
    for (const o of [EXTRA_LABELS, FEATURE_HINTS]) for (const k of Object.keys(o)) o[k] = tr(o[k])
}
