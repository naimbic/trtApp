import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { TbChevronDown, TbPlugConnected, TbAdjustmentsHorizontal, TbBrandWhatsapp, TbBellRinging, TbBrandGoogle, TbBuilding, TbBuildingBank, TbCalendar, TbChecklist, TbClockPlay, TbFileDescription, TbFileInvoice, TbFileTypePdf, TbFilter, TbLifebuoy, TbMail, TbPresentation, TbReceipt2, TbReceiptRefund, TbRepeat, TbShoppingCart, TbSignature, TbSparkles, TbTags, TbUsers, TbWorld } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Switcher from '@/components/ui/Switcher'
import Alert from '@/components/ui/Alert'
import cn from '@/utils/classNames'
import { GROUPS, SECTIONS } from '@/lib/crm/settings/registry'
import { api, notify, useCan } from '../kit/api'
import { Field } from './fields'
import { InvoiceFormatPanel, PayrollExpensesPanel, ChannelsTestPanel, BackupsPanel, ClientPermissionsPanel, CronPanel, CustomFieldsPanel, EmailDesignPanel, FormatPanel } from './panels'
import { MailServerSettings } from '../mail/Mails'
import AiSettingsPanel from '../ai/AiSettingsPanel'
import { refreshBranding } from '@/utils/hooks/useBranding'
import { tr } from '@/utils/t'

