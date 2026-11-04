/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useRef, useState } from 'react'
import RichEditor from '@/components/crm/RichEditor'
import { setMentionDirectory } from '@/utils/mentions'

/**
 * The comment box of a public proposal, estimate or contract (shown in a frame of that page): the same editor as everywhere in the CRM
 * (styles, links, lists, @ to mention the team, # for tags). It posts to the comments address of the document and tells the page.
 * Parameters in the address: kind, id, hash, and the words of the page (n, p, s, r) so it speaks the language of the page.
 */
const PublicComment = () => {
    const q = new URLSearchParams(window.location.search)
    const kind = q.get('kind'), id = q.get('id'), hash = q.get('hash')
    const [name, setName] = useState(q.get('name') || '')
    const [html, setHtml] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const [ready, setReady] = useState(false)
    const [people, setPeople] = useState([])
    const [typing, setTyping] = useState(false) // the editor has the focus: the frame leaves room for the @ and # list
    const box = useRef(null)
    const base = `/api/crm/public/${kind}/${id}/${hash}`

    useEffect(() => { document.documentElement.classList.remove('dark'); document.body.style.background = 'transparent' }, [])
    useEffect(() => {
        let off = false
        fetch(`${base}/team`).then((r) => (r.ok ? r.json() : { staff: [], tags: [], contacts: [] })).catch(() => ({ staff: [], tags: [], contacts: [] })).then((d) => { if (!off) { setMentionDirectory(d); setPeople(d.contacts || []); setReady(true) } })
        return () => { off = true }
    }, [base])
    // the page around the frame follows the height of the box
    useEffect(() => {
        const send = () => window.parent?.postMessage({ type: 'trt-height', h: Math.ceil(box.current?.getBoundingClientRect().height || 0) + 8 }, '*')
        const ro = new ResizeObserver(send)
        if (box.current) ro.observe(box.current)
        send()
        return () => ro.disconnect()
    }, [ready, typing])

    const empty = !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    const submit = async () => {
        if (empty) return setErr(q.get('r') || 'Required')
        setBusy(true); setErr('')
        try {
            const r = await fetch(`${base}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content: html }) })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j.error || 'Error')
            window.parent?.postMessage({ type: 'trt-sent' }, '*')
            setHtml('')
        } catch (e) { setErr(e.message) } finally { setBusy(false) }
    }
    if (!kind || !id || !hash) return null
    return (
        <div ref={box} onFocus={() => setTyping(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTyping(false) }} style={{ paddingBottom: typing ? 230 : 0 }} className="bg-transparent p-1 font-sans text-sm text-gray-800">
            <input value={name} maxLength={80} placeholder={q.get('n') || ''} onChange={(e) => setName(e.target.value)} className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
            {ready && <RichEditor value={html} onChange={setHtml} minHeight={110} placeholder={q.get('p') || ''} images={false} extraMentions={people} />}
            <div className="mt-2 flex items-center justify-end gap-3">
                {err && <span className="me-auto text-sm text-red-600">{err}</span>}
                <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{q.get('s') || 'Send'}</button>
            </div>
        </div>
    )
}

export default PublicComment
