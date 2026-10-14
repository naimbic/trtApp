import { useEffect, useRef } from 'react'
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
