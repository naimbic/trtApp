import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import AccordionCard from '@/components/crm/AccordionCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { TbArrowNarrowLeft, TbTemplate, TbDeviceFloppy } from 'react-icons/tb'
import { api, notify, useCan } from '../kit/api'
import { useSessionUser } from '@/store/authStore'
import RelationSelect from '../kit/RelationSelect'
import ContractText from './contractText'
import confirmDelete from '@/components/crm/useConfirm'
import { tr } from '@/utils/t'

const TEMPLATES = '/api/crm/sales/contracts/templates'
const hasText = (h) => !!String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const addMonths = (d, n) => { const x = new Date(`${d}T00:00:00`); x.setMonth(x.getMonth() + Number(n)); x.setDate(x.getDate() - 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const day = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '')

const ContractEditor = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const can = useCan()
    const [types, setTypes] = useState([])
    const [templates, setTemplates] = useState([])
    const [tplId, setTplId] = useState(null)
    const [v, setV] = useState(null)
    const [open, setOpen] = useState({ text: true, desc: false, how: false }) // folding sections of the form
    const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const authority = useSessionUser((x) => x.user.authority) || []
    const superAdmin = authority.includes('admin') || authority.includes('crm.admin')
    const [wasLocked, setWasLocked] = useState(false)
    const set = (p) => setV((x) => ({ ...x, ...p }))

    const fromId = params.get('from')
    const startTpl = !id && !fromId ? params.get('template') : null // a new contract opened from a template
    useEffect(() => {
        Promise.all([api('/api/crm/sales/contracts?pageSize=1'), id || fromId ? api(`/api/crm/sales/contracts/${id || fromId}`) : null, api(TEMPLATES).catch(() => ({ list: [] })), startTpl ? api(`${TEMPLATES}?id=${startTpl}`).catch(() => null) : null]).then(([l, c, tp, t0]) => {
            setTemplates((tp.list || []).filter((t) => t.active))
            if (t0) setTplId(t0.id)
            const cloned = !id && !!c // a duplicate: the wording of another contract as a new, unsigned one that starts today
            if (id && c?.locked && !superAdmin) { notify('warning', tr("A signed contract cannot be edited")); navigate(`/crm/contracts/${id}`, { replace: true }); return }
            setWasLocked(!cloned && !!c?.locked)
            const tl = l.stats?.types || []
            setTypes(tl)
            // the type that is the default (and its length) is already chosen on a new contract
            const def = !c ? tl.find((t) => t.id === (t0?.typeId || params.get('typeId'))) || tl.find((t) => t.isDefault) : null
            setV(c ? { subject: c.subject || '', clientId: c.clientId, typeId: c.typeId, projectId: c.projectId, dateStart: cloned ? day(new Date()) : day(c.dateStart), dateEnd: cloned ? (c.dateStart && c.dateEnd ? day(new Date(Date.now() + (new Date(c.dateEnd) - new Date(c.dateStart)))) : '') : day(c.dateEnd), value: c.value ?? '', description: c.description || '', content: c.content || '', hidden: !!c.hidden, remindClient: c.remindClient !== false, signed: cloned ? false : c.signed || c.markedAsSigned } : { subject: '', clientId: params.get('clientId'), typeId: def?.id || null, projectId: null, dateStart: day(new Date()), dateEnd: def?.months ? addMonths(day(new Date()), def.months) : '', value: '', description: '', content: t0?.content || '', hidden: false, remindClient: true, signed: false })
        }).catch((e) => setError(e.message))
    }, [id, fromId, startTpl]) // eslint-disable-line react-hooks/exhaustive-deps

    // choosing a template puts its text in the contract (and its type, when the template sets one); a text already written is only replaced after a yes
    const useTemplate = async (o) => {
        if (!o) return setTplId(null)
        try {
            const t = await api(`${TEMPLATES}?id=${o.value}`)
            const apply = () => { setTplId(t.id); const ty = types.find((x) => x.id === t.typeId); set({ content: t.content, ...(ty ? { typeId: ty.id, ...(ty.months && v.dateStart && !v.dateEnd ? { dateEnd: addMonths(v.dateStart, ty.months) } : {}) } : {}) }) }
            if (hasText(v.content)) confirmDelete(tr("Replace the text with this template?"), apply, { text: tr("What is written now is replaced by the text of the template."), confirmText: tr("Replace"), type: 'warning' })
            else apply()
        } catch (e) { notify('danger', e.message) }
    }
    const saveAsTemplate = async () => {
        const name = window.prompt(tr("Name of the new template"), v.subject || '')
        if (!name?.trim()) return
        try { await api(TEMPLATES, { method: 'POST', body: { name: name.trim(), content: v.content, typeId: v.typeId } }); notify('success', tr("Saved as a template")); const tp = await api(TEMPLATES); setTemplates((tp.list || []).filter((t) => t.active)) } catch (e) { notify('danger', e.message) }
    }

    const save = async () => {
        setSaving(true); setError('')
        try {
            const r = await api(id ? `/api/crm/sales/contracts/${id}` : '/api/crm/sales/contracts', { method: id ? 'PUT' : 'POST', body: { ...v, force: wasLocked } })
            notify('success', id ? tr("Contract saved") : tr("Contract created")); navigate(`/crm/contracts/${r.id}`)
        } catch (e) { setError(e.message); window.scrollTo({ top: 0, behavior: 'smooth' }) } finally { setSaving(false) }
    }
    if (!v) return <Container><div className="py-16 text-center text-gray-400">{error || tr("Loading…")}</div></Container>
    const tplOpts = templates.map((t) => ({ value: t.id, label: t.type ? `${t.name} · ${t.type}` : t.name }))
    const typeOpts = types.filter((t) => t.active !== false || t.id === v.typeId).map((t) => ({ value: t.id, label: t.name }))
    // choosing a type with a length fills the end date (counted from the start date) when it is empty or was filled by a type before
    const chooseType = (o) => {
        const t = types.find((x) => x.id === o?.value)
        const prev = types.find((x) => x.id === v.typeId)
        const auto = !v.dateEnd || (prev?.months && v.dateEnd === addMonths(v.dateStart, prev.months))
        set({ typeId: o?.value || null, ...(t?.months && auto && v.dateStart ? { dateEnd: addMonths(v.dateStart, t.months) } : {}) })
    }

    return (
        <div className="flex h-full w-full flex-col justify-between">
            <Container>
                <div className="mb-4"><h3>{id ? tr("Edit contract") : tr("New contract")}</h3></div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                {v.signed && <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10">{tr("This contract is signed. You can change its details, but not its text.")}</div>}
                {/* same layout as the sales forms: the subject and the text wide on the left, settings cards on the right (switch at the top right). One column on small screens */}
                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col gap-3">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><L>{tr("Subject")}</L><Input className="text-base font-semibold" value={v.subject} placeholder={tr("e.g. Website maintenance 2026")} onChange={(e) => set({ subject: e.target.value })} /></div>

                        <AccordionCard title={tr("Contract text")} dot="#f59e0b" note={tr("What the client reads")} open={open.text} onToggle={() => toggle('text')}>
                            <div className="p-4">
                                {!v.signed && (
                                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-2.5 dark:bg-amber-500/10">
                                        <TbTemplate className="shrink-0 text-xl text-amber-600" />
                                        <div className="min-w-[220px] flex-1"><Select size="sm" isClearable placeholder={templates.length ? tr("Start from a template") : tr("No template yet")} isDisabled={!templates.length} options={tplOpts} value={tplOpts.find((o) => o.value === tplId) || null} onChange={useTemplate} /></div>
                                        {can('contracts', 'create') && hasText(v.content) && <Button size="sm" icon={<TbDeviceFloppy />} onClick={saveAsTemplate}>{tr("Save as a template")}</Button>}
                                        <Button size="sm" variant="plain" data-href="/crm/contracts/templates" onClick={() => window.open('/crm/contracts/templates', '_blank')}>{tr("Manage templates")}</Button>
                                    </div>
                                )}
                                <p className="mb-2 text-xs text-gray-500">{tr("Write the contract. Merge fields are replaced when the client opens it or you print the PDF.")}</p>
                                <ContractText value={v.content} disabled={!!v.signed} onChange={(html) => !v.signed && set({ content: html })} />
                            </div>
                        </AccordionCard>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-24">
                        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                            <div className="w-full"><L>{tr("Client")}</L><RelationSelect resource="clients" value={v.clientId} onChange={(x) => set({ clientId: x || null })} /></div>
                            <div className="w-full"><L>{tr("Contract type")}</L><Select isClearable options={typeOpts} value={typeOpts.find((o) => o.value === v.typeId) || null} onChange={chooseType} /></div>
                            <div className="min-w-[130px] flex-1"><L>{tr("Start date")}</L><Input type="date" value={v.dateStart} onChange={(e) => { const m = types.find((x) => x.id === v.typeId)?.months; set({ dateStart: e.target.value, ...(m && e.target.value && (!v.dateEnd || v.dateEnd === addMonths(v.dateStart, m)) ? { dateEnd: addMonths(e.target.value, m) } : {}) }) }} /></div>
                            <div className="min-w-[130px] flex-1" title={tr("End date (empty = no end)")}><L>{tr("End date")}</L><Input type="date" value={v.dateEnd} onChange={(e) => set({ dateEnd: e.target.value })} /></div>
                            <div className="w-full"><L>{tr("Contract value")}</L><Input type="number" step="0.01" min={0} value={v.value} onChange={(e) => set({ value: e.target.value })} /></div>
                        </div>

                        <AccordionCard title={tr("Short description (internal)")} dot="#8b5cf6" note={v.description || undefined} open={open.desc} onToggle={() => toggle('desc')}>
                            <div className="p-3"><Input textArea rows={3} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
                        </AccordionCard>
                        <AccordionCard title={tr("Expiry reminder")} dot="#6b7280" right={<Switcher checked={v.remindClient !== false} onChange={(c) => set({ remindClient: c })} />} />
                        <AccordionCard title={tr("Hide from the client")} dot="#6b7280" right={<Switcher checked={v.hidden} onChange={(c) => set({ hidden: c })} />} />
                        <AccordionCard title={tr("How it works")} dot="#06b6d4" open={open.how} onToggle={() => toggle('how')}>
                            <div className="p-3"><ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300"><li>{tr("Save the contract, check the preview.")}</li><li>{tr("Send it, or copy the client link.")}</li><li>{tr("The client reads it and signs on the page.")}</li><li>{tr("You get an email and the signature is kept with date and IP.")}</li></ol></div>
                        </AccordionCard>
                    </div>
                </div>
            </Container>
            <BottomStickyBar>
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <Button type="button" variant="plain" icon={<TbArrowNarrowLeft />} onClick={() => navigate(id ? `/crm/contracts/${id}` : '/crm/contracts')}>{tr("Back")}</Button>
                        <Button variant="solid" loading={saving} onClick={save}>{id ? tr("Save changes") : tr("Create contract")}</Button>
                    </div>
                </Container>
            </BottomStickyBar>
        </div>
    )
}

export default ContractEditor
