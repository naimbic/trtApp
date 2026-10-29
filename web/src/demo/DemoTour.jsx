import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SCENES, plannedSeconds, wordsOf } from './scenes.js'
import { downloadPack, saveRun, loadRun } from './exportPack'

/**
 * Demo tour (dev.trtcrm.com and localhost only): a cursor dot walks through the CRM scene by scene while the browser records the tab.
 * The panel also downloads the voiceover script, the scene list and the prompt to give an AI (Arabic first, then French).
 * Nothing here writes data: the tour only opens pages and popups.
 */
export const demoAllowed = () => /^(dev\.trtcrm\.com|localhost|127\.0\.0\.1)$/.test(window.location.hostname)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth }

/** The element a step points at: a CSS selector, or 'text:Label' for the visible control showing that text. */
function find(target) {
    if (!target) return null
    // while a popup is open the tour works inside it (the "Tasks" tab of a lead, not the "Tasks" entry of the menu)
    const pops = [...document.querySelectorAll('[role=dialog]')].filter((d) => visible(d))
    const scope = pops[pops.length - 1] || document
    try {
        if (target.startsWith('text:')) {
            const q = target.slice(5).trim().toLowerCase()
            const list = [...scope.querySelectorAll('a, button, [role=button], [role=tab], [role=menuitem], summary, label, h1, h2, h3, li, span')]
                .filter((el) => visible(el) && !el.closest('[data-demo-ui]'))
                .map((el) => ({ el, t: (el.textContent || '').trim().toLowerCase() }))
                .filter((x) => x.t === q || (x.t.includes(q) && x.t.length < q.length + 14))
            list.sort((a, b) => (a.t === q ? 0 : 1) - (b.t === q ? 0 : 1) || a.t.length - b.t.length)
            return list[0]?.el || null
        }
        return [...scope.querySelectorAll(target)].find((el) => visible(el) && !el.closest('[data-demo-ui]')) || null
    } catch { return null }
}
const waitFor = async (target, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const el = find(target); if (el) return el; await sleep(150) } return null }

