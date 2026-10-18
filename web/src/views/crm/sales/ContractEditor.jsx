import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { TbArrowNarrowLeft } from 'react-icons/tb'
import { api, notify } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import VisualEditor from '../mail/VisualEditor'
import { tr } from '@/utils/t'
import ReminderSwitch from '../kit/ReminderSwitch'

const TOKENS = ['contract_subject', 'contract_datestart', 'contract_dateend', 'contract_contract_value', 'contract_type', 'contract_id', 'contract_today', 'client_company', 'client_street', 'client_city', 'client_vat_number', 'company_name', 'address', 'vat_number_with_label']
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const day = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '')

const ContractEditor = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const visual = useRef(null)
    const [types, setTypes] = useState([])
    const [v, setV] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const set = (p) => setV((x) => ({ ...x, ...p }))

    useEffect(() => {
        Promise.all([api('/api/crm/sales/contracts?pageSize=1'), id ? api(`/api/crm/sales/contracts/${id}`) : null]).then(([l, c]) => {
            if (c?.locked) { notify('warning', tr("A signed contract cannot be edited")); navigate(`/crm/contracts/${id}`, { replace: true }); return }
            setTypes(l.stats?.types || [])
            setV(c ? { subject: c.subject || '', clientId: c.clientId, typeId: c.typeId, projectId: c.projectId, dateStart: day(c.dateStart), dateEnd: day(c.dateEnd), value: c.value ?? '', description: c.description || '', content: c.content || '', hidden: !!c.hidden, remindClient: c.remindClient !== false, signed: c.signed || c.markedAsSigned } : { subject: '', clientId: params.get('clientId'), typeId: null, projectId: null, dateStart: day(new Date()), dateEnd: '', value: '', description: '', content: '', hidden: false, remindClient: true, signed: false })
        }).catch((e) => setError(e.message))
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        setSaving(true); setError('')
        try {
            const r = await api(id ? `/api/crm/sales/contracts/${id}` : '/api/crm/sales/contracts', { method: id ? 'PUT' : 'POST', body: v })
            notify('success', id ? tr("Contract saved") : tr("Contract created")); navigate(`/crm/contracts/${r.id}`)
        } catch (e) { setError(e.message); window.scrollTo({ top: 0, behavior: 'smooth' }) } finally { setSaving(false) }
    }
    if (!v) return <Container><div className="py-16 text-center text-gray-400">{error || tr("Loading…")}</div></Container>
    const typeOpts = types.map((t) => ({ value: t.id, label: t.name }))

    return (
        <div className="flex h-full w-full flex-col justify-between">
            <Container>
                <div className="mb-4"><h3>{id ? tr("Edit contract") : tr("New contract")}</h3></div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                {v.signed && <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10">{tr("This contract is signed. You can change its details, but not its text.")}</div>}
                <div className="flex flex-col gap-4 xl:flex-row">
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <Card>
                            <h4 className="mb-5">{tr("Details")}</h4>
                            <div className="mb-4"><L>{tr("Subject")}</L><Input value={v.subject} placeholder={tr("e.g. Website maintenance 2026")} onChange={(e) => set({ subject: e.target.value })} /></div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div><L>{tr("Client")}</L><RelationSelect resource="clients" value={v.clientId} onChange={(x) => set({ clientId: x || null })} /></div>
                                <div><L>{tr("Contract type")}</L><Select isClearable options={typeOpts} value={typeOpts.find((o) => o.value === v.typeId) || null} onChange={(o) => set({ typeId: o?.value || null })} /></div>
                                <div><L>{tr("Start date")}</L><Input type="date" value={v.dateStart} onChange={(e) => set({ dateStart: e.target.value })} /></div>
                                <div><L>{tr("End date (empty = no end)")}</L><Input type="date" value={v.dateEnd} onChange={(e) => set({ dateEnd: e.target.value })} /></div>
                                <div><L>{tr("Contract value")}</L><Input type="number" step="0.01" min={0} value={v.value} onChange={(e) => set({ value: e.target.value })} /></div>
                            </div>
                            <div className="mt-4"><L>{tr("Short description (internal)")}</L><Input textArea rows={2} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
                        </Card>
                        <Card>
                            <div className="mb-3"><h4>{tr("Contract text")}</h4><p className="text-sm text-gray-500">{tr("Write the contract. Merge fields are replaced when the client opens it or you print the PDF.")}</p></div>
                            <div className="mb-3 flex flex-wrap gap-1.5">{TOKENS.map((t) => <button key={t} type="button" disabled={v.signed} onClick={() => visual.current?.insert(`{${t}}`)} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary disabled:opacity-50 dark:bg-gray-700">{`{${t}}`}</button>)}</div>
                            <VisualEditor ref={visual} docKey={`contract-${id || 'new'}`} value={v.content} onChange={(html) => !v.signed && set({ content: html })} />
                        </Card>
                    </div>
                    <div className="flex flex-col gap-4 xl:w-[340px]">
                        <Card>
                            <h4>{tr("Visibility")}</h4>
                            <ReminderSwitch className="mt-5 flex items-center justify-between gap-6" checked={v.remindClient !== false} onChange={(c) => set({ remindClient: c })} title={tr("Send expiry reminders to the client")} hint={tr("Shortly before the contract ends, the client receives a notice by email.")} />
                            <div className="mt-5 flex items-center justify-between gap-6"><div><h6>{tr("Hide from the client")}</h6><p className="text-sm text-gray-500">{tr("The client link and the client area will not show this contract.")}</p></div><Switcher checked={v.hidden} onChange={(c) => set({ hidden: c })} /></div>
                        </Card>
                        <Card><h4>{tr("How it works")}</h4><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300"><li>{tr("Save the contract, check the preview.")}</li><li>{tr("Send it, or copy the client link.")}</li><li>{tr("The client reads it and signs on the page.")}</li><li>{tr("You get an email and the signature is kept with date and IP.")}</li></ol></Card>
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
