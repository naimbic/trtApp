import { tr } from '@/utils/t'

/** How a contract type is written: its code first when it has one ("SEO-PERF · SEO Performance"). */
export const typeLabel = (t) => (t?.code ? `${t.code} · ${t.name}` : t?.name || '')

/** The categories in the order of their tree: each broad one, then the ones under it. */
export const treeOf = (categories = []) => categories.filter((c) => !c.parentId).flatMap((b) => [b, ...categories.filter((c) => c.parentId === b.id)])

/**
 * The contract types for a picker, grouped by category when there are categories (the types without one come last).
 *   types: stats.types of the contracts list · keepId: a type shown even when it is switched off (the one already chosen)
 * Returns { options (for Select), flat (to find the chosen one) }.
 */
export function typeOptions(types = [], categories = [], keepId = null) {
    const flat = types.filter((t) => t.active !== false || t.id === keepId).map((t) => ({ value: t.id, label: typeLabel(t), categoryId: t.categoryId || null }))
    if (!categories.length || !flat.some((o) => o.categoryId)) return { options: flat, flat }
    const groups = treeOf(categories).map((c) => ({ label: c.path || c.name, options: flat.filter((o) => o.categoryId === c.id) })).filter((g) => g.options.length)
    const rest = flat.filter((o) => !o.categoryId)
    return { options: [...groups, ...(rest.length ? [{ label: tr('No category'), options: rest }] : [])], flat }
}
