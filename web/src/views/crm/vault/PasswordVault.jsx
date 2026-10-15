import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { TbShieldLock, TbUsersGroup, TbAlertTriangle, TbDeviceMobileCode, TbPlus, TbSearch, TbLock, TbUsers, TbUserCheck, TbEye, TbEyeOff, TbExternalLink, TbPencil, TbKey, TbFolders, TbFolder, TbStar, TbBuildingStore, TbShare, TbClockExclamation, TbTrash, TbCheck } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
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
import { tr, trn } from '@/utils/t'

const SCOPES = [['all', tr("All entries"), <TbFolders key="a" />], ['mine', tr("Created by me"), <TbStar key="m" />], ['shared', tr("Shared with me"), <TbShare key="s" />], ['private', tr("Only me"), <TbLock key="p" />], ['client', tr("Client logins"), <TbBuildingStore key="c" />]]

const AccessBadge = ({ e }) => e.access === 'team' ? <Tag className="gap-1 bg-sky-100 text-sky-700"><TbUsers className="inline" />{tr("Team")}</Tag> : e.access === 'selected' ? <Tag className="gap-1 bg-violet-100 text-violet-700"><TbUserCheck className="inline" />{e.sharedWith} {e.sharedWith === 1 ? tr("person") : tr("people")}</Tag> : <Tag className="gap-1 bg-gray-100 text-gray-600"><TbLock className="inline" />{tr("Only me")}</Tag>

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
                <div className="flex items-center gap-1">{e.expired && <Tooltip title={tr("Past its “change before” date")}><TbClockExclamation className="text-lg text-red-500" /></Tooltip>}{e.canEdit && <TbPencil className="text-lg text-gray-400 opacity-0 group-hover:opacity-100" />}</div>
            </div>
            <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1 dark:bg-gray-700/40"><span className="min-w-0 flex-1 truncate" title={e.username}>{e.username || <span className="text-gray-400">{tr("No username")}</span>}</span>{e.username && <CopyButton text={e.username} title={tr("Copy username")} onCopied={() => { log('copy_username'); notify('success', tr("Username copied")) }} />}</div>
                <div className="flex items-center justify-between gap-1 rounded-lg bg-gray-50 px-3 py-1 dark:bg-gray-700/40">
                    <span className={cn('min-w-0 flex-1 truncate', pw !== null && 'select-all font-mono text-[13px]')}>{!e.hasPassword ? <span className="text-gray-400">{tr("No password")}</span> : pw !== null ? pw : '••••••••••••'}</span>
                    {e.hasPassword && <><button type="button" title={pw !== null ? tr("Hide") : tr("Show")} onClick={toggle} className="flex h-7 w-7 items-center justify-center rounded-md text-base text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700">{pw !== null ? <TbEyeOff /> : <TbEye />}</button>
                        <CopyButton title={tr("Copy password")} get={async () => (await reveal()).password || ''} onCopied={() => { log('copy_password'); notify('success', tr("Password copied")) }} /></>}
                </div>
                {e.hasTotp && <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1 dark:bg-gray-700/40"><span className="font-mono text-[15px] tracking-[0.2em]">{totp ? `${totp.code.slice(0, 3)} ${totp.code.slice(3)}` : <span className="font-sans text-sm text-gray-500">{tr("2FA code")}</span>}</span>{totp ? <span className="flex items-center gap-1 text-xs text-gray-500">{totp.remaining}s<CopyButton text={totp.code} title={tr("Copy code")} onCopied={() => { log('copy_totp'); notify('success', tr("Code copied")) }} /></span> : <button type="button" onClick={code} className="rounded-md px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10">{tr("Show code")}</button>}</div>}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1"><AccessBadge e={e} />{e.tags.slice(0, 2).map((t) => <Tag key={t} className="bg-transparent text-gray-500">#{t}</Tag>)}</div>
                {e.url && <Tooltip title={e.url}><a href={e.url} target="_blank" rel="noopener noreferrer" onClick={(ev) => { ev.stopPropagation(); log('open_url') }} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{tr("Open")}<TbExternalLink /></a></Tooltip>}
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
            <h4>{tr("Categories")}</h4>
            <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                        <input type="color" value={c.color || '#64748b'} onChange={(e) => recolor(c, e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                        <Input size="sm" defaultValue={c.name} onBlur={(e) => rename(c, e.target.value)} />
                        <span className="w-8 shrink-0 text-right text-xs text-gray-400">{c.count}</span>
                        <button type="button" className="text-red-500" onClick={() => setDel(c)}><TbTrash /></button>
                    </div>
                ))}
                {!categories.length && <p className="text-sm text-gray-500">{tr("No categories yet.")}</p>}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                <Input size="sm" placeholder={tr("New category (Hosting, Social media, Ads…)")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()} />
                <Button size="sm" variant="solid" disabled={!name.trim()} icon={<TbPlus />} onClick={add}>{tr("Add")}</Button>
            </div>
            <div className="mt-5 flex justify-end"><Button onClick={onClose}>{tr("Done")}</Button></div>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete “{name}”?", { name: del?.name })} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={async () => { const c = del; setDel(null); try { await api(`/api/crm/vault/categories/${c.id}`, { method: 'DELETE' }); onChanged() } catch (e) { notify('danger', e.message) } }}><p>{tr("The")} {del?.count || 0} {tr("entries in it are kept and become “No category”.")}</p></ConfirmDialog>
        </Dialog>
    )
}

