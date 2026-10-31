import { useCallback, useEffect, useState } from 'react'
import { TbKey, TbWebhook, TbBook2, TbPlus, TbCopy, TbTrash, TbPlayerPlay, TbCircleCheck, TbAlertTriangle, TbHistory } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Tabs from '@/components/ui/Tabs'
import Checkbox from '@/components/ui/Checkbox'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const { TabList, TabNav, TabContent } = Tabs
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const copy = async (text) => { try { await navigator.clipboard.writeText(text); notify('success', tr("Copied")) } catch { notify('danger', tr("Could not copy")) } }
const Code = ({ children }) => (
    <div className="group relative">
        <pre className="overflow-x-auto rounded-xl bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">{children}</pre>
        <button type="button" aria-label={tr("Copy")} className="absolute end-2 top-2 hidden rounded-md bg-white/10 p-1.5 text-gray-200 hover:bg-white/20 group-hover:block" onClick={() => copy(children)}><TbCopy /></button>
    </div>
)

/* ------------------------------------------------------------ keys */
const Keys = () => {
    const [d, setD] = useState(null)
    const [dlg, setDlg] = useState(null) // { name, scopes, expiresAt }
    const [shown, setShown] = useState(null) // the new key, once
    const [revoke, setRevoke] = useState(null)
    const [log, setLog] = useState(null)
    const load = useCallback(() => api('/api/crm/api-keys').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])
    const create = async () => {
        try { const r = await api('/api/crm/api-keys', { method: 'POST', body: { ...dlg, expiresAt: dlg.expiresAt || null } }); setDlg(null); setShown(r); load() } catch (e) { notify('danger', e.message) }
    }
    const group = (id) => id.split(':')[0]
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm text-gray-500">{tr("An API key lets another program (a website form, n8n, Zapier, your own code) read or push data. Give each program its own key with only what it needs, and revoke it when it is not used any more.")}</p><Button variant="solid" icon={<TbPlus />} onClick={() => setDlg({ name: '', scopes: [], expiresAt: '' })}>{tr("New API key")}</Button></div>
            {!d ? <p className="py-8 text-center text-gray-400">{tr("Loading…")}</p> : !d.keys.length ? <Card><p className="py-6 text-center text-gray-400">{tr("No API key yet.")}</p></Card> : (
                <div className="grid gap-3">
                    {d.keys.map((k) => (
                        <Card key={k.id} className={k.revokedAt ? 'opacity-60' : ''}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-lg text-primary"><TbKey /></span><b className="text-base">{k.name}</b><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">{k.prefix}…</code>{k.revokedAt && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{tr("Revoked")}</span>}{!k.revokedAt && k.expiresAt && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{tr("Expires")} {dayjs(k.expiresAt).format('DD MMM YYYY')}</span>}</div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">{k.scopes.map((s) => <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.endsWith('write') ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{s}</span>)}</div>
                                    <p className="mt-2 text-xs text-gray-500">{tr("Created")} {dayjs(k.createdAt).format('DD MMM YYYY')} · {k.lastUsedAt ? `${tr("last used")} ${dayjs(k.lastUsedAt).format('DD MMM YYYY, HH:mm')}${k.lastIp ? ` (${k.lastIp})` : ''}` : tr("never used")} · {k.calls} {tr("calls")}</p>
                                </div>
                                <div className="flex gap-2"><Button size="sm" icon={<TbHistory />} onClick={() => api(`/api/crm/api-keys/${k.id}`).then((r) => setLog({ key: k, rows: r.log })).catch((e) => notify('danger', e.message))}>{tr("Calls")}</Button>{!k.revokedAt && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setRevoke(k)}>{tr("Revoke")}</Button>}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <Dialog isOpen={!!dlg} width={620} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-4">{tr("New API key")}</h5>
                {dlg && d && (
                    <div className="space-y-4">
                        <div><L>{tr("Name (what will use it)")}</L><Input autoFocus value={dlg.name} placeholder="n8n, website form…" onChange={(e) => setDlg({ ...dlg, name: e.target.value })} /></div>
                        <div>
                            <L>{tr("What the key may do")}</L>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {d.scopes.map(([id, label]) => <Checkbox key={id} checked={dlg.scopes.includes(id)} onChange={(c) => setDlg({ ...dlg, scopes: c ? [...dlg.scopes, id] : dlg.scopes.filter((x) => x !== id) })}><span className="text-sm">{tr(label)} <code className="text-[10px] text-gray-400">{id}</code></span></Checkbox>)}
                            </div>
                            <p className="mt-1 text-xs text-gray-400">{tr("Nothing can be deleted through the API. Passwords, bank details and private notes are never available.")}</p>
                        </div>
                        <div><L>{tr("Expires on (optional)")}</L><Input type="date" value={dlg.expiresAt} onChange={(e) => setDlg({ ...dlg, expiresAt: e.target.value })} /></div>
                    </div>
                )}
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDlg(null)}>{tr("Cancel")}</Button><Button variant="solid" onClick={create}>{tr("Create the key")}</Button></div>
            </Dialog>
            <Dialog isOpen={!!shown} width={560} onClose={() => setShown(null)} onRequestClose={() => setShown(null)}>
                <h5 className="mb-1">{tr("Your new API key")}</h5>
                <p className="mb-3 text-sm text-amber-700">{tr("Copy it now. It is shown only once and cannot be shown again: if you lose it, revoke it and create another.")}</p>
                {shown && <div className="flex items-center gap-2 rounded-xl bg-gray-900 p-3"><code className="min-w-0 flex-1 break-all text-sm text-emerald-300">{shown.key}</code><Button size="sm" icon={<TbCopy />} onClick={() => copy(shown.key)}>{tr("Copy")}</Button></div>}
                <div className="mt-5 flex justify-end"><Button variant="solid" onClick={() => setShown(null)}>{tr("I have copied it")}</Button></div>
            </Dialog>
            <Dialog isOpen={!!log} width={680} onClose={() => setLog(null)} onRequestClose={() => setLog(null)}>
                <h5 className="mb-3">{tr("Last calls")}: {log?.key.name}</h5>
                <div className="max-h-[50vh] overflow-y-auto text-sm">{log?.rows.length ? log.rows.map((r) => <div key={r.id} className="flex items-center justify-between gap-3 border-b border-gray-100 py-1.5 dark:border-gray-700"><span><b className="me-2 text-xs">{r.method}</b><code className="text-xs">{r.path}</code></span><span className="flex items-center gap-3 text-xs text-gray-500"><span className={r.status < 300 ? 'text-emerald-600' : 'text-red-600'}>{r.status}</span>{r.ms}ms · {dayjs(r.createdAt).format('DD MMM HH:mm:ss')}</span></div>) : <p className="py-6 text-center text-gray-400">{tr("No call yet.")}</p>}</div>
                <div className="mt-4 flex justify-end"><Button onClick={() => setLog(null)}>{tr("Close")}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!revoke} type="danger" title={tr("Revoke this key?")} confirmText={tr("Revoke")} onClose={() => setRevoke(null)} onCancel={() => setRevoke(null)} onConfirm={() => { const k = revoke; setRevoke(null); api(`/api/crm/api-keys/${k.id}`, { method: 'DELETE' }).then(() => { notify('success', tr("Key revoked")); load() }).catch((e) => notify('danger', e.message)) }}>
                <p>{tr("The program that uses \"{name}\" stops working at once. This cannot be undone.", { name: revoke?.name })}</p>
            </ConfirmDialog>
        </div>
    )
}

