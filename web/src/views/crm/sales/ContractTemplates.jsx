/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbPlus, TbSearch, TbTemplate, TbCircleCheck, TbFileCertificate, TbPencil, TbTrash, TbArrowNarrowLeft, TbSparkles, TbCopy } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import AccordionCard from '@/components/crm/AccordionCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import confirmDelete from '@/components/crm/useConfirm'
import { api, notify, useCan } from '../kit/api'
import { InvoiceHead } from './InvoiceInsights'
import ContractText from './contractText'
import { tr, trn } from '@/utils/t'

const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const URL = '/api/crm/sales/contracts/templates'

/** Contracts, Templates: the ready texts a new contract starts from. */
const ContractTemplates = () => {
    const navigate = useNavigate()
    const can = useCan()
    const [list, setList] = useState(null)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [show, setShow] = useState('all')
    const [busy, setBusy] = useState(false)

    const load = useCallback(() => api(URL).then((d) => { setList(d.list || []); setError('') }).catch((e) => { setError(e.message); setList([]) }), [])
    useEffect(() => { load() }, [load])

    const starters = async () => {
        setBusy(true)
        try { const r = await api(URL, { method: 'POST', body: { starters: true } }); notify('success', r.added ? trn(r.added, 'example added', 'examples added') : tr("The examples are already in your list")); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const remove = (t) => confirmDelete(tr("Delete this template?"), async () => { try { await api(`${URL}?id=${t.id}`, { method: 'DELETE' }); notify('success', tr("Template deleted")); load() } catch (e) { notify('danger', e.message) } }, { text: tr("Contracts already written from it keep their text.") })
    const copy = async (t) => {
        try {
            const full = await api(`${URL}?id=${t.id}`)
            const r = await api(URL, { method: 'POST', body: { name: `${full.name} (${tr("copy")})`, description: full.description, content: full.content, typeId: full.typeId, active: full.active } })
            navigate(`/crm/contracts/templates/${r.id}`)
        } catch (e) { notify('danger', e.message) }
    }

    const all = list || []
    const q = search.trim().toLowerCase()
    const shown = all.filter((t) => (show === 'all' || (show === 'active') === t.active) && (!q || `${t.name} ${t.description} ${t.type}`.toLowerCase().includes(q)))

    return (
        <Container>
            <InvoiceHead
                title={tr("Contract templates")}
                action={<div className="flex flex-wrap gap-2">
                    <Button icon={<TbArrowNarrowLeft />} data-href="/crm/contracts" onClick={() => navigate('/crm/contracts')}>{tr("Contracts")}</Button>
                    {can('contracts', 'create') && <Button variant="solid" icon={<TbPlus />} data-href="/crm/contracts/templates/new" onClick={() => navigate('/crm/contracts/templates/new')}>{tr("New template")}</Button>}
                </div>}
                stats={[
                    { icon: <TbTemplate />, label: tr("Templates"), value: String(all.length) },
                    { icon: <TbCircleCheck />, label: tr("Offered for new contracts"), value: String(all.filter((t) => t.active).length) },
                ]}
            />
            <div className="cx-tools">
                <Input className="cx-search" size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search a template")} value={search} onChange={(e) => setSearch(e.target.value)} />
                <Segment size="sm" value={show} onChange={(v) => { const x = Array.isArray(v) ? v[0] : v; if (x) setShow(x) }}>
                    <Segment.Item value="all">{tr("All")}</Segment.Item><Segment.Item value="active">{tr("Active")}</Segment.Item><Segment.Item value="off">{tr("Inactive")}</Segment.Item>
                </Segment>
                <span className="cx-spacer" />
                {can('contracts', 'create') && <Button size="sm" icon={<TbSparkles />} loading={busy} onClick={starters}>{tr("Add the examples")}</Button>}
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            {list === null ? <div className="py-16 text-center text-gray-400">{tr("Loading…")}</div> : !shown.length ? (
                <div className="rounded-3xl border border-dashed border-gray-300 px-6 py-14 text-center dark:border-gray-600">
                    <TbTemplate className="mx-auto mb-3 text-4xl text-gray-300" />
                    <h5 className="mb-1">{all.length ? tr("No template matches") : tr("No template yet")}</h5>
                    <p className="mx-auto mb-5 max-w-md text-sm text-gray-500">{all.length ? tr("Try another search.") : tr("A template is a contract text written once: choose it on a new contract and only the client, the dates and the value are left to fill.")}</p>
                    {!all.length && can('contracts', 'create') && <div className="flex flex-wrap justify-center gap-2"><Button variant="solid" icon={<TbPlus />} onClick={() => navigate('/crm/contracts/templates/new')}>{tr("New template")}</Button><Button icon={<TbSparkles />} loading={busy} onClick={starters}>{tr("Add the examples")}</Button></div>}
                </div>
            ) : (
                <div className="rp-cx">
                    <div className="cx-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {shown.map((t, i) => {
                            const open = () => navigate(`/crm/contracts/templates/${t.id}`)
                            return (
                                <article key={t.id} className="cx-card" style={{ '--i': Math.min(i, 12) }} data-href={`/crm/contracts/templates/${t.id}`} role="link" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open() }}>
                                    <header className="cx-card__top">
                                        <span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-2xl text-amber-700"><TbFileCertificate /></span>
                                        <span className="cx-card__tools">{!t.active && <span className="cx-off">{tr("Inactive")}</span>}</span>
                                    </header>
                                    <h3 className="cx-card__name" title={t.name}>{t.name}</h3>
                                    <p className="cx-card__role">{t.description || t.excerpt || '—'}</p>
                                    <dl className="cx-card__facts">
                                        <div><dt>{tr("Length")}</dt><dd>{trn(t.words, 'word')}</dd></div>
                                        <div><dt>{tr("Changed")}</dt><dd>{dayjs(t.updatedAt).format('DD MMM YYYY')}</dd></div>
                                    </dl>
                                    <footer className="cx-card__foot" onClick={(e) => e.stopPropagation()}>
                                        {t.type ? <span className="cx-chip">{t.type}</span> : <span />}
                                        <span className="cx-card__acts">
                                            {can('contracts', 'create') && t.active && <button type="button" className="cx-ibtn" title={tr("New contract from this template")} aria-label={tr("New contract from this template")} onClick={() => navigate(`/crm/contracts/new?template=${t.id}`)}><TbPlus /></button>}
                                            {can('contracts', 'create') && <button type="button" className="cx-ibtn" title={tr("Duplicate")} aria-label={tr("Duplicate")} onClick={() => copy(t)}><TbCopy /></button>}
                                            {can('contracts', 'edit') && <button type="button" className="cx-ibtn" title={tr("Edit")} aria-label={tr("Edit")} onClick={open}><TbPencil /></button>}
                                            {can('contracts', 'delete') && <button type="button" className="cx-ibtn" title={tr("Delete")} aria-label={tr("Delete")} onClick={() => remove(t)}><TbTrash /></button>}
                                        </span>
                                    </footer>
                                </article>
                            )
                        })}
                    </div>
                </div>
            )}
        </Container>
    )
}

