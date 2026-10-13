import Checkbox from '@/components/ui/Checkbox'
import { CAPABILITIES, EXTRA_LABELS, PERMISSION_GROUPS, cleanPermissions } from '@/lib/crm/permissionCatalog'

/** Features × capabilities grid. value = { feature: [capabilities] }; view and view own are mutually exclusive. */
const PermissionMatrix = ({ value = {}, onChange, disabled }) => {
    const has = (f, c) => (value[f] || []).includes(c)

    const set = (feature, cap, on) => {
        const list = new Set(value[feature] || [])
        if (on) {
            list.add(cap)
            if (cap === 'view') list.delete('view_own')
            if (cap === 'view_own') list.delete('view')
        } else list.delete(cap)
        const next = { ...value, [feature]: [...list] }
        if (!next[feature].length) delete next[feature]
        onChange(cleanPermissions(next))
    }

    const setRow = (f, on) => {
        const next = { ...value }
        if (on) next[f.key] = f.caps.filter((c) => c !== 'view_own')
        else delete next[f.key]
        onChange(cleanPermissions(next))
    }

    const setColumn = (cap, on) => {
        let next = { ...value }
        for (const g of PERMISSION_GROUPS) {
            for (const f of g.features) {
                if (!f.caps.includes(cap)) continue
                const list = new Set(next[f.key] || [])
                if (on) {
                    list.add(cap)
                    if (cap === 'view') list.delete('view_own')
                    if (cap === 'view_own') list.delete('view')
                } else list.delete(cap)
                if (list.size) next[f.key] = [...list]
                else delete next[f.key]
            }
        }
        onChange(cleanPermissions(next))
    }

    const colAll = (cap) => PERMISSION_GROUPS.flatMap((g) => g.features).filter((f) => f.caps.includes(cap)).every((f) => has(f.key, cap))

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-600">
            <table className="w-full min-w-[640px] text-sm">
                <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-700/50">
                        <th className="px-4 py-3 font-medium">Feature</th>
                        {CAPABILITIES.map(([cap, label]) => (
                            <th key={cap} className="w-24 px-2 py-3 text-center font-medium">
                                <label className="flex flex-col items-center gap-1.5">
                                    <span>{label}</span>
                                    <Checkbox disabled={disabled} checked={colAll(cap)} onChange={(c) => setColumn(cap, c)} />
                                </label>
                            </th>
                        ))}
                        <th className="px-3 py-3 font-medium">Other</th>
                    </tr>
                </thead>
                <tbody>
                    {PERMISSION_GROUPS.map((g) => (
                        <FragmentGroup key={g.group} title={g.group}>
                            {g.features.map((f) => {
                                const all = f.caps.filter((c) => c !== 'view_own').every((c) => has(f.key, c))
                                const extras = f.caps.filter((c) => !CAPABILITIES.some(([k]) => k === c))
                                return (
                                    <tr key={f.key} className="border-t border-gray-100 hover:bg-gray-50/60 dark:border-gray-700 dark:hover:bg-gray-700/30">
                                        <td className="px-4 py-2.5">
                                            <label className="flex items-center gap-2.5 font-medium">
                                                <Checkbox disabled={disabled} checked={all} onChange={(c) => setRow(f, c)} />
                                                {f.label}
                                            </label>
                                        </td>
                                        {CAPABILITIES.map(([cap]) => (
                                            <td key={cap} className="px-2 py-2.5 text-center">
                                                {f.caps.includes(cap) ? (
                                                    <Checkbox disabled={disabled} checked={has(f.key, cap)} onChange={(c) => set(f.key, cap, c)} />
                                                ) : (
                                                    <span className="text-gray-300">–</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2.5">
                                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                {extras.map((c) => (
                                                    <label key={c} className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                                                        <Checkbox disabled={disabled} checked={has(f.key, c)} onChange={(on) => set(f.key, c, on)} />
                                                        {EXTRA_LABELS[c] || c}
                                                    </label>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </FragmentGroup>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const FragmentGroup = ({ title, children }) => (
    <>
        <tr className="bg-gray-50/70 dark:bg-gray-700/30">
            <td colSpan={7} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</td>
        </tr>
        {children}
    </>
)

export default PermissionMatrix
