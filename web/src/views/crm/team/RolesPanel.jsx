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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[18rem_1fr]">
            <Card bodyClass="p-3">
                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                    <h6>Roles</h6>
                    <Button size="xs" variant="solid" icon={<TbPlus />} onClick={startNew}>New role</Button>
                </div>
                {loading && <div className="p-4 text-center text-gray-400">Loading…</div>}
                <ul className="flex flex-col gap-1">
                    {roles.map((r) => (
                        <li key={r.id}>
                            <button
                                type="button"
                                onClick={() => pick(r)}
                                className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', selected === r.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40')}
                            >
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-lg dark:bg-gray-700"><TbShieldCheck /></span>
                                <span className="min-w-0">
                                    <span className="block truncate font-semibold">{r.name}</span>
                                    <span className="block text-xs text-gray-500">{r.members} member{r.members === 1 ? '' : 's'} · {r.permissionCount} permissions</span>
                                </span>
                            </button>
                        </li>
                    ))}
                    {selected === 'new' && (
                        <li className="rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary">New role (unsaved)</li>
                    )}
                    {!loading && !roles.length && selected !== 'new' && <li className="p-4 text-center text-sm text-gray-400">No roles yet</li>}
                </ul>
            </Card>

            <Card>
                {selected ? (
                    <>
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div className="w-full sm:w-80">
                                <label className="mb-1.5 block text-sm font-semibold">Role name</label>
                                <Input placeholder="e.g. Sales manager" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                            </div>
                            <div className="text-sm text-gray-500">{count(draft.permissions)} permissions selected</div>
                        </div>
                        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                        <PermissionMatrix value={draft.permissions} onChange={(permissions) => setDraft({ ...draft, permissions })} />
                        <p className="mt-3 text-xs text-gray-500">
                            Roles are templates: a member gets the role&apos;s permissions when the role is assigned. Use &quot;Save &amp; apply to members&quot; to push changes to everyone who already has this role. Administrators always have full access.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
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
