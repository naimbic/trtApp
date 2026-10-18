import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TbAdjustmentsHorizontal, TbBellRinging, TbBrandGoogle, TbBuilding, TbBuildingBank, TbCalendar, TbChecklist, TbClockPlay, TbFileDescription, TbFileInvoice, TbFileTypePdf, TbFilter, TbLifebuoy, TbMail, TbPresentation, TbReceipt2, TbReceiptRefund, TbRepeat, TbShoppingCart, TbSignature, TbSparkles, TbTags, TbUsers, TbWorld } from 'react-icons/tb'
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
import { ClientPermissionsPanel, CronPanel, CustomFieldsPanel, EmailDesignPanel, FormatPanel, ResourceManager } from './panels'
import { MailServerSettings } from '../mail/Mails'
import AiSettingsPanel from '../ai/AiSettingsPanel'
import { refreshBranding } from '@/utils/hooks/useBranding'
import { tr } from '@/utils/t'

const ICONS = { TbBuildingBank, TbAdjustmentsHorizontal, TbBuilding, TbWorld, TbMail, TbReceipt2, TbFileInvoice, TbFileDescription, TbPresentation, TbShoppingCart, TbReceiptRefund, TbRepeat, TbUsers, TbChecklist, TbLifebuoy, TbFilter, TbBrandGoogle, TbBellRinging, TbCalendar, TbSparkles, TbFileTypePdf, TbSignature, TbTags, TbClockPlay }

// panel key -> resource key for the plain list managers
const LISTS = { currencies: ['currencies', tr("The currencies you invoice in. Prefix puts the symbol before the amount, suffix after it.")], taxes: ['taxes', tr("The taxes you can add to document lines.")], ticketStatuses: ['ticket-statuses'], ticketPriorities: ['ticket-priorities'], departments: ['departments'], predefinedReplies: ['predefined-replies'], spamFilters: ['spam-filters'], leadStatuses: ['lead-statuses'], leadSources: ['lead-sources'], webToLead: ['web-to-lead'], tags: ['tags', tr("Tags can be attached to clients, leads, tasks and more.")] }

const Panel = ({ name, group, values, setValue, ctx }) => {
    if (name === 'ai') return <AiSettingsPanel />
    if (name === 'bankAccounts') return <ResourceManager resourceKey="bank-accounts" />
    if (name === 'smtp') return <MailServerSettings />
    if (name === 'companyFormat') return <FormatPanel kind="company" fieldKey="company_info_format" values={values} setValue={setValue} />
    if (name === 'customerFormat') return <FormatPanel kind="client" fieldKey="customer_info_format" values={values} setValue={setValue} customFields={ctx.customFields} />
    if (name === 'emailDesign') return <EmailDesignPanel values={values} setValue={setValue} />
    if (name === 'customFields') return <CustomFieldsPanel />
    if (name === 'clientPermissions') return <ClientPermissionsPanel />
    if (name === 'cronCommand') return <CronPanel />
    if (name === 'cronLog') return <CronPanel log />
    if (LISTS[name]) return <ResourceManager resourceKey={LISTS[name][0]} note={LISTS[name][1]} />
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

    const hasFields = (meta.cards || []).some((c) => c.fields?.length)

    return (
        <Container>
            <div className="mb-4"><h3>{tr("Settings")}</h3><p className="text-sm text-gray-500">{tr("Configure the whole platform")}</p></div>
            <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
                <nav className="lg:sticky lg:top-20 lg:self-start">
                    <Card bodyClass="p-2">
                        {SECTIONS.map((s) => (
                            <div key={s.section} className="mb-2 last:mb-0">
                                <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.section}</div>
                                {s.groups.map((k) => {
                                    const Icon = ICONS[GROUPS[k].icon]
                                    return (
                                        <button key={k} type="button" onClick={() => go(k)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition', k === group ? 'bg-primary/10 font-semibold text-primary' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50')}>
                                            {Icon && <Icon className="text-lg" />}{GROUPS[k].label}
                                        </button>
                                    )
                                })}
                            </div>
                        ))}
                    </Card>
                </nav>

                <div className="min-w-0">
                    <div className="mb-4"><h4>{meta.label}</h4><p className="text-sm text-gray-500">{meta.desc}</p></div>
                    {error && <Alert showIcon type="danger" className="mb-4">{error}</Alert>}
                    {!data && !error ? <div className="flex h-60 items-center justify-center"><Spinner size={32} /></div> : data && (
                        <div className="flex flex-col gap-4">
                            {meta.cards.map((c) => {
                                const tg = c.fields?.find((x) => x.cardToggle) // a category's own on/off switch, at the top right of its card
                                const on = !tg || ['1', 1, true].includes(values[tg.key] ?? tg.default)
                                return (
                                <Card key={c.title}>
                                    <div className="flex items-start justify-between gap-4">
                                        <h5 className="mb-0.5">{c.title}</h5>
                                        {tg && <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-gray-500"><span className={on ? 'text-emerald-600' : 'text-gray-400'}>{on ? tr("On") : tr("Off")}</span><Switcher checked={on} disabled={!canEdit} onChange={(v) => setValue(tg.key, v ? '1' : '0')} /></label>}
                                    </div>
                                    {c.desc && <p className="mb-4 text-sm text-gray-500">{c.desc}</p>}
                                    {!c.desc && <div className="mb-3" />}
                                    {c.fields?.filter((x) => !x.cardToggle).length > 0 && (
                                        <div className={cn("grid grid-cols-1 gap-x-5 gap-y-4 transition-opacity md:grid-cols-2 [&>div.md\\:col-span-2:has(button[role=switch])]:border-t", !on && "opacity-50")}>
                                            {c.fields.filter((x) => !x.cardToggle).map((x) => <Field key={x.key} field={x} value={values[x.key]} secretSet={secrets[x.key]} onChange={(v, instant) => setValue(x.key, v, instant)} canEdit={canEdit} taxes={ctx.taxes} />)}
                                            {c.panel && <Panel name={c.panel} group={group} values={values} setValue={setValue} ctx={ctx} />}
                                        </div>
                                    )}
                                    {!c.fields?.length && c.panel && <Panel name={c.panel} group={group} values={values} setValue={setValue} ctx={ctx} />}
                                </Card>
                                )
                            })}
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
