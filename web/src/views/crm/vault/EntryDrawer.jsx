import { useCallback, useEffect, useState } from 'react'
import { TbTrash, TbDice5, TbEye, TbEyeOff, TbLock, TbUsers, TbUserCheck } from 'react-icons/tb'
import dayjs from 'dayjs'
import CreatableSelect from 'react-select/creatable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Tabs from '@/components/ui/Tabs'
import { api, notify } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { generate, strength, CopyButton } from './shared'
import { tr } from '@/utils/t'

const EMPTY = { title: '', categoryId: null, clientId: null, url: '', username: '', password: '', totpSecret: '', tags: [], notes: '', expiresAt: null, access: 'private', viewerIds: [], editorIds: [] }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const ACTION = { create: 'created the entry', update: 'edited', view: 'revealed the password', copy_password: 'copied the password', copy_username: 'copied the username', copy_totp: 'copied the 2FA code', open_url: 'opened the website' }

const EntryDrawer = ({ open, id, categories, staff, onClose, onChanged, onCategories, presets }) => {
    const [v, setV] = useState(EMPTY)
    const [detail, setDetail] = useState(null)
    const [saving, setSaving] = useState(false)
    const [show, setShow] = useState(false)
    const [gen, setGen] = useState({ length: 20, upper: true, lower: true, digits: true, symbols: true })
    const [confirm, setConfirm] = useState(false)
    const [replacePw, setReplacePw] = useState(false)
    const edit = !!id
    const canEdit = edit ? detail?.can.edit : true
    const canShare = edit ? detail?.can.manage : true
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const catOpts = categories.map((c) => ({ value: c.id, label: c.name }))
    const staffOpts = staff.map((s) => ({ value: s.id, label: s.name }))
    const pick = (list, ids) => list.filter((o) => ids.includes(o.value))

    const load = useCallback(async () => {
        if (!id) return
        try {
            const d = await api(`/api/crm/vault/entries/${id}`)
            setDetail(d)
            const e = d.entry
            setV({ ...EMPTY, title: e.title, categoryId: e.categoryId, clientId: e.clientId, url: e.url, username: e.username, tags: e.tags, notes: e.notes, expiresAt: e.expiresAt ? new Date(e.expiresAt) : null, access: e.access, viewerIds: e.viewerIds, editorIds: e.editorIds })
            setReplacePw(false)
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (!open) return; setDetail(null); setShow(false); if (id) load(); else { setV({ ...EMPTY, ...(presets || {}) }); setReplacePw(true) } }, [open, id, load]) // eslint-disable-line react-hooks/exhaustive-deps

    const newCategory = async (name) => { try { const r = await api('/api/crm/vault/categories', { method: 'POST', body: { name } }); await onCategories(); set({ categoryId: r.id }) } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        setSaving(true)
        try {
            const body = { ...v, expiresAt: v.expiresAt ? dayjs(v.expiresAt).format('YYYY-MM-DD') : null }
            if (edit && !replacePw) delete body.password
            await api(edit ? `/api/crm/vault/entries/${id}` : '/api/crm/vault/entries', { method: edit ? 'PUT' : 'POST', body })
            notify('success', edit ? tr("Entry saved") : tr("Entry added")); onChanged()
            if (edit) { setV((x) => ({ ...x, password: '', totpSecret: '' })); await load() } else onClose()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const remove = async () => { setConfirm(false); try { await api(`/api/crm/vault/entries/${id}`, { method: 'DELETE' }); notify('success', tr("Entry deleted")); onChanged(); onClose() } catch (e) { notify('danger', e.message) } }
    const st = strength(v.password)
    const hasPw = detail?.entry.hasPassword

    const details = (
        <div className="space-y-4">
            <div><L>{tr("Name")}</L><Input disabled={!canEdit} autoFocus={!edit} value={v.title} placeholder={tr("e.g. Facebook Business – Kafarat")} onChange={(e) => set({ title: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div><L>{tr("Category")}</L><Select componentAs={CreatableSelect} isClearable isDisabled={!canEdit} options={catOpts} value={catOpts.find((o) => o.value === v.categoryId) || null} onChange={(o) => set({ categoryId: o?.value || null })} onCreateOption={newCategory} formatCreateLabel={(t) => tr("Create category “{t}”", { t: t })} /></div>
                <div><L>{tr("Client (optional)")}</L><RelationSelect resource="clients" value={v.clientId} disabled={!canEdit} onChange={(x) => set({ clientId: x || null })} /></div>
            </div>
            <div><L>{tr("Website / URL")}</L><Input disabled={!canEdit} value={v.url} placeholder={tr("https://")} onChange={(e) => set({ url: e.target.value })} /></div>
            <div><L>{tr("Username / email")}</L><Input disabled={!canEdit} autoComplete="off" value={v.username} onChange={(e) => set({ username: e.target.value })} /></div>
            <div>
                <L>{tr("Password")}</L>
                {edit && !replacePw ? (
                    <div className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700/50"><span>{hasPw ? '••••••••••••' : tr("No password saved")}</span>{canEdit && <Button size="xs" onClick={() => setReplacePw(true)}>{hasPw ? tr("Change password") : tr("Add password")}</Button>}</div>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <Input autoComplete="new-password" type={show ? 'text' : 'password'} value={v.password} placeholder={edit ? tr("New password") : tr("Password")} onChange={(e) => set({ password: e.target.value })} suffix={<button type="button" className="text-lg" onClick={() => setShow(!show)}>{show ? <TbEyeOff /> : <TbEye />}</button>} />
                            <Button type="button" icon={<TbDice5 />} onClick={() => { set({ password: generate(gen) }); setShow(true) }}>{tr("Generate")}</Button>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex flex-1 gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: v.password && i < st.score ? st.color : '#e5e7eb' }} />)}</div><span className="w-16 text-right font-semibold" style={{ color: st.color }}>{st.label}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-300">
                            <label className="flex items-center gap-2">{tr("Length")} <input type="range" min={8} max={64} value={gen.length} onChange={(e) => setGen({ ...gen, length: +e.target.value })} /> <b className="w-5">{gen.length}</b></label>
                            {[['upper', 'A–Z'], ['lower', 'a–z'], ['digits', '0–9'], ['symbols', '#$%']].map(([k, l]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={gen[k]} onChange={(e) => setGen({ ...gen, [k]: e.target.checked })} />{l}</label>)}
                        </div>
                        {edit && <button type="button" className="mt-2 text-xs text-gray-500 underline" onClick={() => { setReplacePw(false); set({ password: '' }) }}>{tr("Keep the current password")}</button>}
                    </>
                )}
            </div>
            <div><L>{tr("2FA secret (optional)")}</L><Input disabled={!canEdit} autoComplete="off" value={v.totpSecret} placeholder={detail?.entry.hasTotp ? tr("A secret is saved. Paste a new one to replace it") : tr("Base32 key shown when you set up an authenticator app")} onChange={(e) => set({ totpSecret: e.target.value })} />{detail?.entry.hasTotp && canEdit && <button type="button" className="mt-1 text-xs text-red-500 underline" onClick={async () => { try { await api(`/api/crm/vault/entries/${id}`, { method: 'PUT', body: { ...v, expiresAt: v.expiresAt ? dayjs(v.expiresAt).format('YYYY-MM-DD') : null, clearTotp: true } }); notify('success', tr("2FA secret removed")); load(); onChanged() } catch (e) { notify('danger', e.message) } }}>{tr("Remove the saved 2FA secret")}</button>}<p className="mt-1 text-xs text-gray-500">{tr("With a secret saved, the team can copy the live 6-digit code instead of sharing a phone.")}</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div><L>{tr("Tags")}</L><Select componentAs={CreatableSelect} isMulti isDisabled={!canEdit} noOptionsMessage={() => tr("Type to add a tag")} options={[]} value={v.tags.map((t) => ({ value: t, label: t }))} onChange={(o) => set({ tags: (o || []).map((x) => x.value) })} /></div>
                <div><L>{tr("Change before")}</L><DatePicker disabled={!canEdit} value={v.expiresAt} onChange={(d) => set({ expiresAt: d })} placeholder={tr("No date")} /></div>
            </div>
            <div><L>{tr("Notes")}</L><Input textArea rows={4} disabled={!canEdit} value={v.notes} placeholder={tr("Security questions, which phone gets the code, who owns the account…")} onChange={(e) => set({ notes: e.target.value })} /></div>
        </div>
    )

    const sharing = (
        <div className="space-y-5">
            <Segment value={v.access} onChange={(a) => canShare && set({ access: Array.isArray(a) ? a[0] : a })} className="w-full">
                <Segment.Item value="private" className="flex-1" disabled={!canShare}><span className="inline-flex items-center gap-1"><TbLock />{tr("Only me")}</span></Segment.Item>
                <Segment.Item value="selected" className="flex-1" disabled={!canShare}><span className="inline-flex items-center gap-1"><TbUserCheck />{tr("Selected people")}</span></Segment.Item>
                <Segment.Item value="team" className="flex-1" disabled={!canShare}><span className="inline-flex items-center gap-1"><TbUsers />{tr("Whole team")}</span></Segment.Item>
            </Segment>
            <p className="text-sm text-gray-500">{v.access === 'private' ? tr("Nobody else can see this entry (administrators can).") : v.access === 'team' ? tr("Every team member with access to the password vault can see and use it. Only you and administrators can change it.") : tr("Only the people you pick can see it. Editors can also change the entry.")}</p>
            {v.access === 'selected' && (
                <>
                    <div><L>{tr("Can view and use")}</L><Select isMulti isDisabled={!canShare} options={staffOpts} value={pick(staffOpts, v.viewerIds)} onChange={(o) => set({ viewerIds: (o || []).map((x) => x.value) })} placeholder={tr("Pick team members")} /></div>
                    <div><L>{tr("Can also edit")}</L><Select isMulti isDisabled={!canShare} options={staffOpts} value={pick(staffOpts, v.editorIds)} onChange={(o) => set({ editorIds: (o || []).map((x) => x.value) })} placeholder={tr("Pick team members")} /></div>
                </>
            )}
            {!canShare && edit && <p className="text-xs text-amber-600">{tr("Only the owner (")}{detail?.entry.owner || tr("unknown")}{tr(") or an administrator can change who shares this entry.")}</p>}
        </div>
    )

    const history = detail && (
        <div className="space-y-3">
            {detail.history.map((h) => <div key={h.id} className="text-sm"><span className="font-semibold heading-text">{h.who}</span> {ACTION[h.action] || h.action}{h.detail ? <span className="text-gray-500"> · {h.detail}</span> : null}<div className="text-xs text-gray-400">{dayjs(h.date).format('DD MMM YYYY, HH:mm')}{h.ip ? ` · ${h.ip}` : ''}</div></div>)}
            {!detail.history.length && <p className="text-gray-500">{tr("Nothing recorded yet.")}</p>}
        </div>
    )

    return (
        <Drawer
            title={edit ? (detail?.entry.title || tr("Entry")) : tr("New entry")} isOpen={open} onClose={onClose} onRequestClose={onClose} width={560}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm(true)}>{tr("Delete")}</Button>}
                    <div className="ml-auto flex gap-2"><Button onClick={onClose}>{canEdit ? tr("Cancel") : tr("Close")}</Button>{canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? tr("Save changes") : tr("Add entry")}</Button>}</div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">{tr("Loading…")}</div> : (
                <Tabs defaultValue="details">
                    <Tabs.TabList><Tabs.TabNav value="details">{tr("Details")}</Tabs.TabNav><Tabs.TabNav value="sharing">{tr("Sharing")}</Tabs.TabNav>{edit && detail?.can.history && <Tabs.TabNav value="history">{tr("History")}</Tabs.TabNav>}</Tabs.TabList>
                    <div className="pt-4"><Tabs.TabContent value="details">{details}</Tabs.TabContent><Tabs.TabContent value="sharing">{sharing}</Tabs.TabContent><Tabs.TabContent value="history">{history}</Tabs.TabContent></div>
                </Tabs>
            )}
            <ConfirmDialog isOpen={confirm} type="danger" title={tr("Delete this entry?")} confirmText={tr("Delete")} onClose={() => setConfirm(false)} onCancel={() => setConfirm(false)} onConfirm={remove}><p>{tr("The saved password and its history are removed for good.")}</p></ConfirmDialog>
        </Drawer>
    )
}

export default EntryDrawer
