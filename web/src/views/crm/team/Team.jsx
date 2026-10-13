import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbPlus, TbSearch, TbPencil, TbKey, TbUserOff, TbUserCheck, TbCopy } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useSessionUser } from '@/store/authStore'
import MemberDrawer from './MemberDrawer'

const { Tr, Th, Td, THead, TBody } = Table
const notify = (type, msg) => toast.push(<Notification type={type}>{msg}</Notification>, { placement: 'top-center' })

const api = async (url, init) => {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
    return json
}

const Stat = ({ label, value, sub }) => (
    <Card bodyClass="p-4">
        <div className="text-sm text-gray-500">{label}</div>
        <h3 className="mt-1">{value}</h3>
        {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </Card>
)

const initials = (m) => `${m.firstName?.[0] || ''}${m.lastName?.[0] || m.email?.[0] || ''}`.toUpperCase()

const Team = () => {
    const authority = useSessionUser((s) => s.user.authority) || []
    const canAdmin = authority.includes('admin') || authority.includes('crm.admin')
    const [data, setData] = useState({ members: [], stats: {} })
    const [lookups, setLookups] = useState({ roles: [], departments: [] })
    const [status, setStatus] = useState('all')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: false, member: null })
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [confirm, setConfirm] = useState(null) // { member, kind: 'active'|'reset' }
    const [secret, setSecret] = useState(null) // { name, email, password }

    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const qs = new URLSearchParams({ status, ...(query ? { search: query } : {}) })
            setData(await api(`/api/crm/team?${qs}`))
            setError('')
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [status, query])
    useEffect(() => { load() }, [load])
    useEffect(() => { api('/api/crm/team/lookups').then(setLookups).catch(() => {}) }, [])

    const openNew = () => { setFormError(''); setDrawer({ open: true, member: null }) }
    const openEdit = (member) => { setFormError(''); setDrawer({ open: true, member }) }

    const submit = async (v) => {
        setSaving(true)
        setFormError('')
        try {
            const body = { ...v, hourlyRate: v.hourlyRate === '' ? 0 : Number(v.hourlyRate) }
            if (drawer.member) {
                await api(`/api/crm/team/${drawer.member.id}`, { method: 'PATCH', body: JSON.stringify(body) })
                notify('success', 'Member updated')
            } else {
                if (!body.password) delete body.password
                const res = await api('/api/crm/team', { method: 'POST', body: JSON.stringify(body) })
                notify('success', 'Member created')
                if (res.tempPassword) setSecret({ name: res.member.name, email: res.member.email, password: res.tempPassword })
            }
            setDrawer({ open: false, member: null })
            load()
        } catch (e) {
            setFormError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const runConfirm = async () => {
        const { member, kind } = confirm
        try {
            if (kind === 'active') {
                await api(`/api/crm/team/${member.id}`, { method: 'PATCH', body: JSON.stringify({ active: !member.active }) })
                notify('success', member.active ? `${member.name} deactivated` : `${member.name} activated`)
            } else {
                const res = await api(`/api/crm/team/${member.id}/reset-password`, { method: 'POST' })
                setSecret({ name: member.name, email: member.email, password: res.tempPassword })
            }
            load()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setConfirm(null)
        }
    }

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            notify('success', 'Copied')
        } catch {
            notify('warning', 'Copy failed — select and copy manually')
        }
    }

    const s = data.stats
    const rows = data.members
    const empty = useMemo(() => !loading && !rows.length, [loading, rows])

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>Team</h3>
                    <p className="text-sm text-gray-500">Manage members, roles, departments and sign-in access</p>
                </div>
                <Button variant="solid" icon={<TbPlus />} onClick={openNew}>Add member</Button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Stat label="Team members" value={s.total ?? '–'} />
                <Stat label="Active" value={s.active ?? '–'} />
                <Stat label="Inactive" value={s.inactive ?? '–'} sub="Cannot sign in" />
                <Stat label="Administrators" value={s.admins ?? '–'} />
                <Stat label="With login" value={s.withLogin ?? '–'} sub="Can sign in" />
            </div>

            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <Segment size="sm" value={status} onChange={(v) => v && setStatus(v)}>
                        <Segment.Item value="all">All</Segment.Item>
                        <Segment.Item value="active">Active</Segment.Item>
                        <Segment.Item value="inactive">Inactive</Segment.Item>
                    </Segment>
                    <div className="w-full sm:w-72">
                        <Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}

                <div className="overflow-x-auto">
                    <Table>
                        <THead>
                            <Tr>
                                <Th>Member</Th>
                                <Th>Role</Th>
                                <Th>Departments</Th>
                                <Th>Status</Th>
                                <Th>Last login</Th>
                                <Th className="text-right">Actions</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {rows.map((m) => (
                                <Tr key={m.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <Avatar shape="circle" size={36}>{initials(m)}</Avatar>
                                            <div className="min-w-0">
                                                <div className="font-semibold heading-text">{m.name}</div>
                                                <div className="truncate text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {m.admin && <Tag className="bg-purple-100 text-purple-700">Administrator</Tag>}
                                            {m.role ? <Tag>{m.role.name}</Tag> : !m.admin && <span className="text-gray-400">—</span>}
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.departments.length ? m.departments.map((d) => <Tag key={d.id}>{d.name}</Tag>) : <span className="text-gray-400">—</span>}
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-1.5">
                                            <Tag className={m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{m.active ? 'Active' : 'Inactive'}</Tag>
                                            {!m.hasLogin && <Tooltip title="No login account yet"><Tag className="bg-amber-100 text-amber-700">No login</Tag></Tooltip>}
                                        </div>
                                    </Td>
                                    <Td className="whitespace-nowrap text-gray-500">{m.lastLogin ? dayjs(m.lastLogin).format('MMM D, YYYY HH:mm') : 'Never'}</Td>
                                    <Td>
                                        <div className="flex items-center justify-end gap-1">
                                            <Tooltip title="Edit"><Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => openEdit(m)} /></Tooltip>
                                            {m.hasLogin && <Tooltip title="Reset password"><Button size="sm" variant="plain" icon={<TbKey />} onClick={() => setConfirm({ member: m, kind: 'reset' })} /></Tooltip>}
                                            <Tooltip title={m.active ? 'Deactivate' : 'Activate'}>
                                                <Button size="sm" variant="plain" icon={m.active ? <TbUserOff /> : <TbUserCheck />} onClick={() => setConfirm({ member: m, kind: 'active' })} />
                                            </Tooltip>
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !rows.length && <div className="py-10 text-center text-gray-400">Loading…</div>}
                    {empty && <div className="py-10 text-center text-gray-400">No team members found</div>}
                </div>
            </AdaptiveCard>

            <MemberDrawer open={drawer.open} member={drawer.member} lookups={lookups} canAdmin={canAdmin} saving={saving} error={formError} onSubmit={submit} onClose={() => setDrawer({ open: false, member: null })} />

            <ConfirmDialog
                isOpen={!!confirm}
                type={confirm?.kind === 'active' && confirm.member.active ? 'danger' : 'warning'}
                title={confirm?.kind === 'reset' ? 'Reset password?' : confirm?.member.active ? 'Deactivate member?' : 'Activate member?'}
                confirmText={confirm?.kind === 'reset' ? 'Reset password' : confirm?.member.active ? 'Deactivate' : 'Activate'}
                onClose={() => setConfirm(null)}
                onRequestClose={() => setConfirm(null)}
                onCancel={() => setConfirm(null)}
                onConfirm={runConfirm}
            >
                <p>
                    {confirm?.kind === 'reset'
                        ? `A new one-time password will be generated for ${confirm?.member.name}. Their current password stops working immediately.`
                        : confirm?.member.active
                          ? `${confirm?.member.name} will no longer be able to sign in. Their data is kept.`
                          : `${confirm?.member.name} will be able to sign in again.`}
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!secret} onClose={() => setSecret(null)} onRequestClose={() => setSecret(null)}>
                <h5 className="mb-2">One-time password</h5>
                <p className="mb-4 text-sm text-gray-500">Share these sign-in details with {secret?.name}. The password is shown only once — it cannot be retrieved later.</p>
                <div className="flex flex-col gap-3">
                    <div><div className="mb-1 text-xs text-gray-500">Email</div><div className="font-semibold">{secret?.email}</div></div>
                    <div>
                        <div className="mb-1 text-xs text-gray-500">Password</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm dark:bg-gray-700">{secret?.password}</code>
                            <Button size="sm" icon={<TbCopy />} onClick={() => copy(secret.password)}>Copy</Button>
                        </div>
                    </div>
                </div>
                <div className="mt-6 text-right"><Button variant="solid" onClick={() => setSecret(null)}>Done</Button></div>
            </Dialog>
        </Container>
    )
}

export default Team
