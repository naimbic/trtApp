import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { TbShieldLock, TbUsersGroup, TbAlertTriangle, TbDeviceMobileCode, TbPlus, TbSearch, TbLock, TbUsers, TbUserCheck, TbEye, TbEyeOff, TbExternalLink, TbPencil, TbKey, TbFolders, TbFolder, TbStar, TbBuildingStore, TbShare, TbClockExclamation, TbTrash, TbCheck } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Chart from '@/components/shared/Chart'
import Card from '@/components/ui/Card'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import cn from '@/utils/classNames'
import { api, notify, qs } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import EntryDrawer from './EntryDrawer'
import { COLORS, colorOf, initials, CopyButton } from './shared'

const SCOPES = [['all', 'All entries', <TbFolders key="a" />], ['mine', 'Created by me', <TbStar key="m" />], ['shared', 'Shared with me', <TbShare key="s" />], ['private', 'Only me', <TbLock key="p" />], ['client', 'Client logins', <TbBuildingStore key="c" />]]

const AccessBadge = ({ e }) => e.access === 'team' ? <Tag className="gap-1 bg-sky-100 text-sky-700"><TbUsers className="inline" />Team</Tag> : e.access === 'selected' ? <Tag className="gap-1 bg-violet-100 text-violet-700"><TbUserCheck className="inline" />{e.sharedWith} {e.sharedWith === 1 ? 'person' : 'people'}</Tag> : <Tag className="gap-1 bg-gray-100 text-gray-600"><TbLock className="inline" />Only me</Tag>

