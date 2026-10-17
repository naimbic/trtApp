import { useCallback, useEffect, useState } from 'react'
import CreatableSelect from 'react-select/creatable'
import { TbCheck, TbKey, TbPlugConnected, TbTrash, TbRefresh } from 'react-icons/tb'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const opts = (list) => list.map((m) => ({ value: m, label: m }))

/** One provider: its key (write-only), the model to use, the models the key can reach, and a test. */
const Provider = ({ p, isDefault, onSaved }) => {
    const [key, setKey] = useState('')
    const [model, setModel] = useState(p.model)
    const [workspace, setWorkspace] = useState(p.workspaceId || '')
    const [loaded, setLoaded] = useState([])
    const [busy, setBusy] = useState('')
    const [result, setResult] = useState(null)
    const all = [...new Set([...p.presets, ...loaded, model].filter(Boolean))]

    const save = async (body, ok) => { setBusy('save'); try { const d = await api('/api/crm/ai/settings', { method: 'PUT', body }); onSaved(d); if (ok) notify('success', ok); return d } catch (e) { notify('danger', e.message) } finally { setBusy('') } }
    const saveKey = async () => { if (!key.trim()) return; const d = await save({ keys: { [p.id]: key.trim() } }, tr('API key saved')); if (d) { setKey(''); setResult(null) } }
    const saveWorkspace = async () => { const d = await save({ workspaces: { [p.id]: workspace.trim() } }, tr('Workspace id saved')); if (d) setResult(null) }
    const load = async () => { setBusy('load'); try { const r = await api('/api/crm/ai/models', { method: 'POST', body: { provider: p.id } }); setLoaded(r.models); notify('success', tr('{n} models loaded', { n: r.models.length })) } catch (e) { notify('danger', e.message) } finally { setBusy('') } }
    const test = async () => { setBusy('test'); setResult(null); try { setResult({ ok: true, ...(await api('/api/crm/ai/test', { method: 'POST', body: { provider: p.id, model } })) }) } catch (e) { setResult({ ok: false, error: e.message }) } finally { setBusy('') } }
    const pick = (o) => { const m = o?.value || ''; setModel(m); if (m) save({ models: { [p.id]: m }, ...(isDefault ? { model: m } : {}) }) }

    return (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><div className="flex items-center gap-2 font-bold heading-text">{p.label}{isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{tr('Default')}</span>}</div><div className="text-xs text-gray-500">{p.help}</div></div>
                {p.hasKey && <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><TbCheck />{tr('Key saved')} <span className="font-mono text-xs text-gray-400">{p.hint}</span></span>}
                {p.unreadable && <span className="text-sm text-red-500">{tr('The saved key cannot be read any more. Enter it again.')}</span>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <div className="mb-1 text-xs font-semibold text-gray-500">{p.hasKey ? tr('Replace the API key') : tr('API key')}</div>
                    <div className="flex gap-2"><Input size="sm" type="password" autoComplete="off" placeholder={p.hasKey ? '••••••••' : 'sk-…'} value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveKey()} /><Button size="sm" icon={<TbKey />} disabled={!key.trim()} loading={busy === 'save'} onClick={saveKey}>{tr('Save key')}</Button></div>
                </div>
                <div>
                    <div className="mb-1 text-xs font-semibold text-gray-500">{tr('Model')}</div>
                    <div className="flex gap-2">
                        <div className="min-w-0 flex-1"><Select size="sm" componentAs={CreatableSelect} menuPortalTarget={document.body} menuPosition="fixed" isDisabled={!p.hasKey} placeholder={tr('Choose or type a model')} formatCreateLabel={(v) => `${tr('Use')} “${v}”`} options={opts(all)} value={model ? { value: model, label: model } : null} onChange={pick} /></div>
                        <Button size="sm" variant="plain" icon={busy === 'load' ? <Spinner size={16} /> : <TbRefresh />} disabled={!p.hasKey || !!busy} title={tr('Load the models this key can use')} onClick={load} />
                    </div>
                </div>
            </div>
            {p.id === 'anthropic' && p.hasKey && (
                <div className="mt-3">
                    <div className="mb-1 text-xs font-semibold text-gray-500">{tr('Workspace id (only if Claude says the key is not scoped to a workspace)')}</div>
                    <div className="flex max-w-xl gap-2"><Input size="sm" autoComplete="off" placeholder="wrkspc_…" value={workspace} onChange={(e) => setWorkspace(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveWorkspace()} /><Button size="sm" disabled={workspace.trim() === (p.workspaceId || '')} loading={busy === 'save'} onClick={saveWorkspace}>{tr('Save')}</Button></div>
                    <p className="mt-1 text-xs text-gray-400">{tr('Find it in console.anthropic.com → Settings → Workspaces. Or create a key inside one workspace and none is needed.')}</p>
                </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" icon={<TbPlugConnected />} disabled={!p.hasKey || !model} loading={busy === 'test'} onClick={test}>{tr('Test')}</Button>
                {p.hasKey && !isDefault && <Button size="sm" onClick={() => save({ provider: p.id, model }, tr('Default provider changed'))}>{tr('Use as default')}</Button>}
                {p.hasKey && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => save({ keys: { [p.id]: null }, ...(isDefault ? { provider: '' } : {}) }, tr('API key removed'))}>{tr('Remove key')}</Button>}
                {result && (result.ok ? <span className="text-sm text-emerald-600">{tr('Works')}: “{result.reply}” · {result.ms} ms</span> : <span className="text-sm text-red-500">{result.error}</span>)}
            </div>
        </div>
    )
}

/** Settings → AI: keys, models and the default for the AI analyses. */
const AiSettingsPanel = () => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [prompt, setPrompt] = useState('')
    const [saving, setSaving] = useState(false)
    const apply = useCallback((x) => { setD(x); setPrompt(x.systemPrompt) }, [])
    useEffect(() => { api('/api/crm/ai/settings').then(apply).catch((e) => setError(e.message)) }, [apply])

    if (error) return <Alert showIcon type="warning">{error}</Alert>
    if (!d) return <div className="flex h-24 items-center justify-center"><Spinner size={28} /></div>
    const savePrompt = async () => { setSaving(true); try { apply(await api('/api/crm/ai/settings', { method: 'PUT', body: { systemPrompt: prompt } })); notify('success', tr('Saved')) } catch (e) { notify('danger', e.message) } finally { setSaving(false) } }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">{tr('Pick the provider you pay for, add its API key, choose the model. The analyses send totals, rates and company names to that provider; never emails, phone numbers or addresses.')}</p>
            {d.providers.map((p) => <Provider key={p.id} p={p} isDefault={d.provider === p.id} onSaved={apply} />)}
            <div>
                <div className="mb-1 text-xs font-semibold text-gray-500">{tr('About your company (optional): added to every analysis')}</div>
                <Input textArea rows={3} value={prompt} placeholder={tr('For example: web agency in Casablanca, clients are SMEs, we invoice in MAD.')} onChange={(e) => setPrompt(e.target.value)} />
                <div className="mt-2"><Button size="sm" loading={saving} disabled={prompt === d.systemPrompt} onClick={savePrompt}>{tr('Save')}</Button></div>
            </div>
        </div>
    )
}

export default AiSettingsPanel
