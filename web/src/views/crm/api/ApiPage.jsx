import { useCallback, useEffect, useState } from 'react'
import { TbKey, TbWebhook, TbBook2, TbPlus, TbCopy, TbTrash, TbPlayerPlay, TbCircleCheck, TbAlertTriangle, TbHistory, TbLogin2, TbRefresh } from 'react-icons/tb'
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
                <h5 className="mb-2">{tr("Send an appointment request to the calendar")}</h5>
                <p className="mb-2 text-sm text-gray-500">{tr("The key needs the scope “Send appointment requests”. The request is a draft on the calendar (⏳): nobody is invited and no reminder goes out until a team member accepts it. The same room is never recorded twice. Ask its state with GET /calendar/events/<id>, or subscribe to the webhooks appointment.accepted and appointment.declined.")}</p>
                <Code>{`curl -X POST ${base}/calendar/events \\\n  -H "Authorization: Bearer trt_xxxxxxxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"Appointment: Ada","start":"2026-11-10T10:00:00Z","end":"2026-11-10T10:30:00Z",\n       "meeting_url":"https://meet.trtcrm.com/rdv-ab12","room":"rdv-ab12",\n       "attendees":[{"name":"Ada","email":"ada@example.com","phone":"+212600000000"}],\n       "description":"Wants a quote","source":"trtmeet-booking"}'\n\n// 201 { "data": { "id": "…", "status": "draft", … }, "created": true }`}</Code>
                            <p className="mb-2 mt-3 text-sm text-gray-500">{tr("The same key can accept, refuse, edit and delete the requests it sent (nothing else): staff_id is the CRM team member who decides in your screen. A request can be refused after it was accepted (cancelled). The CRM calls your webhooks appointment.updated and appointment.deleted when a team member changes or deletes one in the CRM.")}</p>
                <Code>{`curl -X POST ${base}/calendar/events/<id>/decision -H "Authorization: Bearer trt_xxxxxxxx" -H "Content-Type: application/json" \\\n  -d '{"decision":"accept","staff_id":"<team member id>","notify":true}'   # or "refuse"\n\ncurl -X PATCH ${base}/calendar/events/<id> -H "Authorization: Bearer trt_xxxxxxxx" -H "Content-Type: application/json" \\\n  -d '{"start":"2026-11-11T14:00:00Z","end":"2026-11-11T14:30:00Z","title":"Appointment: Ada"}'\n\ncurl -X DELETE ${base}/calendar/events/<id> -H "Authorization: Bearer trt_xxxxxxxx"`}</Code>

                <h5 className="mb-2 mt-4">{tr("Send the meeting recap")}</h5>
                <p className="mb-2 text-sm text-gray-500">{tr("The key needs the scope calendar:write. The minutes are written on the event of that room and every action item becomes a task, assigned to the named team member or else to staff_id. Saving twice adds the minutes and never duplicates a task.")}</p>
                <Code>{`curl -X POST ${base}/calendar/recap -H "Authorization: Bearer trt_xxxxxxxx" -H "Content-Type: application/json" \\\n  -d '{"room":"rdv-ab12","staff_id":"<team member id>","report":"Summary…\\nDecisions…",\n       "tasks":[{"name":"Send the quote","owner":"Ada","due":"2026-11-12"}]}'\n\n// 200 { "event":{…}, "report_saved":true, "tasks":[{"id":"…","assigned_to":"…","link":"…"}], "skipped":[] }`}</Code>            </Card>
            <Card>
                <h5 className="mb-2">{tr("Check a webhook call")}</h5>
                <p className="mb-2 text-sm text-gray-500">{tr("Each call has the headers X-TRT-Event and X-TRT-Signature (t=<seconds>,v1=<hmac>). Recompute the HMAC SHA-256 of \"<t>.<raw body>\" with your signing secret and compare. Refuse calls whose t is older than 5 minutes.")}</p>
                <Code>{`// Node.js\nconst [t, v1] = req.headers['x-trt-signature'].match(/t=(\\d+),v1=(\\w+)/).slice(1)\nconst ok = crypto.createHmac('sha256', SECRET).update(t + '.' + rawBody).digest('hex') === v1\n\n// PHP\n$sig = hash_hmac('sha256', $t . '.' . $rawBody, $secret);`}</Code>
            </Card>
        </div>
    )
}

