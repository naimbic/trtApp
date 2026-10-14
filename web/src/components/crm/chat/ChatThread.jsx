import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { PiPaperPlaneTiltFill } from 'react-icons/pi'
import classNames from '@/utils/classNames'

const POLL = 3000
const time = (d) => (dayjs(d).isSame(dayjs(), 'day') ? dayjs(d).format('HH:mm') : dayjs(d).format('MMM D, HH:mm'))

/**
 * Message list + composer, shared by the staff widget and the client portal.
 * load(after) -> { messages, ...extra }   send(body) -> message   onData(extra) gets everything but messages.
 */
const ChatThread = ({ load, send, onData, showSender = false, empty = 'No messages yet. Say hello!', placeholder = 'Write a message…' }) => {
    const [msgs, setMsgs] = useState(null)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const box = useRef(null)
    const last = useRef(null)
    const stick = useRef(true)

    const pull = useCallback(async (full) => {
        try {
            const { messages, ...rest } = await load(full ? null : last.current)
            onData?.(rest)
            if (full) setMsgs(messages)
            else if (messages.length) setMsgs((cur) => [...(cur || []), ...messages.filter((m) => !(cur || []).some((x) => x.id === m.id))])
        } catch (e) { if (full) setMsgs([]) }
    }, [load, onData])

    useEffect(() => { last.current = null; setMsgs(null); stick.current = true; pull(true) }, [load]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (msgs?.length) last.current = msgs[msgs.length - 1].at }, [msgs])
    useEffect(() => {
        const t = setInterval(() => { if (!document.hidden) pull(false) }, POLL)
        return () => clearInterval(t)
    }, [pull])
    useEffect(() => { if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight }, [msgs])

    const submit = async () => {
        const body = text.trim()
        if (!body || busy) return
        setBusy(true); setErr('')
        try {
            const m = await send(body)
            setText(''); stick.current = true
            setMsgs((cur) => [...(cur || []).filter((x) => x.id !== m.id), m])
        } catch (e) { setErr(e.message || 'Could not send') } finally { setBusy(false) }
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div ref={box} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }} className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
                {msgs && !msgs.length && <div className="py-10 text-center text-sm text-gray-400">{empty}</div>}
                {(msgs || []).map((m, i) => {
                    const prev = msgs[i - 1]
                    const firstOfRun = !prev || prev.mine !== m.mine || prev.senderName !== m.senderName || +new Date(m.at) - +new Date(prev.at) > 5 * 60000
                    return (
                        <div key={m.id} className={classNames('flex flex-col', m.mine ? 'items-end' : 'items-start', firstOfRun && i > 0 && 'pt-2')}>
                            {firstOfRun && !m.mine && showSender && <span className="mb-0.5 px-1 text-xs font-semibold text-gray-500">{m.senderName}</span>}
                            <div title={time(m.at)} className={classNames('max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm', m.mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100')}>{m.body}</div>
                            {(!msgs[i + 1] || msgs[i + 1].mine !== m.mine || +new Date(msgs[i + 1].at) - +new Date(m.at) > 5 * 60000) && <span className="px-1 pt-0.5 text-[11px] text-gray-400">{time(m.at)}</span>}
                        </div>
                    )
                })}
            </div>
            {err && <div className="px-4 pb-1 text-xs text-red-500">{err}</div>}
            <div className="flex items-end gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
                <textarea
                    rows={1}
                    value={text}
                    maxLength={2000}
                    placeholder={placeholder}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                    className="max-h-28 min-h-9 flex-1 resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-gray-700"
                />
                <button type="button" onClick={submit} disabled={busy || !text.trim()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg text-white disabled:opacity-40"><PiPaperPlaneTiltFill /></button>
            </div>
        </div>
    )
}

export default ChatThread
