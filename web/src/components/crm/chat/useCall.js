import { useCallback, useEffect, useRef, useState } from 'react'
import { ring } from './chatKit'
import { tr } from '@/utils/t'

const RING_MS = 45000
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * One-to-one voice calls (WebRTC). Signalling goes through the server and is polled every 2 s (1 s during a call).
 *   fetchSignals() -> { signals }        sendSignal({ roomId, callId, type, payload, to }) -> { delivered }
 *   onLog(roomId, text)                  called by the caller when the call ends, to leave a line in the conversation
 */
export default function useCall({ fetchSignals, sendSignal, enabled, iceServers, onLog }) {
    const [call, setCall] = useState({ phase: 'idle' }) // idle | calling | incoming | connecting | connected
    const [muted, setMuted] = useState(false)
    const [seconds, setSeconds] = useState(0)
    const [error, setError] = useState('')
    const st = useRef({ phase: 'idle' })
    const pc = useRef(null)
    const stream = useRef(null)
    const audio = useRef(null)
    const pendingIce = useRef([])
    const outIce = useRef([])
    const timers = useRef({})
    const connectedAt = useRef(0)
    const live = useRef({ sendSignal, onLog, iceServers, fetchSignals })
    live.current = { sendSignal, onLog, iceServers, fetchSignals }

    const set = (patch) => { st.current = { ...st.current, ...patch }; setCall(st.current) }

    const cleanup = useCallback(() => {
        clearInterval(timers.current.ring); clearTimeout(timers.current.timeout); clearInterval(timers.current.clock)
        stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null
        try { pc.current?.close() } catch { /* already closed */ }
        pc.current = null
        if (audio.current) { audio.current.srcObject = null }
        pendingIce.current = []; outIce.current = []
        setMuted(false); setSeconds(0)
    }, [])

    const end = useCallback((tell = true) => {
        const cur = st.current
        if (cur.phase === 'idle') return
        if (tell && cur.callId && cur.peer) live.current.sendSignal({ roomId: cur.roomId, callId: cur.callId, type: cur.phase === 'incoming' ? 'decline' : 'hangup', to: cur.peer.key }).catch(() => {})
        if (cur.caller) {
            if (connectedAt.current) live.current.onLog?.(cur.roomId, tr("📞 Voice call · {v1}", { v1: fmt(Math.round((Date.now() - connectedAt.current) / 1000)) }))
            else live.current.onLog?.(cur.roomId, '📞 Missed call')
        }
        connectedAt.current = 0
        cleanup()
        set({ phase: 'idle', peer: null, callId: null, roomId: null, caller: false, offer: null })
    }, [cleanup])

    const makePc = useCallback(() => {
        const p = new RTCPeerConnection({ iceServers: live.current.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }] })
        p.onicecandidate = (e) => {
            if (!e.candidate) return
            const cur = st.current
            if (cur.peer?.key || !cur.caller) live.current.sendSignal({ roomId: cur.roomId, callId: cur.callId, type: 'ice', payload: e.candidate.toJSON(), to: cur.peer?.key }).catch(() => {})
            else outIce.current.push(e.candidate.toJSON())
        }
        p.ontrack = (e) => {
            audio.current ||= new Audio()
            audio.current.srcObject = e.streams[0]
            audio.current.play().catch(() => {})
        }
        p.onconnectionstatechange = () => {
            if (p.connectionState === 'connected') {
                connectedAt.current ||= Date.now()
                clearTimeout(timers.current.timeout); clearInterval(timers.current.ring)
                set({ phase: 'connected' })
                clearInterval(timers.current.clock)
                timers.current.clock = setInterval(() => setSeconds(Math.round((Date.now() - connectedAt.current) / 1000)), 1000)
            } else if (['failed', 'closed'].includes(p.connectionState)) end(false)
        }
        pc.current = p
        return p
    }, [end])

    const mic = async () => {
        try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); return stream.current } catch { setError(tr("Allow the microphone to make calls")); return null }
    }

    const start = useCallback(async (room) => {
        if (st.current.phase !== 'idle') return
        setError('')
        const s = await mic()
        if (!s) return
        const callId = uid()
        set({ phase: 'calling', callId, roomId: room.roomId, peer: room.peerKey ? { key: room.peerKey, name: room.peerName } : { key: null, name: room.peerName }, caller: true })
        const p = makePc()
        s.getTracks().forEach((t) => p.addTrack(t, s))
        const offer = await p.createOffer()
        await p.setLocalDescription(offer)
        try {
            const r = await live.current.sendSignal({ roomId: room.roomId, callId, type: 'offer', payload: JSON.stringify(p.localDescription) })
            if (!r.delivered) { setError(tr("Nobody is available to answer right now")); cleanup(); set({ phase: 'idle', peer: null, callId: null, caller: false }); return }
        } catch (e) { setError(e.message || tr("Could not start the call")); cleanup(); set({ phase: 'idle', peer: null, callId: null, caller: false }); return }
        timers.current.timeout = setTimeout(() => end(true), RING_MS)
    }, [makePc, cleanup, end])

    const accept = useCallback(async () => {
        const cur = st.current
        if (cur.phase !== 'incoming') return
        clearInterval(timers.current.ring); clearTimeout(timers.current.timeout)
        const s = await mic()
        if (!s) { end(true); return }
        set({ phase: 'connecting' })
        const p = makePc()
        s.getTracks().forEach((t) => p.addTrack(t, s))
        await p.setRemoteDescription(cur.offer)
        for (const c of pendingIce.current) await p.addIceCandidate(c).catch(() => {})
        pendingIce.current = []
        const answer = await p.createAnswer()
        await p.setLocalDescription(answer)
        await live.current.sendSignal({ roomId: cur.roomId, callId: cur.callId, type: 'answer', payload: JSON.stringify(p.localDescription), to: cur.peer.key }).catch(() => end(false))
    }, [makePc, end])

    const handle = useCallback(async (sig) => {
        const cur = st.current
        let payload = null
        try { payload = sig.payload ? JSON.parse(sig.payload) : null } catch { payload = null }
        if (sig.type === 'offer') {
            if (cur.phase !== 'idle') { live.current.sendSignal({ roomId: sig.roomId, callId: sig.callId, type: 'decline', to: sig.from.key }).catch(() => {}); return }
            set({ phase: 'incoming', callId: sig.callId, roomId: sig.roomId, peer: sig.from, offer: payload, caller: false })
            ring(); timers.current.ring = setInterval(ring, 1800)
            timers.current.timeout = setTimeout(() => end(false), RING_MS)
            return
        }
        if (sig.callId !== cur.callId) return
        if (sig.type === 'answer' && cur.phase === 'calling' && pc.current) {
            set({ peer: sig.from })
            await pc.current.setRemoteDescription(payload).catch(() => {})
            for (const c of pendingIce.current) await pc.current.addIceCandidate(c).catch(() => {})
            pendingIce.current = []
            for (const c of outIce.current) live.current.sendSignal({ roomId: cur.roomId, callId: cur.callId, type: 'ice', payload: c, to: sig.from.key }).catch(() => {})
            outIce.current = []
        } else if (sig.type === 'ice' && payload) {
            if (pc.current?.remoteDescription) await pc.current.addIceCandidate(payload).catch(() => {})
            else pendingIce.current.push(payload)
        } else if (sig.type === 'hangup' || sig.type === 'decline') end(false)
    }, [end])

    // poll for signals while calls are activated
    useEffect(() => {
        if (!enabled) return undefined
        let stop = false, t
        const tick = async () => {
            if (!document.hidden || st.current.phase !== 'idle') {
                try { const r = await live.current.fetchSignals(); for (const sig of r.signals || []) await handle(sig) } catch { /* offline */ }
            }
            if (!stop) t = setTimeout(tick, st.current.phase === 'idle' ? 2500 : 1000)
        }
        tick()
        return () => { stop = true; clearTimeout(t) }
    }, [enabled, handle])

    useEffect(() => () => { cleanup() }, [cleanup])

    const toggleMute = () => {
        const track = stream.current?.getAudioTracks()[0]
        if (track) { track.enabled = !track.enabled; setMuted(!track.enabled) }
    }
    return { call, muted, seconds, error, clearError: () => setError(''), start, accept, decline: () => end(true), hangup: () => end(true), toggleMute, fmt }
}