const EntryCard = ({ e, onOpen, api: call }) => {
    const [pw, setPw] = useState(null)
    const [totp, setTotp] = useState(null)
    const timer = useRef(null)
    useEffect(() => () => clearTimeout(timer.current), [])
    const reveal = async () => (await call(`/api/crm/vault/entries/${e.id}/reveal`, { method: 'POST' }))
    const toggle = async (ev) => {
        ev.stopPropagation()
        if (pw !== null) { setPw(null); return }
        try { const r = await reveal(); setPw(r.password || ''); timer.current = setTimeout(() => setPw(null), 20000) } catch (err) { notify('danger', err.message) }
    }
    const code = async (ev) => {
        ev.stopPropagation()
        try { const r = await call(`/api/crm/vault/entries/${e.id}/totp`, { method: 'POST' }); setTotp(r); setTimeout(() => setTotp(null), r.remaining * 1000) } catch (err) { notify('danger', err.message) }
    }
    const log = (action) => call(`/api/crm/vault/entries/${e.id}/log`, { method: 'POST', body: { action } }).catch(() => {})
    return (
        <div onClick={() => onOpen(e.id)} className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-[0_0_1rem_0.25rem_rgba(0,0,0,0.04),0px_2rem_1.5rem_-1rem_rgba(0,0,0,0.12)] dark:border-transparent dark:bg-gray-800">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: colorOf(e.category) }}>{initials(e.title)}</span>
                <div className="min-w-0 flex-1">
                    <div className="heading-text truncate font-bold" title={e.title}>{e.title}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">{e.category && <span className="font-semibold" style={{ color: colorOf(e.category) }}>{e.category.name}</span>}{e.client && <Link to={`/crm/clients/${e.client.id}`} onClick={(ev) => ev.stopPropagation()} className="truncate hover:text-primary">{e.client.name}</Link>}</div>
                </div>
                <div className="flex items-center gap-1">{e.expired && <Tooltip title="Past its “change before” date"><TbClockExclamation className="text-lg text-red-500" /></Tooltip>}{e.canEdit && <TbPencil className="text-lg text-gray-400 opacity-0 group-hover:opacity-100" />}</div>
            </div>
            <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1 dark:bg-gray-700/40"><span className="min-w-0 flex-1 truncate" title={e.username}>{e.username || <span className="text-gray-400">No username</span>}</span>{e.username && <CopyButton text={e.username} title="Copy username" onCopied={() => { log('copy_username'); notify('success', 'Username copied') }} />}</div>
                <div className="flex items-center justify-between gap-1 rounded-lg bg-gray-50 px-3 py-1 dark:bg-gray-700/40">
                    <span className={cn('min-w-0 flex-1 truncate', pw !== null && 'select-all font-mono text-[13px]')}>{!e.hasPassword ? <span className="text-gray-400">No password</span> : pw !== null ? pw : '••••••••••••'}</span>
                    {e.hasPassword && <><button type="button" title={pw !== null ? 'Hide' : 'Show'} onClick={toggle} className="flex h-7 w-7 items-center justify-center rounded-md text-base text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700">{pw !== null ? <TbEyeOff /> : <TbEye />}</button>
                        <CopyButton title="Copy password" get={async () => (await reveal()).password || ''} onCopied={() => { log('copy_password'); notify('success', 'Password copied') }} /></>}
                </div>
                {e.hasTotp && <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1 dark:bg-gray-700/40"><span className="font-mono text-[15px] tracking-[0.2em]">{totp ? `${totp.code.slice(0, 3)} ${totp.code.slice(3)}` : <span className="font-sans text-sm text-gray-500">2FA code</span>}</span>{totp ? <span className="flex items-center gap-1 text-xs text-gray-500">{totp.remaining}s<CopyButton text={totp.code} title="Copy code" onCopied={() => { log('copy_totp'); notify('success', 'Code copied') }} /></span> : <button type="button" onClick={code} className="rounded-md px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10">Show code</button>}</div>}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1"><AccessBadge e={e} />{e.tags.slice(0, 2).map((t) => <Tag key={t} className="bg-transparent text-gray-500">#{t}</Tag>)}</div>
                {e.url && <Tooltip title={e.url}><a href={e.url} target="_blank" rel="noopener noreferrer" onClick={(ev) => { ev.stopPropagation(); log('open_url') }} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Open<TbExternalLink /></a></Tooltip>}
            </div>
        </div>
    )
}

const CategoryDialog = ({ open, onClose, categories, onChanged }) => {
    const [name, setName] = useState('')
    const [color, setColor] = useState(COLORS[0])
    const [del, setDel] = useState(null)
    const add = async () => { try { await api('/api/crm/vault/categories', { method: 'POST', body: { name, color } }); setName(''); onChanged() } catch (e) { notify('danger', e.message) } }
    const recolor = async (c, col) => { try { await api(`/api/crm/vault/categories/${c.id}`, { method: 'PUT', body: { name: c.name, color: col } }); onChanged() } catch (e) { notify('danger', e.message) } }
    const rename = async (c, n) => { if (!n.trim() || n === c.name) return; try { await api(`/api/crm/vault/categories/${c.id}`, { method: 'PUT', body: { name: n, color: c.color } }); onChanged() } catch (e) { notify('danger', e.message); onChanged() } }
    return (
        <Dialog isOpen={open} width={520} onClose={onClose} onRequestClose={onClose}>
            <h4>Categories</h4>
            <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                        <input type="color" value={c.color || '#64748b'} onChange={(e) => recolor(c, e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                        <Input size="sm" defaultValue={c.name} onBlur={(e) => rename(c, e.target.value)} />
                        <span className="w-8 shrink-0 text-right text-xs text-gray-400">{c.count}</span>
                        <button type="button" className="text-red-500" onClick={() => setDel(c)}><TbTrash /></button>
                    </div>
                ))}
                {!categories.length && <p className="text-sm text-gray-500">No categories yet.</p>}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                <Input size="sm" placeholder="New category (Hosting, Social media, Ads…)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()} />
                <Button size="sm" variant="solid" disabled={!name.trim()} icon={<TbPlus />} onClick={add}>Add</Button>
            </div>
            <div className="mt-5 flex justify-end"><Button onClick={onClose}>Done</Button></div>
            <ConfirmDialog isOpen={!!del} type="danger" title={`Delete “${del?.name}”?`} confirmText="Delete" onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={async () => { const c = del; setDel(null); try { await api(`/api/crm/vault/categories/${c.id}`, { method: 'DELETE' }); onChanged() } catch (e) { notify('danger', e.message) } }}><p>The {del?.count || 0} entries in it are kept and become “No category”.</p></ConfirmDialog>
        </Dialog>
    )
}

const Stat = ({ title, value, sub, className, icon }) => (
    <div className={cn('flex items-center justify-between rounded-2xl p-4', className)}>
        <div><div className="mb-3 font-bold text-gray-900">{title}</div><h3 className="text-gray-900">{value}</h3>{sub && <div className="mt-1 text-xs text-gray-700">{sub}</div>}</div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-2xl text-white">{icon}</div>
    </div>
)
const ACTION = { create: 'added', update: 'edited', view: 'revealed', copy_password: 'copied the password of', copy_username: 'copied the username of', copy_totp: 'copied the 2FA code of', open_url: 'opened' }

const Overview = ({ s }) => {
    const attention = s.expired + s.expiring + s.noPassword
    return (
        <div className="mb-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title="Entries" className="bg-sky-100" value={s.total} sub={`${s.private} only for you`} icon={<TbShieldLock />} />
                <Stat title="Shared" className="bg-emerald-100" value={s.team + s.selected} sub={`${s.team} whole team · ${s.selected} selected people`} icon={<TbUsersGroup />} />
                <Stat title="Need attention" className={attention ? 'bg-amber-100' : 'bg-purple-100'} value={attention} sub={attention ? [s.expired && `${s.expired} past date`, s.expiring && `${s.expiring} due within 30 days`, s.noPassword && `${s.noPassword} without password`].filter(Boolean).join(' · ') : 'Everything is up to date'} icon={<TbAlertTriangle />} />
                <Stat title="With 2FA code" className="bg-pink-100" value={s.withTotp} sub="Live codes the team can copy" icon={<TbDeviceMobileCode />} />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card>
                    <h5 className="mb-2">By category</h5>
                    {s.byCategory.length ? <Chart type="donut" height={230} series={s.byCategory.map((x) => x.value)} customOptions={{ labels: s.byCategory.map((x) => x.name), colors: s.byCategory.map((x) => x.color), legend: { position: 'bottom', fontSize: '12px' }, dataLabels: { enabled: false }, plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Entries', formatter: () => String(s.total) } } } } } }} /> : <p className="py-10 text-center text-gray-500">No entries yet.</p>}
                </Card>
                <Card>
                    <h5 className="mb-2">Activity · last 14 days</h5>
                    <Chart type="bar" height={230} series={[{ name: 'Used', data: s.activity.uses }, { name: 'Added or edited', data: s.activity.changes }]} xAxis={s.activity.days.map((d) => dayjs(d).format('DD MMM'))} customOptions={{ colors: ['#3b82f6', '#10b981'], legend: { position: 'top', fontSize: '12px' }, dataLabels: { enabled: false }, plotOptions: { bar: { columnWidth: '55%', borderRadius: 3, borderRadiusApplication: 'end' } }, xaxis: { categories: s.activity.days.map((d) => dayjs(d).format('DD MMM')), labels: { rotate: -45, style: { fontSize: '10px' } }, tickAmount: 7 }, yaxis: { labels: { formatter: (v) => String(Math.round(v)) } } }} />
                </Card>
                <Card>
                    <h5 className="mb-4">Latest actions</h5>
                    <div className="space-y-3">
                        {s.recent.map((r) => (
                            <div key={r.id} className="flex items-start gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><div><span className="font-semibold heading-text">{r.who}</span> {ACTION[r.action] || r.action} <span className="font-semibold">{r.entry}</span></div><div className="text-xs text-gray-400">{dayjs(r.date).format('DD MMM, HH:mm')}</div></div></div>
                        ))}
                        {!s.recent.length && <p className="py-8 text-center text-gray-500">Nothing yet. Reveals and copies of your entries appear here.</p>}
                    </div>
                </Card>
            </div>
        </div>
    )
}

const PasswordVault = () => {
    const [data, setData] = useState({ list: [], categories: [], counts: {}, staff: [], can: {}, stats: null })
    const [scope, setScope] = useState('all')
    const [categoryId, setCategoryId] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: false, id: null })
    const [cats, setCats] = useState(false)

    useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/vault/entries?${qs({ scope, categoryId: categoryId || '', clientId: clientId || '', query })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [scope, categoryId, clientId, query])
    useEffect(() => { load() }, [load])

    const open = (id) => setDrawer({ open: true, id })
    const pickScope = (s) => { setScope(s); setCategoryId(null) }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Password vault</h3><p className="text-sm text-gray-500">Logins the team shares: platforms, hosting, social accounts, client access. Passwords are encrypted and every reveal is logged.</p></div>
                {data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>New entry</Button>}
            </div>
            {data.stats && data.stats.total > 0 && <Overview s={data.stats} />}
            <div className="flex flex-col gap-6 lg:flex-row">
                <aside className="shrink-0 lg:w-64">
                    <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                        {SCOPES.map(([k, label, icon]) => (
                            <button key={k} onClick={() => pickScope(k)} className={cn('flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left font-semibold transition-colors', scope === k && !categoryId ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700')}>
                                <span className="text-xl">{icon}</span>{label}<span className="ml-auto text-xs text-gray-400">{data.counts[k] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-5 hidden lg:block">
                        <div className="mb-2 flex items-center justify-between px-3"><span className="text-xs font-semibold uppercase text-gray-400">Categories</span>{(data.can.create || data.can.admin) && <button className="text-xs font-semibold text-primary" onClick={() => setCats(true)}>Manage</button>}</div>
                        <div className="flex flex-col gap-1">
                            {data.categories.map((c) => (
                                <button key={c.id} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-semibold transition-colors', categoryId === c.id ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700')}>
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(c) }} /><span className="truncate">{c.name}</span><span className="ml-auto text-xs text-gray-400">{c.count}</span>
                                </button>
                            ))}
                            {data.counts.none > 0 && <button onClick={() => setCategoryId(categoryId === 'none' ? null : 'none')} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-semibold', categoryId === 'none' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}><TbFolder className="text-base" />No category<span className="ml-auto text-xs text-gray-400">{data.counts.none}</span></button>}
                        </div>
                    </div>
                </aside>
                <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <div className="w-72 max-w-full"><Input size="sm" prefix={<TbSearch />} placeholder="Search name, user, URL, client, tag" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                        <div className="w-56"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(x) => setClientId(x || null)} /></div>
                        <span className="ml-auto text-sm text-gray-500">{data.list.length} entr{data.list.length === 1 ? 'y' : 'ies'}</span>
                    </div>
                    {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                        {data.list.map((e) => <EntryCard key={e.id} e={e} onOpen={open} api={api} />)}
                    </div>
                    {!loading && !data.list.length && (
                        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-gray-500"><TbKey className="text-5xl text-gray-300" /><h5>{data.counts.all ? 'Nothing matches' : 'The vault is empty'}</h5><p className="max-w-sm text-sm">{data.counts.all ? 'Try another category or search.' : 'Add the logins your team uses, choose who can see each one, and stop sharing passwords in chat.'}</p>{!data.counts.all && data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>Add the first entry</Button>}</div>
                    )}
                </div>
            </div>
            <EntryDrawer open={drawer.open} id={drawer.id} categories={data.categories} staff={data.staff} presets={clientId ? { clientId } : null} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} onCategories={load} />
            <CategoryDialog open={cats} onClose={() => setCats(false)} categories={data.categories} onChanged={load} />
        </Container>
    )
}

export default PasswordVault
