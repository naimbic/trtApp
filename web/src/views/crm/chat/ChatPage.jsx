import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import { PiMagnifyingGlassDuotone, PiChatsCircleDuotone, PiUsersThreeDuotone, PiUserCircleDuotone, PiPlusBold, PiPhoneCallDuotone, PiInfoDuotone, PiCaretLeftBold, PiBellSimpleDuotone, PiBellSimpleSlashDuotone, PiSignOutDuotone, PiTrashDuotone, PiXBold, PiPencilSimpleLineDuotone, PiCheckBold, PiChatCircleTextDuotone, PiBuildingsDuotone, PiUserPlusDuotone } from 'react-icons/pi'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import classNames from '@/utils/classNames'
import ChatThread from '@/components/crm/chat/ChatThread'
import { StatusDot, usePingOnIncrease } from '@/components/crm/chat/chatKit'
import { chatApi as api, chatPost as post, chatPatch as patch, chatDelete as del } from '@/components/crm/chat/chatClient'
import { upload as uploadFile, notify } from '../kit/api'
import { useChatStatus, useMyStatus, STATUS } from '@/store/chatStatusStore'
import { tr } from '@/utils/t'

const POLL = 6000
const TABS = [['all', tr("All")], ['group', tr("Groups")], ['direct', tr("Direct")], ['client', tr("Clients")]]
const inTab = (tab, r) => tab === 'all' || (tab === 'group' ? r.kind === 'group' || r.kind === 'team' : r.kind === tab)
const stamp = (d) => (dayjs(d).isSame(dayjs(), 'day') ? dayjs(d).format('HH:mm') : dayjs(d).isSame(dayjs(), 'year') ? dayjs(d).format('MMM D') : dayjs(d).format('YYYY-MM-DD'))

const Face = ({ r, size = 44 }) => {
    const group = r.kind === 'group' || r.kind === 'team'
    return (
        <div className="relative shrink-0">
            {group
                ? <div style={{ width: size, height: size }} className={classNames('flex items-center justify-center rounded-full text-xl', r.kind === 'team' ? 'bg-primary/10 text-primary' : 'bg-violet-100 text-violet-600 dark:bg-violet-500/20')}>{r.kind === 'team' ? <PiUsersThreeDuotone /> : <PiChatsCircleDuotone />}</div>
                : <Avatar size={size} shape="circle" src={r.image || undefined} icon={r.image ? undefined : <PiUserCircleDuotone />} />}
            {!group && <StatusDot status={r.status} className="absolute -bottom-0.5 -right-0.5" />}
        </div>
    )
}

