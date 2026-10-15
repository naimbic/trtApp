import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbPlus, TbTrash, TbShieldCheck } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import cn from '@/utils/classNames'
import PermissionMatrix from './PermissionMatrix'

const notify = (type, msg) => toast.push(<Notification type={type}>{msg}</Notification>, { placement: 'top-center' })
const api = async (url, init) => {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
    return json
}
const count = (p) => Object.values(p).reduce((n, c) => n + c.length, 0)
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort())

const RolesPanel = () => {
    const [roles, setRoles] = useState([])
    const [selected, setSelected] = useState(null) // role id | 'new'
    const [draft, setDraft] = useState({ name: '', permissions: {} })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)

    const load = useCallback(async (keep) => {
        try {
            const list = await api('/api/crm/access/roles')
            setRoles(list)
            return list
        } catch (e) {
            setError(e.message)
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load().then((list) => list[0] && pick(list[0]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const pick = (r) => {
        setSelected(r.id)
        setDraft({ name: r.name, permissions: r.permissions })
        setError('')
    }
    const startNew = () => {
        setSelected('new')
        setDraft({ name: '', permissions: {} })
        setError('')
    }

    const current = roles.find((r) => r.id === selected)
    const dirty = useMemo(() => (selected === 'new' ? !!draft.name || count(draft.permissions) > 0 : current ? draft.name !== current.name || !same(draft.permissions, current.permissions) : false), [draft, current, selected])

    const save = async (applyToMembers = false) => {
        setSaving(true)
        setError('')
        try {
            let saved
            if (selected === 'new') {
                saved = await api('/api/crm/access/roles', { method: 'POST', body: JSON.stringify(draft) })
                notify('success', 'Role created')
            } else {
                saved = await api(`/api/crm/access/roles/${selected}`, { method: 'PATCH', body: JSON.stringify({ ...draft, applyToMembers }) })
                notify('success', applyToMembers ? `Role saved and applied to ${saved.applied} member${saved.applied === 1 ? '' : 's'}` : 'Role saved')
            }
            await load()
            pick(saved)
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        try {
            await api(`/api/crm/access/roles/${selected}`, { method: 'DELETE' })
            notify('success', 'Role deleted')
            const list = await load()
            list[0] ? pick(list[0]) : startNew()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setConfirmDelete(false)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                    {loading && <span className="px-2 py-2 text-sm text-gray-400">Loading…</span>}
                    {roles.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => pick(r)}
                            className={cn('flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors', selected === r.id ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white hover:border-primary/50 dark:border-gray-600 dark:bg-gray-800')}
                        >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 text-lg dark:bg-gray-700"><TbShieldCheck /></span>
                            <span className="min-w-0">
                                <span className="block truncate font-semibold">{r.name}</span>
                                <span className="block text-xs text-gray-500">{r.members} member{r.members === 1 ? '' : 's'} · {r.permissionCount} on</span>
                            </span>
                        </button>
                    ))}
                    {selected === 'new' && <span className="flex shrink-0 items-center rounded-2xl border border-dashed border-primary px-4 py-2.5 text-sm font-semibold text-primary">New role (unsaved)</span>}
                    {!loading && !roles.length && selected !== 'new' && <span className="px-2 py-2 text-sm text-gray-400">No roles yet</span>}
                </div>
                <Button variant="solid" icon={<TbPlus />} onClick={startNew}>New role</Button>
            </div>

            <Card className="min-w-0">
                {selected ? (
                    <>
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-700">
                            <div className="w-full sm:w-96">
                                <label className="mb-1.5 block text-sm font-semibold">Role name</label>
                                <Input placeholder="e.g. Sales manager" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                            </div>
                            <div className="flex gap-6 text-sm">
                                <div><div className="text-xs uppercase tracking-wide text-gray-400">Permissions on</div><div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count(draft.permissions)}</div></div>
                                <div><div className="text-xs uppercase tracking-wide text-gray-400">Members</div><div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selected === 'new' ? 0 : current?.members ?? 0}</div></div>
                            </div>
                        </div>
                        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                        <PermissionMatrix value={draft.permissions} onChange={(permissions) => setDraft({ ...draft, permissions })} />
                        <p className="mt-3 text-xs text-gray-500">
                            Roles are templates: a member gets the role&apos;s permissions when the role is assigned. Use &quot;Save &amp; apply to members&quot; to push changes to everyone who already has this role. Administrators always have full access.
                        </p>
                        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white/95 py-3 pl-5 pr-24 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
                            {selected !== 'new' && (
                                <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirmDelete(true)} disabled={saving}>Delete role</Button>
                            )}
                            <div className="ml-auto flex flex-wrap gap-2">
                                <Button disabled={!dirty || saving} onClick={() => (selected === 'new' ? startNew() : pick(current))}>Discard</Button>
                                {selected !== 'new' && current?.members > 0 && (
                                    <Button disabled={!dirty || saving} onClick={() => save(true)}>Save &amp; apply to {current.members} member{current.members === 1 ? '' : 's'}</Button>
                                )}
                                <Button variant="solid" loading={saving} disabled={!dirty} onClick={() => save(false)}>{selected === 'new' ? 'Create role' : 'Save role'}</Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-16 text-center text-gray-400">Select a role to edit its permissions</div>
                )}
            </Card>

            <ConfirmDialog
                isOpen={confirmDelete}
                type="danger"
                title="Delete role?"
                confirmText="Delete"
                onClose={() => setConfirmDelete(false)}
                onRequestClose={() => setConfirmDelete(false)}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={remove}
            >
                <p>The role &quot;{current?.name}&quot; will be removed. This is only possible when no member uses it.</p>
            </ConfirmDialog>
        </div>
    )
}

export default RolesPanel
