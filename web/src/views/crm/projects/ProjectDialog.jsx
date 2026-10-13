import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { api, notify } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { STATUS, BILLING, useStaff } from './shared'

const EMPTY = { name: '', clientId: null, status: 1, billingType: 1, startDate: new Date(), deadline: null, memberIds: [], description: '' }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>

/** Create dialog (the demo's "Add new project"). */
const ProjectDialog = ({ open, onClose, onCreated, presets }) => {
    const staff = useStaff()
    const [v, setV] = useState(EMPTY)
    const [saving, setSaving] = useState(false)
    const set = (p) => setV((x) => ({ ...x, ...p }))
    useEffect(() => { if (open) setV({ ...EMPTY, ...(presets || {}) }) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    const opts = staff.map((s) => ({ value: s.id, label: s.name }))
    const save = async () => {
        setSaving(true)
        try {
            const r = await api('/api/crm/work/projects', { method: 'POST', body: { ...v, startDate: v.startDate ? dayjs(v.startDate).format('YYYY-MM-DD') : null, deadline: v.deadline ? dayjs(v.deadline).format('YYYY-MM-DD') : null } })
            notify('success', 'Project created'); onCreated(r.id)
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    return (
        <Dialog isOpen={open} width={620} onClose={onClose} onRequestClose={onClose}>
            <h4>Add new project</h4>
            <div className="mt-4 space-y-4">
                <div><L>Project name</L><Input autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><L>Client</L><RelationSelect resource="clients" value={v.clientId} onChange={(x) => set({ clientId: x || null })} /></div>
                    <div><L>Status</L><Select options={STATUS.map((s) => ({ value: s.value, label: s.label }))} value={STATUS.filter((s) => s.value === v.status).map((s) => ({ value: s.value, label: s.label }))[0]} onChange={(o) => set({ status: o.value })} /></div>
                    <div><L>Start date</L><DatePicker value={v.startDate} onChange={(d) => set({ startDate: d })} /></div>
                    <div><L>Deadline</L><DatePicker value={v.deadline} onChange={(d) => set({ deadline: d })} /></div>
                    <div><L>Billing</L><Select options={BILLING} value={BILLING.find((b) => b.value === v.billingType)} onChange={(o) => set({ billingType: o.value })} /></div>
                    <div><L>Team</L><Select isMulti options={opts} value={opts.filter((o) => v.memberIds.includes(o.value))} onChange={(o) => set({ memberIds: (o || []).map((x) => x.value) })} /></div>
                </div>
                <div><L>Description</L><Input textArea rows={4} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="solid" loading={saving} disabled={!v.name.trim()} onClick={save}>Create project</Button></div>
        </Dialog>
    )
}

export default ProjectDialog
