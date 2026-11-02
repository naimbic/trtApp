import { useCallback, useEffect, useRef, useState } from 'react'
import { PiStarDuotone, PiStarFill, PiXBold } from 'react-icons/pi'
import { chatApi, chatPost } from './chatClient'
import { tr } from '@/utils/t'
import classNames from '@/utils/classNames'
import { useChatStatus, STATUS } from '@/store/chatStatusStore'

const IDLE_MS = 2 * 60 * 1000
const BEAT_MS = 15000

export const StatusDot = ({ status = 'offline', className }) => <span title={STATUS[status]?.label} className={classNames('inline-block h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-800', STATUS[status]?.dot, className)} />

let ctx
/** Short two-note ping made with the Web Audio API (no sound file needed). Silent until the page has had a click or key press. */
export function ping() {
    if (useChatStatus.getState().muted) return
    try {
        ctx ||= new (window.AudioContext || window.webkitAudioContext)()
        if (ctx.state === 'suspended') ctx.resume()
        const t0 = ctx.currentTime
        ;[[880, 0], [1175, 0.12]].forEach(([f, d]) => {
            const o = ctx.createOscillator(), g = ctx.createGain()
            o.type = 'sine'; o.frequency.value = f
            g.gain.setValueAtTime(0.0001, t0 + d)
            g.gain.exponentialRampToValueAtTime(0.18, t0 + d + 0.02)
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.28)
            o.connect(g).connect(ctx.destination)
            o.start(t0 + d); o.stop(t0 + d + 0.3)
        })
    } catch { /* no audio available */ }
}

/**
 * Keeps this person's presence fresh: online while they use the page, idle (orange) after 2 minutes without
 * activity or when the tab is hidden, away (orange) when they chose it. `send(state)` stores it on the server.
 */
export function usePresence(send) {
    const away = useChatStatus((s) => s.away)
    const setState = useChatStatus((s) => s.setState)
    const lastActive = useRef(Date.now())
    useEffect(() => {
        const bump = () => { lastActive.current = Date.now() }
        const evs = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
        evs.forEach((e) => window.addEventListener(e, bump, { passive: true }))
        const compute = () => (away ? 'away' : document.hidden || Date.now() - lastActive.current > IDLE_MS ? 'idle' : 'online')
        const beat = () => {
            const st = compute()
            setState(st)
            send(st)
        }
        beat()
        const t = setInterval(beat, BEAT_MS)
        const onVis = () => beat()
        document.addEventListener('visibilitychange', onVis)
        return () => { evs.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
    }, [away, send, setState])
}

/** Plays the ping when `count` goes up (messages arriving while the bubble is closed). */
export function usePingOnIncrease(count) {
    const prev = useRef(null)
    useEffect(() => {
        if (prev.current !== null && count > prev.current) ping()
        prev.current = count
    }, [count])
}

/** Ring tone for incoming calls (call it every ~1.8 s while ringing). */
export function ring() {
    if (useChatStatus.getState().muted) return
    try {
        ctx ||= new (window.AudioContext || window.webkitAudioContext)()
        if (ctx.state === 'suspended') ctx.resume()
        const t0 = ctx.currentTime
        ;[[660, 0], [880, 0.22], [660, 0.55], [880, 0.77]].forEach(([f, d]) => {
            const o = ctx.createOscillator(), g = ctx.createGain()
            o.type = 'sine'; o.frequency.value = f
            g.gain.setValueAtTime(0.0001, t0 + d)
            g.gain.exponentialRampToValueAtTime(0.22, t0 + d + 0.03)
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.2)
            o.connect(g).connect(ctx.destination)
            o.start(t0 + d); o.stop(t0 + d + 0.22)
        })
    } catch { /* no audio available */ }
}

/** The stamps a message can be reacted with (the same list as the server). */
export const STAMPS = ['👍', '❤️', '😂', '🎉', '🙏', '👀', '✅', '🔥']

/** The messages this person saved for later; a click opens their conversation. */
export const SavedMessages = ({ onOpen, onRemoved, reload = 0 }) => {
    const [list, setList] = useState(null)
    const load = useCallback(() => chatApi('/bookmarks').then((r) => setList(r.list)).catch(() => setList([])), [])
    useEffect(() => { load() }, [load, reload])
    if (!list) return <div className="py-10 text-center text-sm text-gray-400">{tr("Loading…")}</div>
    if (!list.length) return <div className="px-6 py-12 text-center text-sm text-gray-400"><PiStarDuotone className="mx-auto mb-2 text-3xl text-amber-400" />{tr("Nothing saved yet. Hover a message and press the star to keep it here.")}</div>
    const remove = async (e, it) => { e.stopPropagation(); await chatPost(`/messages/${it.id}`, { action: 'bookmark', on: false }).catch(() => {}); load(); onRemoved?.() }
    return (
        <div className="space-y-1">
            {list.map((it) => (
                <div key={it.id} role="button" tabIndex={0} onClick={() => onOpen(it)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(it) }} className="group flex w-full cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-start hover:bg-gray-100 dark:hover:bg-gray-700">
                    <PiStarFill className="mt-0.5 shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-xs text-gray-500"><b className="truncate text-gray-700 dark:text-gray-200">{it.senderName}</b><span className="shrink-0">{it.roomTitle}</span></span><span className="line-clamp-2 text-sm text-gray-800 dark:text-gray-100">{it.text}</span></span>
                    <button type="button" title={tr("Remove from saved")} aria-label={tr("Remove from saved")} onClick={(e) => remove(e, it)} className="shrink-0 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"><PiXBold /></button>
                </div>
            ))}
        </div>
    )
}