const SEC_TONES = [
    { bg: 'bg-orange-50 dark:bg-orange-500/10', dot: 'bg-orange-500', text: 'text-orange-800 dark:text-orange-300' },
    { bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-500', text: 'text-emerald-800 dark:text-emerald-300' },
    { bg: 'bg-amber-50 dark:bg-amber-500/10', dot: 'bg-amber-500', text: 'text-amber-800 dark:text-amber-300' },
    { bg: 'bg-blue-50 dark:bg-blue-500/10', dot: 'bg-blue-500', text: 'text-blue-800 dark:text-blue-300' },
    { bg: 'bg-pink-50 dark:bg-pink-500/10', dot: 'bg-pink-500', text: 'text-pink-800 dark:text-pink-300' },
    { bg: 'bg-violet-50 dark:bg-violet-500/10', dot: 'bg-violet-500', text: 'text-violet-800 dark:text-violet-300' },
]

const ICONS = { TbPlugConnected, TbBrandWhatsapp, TbBuildingBank, TbAdjustmentsHorizontal, TbBuilding, TbWorld, TbMail, TbReceipt2, TbFileInvoice, TbFileDescription, TbPresentation, TbShoppingCart, TbReceiptRefund, TbRepeat, TbUsers, TbChecklist, TbLifebuoy, TbFilter, TbBrandGoogle, TbBellRinging, TbCalendar, TbSparkles, TbFileTypePdf, TbSignature, TbTags, TbClockPlay }


const COPY = (t) => navigator.clipboard?.writeText(t).then(() => notify('success', tr("Copied"))).catch(() => {})

/** Shows whether Google and GitHub sign-in are on (their keys are server settings) and the addresses to register at the provider. */
const SignInProvidersPanel = () => {
    const [ways, setWays] = useState(null)
    useEffect(() => { fetch('/api/crm/auth/providers').then((r) => r.json()).then(setWays).catch(() => setWays({})) }, [])
    const origin = window.location.origin
    const rows = [
        { id: 'google', name: 'Google', env: 'GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET', where: 'Google Cloud Console → Credentials → OAuth client (Web application) → Authorised redirect URIs' },
        { id: 'github', name: 'GitHub', env: 'GITHUB_AUTH_CLIENT_ID, GITHUB_AUTH_CLIENT_SECRET', where: 'GitHub → Settings → Developer settings → OAuth Apps → Authorization callback URL' },
    ]
    return (
        <div className="flex flex-col gap-3">
            {rows.map((r) => {
                const on = !!ways?.[r.id]
                const cb = `${origin}/api/auth/callback/${r.id}`
                return (
                    <div key={r.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-1 flex items-center gap-2 font-semibold">{r.name}<span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', !ways ? 'bg-gray-100 text-gray-500' : on ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{!ways ? '…' : on ? tr("On: the button shows on the sign-in page") : tr("Off: keys not set on the server")}</span></div>
                        <div className="text-xs text-gray-500">{tr("Register this address at the provider")} ({tr(r.where)}):</div>
                        <button type="button" onClick={() => COPY(cb)} className="mt-1 break-all rounded-md bg-gray-100 px-2 py-1 text-left font-mono text-xs hover:bg-gray-200 dark:bg-gray-700">{cb}</button>
                        {!on && ways && <div className="mt-2 text-xs text-gray-500">{tr("Then add these variables to the server (Coolify → Environment variables) and redeploy:")} <code>{r.env}</code></div>}
                    </div>
                )
            })}
        </div>
    )
}

const Panel = ({ name, group, values, setValue, ctx }) => {
    if (name === 'ai') return <AiSettingsPanel />
    if (name === 'signInProviders') return <SignInProvidersPanel />
    if (name === 'smtp') return <MailServerSettings />
    if (name === 'channelsTest') return <ChannelsTestPanel />
    if (name === 'invoiceFormatApply') return <InvoiceFormatPanel />
    if (name === 'payrollExpensesApply') return <PayrollExpensesPanel />
    if (name === 'companyFormat') return <FormatPanel kind="company" fieldKey="company_info_format" values={values} setValue={setValue} />
    if (name === 'customerFormat') return <FormatPanel kind="client" fieldKey="customer_info_format" values={values} setValue={setValue} customFields={ctx.customFields} />
    if (name === 'emailDesign') return <EmailDesignPanel values={values} setValue={setValue} />
    if (name === 'customFields') return <CustomFieldsPanel />
    if (name === 'clientPermissions') return <ClientPermissionsPanel />
    if (name === 'backups') return <BackupsPanel />
    if (name === 'cronCommand') return <CronPanel />
    if (name === 'cronLog') return <CronPanel log />
    return null
}

const Settings = () => {
    const can = useCan()
    const canEdit = can('settings', 'edit')
    const [params, setParams] = useSearchParams()
    const group = GROUPS[params.get('group')] ? params.get('group') : 'general'
    const meta = GROUPS[group]
    const [data, setData] = useState(null)
    const [values, setValues] = useState({})
    const [saved, setSaved] = useState('{}')
    const [secrets, setSecrets] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [pending, setPending] = useState(null)
    const [ctx, setCtx] = useState({ taxes: [], customFields: [] })

    const load = useCallback(async (g) => {
        setData(null); setError('')
        try {
            const d = await api(`/api/crm/settings?group=${g}`)
            setData(d); setValues(d.values); setSaved(JSON.stringify(d.values)); setSecrets(d.secrets)
        } catch (e) { setError(e.message) }
    }, [])
    useEffect(() => { load(group) }, [group, load])
    useEffect(() => {
        api('/api/crm/taxes?pageSize=100').then((d) => setCtx((c) => ({ ...c, taxes: d.list.map((t) => `${t.name}|${Number(t.taxRate).toFixed(2)}`) }))).catch(() => {})
        api('/api/crm/team?pageSize=200').then((d) => setCtx((c) => ({ ...c, staff: (d.list || []).filter((t) => t.active !== false).map((t) => ({ value: t.id, label: [t.firstName, t.lastName].filter(Boolean).join(' ') || t.email })) }))).catch(() => {})
        api('/api/crm/custom-fields?where.fieldTo=customers&pageSize=100').then((d) => setCtx((c) => ({ ...c, customFields: d.list }))).catch(() => {})
    }, [])

    const dirty = useMemo(() => JSON.stringify(values) !== saved, [values, saved])
    const setValue = (k, v, instant) => {
        setValues((x) => ({ ...x, [k]: v }))
        if (instant) { setSaved((s) => JSON.stringify({ ...JSON.parse(s), [k]: v })); refreshBranding() } // images are saved right away
    }
    const go = (g) => { if (g === group) return; if (dirty) setPending(g); else setParams({ group: g }) }

    const save = async () => {
        setSaving(true)
        try {
            const d = await api('/api/crm/settings', { method: 'PUT', body: { group, values } })
            setData(d); setValues(d.values); setSaved(JSON.stringify(d.values)); setSecrets(d.secrets)
            notify('success', tr("Settings saved"))
            refreshBranding()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }

    // a group whose cards carry a "section" is shown as accordions (one per section) instead of one long page of cards
    const explicit = (meta.cards || []).some((c) => c.section)
    const sectioned = explicit || (meta.cards || []).length >= 3 // no sections given: each card becomes its own accordion row
    const sections = useMemo(() => { if (!explicit) return (meta.cards || []).map((c) => ({ name: c.title, cards: [c], single: true })); const m = new Map(); for (const c of meta.cards || []) { const k = c.section || 'More'; if (!m.has(k)) m.set(k, []); m.get(k).push(c) } return [...m].map(([name, cards]) => ({ name, cards })) }, [meta, explicit])
    const [navOpen, setNavOpen] = useState(() => { try { const v = JSON.parse(localStorage.getItem('settings.nav') || 'null'); return Array.isArray(v) ? v : [] } catch { return [] } })
    const toggleNav = (n) => setNavOpen((o) => { const next = o.includes(n) ? o.filter((x) => x !== n) : [...o, n]; try { localStorage.setItem('settings.nav', JSON.stringify(next)) } catch { /* not saved */ } return next })
    useEffect(() => { const sec = SECTIONS.find((x) => x.groups.includes(group))?.section; if (sec) setNavOpen((o) => (o.includes(sec) ? o : [...o, sec])) }, [group]) // the section of the page you are on is always open
    const memo = `settings.open.${group}`
    const [openSecs, setOpenSecs] = useState([])
    useEffect(() => { try { const v = JSON.parse(localStorage.getItem(memo) || 'null'); setOpenSecs(Array.isArray(v) ? v : [sections[0]?.name].filter(Boolean)) } catch { setOpenSecs([sections[0]?.name].filter(Boolean)) } }, [memo, sections])
    const toggleSec = (n) => setOpenSecs((o) => { const next = o.includes(n) ? o.filter((x) => x !== n) : [...o, n]; try { localStorage.setItem(memo, JSON.stringify(next)) } catch { /* not saved */ } return next })
    const renderCard = (c, compact, hideTitle) => {
        const Wrapper = compact ? 'div' : Card // (a stable type: a component made on the spot would reset the fields at every keystroke)
                                const tg = c.fields?.find((x) => x.cardToggle) // a category's own on/off switch, at the top right of its card
                                const on = !tg || ['1', 1, true].includes(values[tg.key] ?? tg.default)
                                return (
                                <Wrapper key={c.title} {...(compact ? { className: 'rounded-xl border border-gray-200 px-3.5 py-3 dark:border-gray-700' } : {})}>
                                    <div className="flex items-start justify-between gap-4">
                                        {hideTitle ? <span /> : compact ? <h6 className="mb-0.5">{c.title}</h6> : <h5 className="mb-0.5">{c.title}</h5>}
                                        {tg && <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-gray-500"><span className={on ? 'text-emerald-600' : 'text-gray-400'}>{on ? tr("On") : tr("Off")}</span><Switcher checked={on} disabled={!canEdit} onChange={(v) => setValue(tg.key, v ? '1' : '0')} /></label>}
                                    </div>
                                    {c.desc && <p className={compact ? 'mb-2.5 text-xs leading-snug text-gray-500' : 'mb-4 text-sm text-gray-500'}>{tr(c.desc)}</p>}
                                    {c.links && <div className="flex flex-wrap gap-2">{c.links.map(([label, to]) => <Link key={to} to={to}><Button size="sm">{tr(label)}</Button></Link>)}</div>}
                                    {!c.desc && <div className={compact ? 'mb-1.5' : 'mb-3'} />}
                                    {c.fields?.filter((x) => !x.cardToggle).length > 0 && (
                                        <div className={cn(compact ? "grid grid-cols-1 gap-x-4 gap-y-3 transition-opacity md:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-x-5 gap-y-4 transition-opacity md:grid-cols-2", "[&>div.md\\:col-span-2:has(button[role=switch])]:border-t", !on && "opacity-50")}>
                                            {c.fields.filter((x) => !x.cardToggle).map((x) => <Field key={x.key} field={x} value={values[x.key]} secretSet={secrets[x.key]} onChange={(v, instant) => setValue(x.key, v, instant)} canEdit={canEdit} taxes={ctx.taxes} staff={ctx.staff} />)}
                                            {c.panel && <Panel name={c.panel} group={group} values={values} setValue={setValue} ctx={ctx} />}
                                        </div>
                                    )}
                                    {!c.fields?.length && c.panel && <Panel name={c.panel} group={group} values={values} setValue={setValue} ctx={ctx} />}
                                </Wrapper>
                                )
    }

    const hasFields = (meta.cards || []).some((c) => c.fields?.length)

    return (
        <Container>
            <div className="mb-4"><h3>{tr("Settings")}</h3><p className="text-sm text-gray-500">{tr("Configure the whole platform")}</p></div>
            <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
                <nav className="lg:sticky lg:top-20 lg:self-start">
                    <div className="flex flex-col gap-2">
                        {SECTIONS.map((s, i) => {
                            const tone = SEC_TONES[i % SEC_TONES.length]
                            const open = navOpen.includes(s.section)
                            return (
                                <div key={s.section} className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-gray-700 dark:bg-gray-800">
                                    <button type="button" aria-expanded={open} onClick={() => toggleNav(s.section)} className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start transition hover:brightness-95', tone.bg)}>
                                        <span className={cn('size-2.5 shrink-0 rounded-full', tone.dot)} />
                                        <span className={cn('flex-1 text-sm font-semibold', tone.text)}>{tr(s.section)}</span>
                                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{s.groups.length}</span>
                                        <TbChevronDown className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
                                    </button>
                                    {open && (
                                        <div className="p-1.5">
                                            {s.groups.map((k) => {
                                                const Icon = ICONS[GROUPS[k].icon]
                                                return (
                                                    <button key={k} type="button" onClick={() => go(k)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition', k === group ? 'bg-primary/10 font-semibold text-primary' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50')}>
                                                        {Icon && <Icon className="text-lg" />}{tr(GROUPS[k].label)}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </nav>

                <div className="min-w-0">
                    <div className="mb-4"><h4>{meta.label}</h4><p className="text-sm text-gray-500">{meta.desc}</p></div>
                    {error && <Alert showIcon type="danger" className="mb-4">{error}</Alert>}
                    {sectioned && sections.length > 1 && data && <div className="mb-2 flex justify-end text-xs"><button type="button" className="font-semibold text-primary hover:underline" onClick={() => { const next = openSecs.length === sections.length ? [] : sections.map((x) => x.name); setOpenSecs(next); try { localStorage.setItem(memo, JSON.stringify(next)) } catch { /* not saved */ } }}>{openSecs.length === sections.length ? tr('Collapse all') : tr('Expand all')}</button></div>}
                    {!data && !error ? <div className="flex h-60 items-center justify-center"><Spinner size={32} /></div> : data && (
                        <div className={sectioned ? 'flex flex-col gap-2' : 'flex flex-col gap-4'}>
                            {sectioned ? sections.map((sec, i) => {
                                const tone = SEC_TONES[i % SEC_TONES.length]
                                const open = openSecs.includes(sec.name)
                                const toggles = sec.cards.map((c) => c.fields?.find((x) => x.cardToggle)).filter(Boolean)
                                const onCount = toggles.filter((tg) => ['1', 1, true].includes(values[tg.key] ?? tg.default)).length
                                return (
                                    <div key={sec.name} className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-gray-700 dark:bg-gray-800">
                                        <button type="button" aria-expanded={open} onClick={() => toggleSec(sec.name)} className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start transition hover:brightness-95', tone.bg)}>
                                            <span className={cn('size-2.5 shrink-0 rounded-full', tone.dot)} />
                                            <span className={cn('font-semibold', tone.text)}>{tr(sec.name)}</span>
                                            {!sec.single && <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{sec.cards.length}</span>}
                                            {toggles.length > 0 && !sec.single && <span className={cn('text-xs font-semibold', onCount === toggles.length ? 'text-emerald-600' : onCount ? 'text-amber-600' : 'text-gray-400')}>{tr('{n} of {total} on', { n: onCount, total: toggles.length })}</span>}
                                            <span className="min-w-0 flex-1 truncate text-xs text-gray-400">{open ? '' : sec.single ? tr(sec.cards[0].desc || '') : sec.cards.map((c) => tr(c.title)).join(' · ')}</span>
                                            <TbChevronDown className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
                                        </button>
                                        {open && <div className="flex flex-col gap-2.5 p-3">{sec.cards.map((c) => renderCard(c, true, sec.single))}</div>}
                                    </div>
                                )
                            }) : meta.cards.map((c) => renderCard(c, false))}
                        </div>
                    )}
                    {hasFields && canEdit && dirty && (
                        <div className="sticky bottom-4 z-10 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                            <span className="text-sm text-gray-500">{tr("You have unsaved changes")}</span>
                            <div className="flex gap-2"><Button onClick={() => setValues(JSON.parse(saved))}>{tr("Discard")}</Button><Button variant="solid" loading={saving} onClick={save}>{tr("Save changes")}</Button></div>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialog isOpen={!!pending} type="warning" title={tr("Leave without saving?")} confirmText={tr("Leave")} onClose={() => setPending(null)} onRequestClose={() => setPending(null)} onCancel={() => setPending(null)} onConfirm={() => { setParams({ group: pending }); setPending(null) }}>
                <p>{tr("You changed settings on this page and have not saved them.")}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default Settings