/* ------------------------------------------------------------ webhooks */
const Hooks = () => {
    const [d, setD] = useState(null)
    const [dlg, setDlg] = useState(null)
    const [secret, setSecret] = useState(null)
    const [del, setDel] = useState(null)
    const [deliveries, setDeliveries] = useState(null)
    const load = useCallback(() => api('/api/crm/webhooks').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])
    const save = async () => {
        try { const r = await api(dlg.id ? `/api/crm/webhooks/${dlg.id}` : '/api/crm/webhooks', { method: dlg.id ? 'PUT' : 'POST', body: dlg }); setDlg(null); if (r.secret) setSecret(r.secret); load() } catch (e) { notify('danger', e.message) }
    }
    const test = async (h) => { try { const r = await api(`/api/crm/webhooks/${h.id}`, { method: 'POST' }); notify(r.ok ? 'success' : 'danger', r.ok ? tr("The receiver answered {status}", { status: r.status }) : r.error || tr("The receiver did not answer")); load() } catch (e) { notify('danger', e.message) } }
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm text-gray-500">{tr("A webhook is the other direction: when something happens in the CRM (a lead arrives, a task is created…) the CRM calls the address you give, with the data, signed so that your program can check it really comes from here.")}</p><Button variant="solid" icon={<TbPlus />} onClick={() => setDlg({ name: '', url: '', events: [], active: true })}>{tr("New webhook")}</Button></div>
            {!d ? <p className="py-8 text-center text-gray-400">{tr("Loading…")}</p> : !d.webhooks.length ? <Card><p className="py-6 text-center text-gray-400">{tr("No webhook yet.")}</p></Card> : (
                <div className="grid gap-3">
                    {d.webhooks.map((h) => (
                        <Card key={h.id} className={h.active ? '' : 'opacity-70'}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-lg text-violet-600"><TbWebhook /></span><b className="text-base">{h.name}</b>{!h.active && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{tr("Switched off")}{h.failures >= 20 ? ` (${tr("too many failures")})` : ''}</span>}{h.lastOk === true && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><TbCircleCheck />{tr("Working")}</span>}{h.lastOk === false && <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><TbAlertTriangle />{h.lastError}</span>}</div>
                                    <code className="mt-1 block truncate text-xs text-gray-500">{h.url}</code>
                                    <div className="mt-2 flex flex-wrap gap-1.5">{h.events.map((e) => <span key={e} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{e}</span>)}</div>
                                    {h.lastAt && <p className="mt-2 text-xs text-gray-500">{tr("Last call")} {dayjs(h.lastAt).format('DD MMM YYYY, HH:mm')}</p>}
                                </div>
                                <div className="flex flex-wrap gap-2"><Button size="sm" icon={<TbPlayerPlay />} onClick={() => test(h)}>{tr("Send a test")}</Button><Button size="sm" icon={<TbHistory />} onClick={() => api(`/api/crm/webhooks/${h.id}`).then((r) => setDeliveries({ h, rows: r.deliveries }))}>{tr("Calls")}</Button><Button size="sm" onClick={() => setDlg({ ...h })}>{tr("Edit")}</Button><Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(h)} /></div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <Dialog isOpen={!!dlg} width={620} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-4">{dlg?.id ? tr("Edit the webhook") : tr("New webhook")}</h5>
                {dlg && d && (
                    <div className="space-y-4">
                        <div><L>{tr("Name")}</L><Input autoFocus value={dlg.name} onChange={(e) => setDlg({ ...dlg, name: e.target.value })} /></div>
                        <div><L>{tr("Address that receives the calls (https)")}</L><Input value={dlg.url} placeholder="https://example.com/hooks/trtcrm" onChange={(e) => setDlg({ ...dlg, url: e.target.value })} /></div>
                        <div><L>{tr("Events")}</L><div className="grid gap-1.5 sm:grid-cols-2">{d.events.map(([id, label]) => <Checkbox key={id} checked={dlg.events.includes(id)} onChange={(c) => setDlg({ ...dlg, events: c ? [...dlg.events, id] : dlg.events.filter((x) => x !== id) })}><span className="text-sm">{tr(label)} <code className="text-[10px] text-gray-400">{id}</code></span></Checkbox>)}</div></div>
                        {dlg.id && <label className="flex items-center gap-2 text-sm"><Switcher checked={dlg.active} onChange={(c) => setDlg({ ...dlg, active: c })} />{tr("Active")}</label>}
                    </div>
                )}
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDlg(null)}>{tr("Cancel")}</Button><Button variant="solid" onClick={save}>{tr("Save")}</Button></div>
            </Dialog>
            <Dialog isOpen={!!secret} width={560} onClose={() => setSecret(null)} onRequestClose={() => setSecret(null)}>
                <h5 className="mb-1">{tr("Signing secret")}</h5>
                <p className="mb-3 text-sm text-amber-700">{tr("Copy it now, it is shown only once. Your program uses it to check the signature of every call.")}</p>
                {secret && <div className="flex items-center gap-2 rounded-xl bg-gray-900 p-3"><code className="min-w-0 flex-1 break-all text-sm text-emerald-300">{secret}</code><Button size="sm" icon={<TbCopy />} onClick={() => copy(secret)}>{tr("Copy")}</Button></div>}
                <div className="mt-5 flex justify-end"><Button variant="solid" onClick={() => setSecret(null)}>{tr("I have copied it")}</Button></div>
            </Dialog>
            <Dialog isOpen={!!deliveries} width={680} onClose={() => setDeliveries(null)} onRequestClose={() => setDeliveries(null)}>
                <h5 className="mb-3">{tr("Last calls")}: {deliveries?.h.name}</h5>
                <div className="max-h-[50vh] overflow-y-auto text-sm">{deliveries?.rows.length ? deliveries.rows.map((r) => <div key={r.id} className="flex items-center justify-between gap-3 border-b border-gray-100 py-1.5 dark:border-gray-700"><span><code className="text-xs">{r.event}</code>{r.error && <span className="ms-2 text-xs text-red-600">{r.error}</span>}</span><span className="flex items-center gap-3 text-xs text-gray-500"><span className={r.ok ? 'text-emerald-600' : 'text-red-600'}>{r.status || '—'}</span>{r.ms}ms · {dayjs(r.createdAt).format('DD MMM HH:mm:ss')}</span></div>) : <p className="py-6 text-center text-gray-400">{tr("No call yet.")}</p>}</div>
                <div className="mt-4 flex justify-end"><Button onClick={() => setDeliveries(null)}>{tr("Close")}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this webhook?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const h = del; setDel(null); api(`/api/crm/webhooks/${h.id}`, { method: 'DELETE' }).then(() => { notify('success', tr("Webhook deleted")); load() }).catch((e) => notify('danger', e.message)) }}><p>{del?.name}</p></ConfirmDialog>
        </div>
    )
}

