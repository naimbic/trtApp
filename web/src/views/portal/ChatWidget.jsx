import { useCallback, useEffect, useRef, useState } from 'react'
import { PiChatCircleDotsFill, PiXBold, PiUserCircleDuotone } from 'react-icons/pi'
import Avatar from '@/components/ui/Avatar'
import ChatThread from '@/components/crm/chat/ChatThread'
import { portal } from './api'
import { usePresence, usePingOnIncrease } from '@/components/crm/chat/chatKit'

// Chat bubble in the client area: shows who from the team is available and keeps the conversation with them.
const ChatWidget = () => {
    const [open, setOpen] = useState(false)
    const [team, setTeam] = useState([])
    const [unread, setUnread] = useState(0)
    const openRef = useRef(false)
    openRef.current = open

    const load = useCallback((after) => portal(`/chat${after ? `?after=${encodeURIComponent(after)}` : ''}`, { quiet: true }), [])
    const send = useCallback((body) => portal('/chat', { method: 'POST', body: { body } }), [])
    const onData = useCallback((x) => { setTeam(x.team || []); setUnread(openRef.current ? 0 : x.unread || 0) }, [])

    // closed: keep the badge and the "available" state fresh
    useEffect(() => {
        const t = setInterval(() => { if (!document.hidden && !openRef.current) load().then(onData).catch(() => {}) }, 10000)
        load().then(onData).catch(() => {})
        return () => clearInterval(t)
    }, [load, onData])

    useEffect(() => { if (open) portal('/chat', { method: 'POST', body: { read: true }, quiet: true }).then(() => setUnread(0)).catch(() => {}) }, [open])

    const sendPresence = useCallback((state) => { portal('/chat', { method: 'POST', body: { state }, quiet: true }).catch(() => {}) }, [])
    usePresence(sendPresence)
    usePingOnIncrease(unread)

    const on = team.length > 0
    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
            {open && (
                <div className="flex h-[min(540px,calc(100vh-110px))] w-[min(370px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3 bg-primary px-4 py-3 text-white">
                        <div className="flex -space-x-2">{(on ? team : [{ name: 'Team' }]).slice(0, 3).map((p, i) => <Avatar key={i} size={34} shape="circle" className="ring-2 ring-primary" src={p.image || undefined} icon={p.image ? undefined : <PiUserCircleDuotone />} />)}</div>
                        <div className="min-w-0 flex-1">
                            <div className="font-bold">Chat with our team</div>
                            <div className="flex items-center gap-1.5 text-xs text-white/85"><span className={`h-2 w-2 rounded-full ${on ? 'bg-emerald-300' : 'bg-white/50'}`} />{on ? `${team.map((p) => p.name).slice(0, 2).join(', ')} ${team.length > 2 ? `+${team.length - 2} ` : ''}available` : 'Nobody is online right now — leave a message'}</div>
                        </div>
                        <button type="button" className="text-lg" onClick={() => setOpen(false)}><PiXBold /></button>
                    </div>
                    <ChatThread load={load} send={send} onData={onData} showSender empty={on ? 'Someone from our team is here. Say hello!' : 'Leave us a message and we will reply as soon as we are back.'} />
                </div>
            )}
            <button type="button" onClick={() => setOpen((o) => !o)} className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl text-white shadow-xl transition-transform hover:scale-105" title="Chat with our team">
                {open ? <PiXBold className="text-2xl" /> : <PiChatCircleDotsFill />}
                {!open && <span className={`absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${on ? 'bg-emerald-500' : 'bg-gray-300'}`} />}
                {!open && unread > 0 && <span className="absolute -left-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{unread}</span>}
            </button>
        </div>
    )
}

export default ChatWidget