const DemoTour = () => {
    const nav = useNavigate()
    const { pathname } = useLocation()
    const [open, setOpen] = useState(false)
    const [running, setRunning] = useState(false)
    const [picked, setPicked] = useState(() => new Set(SCENES.map((s) => s.id)))
    const [subs, setSubs] = useState(false) // show the narration as subtitles inside the video
    const [pace, setPace] = useState(1)
    const [status, setStatus] = useState('')
    const [last, setLast] = useState(() => loadRun())
    const dot = useRef(null), ripple = useRef(null), cap = useRef(null)
    const stop = useRef(false), pos = useRef({ x: 80, y: 120 })
    const pathRef = useRef(pathname)
    useEffect(() => { pathRef.current = pathname }, [pathname])
    const [caption, setCaption] = useState(null)

    const total = useMemo(() => SCENES.filter((s) => picked.has(s.id)).reduce((n, s) => n + plannedSeconds(s), 0), [picked])
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`

    const glide = useCallback(async (x, y) => {
        const d = dot.current
        if (!d) return
        const dist = Math.hypot(x - pos.current.x, y - pos.current.y)
        const ms = Math.min(1500, Math.max(500, dist * 1.15)) / pace
        d.style.transition = `transform ${ms}ms cubic-bezier(.45,.05,.2,1)`
        d.style.transform = `translate(${x}px, ${y}px)`
        pos.current = { x, y }
        await sleep(ms + 80)
    }, [pace])
    const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + Math.min(r.width / 2, 120), r.top + Math.min(r.height / 2, 40)] }
    const clickFx = async () => {
        const r = ripple.current
        if (!r) return
        r.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) scale(.2)`
        r.style.opacity = '.9'
        r.style.transition = 'none'
        await sleep(30)
        r.style.transition = 'transform .55s ease-out, opacity .55s ease-out'
        r.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) scale(1.6)`
        r.style.opacity = '0'
    }

    const runStep = async (st) => {
        if (st.wait) await sleep(st.wait / pace)
        else if (st.scroll !== undefined) {
            window.scrollTo({ top: st.scroll === 'top' ? 0 : window.scrollY + st.scroll, behavior: 'smooth' })
            await sleep(900 / pace)
        } else if (st.key) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: st.key, bubbles: true }))
            await sleep(500)
        } else if (st.move || st.click || st.type) {
            const target = st.move || st.click || st.type[0]
            const el = await waitFor(target, 3500)
            if (!el) return
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
            await sleep(450)
            const [x, y] = center(el)
            await glide(x, y)
            if (st.click) { await clickFx(); el.click(); await sleep(600 / pace) }
            if (st.type) {
                el.focus()
                const set = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set
                for (let i = 1; i <= st.type[1].length; i++) { set?.call(el, st.type[1].slice(0, i)); el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(70) }
            }
            await sleep(350 / pace)
        }
    }

    const goTo = async (path) => {
        if (pathRef.current === path) return
        const link = document.querySelector(`a[href="${path}"]`)
        // the dot visits the menu entry of the page (menu entries open sub-menus, so the page itself is opened by the router)
        if (link && visible(link) && !link.closest('[data-demo-ui]')) { const [x, y] = center(link); await glide(x, y); await clickFx() }
        nav(path)
        const t0 = Date.now()
        while (pathRef.current !== path && Date.now() - t0 < 5000) await sleep(100)
        await sleep(1100 / pace)
    }

    const play = useCallback(async (record) => {
        const scenes = SCENES.filter((s) => picked.has(s.id))
        if (!scenes.length) return
        let rec = null, chunks = [], stream = null
        if (record) {
            try {
                stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' })
                const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => window.MediaRecorder?.isTypeSupported?.(m))
                rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
                rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
                rec.start(1000)
            } catch { setStatus('Recording was cancelled: choose "This tab" in the browser dialog.'); return }
        }
        stop.current = false
        setOpen(false); setRunning(true); setStatus('')
        await sleep(record ? 1800 : 600)
        const timing = []
        const t0 = Date.now()
        try {
            for (const sc of scenes) {
                if (stop.current) break
                const start = (Date.now() - t0) / 1000
                setCaption({ title: sc.title, say: sc.say })
                window.scrollTo({ top: 0 })
                await goTo(sc.path)
                window.scrollTo({ top: 0 })
                const sceneStart = Date.now()
                for (const st of sc.steps) { if (stop.current) break; await runStep(st) }
                // never shorter than the voiceover needs
                const need = (plannedSeconds(sc) * 1000) / pace
                const left = need - (Date.now() - sceneStart)
                if (left > 0 && !stop.current) await sleep(left)
                timing.push({ id: sc.id, start: Math.round(start * 10) / 10, end: Math.round(((Date.now() - t0) / 1000) * 10) / 10 })
            }
        } finally {
            setCaption(null)
            setRunning(false)
            if (timing.length) { saveRun(timing); setLast(timing) }
            if (rec) {
                await sleep(800)
                rec.onstop = () => {
                    stream.getTracks().forEach((t) => t.stop())
                    const blob = new Blob(chunks, { type: 'video/webm' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `trtcrm-demo-${new Date().toISOString().slice(0, 10)}.webm`
                    document.body.appendChild(a); a.click(); a.remove()
                    setStatus(`Video saved (${(blob.size / 1048576).toFixed(1)} MB). Now download the voiceover pack.`)
                    setOpen(true)
                }
                rec.stop()
            } else { setStatus('Tour finished.'); setOpen(true) }
        }
    }, [picked, pace]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && running) { stop.current = true; return }
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); setOpen((o) => !o) }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [running])

    const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
    const btn = 'rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40'

    return (
        <div data-demo-ui>
            {/* the cursor dot and the click ripple (part of the recording) */}
            {running && (
                <>
                    <div ref={dot} style={{ position: 'fixed', left: 0, top: 0, zIndex: 2147483000, pointerEvents: 'none', transform: `translate(${pos.current.x}px, ${pos.current.y}px)` }}>
                        <div style={{ width: 26, height: 26, margin: '-13px 0 0 -13px', borderRadius: '50%', background: 'rgba(255, 90, 60, .92)', boxShadow: '0 0 0 4px rgba(255,255,255,.9), 0 6px 18px rgba(0,0,0,.35)' }} />
                    </div>
                    <div ref={ripple} style={{ position: 'fixed', left: 0, top: 0, zIndex: 2147482999, pointerEvents: 'none', opacity: 0 }}>
                        <div style={{ width: 70, height: 70, margin: '-35px 0 0 -35px', borderRadius: '50%', border: '3px solid rgba(255, 90, 60, .9)' }} />
                    </div>
                    {caption && (
                        <div ref={cap} style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 2147482998, pointerEvents: 'none', maxWidth: 'min(920px, 92vw)' }}>
                            <div style={{ background: 'rgba(15,15,20,.82)', color: '#fff', borderRadius: 16, padding: subs ? '12px 20px' : '8px 18px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
                                <div style={{ fontWeight: 800, fontSize: subs ? 15 : 17, letterSpacing: '.01em' }}>{caption.title}</div>
                                {subs && <div style={{ fontSize: 15, marginTop: 4, lineHeight: 1.35, opacity: .92 }}>{caption.say}</div>}
                            </div>
                        </div>
                    )}
                    <button type="button" onClick={() => { stop.current = true }} title="Stop (Esc)" style={{ position: 'fixed', top: 6, right: 6, zIndex: 2147483001, opacity: 0.12, width: 22, height: 22, borderRadius: 11, background: '#000', color: '#fff', fontSize: 11 }}>■</button>
                </>
            )}

            {!running && (
                <button type="button" onClick={() => setOpen((o) => !o)} style={{ position: 'fixed', left: 14, bottom: 14, zIndex: 2147482000 }}
                    className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-xl hover:bg-black" title="Demo tour (Ctrl+Shift+D)">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> Demo tour
                </button>
            )}

            {open && !running && (
                <div style={{ position: 'fixed', left: 14, bottom: 60, zIndex: 2147482001, width: 440, maxWidth: 'calc(100vw - 28px)', maxHeight: '78vh' }}
                    className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <div><div className="text-base font-extrabold">Demo tour</div><div className="text-xs text-gray-500">{picked.size} scenes · about {fmt(total)} · dev only</div></div>
                        <button type="button" onClick={() => setOpen(false)} className="text-xl text-gray-400 hover:text-gray-700">×</button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                        <div className="mb-2 flex flex-wrap gap-2 text-xs">
                            <button type="button" className="underline" onClick={() => setPicked(new Set(SCENES.map((s) => s.id)))}>All</button>
                            <button type="button" className="underline" onClick={() => setPicked(new Set())}>None</button>
                            <label className="ml-auto flex items-center gap-1.5"><input type="checkbox" checked={subs} onChange={(e) => setSubs(e.target.checked)} />Subtitles in the video</label>
                            <label className="flex items-center gap-1.5">Pace
                                <select value={pace} onChange={(e) => setPace(Number(e.target.value))} className="rounded border border-gray-300 px-1 py-0.5">
                                    <option value={0.8}>Relaxed</option><option value={1}>Normal</option><option value={1.3}>Quick</option>
                                </select>
                            </label>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {SCENES.map((s, i) => (
                                <li key={s.id}>
                                    <label className="flex cursor-pointer items-start gap-2 py-1.5 text-sm">
                                        <input type="checkbox" className="mt-1" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                                        <span className="min-w-0 flex-1"><b>{i + 1}. {s.title}</b> <span className="text-xs text-gray-400">{plannedSeconds(s)}s · {wordsOf(s.say)} words</span>
                                            <span className="block truncate text-xs text-gray-500">{s.say}</span></span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="border-t border-gray-100 px-4 py-3">
                        {status && <div className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{status}</div>}
                        <div className="mb-2 flex flex-wrap gap-2">
                            <button type="button" className={`${btn} bg-red-600 text-white hover:bg-red-700`} disabled={!picked.size} onClick={() => play(true)}>● Record the tour</button>
                            <button type="button" className={`${btn} border border-gray-300 hover:bg-gray-50`} disabled={!picked.size} onClick={() => play(false)}>▶ Rehearse (no recording)</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={`${btn} bg-gray-900 text-white hover:bg-black`} onClick={() => downloadPack(SCENES.filter((s) => picked.has(s.id)), last)}>Download the voiceover pack</button>
                        </div>
                        <p className="mt-2 text-[11px] leading-snug text-gray-500">Recording: pick "This tab" in the browser dialog, use a full-screen window (F11) and a 16:9 size for the best video. Esc stops the tour. The pack has the English voiceover, the scene list with timings and the prompt for the AI (Arabic first, then French).</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DemoTour