/* ------------------------------------------------------------ docs */
const Docs = () => {
    const base = `${window.location.origin}/api/v1`
    return (
        <div className="max-w-4xl space-y-6">
            <Card><h5 className="mb-2">{tr("Send your key")}</h5><p className="mb-2 text-sm text-gray-500">{tr("Every call carries the key in a header. Answers are JSON. Limit: 120 calls a minute per key.")}</p><Code>{`curl ${base}/me \\\n  -H "Authorization: Bearer trt_xxxxxxxx"`}</Code></Card>
            <Card>
                <h5 className="mb-2">{tr("Resources")}</h5>
                <div className="overflow-x-auto text-sm"><table className="w-full"><thead><tr className="text-start text-xs uppercase text-gray-400"><th className="py-1 text-start">{tr("Resource")}</th><th className="text-start">{tr("Read")}</th><th className="text-start">{tr("Create / change")}</th></tr></thead><tbody>
                    {[['leads', 'GET list, GET one', 'POST, PATCH'], ['clients', 'GET list, GET one', 'POST, PATCH'], ['tasks', 'GET list, GET one', 'POST, PATCH'], ['ideas', 'GET list, GET one', 'POST, PATCH'], ['tickets', 'GET list, GET one', '—'], ['invoices', 'GET list, GET one', '—'], ['proposals', 'GET list, GET one', '—'], ['projects', 'GET list, GET one', '—'], ['staff', 'GET list, GET one (names only)', '—']].map(([n, r, w]) => <tr key={n} className="border-t border-gray-100 dark:border-gray-700"><td className="py-1.5"><code>/api/v1/{n}</code></td><td>{r}</td><td>{w}</td></tr>)}
                </tbody></table></div>
                <p className="mt-2 text-xs text-gray-500">{tr("Lists take ?limit= (up to 100), ?page=, ?q= (search) and ?updated_since= (ISO date), and answer { data, page, limit, total }.")}</p>
            </Card>
            <Card><h5 className="mb-2">{tr("Push a lead (for example from a website form)")}</h5><Code>{`curl -X POST ${base}/leads \\\n  -H "Authorization: Bearer trt_xxxxxxxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Sara Benali","email":"sara@example.com","phone":"+212600000000","company":"Atlas","source":"Website","description":"Wants a new website"}'`}</Code></Card>
            <Card><h5 className="mb-2">{tr("Create a task")}</h5><Code>{`curl -X POST ${base}/tasks \\\n  -H "Authorization: Bearer trt_xxxxxxxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Call Sara","priority":3,"due_date":"2026-12-01","rel_type":"lead","rel_id":"<lead id>","assignee_ids":["<staff id>"]}'`}</Code></Card>
            <Card><h5 className="mb-2">{tr("Push an idea to the Grow board")}</h5><Code>{`curl -X POST ${base}/ideas \\\n  -H "Authorization: Bearer trt_xxxxxxxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"Offer a maintenance plan","body":"Three clients have no plan","category":"income","period":"monthly","priority":3,"tags":["upsell"]}'`}</Code></Card>
            <Card>
                <h5 className="mb-2">{tr("Check a webhook call")}</h5>
                <p className="mb-2 text-sm text-gray-500">{tr("Each call has the headers X-TRT-Event and X-TRT-Signature (t=<seconds>,v1=<hmac>). Recompute the HMAC SHA-256 of \"<t>.<raw body>\" with your signing secret and compare. Refuse calls whose t is older than 5 minutes.")}</p>
                <Code>{`// Node.js\nconst [t, v1] = req.headers['x-trt-signature'].match(/t=(\\d+),v1=(\\w+)/).slice(1)\nconst ok = crypto.createHmac('sha256', SECRET).update(t + '.' + rawBody).digest('hex') === v1\n\n// PHP\n$sig = hash_hmac('sha256', $t . '.' . $rawBody, $secret);`}</Code>
            </Card>
        </div>
    )
}

const ApiPage = () => (
    <Container>
        <div className="mb-5"><h3>{tr("API and webhooks")}</h3><p className="text-sm text-gray-500">{tr("Two ways to talk to the CRM from outside, both secure: keys to read and push data, webhooks to be told when something happens.")}</p></div>
        <Tabs defaultValue="keys">
            <TabList><TabNav value="keys" icon={<TbKey />}>{tr("API keys")}</TabNav><TabNav value="hooks" icon={<TbWebhook />}>{tr("Webhooks")}</TabNav><TabNav value="docs" icon={<TbBook2 />}>{tr("How to use")}</TabNav></TabList>
            <div className="pt-5"><TabContent value="keys"><Keys /></TabContent><TabContent value="hooks"><Hooks /></TabContent><TabContent value="docs"><Docs /></TabContent></div>
        </Tabs>
    </Container>
)

export default ApiPage
