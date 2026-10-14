import { useMemo, useState } from 'react'
import { TbSearch, TbLock, TbCoin } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Button from '@/components/ui/Button'
import { CAPABILITIES, EXTRA_LABELS, FEATURE_HINTS, PERMISSION_GROUPS, cleanPermissions } from '@/lib/crm/permissionCatalog'

const capLabel = (c) => CAPABILITIES.find(([k]) => k === c)?.[1] || EXTRA_LABELS[c] || c
const READ_ONLY = (f) => f.caps.filter((c) => c === 'view' || c === 'view-timesheets')

/** One labelled switch. */
const Option = ({ label, checked, onChange, disabled, hint }) => (
    <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
        <Switcher checked={checked} disabled={disabled} onChange={(on) => onChange(on)} />
        <span>{label}</span>
        {hint && <Tooltip title={hint}><span className="cursor-help text-xs text-gray-400">auto</span></Tooltip>}
    </label>
)

/**
 * Permission editor. value = { feature: [capabilities] }. One card per group, one row per feature with a switch for
 * every capability (view and view own are mutually exclusive, a person with "view" never needs "view own").
 */
const PermissionMatrix = ({ value = {}, onChange, disabled }) => {
    const [q, setQ] = useState('')
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
    const setMany = (features, on) => {
        const next = { ...value }
        for (const f of features) { if (on) next[f.key] = f.caps.filter((c) => c !== 'view_own'); else delete next[f.key] }
        onChange(cleanPermissions(next))
    }
    const preset = (kind) => {
        const all = PERMISSION_GROUPS.flatMap((g) => g.features)
        const next = {}
        for (const f of all) {
            if (kind === 'full') next[f.key] = f.caps.filter((c) => c !== 'view_own')
            else if (kind === 'read') { const c = READ_ONLY(f); if (c.length) next[f.key] = c }
        }
        onChange(cleanPermissions(next))
    }

    const needle = q.trim().toLowerCase()
    const groups = useMemo(() => PERMISSION_GROUPS.map((g) => ({ ...g, features: g.features.filter((f) => !needle || f.label.toLowerCase().includes(needle) || g.group.toLowerCase().includes(needle)) })).filter((g) => g.features.length), [needle])
    const total = Object.values(value).reduce((n, c) => n + c.length, 0)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-72"><Input size="sm" prefix={<TbSearch />} placeholder="Search a feature" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <span className="text-sm text-gray-500">{total} permission{total === 1 ? '' : 's'} on</span>
                {!disabled && (
                    <div className="ml-auto flex flex-wrap gap-2">
                        <Button size="xs" onClick={() => preset('read')}>Read only</Button>
                        <Button size="xs" onClick={() => preset('full')}>Everything</Button>
                        <Button size="xs" variant="plain" className="text-red-500" onClick={() => preset('none')}>Nothing</Button>
                    </div>
                )}
            </div>

            {groups.map((g) => {
                const allOn = g.features.every((f) => f.caps.filter((c) => c !== 'view_own').every((c) => has(f.key, c)))
                const on = g.features.reduce((n, f) => n + (value[f.key]?.length || 0), 0)
                const money = g.group === 'Money & reports'
                return (
                    <Card key={g.group} bodyClass="p-0" className={money ? 'border-amber-200 dark:border-amber-500/30' : ''}>
                        <div className={`flex items-center justify-between gap-3 rounded-t-2xl px-5 py-3 ${money ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
                            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">{money ? <TbCoin className="text-xl text-amber-500" /> : <TbLock className="text-xl text-gray-400" />}{g.group}<Tag className="ml-1 bg-white text-gray-600 dark:bg-gray-600 dark:text-gray-100">{on}</Tag></div>
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span>Allow all</span><Switcher checked={allOn} disabled={disabled} onChange={(v) => setMany(g.features, v)} /></label>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {g.features.map((f) => {
                                const everything = f.caps.filter((c) => c !== 'view_own').every((c) => has(f.key, c))
                                const hint = FEATURE_HINTS[f.key]
                                return (
                                    <div key={f.key} className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[14rem_1fr] lg:items-center">
                                        <div>
                                            <label className="flex items-center gap-2.5 font-semibold text-gray-900 dark:text-gray-100">
                                                <Switcher checked={everything} disabled={disabled} onChange={(v) => setRow(f, v)} />
                                                {f.label}
                                            </label>
                                            {hint && <p className="ml-12 mt-1 text-xs text-gray-500">{hint}</p>}
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2.5 lg:pl-0">
                                            {f.caps.map((c) => <Option key={c} label={capLabel(c)} checked={has(f.key, c)} disabled={disabled} onChange={(v) => set(f.key, c, v)} />)}
                                            {Object.entries(f.auto || {}).filter(([c]) => !f.caps.includes(c) && CAPABILITIES.some(([k]) => k === c)).map(([c, why]) => (
                                                <Tooltip key={c} title={why}><span className="flex cursor-help items-center gap-1.5 text-sm text-gray-400"><Switcher checked disabled />{capLabel(c)} · automatic</span></Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                )
            })}
            {!groups.length && <div className="py-10 text-center text-gray-400">No feature matches “{q}”.</div>}
        </div>
    )
}

export default PermissionMatrix