/** One template: its name, the type it sets, and its text in the full editor. */
export const ContractTemplateEditor = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const can = useCan()
    const [types, setTypes] = useState([])
    const [v, setV] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const mayEdit = can('contracts', id ? 'edit' : 'create')

    useEffect(() => {
        Promise.all([api('/api/crm/sales/contracts?pageSize=1'), id ? api(`${URL}?id=${id}`) : null]).then(([l, t]) => {
            setTypes(l.stats?.types || [])
            setV(t ? { name: t.name, description: t.description, content: t.content, typeId: t.typeId, active: t.active } : { name: '', description: '', content: '', typeId: null, active: true })
        }).catch((e) => setError(e.message))
    }, [id])

    const save = async () => {
        setSaving(true); setError('')
        try {
            await api(URL, { method: id ? 'PUT' : 'POST', body: { ...v, id } })
            notify('success', id ? tr("Template saved") : tr("Template created")); navigate('/crm/contracts/templates')
        } catch (e) { setError(e.message); window.scrollTo({ top: 0, behavior: 'smooth' }) } finally { setSaving(false) }
    }
    if (!v) return <Container><div className="py-16 text-center text-gray-400">{error || tr("Loading…")}</div></Container>
    const typeOpts = types.filter((t) => t.active !== false || t.id === v.typeId).map((t) => ({ value: t.id, label: t.name }))

    return (
        <div className="flex h-full w-full flex-col justify-between">
            <Container>
                <div className="mb-4"><h3>{id ? tr("Edit template") : tr("New template")}</h3></div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col gap-3">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><L>{tr("Template name")}</L><Input className="text-base font-semibold" disabled={!mayEdit} value={v.name} placeholder={tr("e.g. Maintenance agreement")} onChange={(e) => set({ name: e.target.value })} /></div>
                        <AccordionCard title={tr("Template text")} dot="#f59e0b" note={tr("What every contract made from it starts with")} open onToggle={() => {}}>
                            <div className="p-4">
                                <p className="mb-2 text-xs text-gray-500">{tr("Write the text once. Merge fields are replaced by the client, the dates and the value of each contract. The letterhead, the two parties and the signatures are added by the contract itself.")}</p>
                                <ContractText value={v.content} disabled={!mayEdit} onChange={(html) => set({ content: html })} />
                            </div>
                        </AccordionCard>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-24">
                        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                            <div><L>{tr("Contract type")}</L><Select isClearable isDisabled={!mayEdit} placeholder={tr("Not set by the template")} options={typeOpts} value={typeOpts.find((o) => o.value === v.typeId) || null} onChange={(o) => set({ typeId: o?.value || null })} /></div>
                            <div><L>{tr("What it is for")}</L><Input textArea rows={3} disabled={!mayEdit} value={v.description} placeholder={tr("A line to recognise it in the list")} onChange={(e) => set({ description: e.target.value })} /></div>
                        </div>
                        <AccordionCard title={tr("Offered for new contracts")} dot="#6b7280" right={<Switcher disabled={!mayEdit} checked={v.active} onChange={(c) => set({ active: c })} />} />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <Button type="button" variant="plain" icon={<TbArrowNarrowLeft />} onClick={() => navigate('/crm/contracts/templates')}>{tr("Back")}</Button>
                        {mayEdit && <Button variant="solid" loading={saving} onClick={save}>{id ? tr("Save changes") : tr("Create template")}</Button>}
                    </div>
                </Container>
            </BottomStickyBar>
        </div>
    )
}

export default ContractTemplates
