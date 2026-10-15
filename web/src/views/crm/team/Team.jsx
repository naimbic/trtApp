import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatTile } from '@/components/crm/ListHeader'
import { TbUsers, TbCircleCheck, TbCircleOff, TbLogin } from 'react-icons/tb'
import dayjs from 'dayjs'
import { useLocation } from 'react-router'
import { TbPlus, TbSearch, TbPencil, TbKey, TbCopy, TbShieldLock, TbLink, TbLogout, TbDeviceMobileOff } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useSessionUser } from '@/store/authStore'
import MemberDrawer from './MemberDrawer'
import MemberAccessDrawer from './MemberAccessDrawer'
import RolesPanel from './RolesPanel'
import { usePageTabs } from '@/store/pageTabsStore'

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
    const [status, setStatus] = useState('active')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: false, member: null })
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const location = useLocation()
    const [tab, setTab] = useState(location.pathname.endsWith('/roles') ? 'roles' : 'members')
    usePageTabs([{ key: 'members', label: 'Members' }, { key: 'roles', label: 'Roles & permissions' }], tab, setTab)
    const [access, setAccess] = useState({ open: false, id: null })
    const [confirm, setConfirm] = useState(null) // { member, kind: 'reset' }
    const [secret, setSecret] = useState(null) // { name, email, password } or { name, email, link, invite }

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
                else if (res.inviteLink) setSecret({ name: res.member.name, email: res.member.email, link: res.inviteLink, invite: true, emailed: res.emailed })
            }
            setDrawer({ open: false, member: null })
            load()
        } catch (e) {
            setFormError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (member, checked) => {
        // optimistic: flip immediately, roll back if the server refuses (e.g. your own account, last admin)
        setData((d) => ({ ...d, members: d.members.map((m) => (m.id === member.id ? { ...m, active: checked } : m)) }))
        try {
            await api(`/api/crm/team/${member.id}`, { method: 'PATCH', body: JSON.stringify({ active: checked }) })
            notify('success', checked ? `${member.name} activated` : `${member.name} deactivated`)
            load()
        } catch (e) {
            setData((d) => ({ ...d, members: d.members.map((m) => (m.id === member.id ? { ...m, active: member.active } : m)) }))
            notify('danger', e.message)
        }
    }

    const runConfirm = async () => {
        const { member, kind } = confirm
        try {
            if (kind === 'link') {
                const res = await api(`/api/crm/team/${member.id}/reset-link`, { method: 'POST', body: JSON.stringify({ purpose: 'reset' }) })
                setSecret({ name: member.name, email: member.email, link: res.link, emailed: res.emailed })
            } else if (kind === 'signout') {
                await api(`/api/crm/team/${member.id}/sign-out`, { method: 'POST' })
                notify('success', `${member.name} was signed out on every device`)
            } else if (kind === 'twofactor') {
                await api(`/api/crm/team/${member.id}/two-factor`, { method: 'DELETE' })
                notify('success', `Two-step verification removed for ${member.name}`)
            } else if (kind === 'reset') {
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
                    <h3>{tab === 'roles' ? 'Roles & permissions' : 'Team'}</h3>
                    <p className="text-sm text-gray-500">{tab === 'roles' ? 'Choose what each role can see and do. Members get the permissions of their role.' : 'Manage members, departments and sign-in access'}</p>
                </div>
                {tab === 'members' && <Button variant="solid" icon={<TbPlus />} onClick={openNew}>Add member</Button>}
            </div>

            {tab === 'roles' ? (
                <RolesPanel />
            ) : (
                <>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatTile title="Team members" className="bg-sky-100" value={s.total ?? '–'} icon={<TbUsers />} />
                <StatTile title="Active" className="bg-emerald-100" value={s.active ?? '–'} icon={<TbCircleCheck />} />
                <StatTile title="Inactive" className="bg-amber-100" value={s.inactive ?? '–'} sub="Cannot sign in" icon={<TbCircleOff />} />
                <StatTile title="Super Admins" className="bg-purple-100" value={s.admins ?? '–'} icon={<TbShieldLock />} />
                <StatTile title="With login" className="bg-pink-100" value={s.withLogin ?? '–'} sub="Can sign in" icon={<TbLogin />} />
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
                                            <Avatar shape="circle" size={36} {...(m.image ? { src: m.image } : {})}>{m.image ? null : initials(m)}</Avatar>
                                            <div className="min-w-0">
                                                <div className="font-semibold heading-text">{m.name}</div>
                                                <div className="truncate text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {m.admin && <Tag className="bg-purple-100 text-purple-700">Super Admin</Tag>}
                                            {m.role ? <Tag>{m.role.name}</Tag> : !m.admin && <span className="text-gray-400">—</span>}
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.departments.length ? m.departments.map((d) => <Tag key={d.id}>{d.name}</Tag>) : <span className="text-gray-400">—</span>}
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-2.5">
                                            <Switcher checked={m.active} onChange={(checked) => toggleActive(m, checked)} />
                                            <span className={m.active ? 'text-emerald-600' : 'text-gray-400'}>{m.active ? 'Active' : 'Inactive'}</span>
                                            {!m.hasLogin && <Tooltip title="No login account yet"><Tag className="bg-amber-100 text-amber-700">No login</Tag></Tooltip>}
                                        </div>
                                    </Td>
                                    <Td className="whitespace-nowrap text-gray-500">{m.lastLogin ? dayjs(m.lastLogin).format('MMM D, YYYY HH:mm') : 'Never'}</Td>
                                    <Td>
                                        <div className="flex items-center justify-end gap-1">
                                            <Tooltip title="Edit"><Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => openEdit(m)} /></Tooltip>
                                            <Tooltip title="Permissions"><Button size="sm" variant="plain" icon={<TbShieldLock />} onClick={() => setAccess({ open: true, id: m.id })} /></Tooltip>
                                            {m.hasLogin && <Tooltip title="Reset link (member sets own password)"><Button size="sm" variant="plain" icon={<TbLink />} onClick={() => setConfirm({ member: m, kind: 'link' })} /></Tooltip>}
                                            {m.hasLogin && <Tooltip title="One-time password"><Button size="sm" variant="plain" icon={<TbKey />} onClick={() => setConfirm({ member: m, kind: 'reset' })} /></Tooltip>}
                                            {m.hasLogin && m.twoFactor && canAdmin && <Tooltip title="Reset two-step verification"><Button size="sm" variant="plain" icon={<TbDeviceMobileOff />} onClick={() => setConfirm({ member: m, kind: 'twofactor' })} /></Tooltip>}
                                            {m.hasLogin && <Tooltip title="Sign out everywhere"><Button size="sm" variant="plain" icon={<TbLogout />} onClick={() => setConfirm({ member: m, kind: 'signout' })} /></Tooltip>}
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

                </>
            )}

            <MemberAccessDrawer open={access.open} memberId={access.id} onClose={() => setAccess({ open: false, id: null })} onSaved={load} />
            <MemberDrawer open={drawer.open} member={drawer.member} lookups={lookups} canAdmin={canAdmin} saving={saving} error={formError} onSubmit={submit} onClose={() => setDrawer({ open: false, member: null })} />

            <ConfirmDialog
                isOpen={!!confirm}
                type="warning"
                title={confirm?.kind === 'link' ? 'Create a reset link?' : confirm?.kind === 'signout' ? 'Sign out everywhere?' : confirm?.kind === 'twofactor' ? 'Reset two-step verification?' : 'Generate a one-time password?'}
                confirmText={confirm?.kind === 'link' ? 'Create link' : confirm?.kind === 'signout' ? 'Sign out' : confirm?.kind === 'twofactor' ? 'Reset' : 'Generate password'}
                onClose={() => setConfirm(null)}
                onRequestClose={() => setConfirm(null)}
                onCancel={() => setConfirm(null)}
                onConfirm={runConfirm}
            >
                <p>
                    {confirm?.kind === 'link'
                        ? `A one-time link (valid for 1 hour) will be created so ${confirm?.member.name} can choose a new password. Their current password keeps working until they use it. It is emailed when mail is configured, and shown here either way.`
                        : confirm?.kind === 'twofactor'
                          ? `${confirm?.member.name} will no longer be asked for a code when signing in (use this if they lost their phone). They can set it up again from their profile.`
                          : confirm?.kind === 'signout'
                          ? `${confirm?.member.name} will be signed out on every device and must sign in again.`
                          : `A new one-time password will be generated for ${confirm?.member.name}. Their current password stops working immediately.`}
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!secret} onClose={() => setSecret(null)} onRequestClose={() => setSecret(null)}>
                <h5 className="mb-2">{secret?.link ? (secret.invite ? 'Invite link' : 'Reset link') : 'One-time password'}</h5>
                <p className="mb-4 text-sm text-gray-500">
                    {secret?.link
                        ? `Send this link to ${secret?.name}${secret?.emailed ? ' (it was also emailed)' : ''}. It works once and expires (${secret?.invite ? '7 days' : '1 hour'}).`
                        : `Share these sign-in details with ${secret?.name}. The password is shown only once — it cannot be retrieved later.`}
                </p>
                <div className="flex flex-col gap-3">
                    <div><div className="mb-1 text-xs text-gray-500">Email</div><div className="font-semibold">{secret?.email}</div></div>
                    <div>
                        <div className="mb-1 text-xs text-gray-500">{secret?.link ? 'Link' : 'Password'}</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 break-all rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs dark:bg-gray-700">{secret?.link || secret?.password}</code>
                            <Button size="sm" icon={<TbCopy />} onClick={() => copy(secret.link || secret.password)}>Copy</Button>
                        </div>
                    </div>
                </div>
                <div className="mt-6 text-right"><Button variant="solid" onClick={() => setSecret(null)}>Done</Button></div>
            </Dialog>
        </Container>
    )
}

export default Team