/* ------------------------------------------------------------ sign in with the CRM (OpenID Connect) */
const NODE = (iss) => `// Node.js, with the "openid-client" library: the Meet app signs its team in with the CRM
import * as client from 'openid-client'

const config = await client.discovery(new URL('${iss}'), process.env.CRM_CLIENT_ID, process.env.CRM_CLIENT_SECRET)

// 1) /login: send the person to the CRM (PKCE protects the code)
const verifier = client.randomPKCECodeVerifier()
const url = client.buildAuthorizationUrl(config, {
  redirect_uri: 'https://meet.trtcrm.com/auth/callback',
  scope: 'openid profile email calendar.read',
  code_challenge: await client.calculatePKCECodeChallenge(verifier),
  code_challenge_method: 'S256',
  state: client.randomState(),            // keep it (and the verifier) in a cookie
})

// 2) /auth/callback: swap the code for the person
const tokens = await client.authorizationCodeGrant(config, new URL(req.url), { pkceCodeVerifier: verifier, expectedState: savedState })
const me = tokens.claims()   // { sub, name, email, picture, staff_id, admin, role }
// me.admin === true: this person may admit guests from the waiting room. Guests who only have a meeting link never sign in.

// 2b) the member's own meetings (only meetings with a link on meet.trtcrm.com):
//    GET ${iss}/api/v1/calendar/events?from=<ISO>&to=<ISO>[&include_unlinked=1]   with  Authorization: Bearer <tokens.access_token>
//    (include_unlinked=1: every event of the member, meeting_url null when there is no link)
//    Team busy times for free slots (no titles):  GET ${iss}/api/v1/calendar/busy?from=&to=   with a key that has calendar:read
//    → { data: [{ id, title, start, end, meeting_url, room, attendees, attendees_count, organizer }] }

// 3) stay signed in only while the CRM session lives: from time to time ask silently.
//    The authorize URL with prompt=none answers with an error=login_required when the CRM session is over.
// 4) sign out: send the browser to  ${iss}/api/oauth/logout?client_id=…&post_logout_redirect_uri=https://meet.trtcrm.com/`