const Row = ({ r, active, onClick }) => (
    <button type="button" onClick={onClick} className={classNames('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition', active ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700')}>
        <Face r={r} />
        <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><span className={classNames('truncate text-sm', r.unread ? 'font-bold' : 'font-semibold', 'text-gray-900 dark:text-gray-100')}>{r.title}</span>{r.lastAt && r.lastMessage && <span className="shrink-0 text-[11px] text-gray-400">{stamp(r.lastAt)}</span>}</div>
            <div className="flex items-center justify-between gap-2"><span className={classNames('truncate text-xs', r.unread ? 'font-medium text-gray-700 dark:text-gray-200' : 'text-gray-500')}>{r.lastMessage || r.subtitle || STATUS[r.status || 'offline'].label}</span>{r.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">{r.unread}</span>}</div>
            {r.kind === 'client' && r.subtitle && r.lastMessage && <div className="truncate text-[11px] text-gray-400">{r.subtitle}</div>}
        </div>
    </button>
)

/** Pick colleagues: one click starts a private chat, or tick several to make a group. */
const NewChatDialog = ({ open, mode, people, onClose, onDirect, onGroup }) => {
    const [name, setName] = useState('')
    const [q, setQ] = useState('')
    const [sel, setSel] = useState([])
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) { setName(''); setQ(''); setSel([]) } }, [open, mode])
    const list = people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    const group = mode === 'group'
    const create = async () => { setBusy(true); try { await onGroup(name, sel) } finally { setBusy(false) } }
    return (
        <Dialog isOpen={open} onClose={onClose} onRequestClose={onClose} width={440}>
            <h5 className="mb-4">{group ? tr("New group") : tr("New chat")}</h5>
            {group && <div className="mb-3"><label className="form-label mb-2 block">{tr("Group name")}</label><Input autoFocus value={name} maxLength={60} placeholder={tr("e.g. Design team")} onChange={(e) => setName(e.target.value)} /></div>}
            <Input value={q} placeholder={tr("Search colleagues")} prefix={<PiMagnifyingGlassDuotone />} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-3 max-h-72 space-y-0.5 overflow-y-auto">
                {list.map((p) => {
                    const on = sel.includes(p.id)
                    return (
                        <button key={p.id} type="button" onClick={() => (group ? setSel((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id])) : onDirect(p))} className={classNames('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700', on && 'bg-primary/10')}>
                            <Face r={{ kind: 'direct', image: p.image, status: p.status }} size={36} />
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="text-xs text-gray-500">{STATUS[p.status || 'offline'].label}</span></span>
                            {group && <span className={classNames('flex h-5 w-5 items-center justify-center rounded-md border text-xs', on ? 'border-primary bg-primary text-white' : 'border-gray-300')}>{on && <PiCheckBold />}</span>}
                        </button>
                    )
                })}
                {!list.length && <div className="py-8 text-center text-sm text-gray-400">{tr("No colleague found")}</div>}
            </div>
            {group && <div className="mt-5 flex items-center justify-between gap-2"><span className="text-xs text-gray-500">{sel.length} {tr("selected")}</span><div className="flex gap-2"><Button onClick={onClose}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} disabled={!name.trim() || !sel.length} onClick={create}>{tr("Create group")}</Button></div></div>}
        </Dialog>
    )
}

