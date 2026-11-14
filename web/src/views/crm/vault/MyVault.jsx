import { useCallback, useEffect, useRef, useState } from 'react'
import { TbLock, TbPlus, TbSearch, TbEye, TbEyeOff, TbPencil, TbTrash, TbExternalLink, TbDice5, TbKey } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tooltip from '@/components/ui/Tooltip'
import { confirmDelete } from '@/components/crm/useConfirm'
import { api, notify } from '../kit/api'
import { generate, initials, CopyButton } from './shared'
import { tr } from '@/utils/t'

/* My password vault: the logins of ONE person, kept in their own My space (kind "password", encrypted). Everyone has their own; the Super Admin (and
   people given "See other people's My space") can open anyone's, read only. Vault entries sent to My space land here too. */
const BASE = '/api/crm/chat/my-space'
const EMPTY = { title: '', url: '', username: '', password: '', notes: '' }
const L = ({ children }) => <label className="form-label mb-1.5 block">{children}</label>

// the secret text is "Username: …\nPassword: …\nNotes: …" (the same shape "Send to My space" writes)
const parse = (text = '') => {
    const out = { username: '', password: '', notes: [] }
    for (const line of String(text).split('\n')) {
        const m = /^(Username|Password|Notes):\s?(.*)$/.exec(line)
        if (m) { if (m[1] === 'Username') out.username = m[2]; else if (m[1] === 'Password') out.password = m[2]; else out.notes.push(m[2]) } else if (out.notes.length) out.notes.push(line)
        else if (line.trim()) out.password = out.password || line
    }
    return { username: out.username, password: out.password, notes: out.notes.join('\n') }
}
const compose = (v) => [v.username && `Username: ${v.username}`, v.password && `Password: ${v.password}`, v.notes && `Notes: ${v.notes.replace(/\n/g, '\n')}`].filter(Boolean).join('\n')