const Sso = () => {
    const [d, setD] = useState(null)
    const [dlg, setDlg] = useState(null)
    const [shown, setShown] = useState(null)
    const [del, setDel] = useState(null)
    const load = useCallback(() => api('/api/crm/oauth-clients').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])
    const save = async () => {
        try { const r = await api('/api/crm/oauth-clients', { method: 'POST', body: dlg }); setDlg(null); setShown(r); load() } catch (e) { notify('danger', e.message) }
    }
    const patch = (c, body) => api(`/api/crm/oauth-clients/${c.id}`, { method: 'PUT', body }).then((r) => { if (r.secret) setShown({ client: r.client, secret: r.secret }); load() }).catch((e) => notify('danger', e.message))
    const ep = d?.endpoints
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm text-gray-500">{tr("Let another app of yours (the Meet app) sign the team in with their CRM account. Only active team members can sign in: clients never. Guests of a meeting use the meeting link and are admitted by a team member.")}</p><Button variant="solid" icon={<TbPlus />} onClick={() => setDlg({ name: '', redirectUris: '', logoutUris: '' })}>{tr("Add an app")}</Button></div>
            {!d ? <p className="py-8 text-center text-gray-400">{tr("Loading…")}</p> : !d.clients.length ? <Card><p className="py-6 text-center text-gray-400">{tr("No app yet.")}</p></Card> : (
                <div className="grid gap-3">{d.clients.map((c) => (
                    <Card key={c.id} className={c.active ? '' : 'opacity-60'}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-lg text-primary"><TbLogin2 /></span><b className="text-base">{c.name}</b><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">{c.clientId}</code><button type="button" className="text-gray-400 hover:text-primary" aria-label={tr("Copy")} onClick={() => copy(c.clientId)}><TbCopy /></button></div>
                                <div className="mt-2 space-y-0.5 text-xs text-gray-500">{c.redirectUris.map((u) => <div key={u} className="truncate">↪ {u}</div>)}</div>
                                <p className="mt-2 text-xs text-gray-500">{tr("Created")} {dayjs(c.createdAt).format('DD MMM YYYY')} · {c.lastUsedAt ? `${tr("last sign-in")} ${dayjs(c.lastUsedAt).format('DD MMM YYYY, HH:mm')}` : tr("never used")} · {c.logins} {tr("sign-ins")}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-sm"><Switcher checked={c.active} onChange={(v) => patch(c, { active: v })} />{tr("On")}</label><Button size="sm" icon={<TbRefresh />} onClick={() => patch(c, { rotateSecret: true })}>{tr("New secret")}</Button><Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(c)}>{tr("Delete")}</Button></div>
                        </div>
                    </Card>
                ))}</div>
            )}
            {ep && (
                <Card><h5 className="mb-2">{tr("Addresses for the app")}</h5>
                    <div className="grid gap-1.5 text-sm">{[['Issuer', ep.issuer], ['Discovery', `${ep.issuer}/.well-known/openid-configuration`], ['Authorize', ep.authorization_endpoint], ['Token', ep.token_endpoint], ['User info', ep.userinfo_endpoint], ['Keys (JWKS)', ep.jwks_uri], ['Sign out', ep.end_session_endpoint]].map(([k, v]) => <div key={k} className="flex items-center gap-2"><span className="w-24 shrink-0 text-xs font-semibold text-gray-500">{tr(k)}</span><code className="min-w-0 flex-1 truncate text-xs">{v}</code><button type="button" className="text-gray-400 hover:text-primary" aria-label={tr("Copy")} onClick={() => copy(v)}><TbCopy /></button></div>)}</div>
                    <p className="mt-3 text-xs text-gray-500">{tr("What the app learns about the person: id, name, email, photo, staff id, whether they are an administrator and their role. Any OpenID Connect library works with the discovery address.")}</p>
                    <div className="mt-3"><Code>{NODE(ep.issuer)}</Code></div>
                </Card>
            )}
            <Dialog isOpen={!!dlg} width={620} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-4">{tr("Add an app")}</h5>
                {dlg && <div className="space-y-4">
                    <div><L>{tr("Name")}</L><Input autoFocus value={dlg.name} placeholder="Meet" onChange={(e) => setDlg({ ...dlg, name: e.target.value })} /></div>
                    <div><L>{tr("Redirect addresses (one per line): where the app receives the sign-in")}</L><Input textArea rows={3} value={dlg.redirectUris} placeholder="https://meet.trtcrm.com/auth/callback" onChange={(e) => setDlg({ ...dlg, redirectUris: e.target.value })} /></div>
                    <div><L>{tr("Sign-out addresses (optional, one per line)")}</L><Input textArea rows={2} value={dlg.logoutUris} placeholder="https://meet.trtcrm.com/" onChange={(e) => setDlg({ ...dlg, logoutUris: e.target.value })} /></div>
                </div>}
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDlg(null)}>{tr("Cancel")}</Button><Button variant="solid" onClick={save}>{tr("Add the app")}</Button></div>
            </Dialog>
            <Dialog isOpen={!!shown} width={560} onClose={() => setShown(null)} onRequestClose={() => setShown(null)}>
                <h5 className="mb-1">{tr("Client id and secret")}</h5>
                <p className="mb-3 text-sm text-amber-700">{tr("Copy the secret now. It is shown only once: if you lose it, create a new one.")}</p>
                {shown && <div className="space-y-2">{[[tr("Client id"), shown.client.clientId], [tr("Client secret"), shown.secret]].map(([k, v]) => <div key={k}><L>{k}</L><div className="flex items-center gap-2 rounded-xl bg-gray-900 p-3"><code className="min-w-0 flex-1 break-all text-sm text-emerald-300">{v}</code><Button size="sm" icon={<TbCopy />} onClick={() => copy(v)}>{tr("Copy")}</Button></div></div>)}</div>}
                <div className="mt-5 flex justify-end"><Button variant="solid" onClick={() => setShown(null)}>{tr("I have copied it")}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this app?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const c = del; setDel(null); api(`/api/crm/oauth-clients/${c.id}`, { method: 'DELETE' }).then(() => { notify('success', tr("App deleted")); load() }).catch((e) => notify('danger', e.message)) }}><p>{tr("\"{name}\" can no longer sign anyone in. This cannot be undone.", { name: del?.name })}</p></ConfirmDialog>
        </div>
    )
}

const ApiPage = () => (
    <Container>
        <div className="mb-5"><h3>{tr("API and webhooks")}</h3><p className="text-sm text-gray-500">{tr("Ways to talk to the CRM from outside, all secure: keys to read and push data, webhooks to be told when something happens, and sign-in for your other apps.")}</p></div>
        <Tabs defaultValue="keys">
            <TabList><TabNav value="keys" icon={<TbKey />}>{tr("API keys")}</TabNav><TabNav value="hooks" icon={<TbWebhook />}>{tr("Webhooks")}</TabNav><TabNav value="sso" icon={<TbLogin2 />}>{tr("Sign in with CRM")}</TabNav><TabNav value="docs" icon={<TbBook2 />}>{tr("How to use")}</TabNav></TabList>
            <div className="pt-5"><TabContent value="keys"><Keys /></TabContent><TabContent value="hooks"><Hooks /></TabContent><TabContent value="sso"><Sso /></TabContent><TabContent value="docs"><Docs /></TabContent></div>
        </Tabs>
    </Container>
)

export default ApiPage