/** Right-hand panel: who is in the conversation and what can be done with it. */
const InfoPanel = ({ room, data, theirStatus, onClose, reload, onLeft }) => {
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState('')
    const [adding, setAdding] = useState(false)
    const [confirm, setConfirm] = useState(null) // 'leave' | 'delete'
    const dir = useMemo(() => Object.fromEntries((data.directory || []).map((s) => [s.id, s])), [data.directory])
    const me = data.me
    const owner = room.kind === 'group' && (room.createdBy === me.id || me.admin)
    const members = room.kind === 'group' ? room.members.map((i) => dir[i]).filter(Boolean) : room.kind === 'team' ? (data.directory || []) : []
    const run = async (fn, ok) => { try { const r = await fn(); if (ok) notify('success', ok); await reload(); return r } catch (e) { notify('danger', e.message) } }
    const addable = (data.directory || []).filter((s) => !room.members?.includes(s.id))
    useEffect(() => { setEditing(false); setAdding(false) }, [room.id])
    const status = theirStatus ?? room.status

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 pt-4"><h6>{tr("Details")}</h6><button type="button" className="text-lg text-gray-400" onClick={onClose}><PiXBold /></button></div>
            <div className="flex flex-col items-center gap-2 px-4 py-5 text-center">
                <Face r={{ ...room, status }} size={72} />
                {editing ? (
                    <div className="flex w-full items-center gap-1"><Input size="sm" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /><Button size="sm" variant="solid" icon={<PiCheckBold />} onClick={async () => { await run(() => patch(`/rooms/${room.id}`, { name }), tr("Group renamed")); setEditing(false) }} /></div>
                ) : (
                    <div className="flex items-center gap-1.5"><span className="text-base font-bold heading-text">{room.title}</span>{room.kind === 'group' && <button type="button" className="text-gray-400 hover:text-primary" title={tr("Rename")} onClick={() => { setName(room.title); setEditing(true) }}><PiPencilSimpleLineDuotone /></button>}</div>
                )}
                <div className="text-xs text-gray-500">
                    {room.kind === 'group' ? tr("{length} members", { length: members.length }) : room.kind === 'team' ? tr("Everyone on the team") : room.kind === 'client' ? (room.subtitle || tr("Client contact")) : STATUS[status || 'offline'].label}
                </div>
            </div>

            {(room.kind === 'group' || room.kind === 'team') && (
                <div className="px-3 pb-4">
                    <div className="mb-1 flex items-center justify-between px-1"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tr("Members")}</span>{room.kind === 'group' && <button type="button" className="flex items-center gap-1 text-xs font-semibold text-primary" onClick={() => setAdding((a) => !a)}><PiUserPlusDuotone />{adding ? tr("Done") : tr("Add")}</button>}</div>
                    {adding && (
                        <div className="mb-2 max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-gray-200 p-1 dark:border-gray-700">
                            {addable.map((s) => <button key={s.id} type="button" onClick={() => run(() => patch(`/rooms/${room.id}`, { add: [s.id] }))} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><Avatar size={24} shape="circle" src={s.image || undefined} icon={<PiUserCircleDuotone />} /><span className="truncate">{s.name}</span><PiPlusBold className="ml-auto text-gray-400" /></button>)}
                            {!addable.length && <div className="p-3 text-center text-xs text-gray-400">{tr("Everyone is already here")}</div>}
                        </div>
                    )}
                    <div className="space-y-0.5">
                        {members.map((s) => (
                            <div key={s.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                                <Face r={{ kind: 'direct', image: s.image, status: s.id === me.id ? (useChatStatus.getState().away ? 'away' : useChatStatus.getState().state) : s.status }} size={32} />
                                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{s.name}{s.id === me.id && <span className="ml-1 font-normal text-gray-400">{tr("(you)")}</span>}</div><div className="text-[11px] text-gray-400">{s.id === room.createdBy ? tr("Creator") : STATUS[(s.id === me.id ? (useChatStatus.getState().away ? 'away' : useChatStatus.getState().state) : s.status) || 'offline'].label}</div></div>
                                {room.kind === 'group' && owner && s.id !== me.id && <button type="button" title={tr("Remove")} className="text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100" onClick={() => run(() => patch(`/rooms/${room.id}`, { remove: [s.id] }))}><PiXBold /></button>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {room.kind === 'group' && (
                <div className="mt-auto flex flex-col gap-2 border-t border-gray-100 p-4 dark:border-gray-700">
                    <Button size="sm" icon={<PiSignOutDuotone />} onClick={() => setConfirm('leave')}>{tr("Leave group")}</Button>
                    {owner && <Button size="sm" variant="plain" className="text-red-500" icon={<PiTrashDuotone />} onClick={() => setConfirm('delete')}>{tr("Delete group")}</Button>}
                </div>
            )}

            <ConfirmDialog isOpen={!!confirm} type={confirm === 'delete' ? 'danger' : 'warning'} title={confirm === 'delete' ? tr("Delete this group?") : tr("Leave this group?")} confirmText={confirm === 'delete' ? tr("Delete") : tr("Leave")} onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={async () => { const c = confirm; setConfirm(null); await run(() => (c === 'delete' ? del(`/rooms/${room.id}`) : patch(`/rooms/${room.id}`, { leave: true })), c === 'delete' ? tr("Group deleted") : tr("You left the group")); onLeft() }}>
                <p>{confirm === 'delete' ? tr("The group and all of its messages are removed for everybody.") : tr("You will no longer see this conversation. Others can add you again.")}</p>
            </ConfirmDialog>
        </div>
    )
}

const ChatPage = () => {
    const navigate = useNavigate()
    const [params, setParams] = useSearchParams()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [tab, setTab] = useState('all')
    const [q, setQ] = useState('')
    const [dlg, setDlg] = useState(null) // 'direct' | 'group'
    const [info, setInfo] = useState(false)
    const [theirStatus, setTheirStatus] = useState(null)
    const muted = useChatStatus((s) => s.muted)
    const setMuted = useChatStatus((s) => s.setMuted)
    const mine = useMyStatus()
    const roomId = params.get('room')

    const refresh = useCallback(async () => { try { setData(await api('/rooms')); setError('') } catch (e) { setError(e.message) } }, [])
    useEffect(() => { refresh(); const t = setInterval(() => { if (!document.hidden) refresh() }, POLL); return () => clearInterval(t) }, [refresh])
    usePingOnIncrease(data?.unread ?? 0)

    const room = data?.rooms.find((r) => r.id === roomId) || null
    const open = (id) => { setTheirStatus(null); setParams(id ? { room: id } : {}, { replace: true }) }
    useEffect(() => { if (data && roomId && !room) setParams({}, { replace: true }) }, [data, roomId, room, setParams])

    const loadMsgs = useCallback((after) => api(`/rooms/${roomId}${after ? `?after=${encodeURIComponent(after)}` : ''}`), [roomId])
    const sendMsg = useCallback((body, attachment, replyTo) => post(`/rooms/${roomId}`, { body, attachment, replyTo }).then((m) => { refresh(); return m }), [roomId, refresh])
    const uploadMsg = useCallback((file, voice) => { const fd = new FormData(); fd.append('file', file); if (voice) fd.append('voice', '1'); return uploadFile('/api/crm/chat/upload', fd) }, [])
    const onData = useCallback((x) => setTheirStatus(x.status ?? null), [])

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return (data?.rooms || []).filter((r) => inTab(tab, r) && (!needle || r.title.toLowerCase().includes(needle) || (r.subtitle || '').toLowerCase().includes(needle) || (r.lastMessage || '').toLowerCase().includes(needle)))
            .sort((a, b) => (a.kind === 'team' ? -1 : b.kind === 'team' ? 1 : +new Date(b.lastAt || 0) - +new Date(a.lastAt || 0)))
    }, [data, tab, q])
    const unreadOf = (t) => (data?.rooms || []).filter((r) => t !== 'all' && inTab(t, r)).reduce((n, r) => n + r.unread, 0)

    const talkTo = async (p) => { try { const { id } = await post('/rooms', { staffId: p.id }); setDlg(null); await refresh(); open(id) } catch (e) { notify('danger', e.message) } }
    const makeGroup = async (name, staffIds) => { try { const { id } = await post('/rooms', { group: { name, staffIds } }); setDlg(null); await refresh(); open(id); setInfo(false) } catch (e) { notify('danger', e.message) } }

    if (error && !data) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
    if (!data) return <div className="py-20 text-center text-gray-400">{tr("Loading…")}</div>
    const status = theirStatus ?? room?.status
    const sub = !room ? '' : room.kind === 'team' ? tr("{v1} online", { v1: data.people.filter((p) => p.status === 'online').length + 1 }) : room.kind === 'group' ? tr("{length} members", { length: room.members.length }) : status === 'online' ? tr("Available now") : status === 'offline' ? (room.kind === 'client' ? 'Offline · will see your reply later' : tr("Offline")) : tr("{label} · may reply late", { label: STATUS[status].label })

    return (
        <div className="flex h-[calc(100vh-150px)] min-h-[480px] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <aside className={classNames('flex w-full shrink-0 flex-col border-gray-200 dark:border-gray-700 md:w-[340px] md:border-r', room && 'hidden md:flex')}>
                <div className="flex items-start justify-between gap-2 px-4 pt-4">
                    <div><h4>{tr("Chat")}</h4><div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500"><StatusDot status={mine} className="!border-0" />{tr("You:")} {STATUS[mine].label} · {data.people.filter((p) => p.status === 'online').length} {tr("colleagues available")}</div></div>
                    <div className="flex items-center gap-1">
                        <button type="button" title={muted ? tr("Sound off") : tr("Sound on")} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setMuted(!muted)}>{muted ? <PiBellSimpleSlashDuotone /> : <PiBellSimpleDuotone />}</button>
                    </div>
                </div>
                <div className="flex gap-2 px-4 pt-3">
                    <Button size="sm" variant="solid" className="flex-1" icon={<PiChatCircleTextDuotone />} onClick={() => setDlg('direct')}>{tr("New chat")}</Button>
                    <Button size="sm" className="flex-1" icon={<PiUsersThreeDuotone />} onClick={() => setDlg('group')}>{tr("New group")}</Button>
                </div>
                <div className="px-4 pt-3"><Input size="sm" value={q} prefix={<PiMagnifyingGlassDuotone />} placeholder={tr("Search conversations")} onChange={(e) => setQ(e.target.value)} /></div>
                <div className="flex gap-1 px-3 pb-2 pt-3">
                    {TABS.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={classNames('flex-1 rounded-lg py-1.5 text-xs font-semibold', tab === k ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}>{label}{unreadOf(k) > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-white">{unreadOf(k)}</span>}</button>)}
                </div>
                <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                    {rows.map((r) => <Row key={r.id} r={r} active={r.id === roomId} onClick={() => open(r.id)} />)}
                    {!rows.length && (
                        <div className="px-6 py-14 text-center text-sm text-gray-400">
                            {tab === 'client' ? <><PiBuildingsDuotone className="mx-auto mb-2 text-3xl" />{tr("Clients who write from their portal appear here.")}</> : q ? tr("No conversation matches your search.") : tab === 'group' ? tr("No group yet. Create one with New group.") : tr("Nothing here yet. Start with New chat.")}
                        </div>
                    )}
                </div>
            </aside>

            <section className={classNames('min-w-0 flex-1 flex-col', room ? 'flex' : 'hidden md:flex')}>
                {room ? (
                    <div className="flex min-h-0 flex-1">
                        <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                                <button type="button" className="text-xl text-gray-500 md:hidden" onClick={() => open(null)}><PiCaretLeftBold /></button>
                                <Face r={{ ...room, status }} size={40} />
                                <div className="min-w-0 flex-1"><div className="truncate font-bold heading-text">{room.title}</div><div className="truncate text-xs text-gray-500">{sub}</div></div>
                                {data.calls && (room.kind === 'direct' || room.kind === 'client') && <button type="button" title={tr("Voice call")} className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-primary hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => window.dispatchEvent(new CustomEvent('trt-chat-call', { detail: { roomId: room.id, peerName: room.title } }))}><PiPhoneCallDuotone /></button>}
                                <button type="button" title={tr("Details")} className={classNames('flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-gray-100 dark:hover:bg-gray-700', info ? 'bg-primary/10 text-primary' : 'text-gray-500')} onClick={() => setInfo((v) => !v)}><PiInfoDuotone /></button>
                            </div>
                            <ChatThread load={loadMsgs} send={sendMsg} upload={uploadMsg} onData={onData} showSender={room.kind === 'team' || room.kind === 'group'} empty={room.kind === 'group' ? tr("No messages yet. Say hello to the group!") : undefined} />
                        </div>
                        {info && <div className="absolute inset-0 z-10 bg-white dark:bg-gray-800 lg:static lg:inset-auto lg:z-auto lg:w-72 lg:shrink-0 lg:border-l lg:border-gray-200 lg:dark:border-gray-700"><InfoPanel room={room} data={data} theirStatus={theirStatus} onClose={() => setInfo(false)} reload={refresh} onLeft={() => { setInfo(false); open(null) }} /></div>}
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl text-primary"><PiChatsCircleDuotone /></span>
                        <div className="text-lg font-bold heading-text">{tr("Your messages")}</div>
                        <p className="max-w-xs text-sm">{tr("Pick a conversation on the left, or start a private chat or a group with your colleagues.")}</p>
                        <div className="flex gap-2"><Button size="sm" variant="solid" onClick={() => setDlg('direct')}>{tr("New chat")}</Button><Button size="sm" onClick={() => setDlg('group')}>{tr("New group")}</Button></div>
                    </div>
                )}
            </section>

            <NewChatDialog open={!!dlg} mode={dlg} people={data.people} onClose={() => setDlg(null)} onDirect={talkTo} onGroup={makeGroup} />
        </div>
    )
}

export default ChatPage
