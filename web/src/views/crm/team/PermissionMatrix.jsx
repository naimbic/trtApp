import { useMemo, useState } from 'react'
import { TbSearch, TbLock, TbCoin } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Button from '@/components/ui/Button'
import { CAPABILITIES, EXTRA_LABELS, FEATURE_HINTS, PERMISSION_GROUPS, cleanPermissions } from '@/lib/crm/permissionCatalog'
import { tr } from '@/utils/t'

const capLabel = (c) => CAPABILITIES.find(([k]) => k === c)?.[1] || EXTRA_LABELS[c] || c
const STD_CAPS = ['view', 'view_own', 'create', 'edit', 'delete']
const isStd = (c) => STD_CAPS.includes(c)
// features with at most one standard capability (Financial figures, Reports, My profile…) are listed as plain switches, not in the grid
const listOnly = (f) => f.caps.filter(isStd).length < 2 && !Object.keys(f.auto || {}).some(isStd)
const labelFor = (f, c) => (f.key === 'reports' && c === 'view' ? tr("Open Reports") : capLabel(c))
const GRID = 'grid grid-cols-[minmax(0,1fr)_repeat(5,3.75rem)] items-center gap-x-1 sm:grid-cols-[minmax(0,1fr)_repeat(5,4.5rem)]'
const READ_ONLY = (f) => f.caps.filter((c) => c === 'view' || c === 'view-timesheets')

/** One labelled switch. */
const Option = ({ label, checked, onChange, disabled, hint }) => (
    <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
        <Switcher checked={checked} disabled={disabled} onChange={(on) => onChange(on)} />
        <span>{label}</span>
        {hint && <Tooltip title={hint}><span className="cursor-help text-xs text-gray-400">{tr("auto")}</span></Tooltip>}
    </label>
)

/**
 * Permission editor. value = { feature: [capabilities] }. One card per group, one row per feature with a switch for
 * every capability (view and view own are mutually exclusive, a person with "view" never needs "view own").
 */
const PermissionMatrix = ({ value = {}, onChange, disabled, toolbarStart }) => {
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

    const slug = (t) => `perm-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const needle = q.trim().toLowerCase()
    const groups = useMemo(() => PERMISSION_GROUPS.map((g) => ({ ...g, features: g.features.filter((f) => !needle || f.label.toLowerCase().includes(needle) || g.group.toLowerCase().includes(needle)) })).filter((g) => g.features.length), [needle])
    const total = Object.values(value).reduce((n, c) => n + c.length, 0)

    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                {toolbarStart}
                <div className="w-full sm:w-56"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search a feature")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200">{total} {tr("on")}</Tag>
                {!disabled && (
                    <div className="ml-auto flex flex-wrap gap-2">
                        <Button size="xs" onClick={() => preset('read')}>{tr("Read only")}</Button>
                        <Button size="xs" onClick={() => preset('full')}>{tr("Everything")}</Button>
                        <Button size="xs" variant="plain" className="text-red-500" onClick={() => preset('none')}>{tr("Nothing")}</Button>
                    </div>
                )}
            </div>

            {groups.length > 1 && (
                <div className="sticky top-16 z-10 -mx-1 flex gap-1.5 overflow-x-auto bg-white/95 px-1 py-1.5 backdrop-blur dark:bg-gray-800/95">
                    {groups.map((g) => {
                        const n = g.features.reduce((acc, f) => acc + (value[f.key]?.length || 0), 0)
                        return (
                            <button key={g.group} type="button" onClick={() => document.getElementById(slug(g.group))?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300">
                                {g.group}<span className={`rounded-full px-1.5 text-xs ${n ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>{n}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            {groups.map((g) => {
                const allOn = g.features.every((f) => f.caps.filter((c) => c !== 'view_own').every((c) => has(f.key, c)))
                const on = g.features.reduce((n, f) => n + (value[f.key]?.length || 0), 0)
                const money = g.group === 'Money & reports'
                const std = g.features.some((f) => !listOnly(f))
                return (
                    <Card key={g.group} id={slug(g.group)} bodyClass="p-0" className={`scroll-mt-32 overflow-hidden ${money ? 'border-amber-200 dark:border-amber-500/30' : ''}`}>
                        <div className={`flex items-center justify-between gap-3 px-4 py-2 ${money ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">{money ? <TbCoin className="text-xl text-amber-500" /> : <TbLock className="text-xl text-gray-400" />}{g.group}<Tag className="ml-1 bg-white text-gray-600 dark:bg-gray-600 dark:text-gray-100">{on} {tr("on")}</Tag></div>
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span>{tr("Allow all")}</span><Switcher checked={allOn} disabled={disabled} onChange={(v) => setMany(g.features, v)} /></label>
                        </div>
                        {std && (
                            <div className={`${GRID} border-y border-gray-100 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700`}>
                                <span>{tr("Feature")}</span>
                                {STD_CAPS.map((c) => <span key={c} className="text-center">{capLabel(c)}</span>)}
                            </div>
                        )}
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {g.features.map((f) => {
                                const everything = f.caps.filter((c) => c !== 'view_own').every((c) => has(f.key, c))
                                const hint = FEATURE_HINTS[f.key]
                                const plain = listOnly(f)
                                const extras = plain ? f.caps : f.caps.filter((c) => !isStd(c))
                                return (
                                    <div key={f.key} className="px-4 py-2 transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-700/20">
                                        <div className={plain ? '' : GRID}>
                                            <div className="min-w-0">
                                                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    <Switcher checked={everything} disabled={disabled} onChange={(v) => setRow(f, v)} />
                                                    <span className="truncate">{f.label}</span>
                                                </label>
                                                {hint && <p className="ml-[3.25rem] text-[11px] leading-snug text-gray-500">{hint}</p>}
                                            </div>
                                            {!plain && STD_CAPS.map((c) => (
                                                <div key={c} className="flex justify-center">
                                                    {f.caps.includes(c) ? <Switcher checked={has(f.key, c)} disabled={disabled} onChange={(v) => set(f.key, c, v)} />
                                                        : f.auto?.[c] ? <Tooltip title={f.auto[c]}><span className="flex cursor-help items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-700"><TbLock />{tr("auto")}</span></Tooltip>
                                                            : <span className="text-gray-300">–</span>}
                                                </div>
                                            ))}
                                        </div>
                                        {extras.length > 0 && (
                                            <div className="ml-[3.25rem] mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-4">
                                                {extras.map((c) => <Option key={c} label={labelFor(f, c)} checked={has(f.key, c)} disabled={disabled} onChange={(v) => set(f.key, c, v)} />)}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                )
            })}
            {!groups.length && <div className="py-10 text-center text-gray-400">{tr("No feature matches “")}{q}”.</div>}
        </div>
    )
}

export default PermissionMatrix
