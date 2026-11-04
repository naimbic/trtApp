import { useCallback, useEffect, useState } from 'react'
import CreatableSelect from 'react-select/creatable'
import { TbWorldSearch, TbBrain, TbCheck, TbKey, TbPlugConnected, TbTrash, TbRefresh } from 'react-icons/tb'
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

/** Monthly team review: the AI reads what each person did last month and writes a short personal review into their chat (automatic on the 8th at 08:00). */
const CoachCard = () => {
    const [st, setSt] = useState(null)
    const [busy, setBusy] = useState('')
    const [result, setResult] = useState(null)
    useEffect(() => { api('/api/crm/ai/coach').then(setSt).catch(() => {}) }, [])
    const run = async (who) => {
        setBusy(who); setResult(null)
        try { const r = await api('/api/crm/ai/coach', { method: 'POST', body: { who } }); setResult(r); notify('success', r.started ? tr('Started: the reviews arrive in the chats within a few minutes') : r.sent ? tr('Review sent to the chat') : tr('Nothing was sent')) } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    return (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
            <div className="mb-1 flex items-center gap-2 font-semibold"><TbBrain className="text-lg" />{tr('Monthly team review')}</div>
            <p className="mb-3 text-sm text-gray-500">{tr('On the 8th of every month at 08:00 the AI reads what each team member did last month (tasks done and late, tasks without a deadline or a supervisor, tasks closed alone, time tracked) and sends a short personal review with advice to their own chat conversation “My monthly review”.')}</p>
            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="solid" icon={<TbBrain />} loading={busy === 'me'} disabled={!!busy || st?.ready === false} onClick={() => run('me')}>{tr('Send me my review of {month}', { month: st?.month || '' })}</Button>
                <Button size="sm" loading={busy === 'all'} disabled={!!busy || st?.ready === false} onClick={() => run('all')}>{tr('Send to the whole team now')}</Button>
                {st?.ready === false && <span className="text-sm text-amber-600">{tr('Add an API key first.')}</span>}
            </div>
            {result && <ul className="mt-3 space-y-0.5 text-sm text-gray-600 dark:text-gray-300">{result.lines.map((l, i) => <li key={i} className={l.startsWith('!') ? 'text-red-500' : ''}>{l}</li>)}</ul>}
        </div>
    )
}

/** The Ubersuggest key: lets the CRM show the SEO figures (authority, traffic, keywords, backlinks) of a lead's website when you hover it. */
const SeoCard = ({ seo, onSaved }) => {
    const [key, setKey] = useState('')
    const [ahKey, setAhKey] = useState('')
    const [oprKey, setOprKey] = useState('')
    const [busy, setBusy] = useState('')
    const [result, setResult] = useState(null)
    const save = async (body, ok) => { setBusy('save'); try { onSaved(await api('/api/crm/ai/settings', { method: 'PUT', body })); setKey(''); setAhKey(''); setOprKey(''); setResult(null); if (ok) notify('success', ok) } catch (e) { notify('danger', e.message) } finally { setBusy('') } }
    const test = async () => {
        setBusy('test'); setResult(null)
        try { const r = await api('/api/crm/pipeline/leads/site-info?url=trtdigital.ma&force=1'); setResult(r.seo && !r.seo.error ? { ok: true, text: `trtdigital.ma: ${r.seo.source || ''} · DA ${r.seo.da ?? r.seo.opr ?? '–'}, ${r.seo.keywords ?? '–'} ${tr('keywords')}, ${r.seo.backlinks ?? '–'} ${tr('backlinks')}` } : { ok: false, text: r.seo?.error || tr('No key saved yet') }) } catch (e) { setResult({ ok: false, text: e.message }) } finally { setBusy('') }
    }
    return (
        <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
            <div className="mb-1 flex items-center gap-2 font-semibold"><TbWorldSearch className="text-lg" />{tr('Website SEO data (Ahrefs)')}</div>
            <p className="mb-3 text-sm text-gray-500">{tr('With your Ahrefs API key (API v3), hovering the website of a lead shows its domain rating, organic traffic and keywords, and backlinks. When both keys are saved, Ahrefs is used. The key is stored encrypted and never shown again.')}</p>
            <div className="flex flex-wrap items-center gap-2">
                <Input size="sm" className="max-w-xs" type="password" placeholder={seo.ahrefs?.hasKey ? seo.ahrefs.hint : tr('Ahrefs API key')} value={ahKey} onChange={(e) => setAhKey(e.target.value)} />
                <Button size="sm" variant="solid" icon={<TbKey />} loading={busy === 'save'} disabled={!ahKey.trim()} onClick={() => save({ ahrefsKey: ahKey.trim() }, tr('API key saved'))}>{tr('Save key')}</Button>
                {seo.ahrefs?.hasKey && <Button size="sm" icon={<TbPlugConnected />} loading={busy === 'test'} onClick={test}>{tr('Test')}</Button>}
                {seo.ahrefs?.hasKey && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => save({ ahrefsKey: null }, tr('Key removed'))}>{tr('Remove')}</Button>}
                {result && <span className={`text-sm ${result.ok ? 'text-emerald-600' : 'text-red-500'}`}>{result.text}</span>}
            </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
            <div className="mb-1 flex items-center gap-2 font-semibold"><TbWorldSearch className="text-lg" />{tr('Website SEO data (free: Open PageRank)')}</div>
            <p className="mb-3 text-sm text-gray-500">{tr('Free: get a key at openpagerank.com (an account is enough). It gives a 0-10 authority score and the world rank of a lead website. Used when no Ahrefs or Ubersuggest key answers. The basic SEO checks (title, description, mobile, indexing, robots.txt, sitemap) need no key at all.')}</p>
            <div className="flex flex-wrap items-center gap-2">
                <Input size="sm" className="max-w-xs" type="password" placeholder={seo.opr?.hasKey ? seo.opr.hint : tr('Open PageRank API key')} value={oprKey} onChange={(e) => setOprKey(e.target.value)} />
                <Button size="sm" variant="solid" icon={<TbKey />} loading={busy === 'save'} disabled={!oprKey.trim()} onClick={() => save({ oprKey: oprKey.trim() }, tr('API key saved'))}>{tr('Save key')}</Button>
                {seo.opr?.hasKey && <Button size="sm" icon={<TbPlugConnected />} loading={busy === 'test'} onClick={test}>{tr('Test')}</Button>}
                {seo.opr?.hasKey && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => save({ oprKey: null }, tr('Key removed'))}>{tr('Remove')}</Button>}
                {result && <span className={`text-sm ${result.ok ? 'text-emerald-600' : 'text-red-500'}`}>{result.text}</span>}
            </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
            <div className="mb-1 flex items-center gap-2 font-semibold"><TbWorldSearch className="text-lg" />{tr('Website SEO data (Ubersuggest)')}</div>
            <p className="mb-3 text-sm text-gray-500">{tr('With your Ubersuggest API key, hovering the website of a lead also shows its domain authority, organic traffic and keywords, and backlinks. The key is stored encrypted and never shown again.')}</p>
            <div className="flex flex-wrap items-center gap-2">
                <Input size="sm" className="max-w-xs" type="password" placeholder={seo.hasKey ? seo.hint : tr('Ubersuggest API key')} value={key} onChange={(e) => setKey(e.target.value)} />
                <Button size="sm" variant="solid" icon={<TbKey />} loading={busy === 'save'} disabled={!key.trim()} onClick={() => save({ seoKey: key.trim() }, tr('API key saved'))}>{tr('Save key')}</Button>
                {seo.hasKey && <Button size="sm" icon={<TbPlugConnected />} loading={busy === 'test'} onClick={test}>{tr('Test')}</Button>}
                {seo.hasKey && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => save({ seoKey: null }, tr('Key removed'))}>{tr('Remove')}</Button>}
            </div>
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
            <CoachCard />
            <SeoCard seo={d.seo || { hasKey: false }} onSaved={apply} />
            <div>
                <div className="mb-1 text-xs font-semibold text-gray-500">{tr('About your company (optional): added to every analysis')}</div>
                <Input textArea rows={3} value={prompt} placeholder={tr('For example: web agency in Casablanca, clients are SMEs, we invoice in MAD.')} onChange={(e) => setPrompt(e.target.value)} />
                <div className="mt-2"><Button size="sm" loading={saving} disabled={prompt === d.systemPrompt} onClick={savePrompt}>{tr('Save')}</Button></div>
            </div>
        </div>
    )
}

export default AiSettingsPanel
