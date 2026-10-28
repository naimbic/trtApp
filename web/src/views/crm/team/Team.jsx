import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatTile } from '@/components/crm/ListHeader'
import { TbUsers, TbCircleCheck, TbCircleOff, TbLogin } from 'react-icons/tb'
import dayjs from 'dayjs'
import { Link, useLocation, useNavigate } from 'react-router'
import { TbUserShare, TbPlus, TbSearch, TbPencil, TbHistory, TbKey, TbLockPassword, TbShieldLock, TbLink, TbLogout, TbDeviceMobileOff } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import ScoreRing from '@/components/crm/ScoreRing'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Dropdown from '@/components/ui/Dropdown'
import EllipsisButton from '@/components/shared/EllipsisButton'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import { useSessionUser } from '@/store/authStore'
import MemberDrawer from './MemberDrawer'
import { useMemberActions, api, notify } from './MemberActions'
import { loginAs } from '@/components/crm/LoginAsBanner'
import MemberAccessDrawer from './MemberAccessDrawer'
import RolesPanel from './RolesPanel'
import { usePageTabs } from '@/store/pageTabsStore'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table

const Stat = ({ label, value, sub }) => (
    <Card bodyClass="p-4">
        <div className="text-sm text-gray-500">{label}</div>
        <h3 className="mt-1">{value}</h3>
        {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </Card>
)

const initials = (m) => `${m.firstName?.[0] || ''}${m.lastName?.[0] || m.email?.[0] || ''}`.toUpperCase()

const Team = () => {
    const navigate = useNavigate()
    const authority = useSessionUser((s) => s.user.authority) || []
    const canAdmin = authority.includes('admin') || authority.includes('crm.admin')
    const canLoginAs = canAdmin || authority.includes('crm.staff.login_as')
    const canActivity = canAdmin || authority.includes('crm.activity_log.view')
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
    usePageTabs([{ key: 'members', label: tr("Members") }, { key: 'roles', label: tr("Roles & permissions") }], tab, setTab)
    const [access, setAccess] = useState({ open: false, id: null })

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
            const body = { ...v }
            if (drawer.member) {
                await api(`/api/crm/team/${drawer.member.id}`, { method: 'PATCH', body: JSON.stringify(body) })
                notify('success', tr("Member updated"))
            } else {
                if (!body.password) delete body.password
                const res = await api('/api/crm/team', { method: 'POST', body: JSON.stringify(body) })
                notify('success', tr("Member created"))
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
            notify('success', checked ? tr("{name} activated", { name: member.name }) : tr("{name} deactivated", { name: member.name }))
            load()
        } catch (e) {
            setData((d) => ({ ...d, members: d.members.map((m) => (m.id === member.id ? { ...m, active: member.active } : m)) }))
            notify('danger', e.message)
        }
    }

    const { setConfirm, setSetPw, setSecret, dialogs } = useMemberActions({ reload: load })

    const roleOptions = useMemo(() => lookups.roles.filter((r) => !/^super admin$/i.test(r.name)).map((r) => ({ value: r.id, label: r.name })), [lookups.roles])
    // quick assign: picking a role in the table gives the member that role's permissions right away
    const changeRole = async (member, option) => {
        const roleId = option?.value || null
        try {
            await api(`/api/crm/team/${member.id}`, { method: 'PATCH', body: JSON.stringify({ roleId, applyRolePermissions: true }) })
            notify('success', roleId ? tr("{name} is now {label}", { name: member.name, label: option.label }) : tr("{name} has no role", { name: member.name }))
            load()
        } catch (e) {
            notify('danger', e.message)
        }
    }

    const s = data.stats
    const rows = data.members
    const empty = useMemo(() => !loading && !rows.length, [loading, rows])

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>{tab === 'roles' ? tr("Roles & permissions") : tr("Team")}</h3>
                    <p className="text-sm text-gray-500">{tab === 'roles' ? tr("Choose what each role can see and do. Members get the permissions of their role.") : tr("Manage members, departments and sign-in access")}</p>
                </div>
                {tab === 'members' && <Button variant="solid" icon={<TbPlus />} onClick={openNew}>{tr("Add member")}</Button>}
            </div>

            {tab === 'roles' ? (
                <RolesPanel />
            ) : (
                <>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatTile title={tr("Team members")} className="bg-sky-100" value={s.total ?? '–'} icon={<TbUsers />} />
                <StatTile title={tr("Active")} className="bg-emerald-100" value={s.active ?? '–'} icon={<TbCircleCheck />} />
                <StatTile title={tr("Inactive")} className="bg-amber-100" value={s.inactive ?? '–'} sub={tr("Cannot sign in")} icon={<TbCircleOff />} />
                <StatTile title={tr("Super Admins")} className="bg-purple-100" value={s.admins ?? '–'} icon={<TbShieldLock />} />
                <StatTile title={tr("With login")} className="bg-pink-100" value={s.withLogin ?? '–'} sub={tr("Can sign in")} icon={<TbLogin />} />
            </div>

            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <Segment size="sm" value={status} onChange={(v) => v && setStatus(v)}>
                        <Segment.Item value="all">{tr("All")}</Segment.Item>
                        <Segment.Item value="active">{tr("Active")}</Segment.Item>
                        <Segment.Item value="inactive">{tr("Inactive")}</Segment.Item>
                    </Segment>
                    <div className="w-full sm:w-72">
                        <Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search name, email or phone")} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}

                <div className="overflow-x-auto">
                    <Table compact overflow={false}>
                        <THead>
                            <Tr>
                                <Th>{tr("Member")}</Th>
                                <Th>{tr("Role")}</Th>
                                <Th>{tr("Departments")}</Th>
                                <Th>{tr("Status")}</Th>
                                <Th>{tr("Last login")}</Th>
                                <Th className="text-right">{tr("Actions")}</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {rows.map((m) => (
                                <Tr key={m.id}>
                                    <Td className={m.active ? undefined : 'opacity-60 grayscale'}>
                                        <div className="flex items-center gap-3">
                                            <ScoreRing score={m.score} size={44}><Avatar shape="circle" size={36} {...(m.image ? { src: m.image } : {})}>{m.image ? null : initials(m)}</Avatar></ScoreRing>
                                            <div className="min-w-0">
                                                <Link to={`/crm/staff/${m.id}`} className="font-semibold heading-text hover:underline">{m.name}</Link>
                                                <div className="truncate text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td className={m.active ? undefined : 'opacity-60 grayscale'}>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {m.admin ? <Tag className="bg-purple-100 text-purple-700">{tr("Super Admin")}</Tag> : (
                                                <div className="w-36">
                                                    <Select isClearable size="sm" placeholder={tr("No role")} options={roleOptions} value={roleOptions.find((o) => o.value === m.role?.id) || null} onChange={(o) => changeRole(m, o)} menuPortalTarget={document.body} menuPosition="fixed" menuPlacement="auto" classNames={{ menu: () => 'select-menu !min-w-[210px]' }} styles={{ menuPortal: (b) => ({ ...b, zIndex: 10000 }) }} />
                                                </div>
                                            )}
                                        </div>
                                    </Td>
                                    <Td className={m.active ? undefined : 'opacity-60 grayscale'}>
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.departments.length ? m.departments.map((d) => <Tag key={d.id}>{d.name}</Tag>) : <span className="text-gray-400">—</span>}
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-2.5">
                                            <Switcher checked={m.active} onChange={(checked) => toggleActive(m, checked)} />
                                            <span className={`hidden 2xl:inline ${m.active ? 'text-emerald-600' : 'text-gray-400'}`}>{m.active ? tr("Active") : tr("Inactive")}</span>
                                            {!m.hasLogin && <Tooltip title={tr("No login account yet")}><Tag className="bg-amber-100 text-amber-700">{tr("No login")}</Tag></Tooltip>}
                                        </div>
                                    </Td>
                                    <Td className={`whitespace-nowrap text-gray-500 ${m.active ? '' : 'opacity-60 grayscale'}`}>{m.lastLogin ? dayjs(m.lastLogin).format('MMM D, HH:mm') : tr("Never")}{m.lastActive && <div className="text-xs text-gray-400">{tr("Active")} {dayjs(m.lastActive).format('MMM D, HH:mm')}</div>}</Td>
                                    <Td className={m.active ? undefined : 'opacity-60 grayscale'}>
                                        <div className={`flex items-center justify-end gap-0.5 ${m.active ? '' : 'pointer-events-none'}`}>
                                            <Tooltip title={tr("Edit")}><Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => openEdit(m)} /></Tooltip>
                                            {canActivity && <Tooltip title={tr("Activity log")}><Button size="sm" variant="plain" icon={<TbHistory />} onClick={() => navigate(`/crm/activity/staff/${m.id}`)} /></Tooltip>}
                                            {canLoginAs && m.hasLogin && <Tooltip title={tr("Log in as this member")}><Button size="sm" variant="plain" icon={<TbUserShare />} onClick={() => loginAs(m.id).catch((e) => notify('danger', e.message))} /></Tooltip>}
                                            <Tooltip title={tr("Permissions")}><Button size="sm" variant="plain" icon={<TbShieldLock />} onClick={() => setAccess({ open: true, id: m.id })} /></Tooltip>
                                            {m.hasLogin && <Tooltip title={tr("Set a password")}><Button size="sm" variant="plain" icon={<TbLockPassword />} onClick={() => setSetPw({ member: m, value: '', saving: false, error: '' })} /></Tooltip>}
                                            {m.hasLogin && (
                                                <Dropdown placement="bottom-end" renderTitle={<EllipsisButton />}>
                                                    <Dropdown.Item eventKey="link" onClick={() => setConfirm({ member: m, kind: 'link' })}><TbLink className="mr-2 text-lg" />{tr("Reset link")}</Dropdown.Item>
                                                    <Dropdown.Item eventKey="reset" onClick={() => setConfirm({ member: m, kind: 'reset' })}><TbKey className="mr-2 text-lg" />{tr("One-time password")}</Dropdown.Item>
                                                    <Dropdown.Item eventKey="signout" onClick={() => setConfirm({ member: m, kind: 'signout' })}><TbLogout className="mr-2 text-lg" />{tr("Sign out everywhere")}</Dropdown.Item>
                                                    {m.twoFactor && canAdmin && <Dropdown.Item eventKey="twofactor" onClick={() => setConfirm({ member: m, kind: 'twofactor' })}><TbDeviceMobileOff className="mr-2 text-lg" />{tr("Reset two-step verification")}</Dropdown.Item>}
                                                </Dropdown>
                                            )}
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !rows.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {empty && <div className="py-10 text-center text-gray-400">{tr("No team members found")}</div>}
                </div>
            </AdaptiveCard>

                </>
            )}

            <MemberAccessDrawer open={access.open} memberId={access.id} onClose={() => setAccess({ open: false, id: null })} onSaved={load} />
            <MemberDrawer open={drawer.open} member={drawer.member} lookups={lookups} canAdmin={canAdmin} saving={saving} error={formError} onSubmit={submit} onClose={() => setDrawer({ open: false, member: null })} onChanged={load} />

            {dialogs}
        </Container>
    )
}

export default Team