const Card1 = ({ it, ro, onEdit, onDelete }) => {
    const [text, setText] = useState(null)
    const timer = useRef(null)
    useEffect(() => () => clearTimeout(timer.current), [])
    const reveal = async () => parse((await api(`${BASE}?reveal=${it.id}`)).body)
    const toggle = async () => {
        if (text) { setText(null); return }
        try { setText(await reveal()); timer.current = setTimeout(() => setText(null), 20000) } catch (e) { notify('danger', e.message) }
    }
    const field = (label, value, get) => (
        <div className="flex items-center justify-between gap-1 rounded-lg bg-gray-50 px-3 py-1 text-sm dark:bg-gray-700/40">
            <span className={`min-w-0 flex-1 truncate ${text ? 'select-all font-mono text-[13px]' : ''}`}>{value}</span>
            <CopyButton title={tr('Copy')} get={get} onCopied={() => notify('success', tr('Copied'))} />
        </div>
    )
    return (
        <div className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-[0_0_1rem_0.25rem_rgba(0,0,0,0.04),0px_2rem_1.5rem_-1rem_rgba(0,0,0,0.12)] dark:border-transparent dark:bg-gray-800">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-sm font-bold text-white">{initials(it.title)}</span>
                <div className="min-w-0 flex-1">
                    <div className="heading-text truncate font-bold" title={it.title}>{it.title || tr('Untitled')}</div>
                    {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-primary hover:underline">{it.url.replace(/^https?:\/\//, '')}<TbExternalLink /></a>}
                </div>
                {!ro && <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <Tooltip title={tr('Edit')}><button type="button" onClick={() => onEdit(it)} className="grid size-7 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbPencil /></button></Tooltip>
                    <Tooltip title={tr('Delete')}><button type="button" onClick={() => onDelete(it)} className="grid size-7 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"><TbTrash /></button></Tooltip>
                </div>}
            </div>
            <div className="space-y-1.5">
                {field('user', text ? text.username || '—' : '••••••••', async () => (text || await reveal()).username || '')}
                <div className="flex items-center justify-between gap-1 rounded-lg bg-gray-50 px-3 py-1 text-sm dark:bg-gray-700/40">
                    <span className={`min-w-0 flex-1 truncate ${text ? 'select-all font-mono text-[13px]' : ''}`}>{!it.hasBody ? <span className="text-gray-400">{tr('No password')}</span> : text ? text.password || '—' : '••••••••••••'}</span>
                    {it.hasBody && <>
                        <button type="button" title={text ? tr('Hide') : tr('Show')} onClick={toggle} className="grid size-7 place-items-center rounded-md text-base text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700">{text ? <TbEyeOff /> : <TbEye />}</button>
                        <CopyButton title={tr('Copy password')} get={async () => (text || await reveal()).password || ''} onCopied={() => notify('success', tr('Password copied'))} />
                    </>}
                </div>
                {text?.notes && <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">{text.notes}</p>}
            </div>
        </div>
    )
}

const MyVault = () => {
    const [d, setD] = useState(null)
    const [owner, setOwner] = useState('')
    const [search, setSearch] = useState('')
    const [q, setQ] = useState('')
    const [form, setForm] = useState(null) // null closed · { id?, ...fields }
    const [saving, setSaving] = useState(false)
    useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(t) }, [search])
    const load = useCallback(() => api(`${BASE}?owner=${owner}&q=${encodeURIComponent(q)}`).then(setD).catch((e) => { notify('danger', e.message); setD({ items: [], owners: [], readOnly: false, canViewOthers: false }) }), [owner, q])
    useEffect(() => { load() }, [load])

    const ro = !!d?.readOnly
    const items = (d?.items || []).filter((i) => i.kind === 'password')
    const ownerOpts = [{ value: '', label: tr('My vault') }, ...(d?.owners || []).map((o) => ({ value: o.id, label: `${o.name} (${o.count})` }))]
    const set = (p) => setForm((f) => ({ ...f, ...p }))

    const openEdit = async (it) => {
        try { const r = it.hasBody ? await api(`${BASE}?reveal=${it.id}`) : { body: '' }; setForm({ id: it.id, title: it.title, url: it.url || '', ...parse(r.body) }) } catch (e) { notify('danger', e.message) }
    }
    const save = async () => {
        if (!form.title.trim()) { notify('danger', tr('Give the entry a name')); return }
        setSaving(true)
        try {
            const body = { kind: 'password', secret: true, title: form.title, url: form.url, body: compose(form) }
            await api(BASE, { method: form.id ? 'PUT' : 'POST', body: form.id ? { id: form.id, ...body } : body })
            setForm(null); load(); notify('success', tr('Saved'))
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const remove = (it) => confirmDelete(tr('Delete “{name}”?', { name: it.title || tr('Untitled') }), async () => {
        try { await api(`${BASE}?id=${it.id}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) }
    })

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2" title={ro ? tr('Read only. This is private to its owner.') : undefined}>{ro && <TbLock className="shrink-0 text-gray-500" />}{ro ? ownerOpts.find((o) => o.value === d.owner)?.label.replace(/ \(\d+\)$/, '') || '' : tr('My password vault')}</h3>
                    {!ro && <p className="flex items-center gap-1 text-sm text-gray-500"><TbLock className="shrink-0" />{tr('Your own logins, kept encrypted. Only you and the Super Admin can see them.')}</p>}
                </div>
                <div className="flex items-center gap-2">
                    {d?.canViewOthers && d.owners.length > 0 && <div className="w-56"><Select size="sm" isSearchable={d.owners.length > 6} options={ownerOpts} value={ownerOpts.find((o) => o.value === (ro ? d.owner : '')) || ownerOpts[0]} onChange={(o) => setOwner(o?.value || '')} /></div>}
                    {!ro && <Button variant="solid" icon={<TbPlus />} onClick={() => setForm({ ...EMPTY })}>{tr('New entry')}</Button>}
                </div>
            </div>
            <Card className="mb-5" bodyClass="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[220px] flex-1 md:max-w-md"><Input prefix={<TbSearch className="text-lg" />} placeholder={tr('Search name or website')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <span className="ml-auto text-sm text-gray-500">{items.length} {items.length === 1 ? tr('entry') : tr('entries')}</span>
                </div>
            </Card>
            {items.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((it) => <Card1 key={it.id} it={it} ro={ro} onEdit={openEdit} onDelete={remove} />)}</div>
            ) : d && (
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-gray-500"><TbKey className="text-5xl text-gray-300" /><h5>{tr('Nothing here yet')}</h5><p className="max-w-sm text-sm">{ro ? tr('This person has no saved logins.') : tr('Add your own logins here, or use “Send to My space” on an entry of the shared Password vault.')}</p>{!ro && <Button variant="solid" icon={<TbPlus />} onClick={() => setForm({ ...EMPTY })}>{tr('Add the first entry')}</Button>}</div>
            )}
            <Dialog isOpen={!!form} width={520} onClose={() => setForm(null)} onRequestClose={() => setForm(null)}>
                {form && <div className="space-y-3">
                    <h5>{form.id ? tr('Edit entry') : tr('New entry')}</h5>
                    <div><L>{tr('Name')}</L><Input autoFocus value={form.title} placeholder={tr('What is it for? (for example Gmail of the agency)')} onChange={(e) => set({ title: e.target.value })} /></div>
                    <div><L>{tr('Website')}</L><Input value={form.url} placeholder="https://" onChange={(e) => set({ url: e.target.value })} /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div><L>{tr('Username')}</L><Input autoComplete="off" value={form.username} onChange={(e) => set({ username: e.target.value })} /></div>
                        <div><L>{tr('Password')}</L><Input autoComplete="off" value={form.password} suffix={<button type="button" title={tr('Generate')} onClick={() => set({ password: generate() })}><TbDice5 className="text-lg" /></button>} onChange={(e) => set({ password: e.target.value })} /></div>
                    </div>
                    <div><L>{tr('Notes')}</L><Input textArea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
                    <div className="flex justify-end gap-2 pt-1"><Button onClick={() => setForm(null)}>{tr('Cancel')}</Button><Button variant="solid" loading={saving} onClick={save}>{tr('Save')}</Button></div>
                </div>}
            </Dialog>
        </Container>
    )
}

export default MyVault