const Stat = ({ title, value, sub, className, icon }) => (
    <div className={cn('flex items-center justify-between rounded-2xl p-4', className)}>
        <div><div className="mb-3 font-bold text-gray-900">{title}</div><h3 className="text-gray-900">{value}</h3>{sub && <div className="mt-1 text-xs text-gray-700">{sub}</div>}</div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-2xl text-white">{icon}</div>
    </div>
)
const Overview = ({ s }) => {
    const attention = s.expired + s.expiring + s.noPassword
    return (
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Stat title={tr("Entries")} className="bg-sky-100" value={s.total} sub={tr("{private} only for you", { private: s.private })} icon={<TbShieldLock />} />
            <Stat title={tr("Shared")} className="bg-emerald-100" value={s.team + s.selected} sub={tr("{team} whole team · {selected} selected people", { team: s.team, selected: s.selected })} icon={<TbUsersGroup />} />
            <Stat title={tr("Need attention")} className={attention ? 'bg-amber-100' : 'bg-purple-100'} value={attention} sub={attention ? [s.expired && tr("{expired} past date", { expired: s.expired }), s.expiring && tr("{expiring} due within 30 days", { expiring: s.expiring }), s.noPassword && tr("{noPassword} without password", { noPassword: s.noPassword })].filter(Boolean).join(' · ') : tr("Everything is up to date")} icon={<TbAlertTriangle />} />
            <Stat title={tr("With 2FA code")} className="bg-pink-100" value={s.withTotp} sub={tr("Live codes the team can copy")} icon={<TbDeviceMobileCode />} />
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
                <div><h3>{tr("Password vault")}</h3><p className="text-sm text-gray-500">{tr("Logins the team shares: platforms, hosting, social accounts, client access. Passwords are encrypted and every reveal is logged.")}</p></div>
                {data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New entry")}</Button>}
            </div>
            {data.stats && data.stats.total > 0 && <Overview s={data.stats} />}
            <Card className="mb-5" bodyClass="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[220px] flex-1 md:max-w-md"><Input prefix={<TbSearch className="text-lg" />} placeholder={tr("Search name, user, URL, client, tag")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <div className="w-56"><RelationSelect resource="clients" value={clientId} onChange={(x) => setClientId(x || null)} /></div>
                    {(scope !== 'all' || categoryId || clientId || search) && <Button size="sm" variant="plain" onClick={() => { setScope('all'); setCategoryId(null); setClientId(null); setSearch('') }}>{tr("Clear filters")}</Button>}
                    <span className="ml-auto text-sm text-gray-500">{data.list.length} {tr("of")} {data.counts.all ?? 0} {trn(data.counts.all ?? 0, 'entry', 'entries')}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-semibold uppercase text-gray-400">{tr("Show")}</span>
                    {SCOPES.map(([k, label, icon]) => (
                        <button key={k} onClick={() => pickScope(k)} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors', scope === k ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300')}>
                            <span className="text-base">{icon}</span>{label}<span className={cn('rounded-full px-1.5 text-xs', scope === k ? 'bg-primary/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-700')}>{data.counts[k] ?? 0}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <span className="mr-1 text-xs font-semibold uppercase text-gray-400">{tr("Category")}</span>
                    {data.categories.map((c) => (
                        <button key={c.id} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition-colors', categoryId === c.id ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-200')} style={categoryId === c.id ? { background: colorOf(c) } : undefined}>
                            <span className="h-2 w-2 rounded-full" style={{ background: categoryId === c.id ? '#fff' : colorOf(c) }} />{c.name}<span className="text-xs opacity-70">{c.count}</span>
                        </button>
                    ))}
                    {data.counts.none > 0 && <button onClick={() => setCategoryId(categoryId === 'none' ? null : 'none')} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold', categoryId === 'none' ? 'border-primary bg-primary/10 text-primary' : 'border-dashed border-gray-300 text-gray-500')}><TbFolder />{tr("No category")}<span className="text-xs opacity-70">{data.counts.none}</span></button>}
                    {!data.categories.length && !data.counts.none && <span className="text-sm text-gray-400">{tr("No categories yet")}</span>}
                    {(data.can.create || data.can.admin) && <button className="ml-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" onClick={() => setCats(true)}><TbPlus />{tr("Manage categories")}</button>}
                </div>
            </Card>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {data.list.map((e) => <EntryCard key={e.id} e={e} onOpen={open} api={api} />)}
            </div>
            {!loading && !data.list.length && (
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-gray-500"><TbKey className="text-5xl text-gray-300" /><h5>{data.counts.all ? tr("Nothing matches") : tr("The vault is empty")}</h5><p className="max-w-sm text-sm">{data.counts.all ? tr("Try another category or search.") : tr("Add the logins your team uses, choose who can see each one, and stop sharing passwords in chat.")}</p>{!data.counts.all && data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("Add the first entry")}</Button>}</div>
            )}
            <EntryDrawer open={drawer.open} id={drawer.id} categories={data.categories} staff={data.staff} presets={clientId ? { clientId } : null} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} onCategories={load} />
            <CategoryDialog open={cats} onClose={() => setCats(false)} categories={data.categories} onChanged={load} />
        </Container>
    )
}

export default PasswordVault
