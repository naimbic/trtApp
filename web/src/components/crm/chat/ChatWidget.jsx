import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { PiChatCircleDotsFill, PiXBold, PiCaretLeftBold, PiUsersThreeDuotone, PiUserCircleDuotone, PiBuildingsDuotone, PiBellSimpleDuotone, PiBellSimpleSlashDuotone, PiPhoneCallDuotone, PiChatsCircleDuotone, PiArrowsOutSimpleDuotone } from 'react-icons/pi'
import Avatar from '@/components/ui/Avatar'
import classNames from '@/utils/classNames'
import ChatThread from './ChatThread'
import CallOverlay from './CallOverlay'
import useCall from './useCall'
import { upload as uploadFile } from '@/views/crm/kit/api'
import { StatusDot, usePresence, usePingOnIncrease } from './chatKit'
import { useChatStatus, useMyStatus, STATUS } from '@/store/chatStatusStore'
import { chatApi, chatPost } from './chatClient'
import { tr, trn } from '@/utils/t'

const POLL = 8000
const api = chatApi
const post = chatPost

const Face = ({ r }) => (
    <div className="relative shrink-0">
        {r.kind === 'team' || r.kind === 'group' ? <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl text-primary">{r.kind === 'group' ? <PiChatsCircleDuotone /> : <PiUsersThreeDuotone />}</div> : <Avatar size={40} shape="circle" src={r.image || undefined} icon={r.image ? undefined : <PiUserCircleDuotone />} />}
        {r.kind !== 'team' && r.kind !== 'group' && <StatusDot status={r.status} className="absolute -bottom-0.5 -right-0.5" />}
    </div>
)

const Row = ({ r, onClick }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
        <Face r={r} />
        <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{r.title}</span>{r.lastAt && r.lastMessage && <span className="shrink-0 text-[11px] text-gray-400">{dayjs(r.lastAt).format(dayjs(r.lastAt).isSame(dayjs(), 'day') ? 'HH:mm' : 'MMM D')}</span>}</div>
            <div className="truncate text-xs text-gray-500">{r.lastMessage || r.subtitle || STATUS[r.status || 'offline'].label}</div>
        </div>
        {r.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">{r.unread}</span>}
    </button>
)

const TABS = [['chats', tr("Chats")], ['people', tr("People")], ['clients', tr("Clients")]]

const ChatWidget = () => {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const onPage = useLocation().pathname.startsWith('/crm/chat')
    const [data, setData] = useState(null)
    const [tab, setTab] = useState('chats')
    const [room, setRoom] = useState(null) // { id, title, kind, image, online }
    const [theirStatus, setTheirStatus] = useState(null)
    const muted = useChatStatus((s) => s.muted)
    const setMuted = useChatStatus((s) => s.setMuted)
    const mine = useMyStatus()

    const refresh = useCallback(async () => { try { setData(await api('/rooms')) } catch { /* not signed in or no staff profile: stay hidden */ } }, [])
    useEffect(() => { refresh(); const t = setInterval(() => { if (!document.hidden) refresh() }, POLL); return () => clearInterval(t) }, [refresh])

    const sendPresence = useCallback((state) => { post('/presence', { state }).catch(() => {}) }, [])
    usePresence(sendPresence)
    usePingOnIncrease(data?.unread ?? 0)

    const loadMsgs = useCallback((after) => api(`/rooms/${room.id}${after ? `?after=${encodeURIComponent(after)}` : ''}`), [room?.id])
    const sendMsg = useCallback((body, attachment) => api(`/rooms/${room.id}`, { method: 'POST', body: JSON.stringify({ body, attachment }) }).then((m) => { refresh(); return m }), [room?.id, refresh])
    const uploadMsg = useCallback((file, voice) => { const fd = new FormData(); fd.append('file', file); if (voice) fd.append('voice', '1'); return uploadFile('/api/crm/chat/upload', fd) }, [])
    const fetchSignals = useCallback(() => api('/signals'), [])
    const sendSignal = useCallback((b) => api('/signals', { method: 'POST', body: JSON.stringify(b) }), [])
    const logCall = useCallback((roomId, body) => { api(`/rooms/${roomId}`, { method: 'POST', body: JSON.stringify({ body }) }).then(refresh).catch(() => {}) }, [refresh])
    const phone = useCall({ fetchSignals, sendSignal, enabled: !!data?.calls, iceServers: data?.iceServers, onLog: logCall })
    useEffect(() => { const h = (e) => phone.start(e.detail); window.addEventListener('trt-chat-call', h); return () => window.removeEventListener('trt-chat-call', h) }, [phone])
    const setCalls = async (calls) => { try { await api('/settings', { method: 'POST', body: JSON.stringify({ calls }) }); refresh() } catch { /* not allowed */ } }
    const onData = useCallback((x) => setTheirStatus(x.status ?? null), [])

    // a click on a @mention anywhere in the app opens the chat with that person
    useEffect(() => {
        const h = async (e) => {
            try {
                const { id } = await api('/rooms', { method: 'POST', body: JSON.stringify({ staffId: e.detail.staffId }) })
                refresh()
                if (window.location.pathname.startsWith('/crm/chat')) return navigate('/crm/chat')
                setTheirStatus(null); setRoom({ id, kind: 'direct', title: e.detail.name, image: null, status: null }); setTab('chats'); setOpen(true)
            } catch { /* chat not available for this person */ }
        }
        window.addEventListener('trt-chat-open', h)
        return () => window.removeEventListener('trt-chat-open', h)
    }, [refresh, navigate])

    if (!data) return null
    const rooms = data.rooms
    const shown = tab === 'clients' ? rooms.filter((r) => r.kind === 'client') : rooms.filter((r) => r.kind !== 'client')
    const clientUnread = rooms.filter((r) => r.kind === 'client').reduce((n, r) => n + r.unread, 0)
    const chatUnread = rooms.filter((r) => r.kind !== 'client').reduce((n, r) => n + r.unread, 0)
    const peopleOnline = data.people.filter((p) => p.status === 'online').length
    const pick = (r) => { setTheirStatus(null); setRoom(r) }
    const talkTo = async (p) => { const { id } = await api('/rooms', { method: 'POST', body: JSON.stringify({ staffId: p.id }) }); pick({ id, kind: 'direct', title: p.name, image: p.image, status: p.status }); refresh() }
    const badge = { chats: chatUnread, clients: clientUnread, people: 0 }

    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
            <CallOverlay c={phone} />
            {open && !onPage && (
                <div className="flex h-[min(560px,calc(100vh-110px))] w-[min(380px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                    {room ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-gray-200 px-3 py-3 dark:border-gray-700">
                                <button type="button" className="text-lg text-gray-500" onClick={() => { setRoom(null); refresh() }}><PiCaretLeftBold /></button>
                                <Face r={{ ...room, status: theirStatus ?? room.status }} />
                                <div className="min-w-0 flex-1"><div className="truncate font-bold text-gray-900 dark:text-gray-100">{room.title}</div><div className="text-xs text-gray-500">{room.kind === 'group' ? room.subtitle : room.kind === 'team' ? tr("{v1} online", { v1: peopleOnline + 1 }) : (theirStatus ?? room.status) === 'online' ? tr("Available now") : (theirStatus ?? room.status) === 'offline' ? (room.kind === 'client' ? tr("Offline · will see your reply later") : tr("Offline")) : tr("{label} · may reply late", { label: STATUS[theirStatus ?? room.status].label })}</div></div>
                                {data.calls && room.kind !== 'team' && room.kind !== 'group' && <button type="button" className="text-xl text-primary" title={tr("Voice call")} onClick={() => phone.start({ roomId: room.id, peerName: room.title })}><PiPhoneCallDuotone /></button>}
                                <button type="button" className="text-lg text-gray-400" onClick={() => setOpen(false)}><PiXBold /></button>
                            </div>
                            <ChatThread load={loadMsgs} send={sendMsg} upload={uploadMsg} onData={onData} showSender={room.kind === 'team' || room.kind === 'group'} />
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-4 pt-4">
                                <div><div className="text-lg font-bold text-gray-900 dark:text-gray-100">{tr("Chat")}</div><div className="flex items-center gap-1.5 text-xs text-gray-500"><StatusDot status={mine} className="!border-0" />{tr("You:")} {STATUS[mine].label} · {trn(peopleOnline, "colleague")} {tr("available")}</div></div>
                                <div className="flex items-center gap-3 text-lg text-gray-400"><button type="button" title={tr("Open the full chat page")} onClick={() => { setOpen(false); navigate('/crm/chat') }}><PiArrowsOutSimpleDuotone /></button>{data.me?.admin && <button type="button" title={data.calls ? tr("Voice calls are on (click to turn off)") : tr("Voice calls are off (click to turn on)")} onClick={() => setCalls(!data.calls)} className={data.calls ? 'text-emerald-500' : ''}><PiPhoneCallDuotone /></button>}<button type="button" title={muted ? tr("Sound off") : tr("Sound on")} onClick={() => setMuted(!muted)}>{muted ? <PiBellSimpleSlashDuotone /> : <PiBellSimpleDuotone />}</button><button type="button" onClick={() => setOpen(false)}><PiXBold /></button></div>
                            </div>
                            <div className="flex gap-1 px-3 pb-2 pt-3">
                                {TABS.map(([k, label]) => (
                                    <button key={k} type="button" onClick={() => setTab(k)} className={classNames('flex-1 rounded-xl py-1.5 text-sm font-semibold', tab === k ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}>{label}{badge[k] > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-white">{badge[k]}</span>}</button>
                                ))}
                            </div>
                            <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                                {tab === 'people' ? (
                                    data.people.map((p) => <Row key={p.id} r={{ kind: 'direct', title: p.name, image: p.image, status: p.status }} onClick={() => talkTo(p)} />)
                                ) : (
                                    <>
                                        {shown.map((r) => <Row key={r.id} r={r} onClick={() => pick(r)} />)}
                                        {tab === 'clients' && !shown.length && <div className="px-6 py-12 text-center text-sm text-gray-400"><PiBuildingsDuotone className="mx-auto mb-2 text-3xl" />{tr("Clients who write from their portal appear here.")}</div>}
                                        {tab === 'chats' && <div className="px-6 pt-3 text-center text-xs text-gray-400">{tr("Open the People tab to start a private conversation.")}</div>}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
            {!onPage && <button type="button" onClick={() => setOpen((o) => !o)} className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl text-white shadow-xl transition-transform hover:scale-105" title={tr("Chat")}>
                {open ? <PiXBold className="text-2xl" /> : <PiChatCircleDotsFill />}
                {!open && data.unread > 0 && <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{data.unread}</span>}
            </button>}
        </div>
    )
}

export default ChatWidget
