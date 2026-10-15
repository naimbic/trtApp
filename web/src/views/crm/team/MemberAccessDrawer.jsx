import { useEffect, useState } from 'react'
import { TbShieldLock, TbRestore } from 'react-icons/tb'
import Drawer from '@/components/ui/Drawer'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import PermissionMatrix from './PermissionMatrix'
import { tr } from '@/utils/t'

const notify = (type, msg) => toast.push(<Notification type={type}>{msg}</Notification>, { placement: 'top-center' })
const count = (p) => Object.values(p || {}).reduce((n, c) => n + c.length, 0)

/** Per-member permission overrides. props: open, memberId, onClose, onSaved */
const MemberAccessDrawer = ({ open, memberId, onClose, onSaved }) => {
    const [info, setInfo] = useState(null)
    const [perms, setPerms] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open || !memberId) return
        setInfo(null)
        setError('')
        fetch(`/api/crm/access/staff/${memberId}`, { credentials: 'include' })
            .then(async (r) => ({ ok: r.ok, json: await r.json() }))
            .then(({ ok, json }) => {
                if (!ok) throw new Error(json.error || tr("Could not load permissions"))
                setInfo(json)
                setPerms(json.permissions)
            })
            .catch((e) => setError(e.message))
    }, [open, memberId])

    const save = async () => {
        setSaving(true)
        setError('')
        try {
            const res = await fetch(`/api/crm/access/staff/${memberId}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: perms }) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || tr("Save failed"))
            notify('success', tr("Permissions saved"))
            onSaved?.()
            onClose()
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Drawer
            title={info ? tr("Permissions · {name}", { name: info.name }) : tr("Permissions")}
            isOpen={open}
            onClose={onClose}
            onRequestClose={onClose}
            width={820}
            footer={
                <div className="flex w-full items-center gap-2">
                    {info?.role && (
                        <Button variant="plain" icon={<TbRestore />} disabled={info.admin} onClick={() => setPerms(info.role.permissions)}>{tr("Reset to “")}{info.role.name}{tr("” defaults")}</Button>
                    )}
                    <div className="ml-auto flex gap-2">
                        <Button onClick={onClose}>{tr("Cancel")}</Button>
                        <Button variant="solid" loading={saving} disabled={!info || info.admin} onClick={save}>{tr("Save permissions")}</Button>
                    </div>
                </div>
            }
        >
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            {!info && !error && <div className="py-16 text-center text-gray-400">{tr("Loading…")}</div>}
            {info?.admin && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700 dark:bg-purple-500/10">
                    <TbShieldLock className="mt-0.5 text-lg shrink-0" />
                    {tr("A Super Admin has full access and cannot be edited. To restrict this person, turn off Super Admin in their profile first; they become an Admin whose permissions you can change.")}
                </div>
            )}
            {info && (
                <>
                    <p className="mb-3 text-sm text-gray-500">{count(perms)} {tr("permissions ·")} {info.role ? tr("role: {name}", { name: info.role.name }) : tr("no role")}{tr(". Changes apply the next time")} {info.name} {tr("signs in.")}</p>
                    <PermissionMatrix value={perms} onChange={setPerms} disabled={info.admin} />
                </>
            )}
        </Drawer>
    )
}

export default MemberAccessDrawer
