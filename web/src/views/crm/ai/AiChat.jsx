import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import ReactMarkdown from 'react-markdown'
import { TbSend, TbCopy, TbTrash, TbSparkles, TbUser } from 'react-icons/tb'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import classNames from '@/utils/classNames'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const MD = 'text-sm leading-relaxed [&_h2]:mb-1.5 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-bold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_table]:my-2 [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:ps-5 dark:[&_td]:border-gray-600 dark:[&_th]:border-gray-600'
const IDEAS = () => [
    tr('Which clients owe us money, and who should I call first?'),
    tr('Compare this year with last year, month by month.'),
    tr('Which lead source brings the clients that pay?'),
    tr('Which leads am I about to lose?'),
]

/** A conversation with the AI about the company's figures. The conversation lives in the parent, so it survives a change of tab. */
const AiChat = ({ cfg, ready, provider, setProvider, model, setModel, messages, setMessages, lang }) => {
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const end = useRef(null)
    const current = ready.find((p) => p.id === provider)
    const models = useMemo(() => [...new Set([...(current?.presets || []), current?.model, model].filter(Boolean))], [current, model])
    useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }) }, [messages, sending])

    const send = async (q) => {
        const content = String(q ?? text).trim()
        if (!content || sending) return
        const next = [...messages, { role: 'user', content }]
        setMessages(next); setText(''); setSending(true)
        try {
            const r = await api('/api/crm/ai/chat', { method: 'POST', body: { messages: next.map(({ role, content: c }) => ({ role, content: c })), provider, model, lang } })
            setMessages((m) => [...m, { role: 'assistant', content: r.text, meta: `${r.model} · ${r.ms < 1000 ? `${r.ms} ms` : `${(r.ms / 1000).toFixed(1)} s`}` }])
        } catch (e) {
            setMessages((m) => [...m, { role: 'assistant', error: true, content: e.message }])
        } finally { setSending(false) }
    }

    if (cfg && !ready.length) return <Alert showIcon type="info">{tr('Add an API key (Claude, ChatGPT, DeepSeek or OpenRouter) in')} <Link to="/crm/settings?group=ai" className="font-semibold underline">{tr('Settings → AI')}</Link> {tr('to chat about your figures.')}</Alert>

    return (
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" style={{ minHeight: 'calc(100vh - 260px)' }}>
            <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 p-3 dark:border-gray-700">
                <div className="w-52"><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Provider')}</div><Select size="sm" isSearchable={false} options={ready.map((p) => ({ value: p.id, label: p.label }))} value={current ? { value: current.id, label: current.label } : null} onChange={(o) => { setProvider(o.value); setModel(ready.find((p) => p.id === o.value)?.model || '') }} /></div>
                <div className="w-64"><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Model')}</div><Select size="sm" options={models.map((m) => ({ value: m, label: m }))} value={model ? { value: model, label: model } : null} onChange={(o) => setModel(o.value)} /></div>
                <div className="ms-auto"><Button size="sm" icon={<TbTrash />} disabled={!messages.length || sending} onClick={() => setMessages([])}>{tr('New chat')}</Button></div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                {!messages.length && (
                    <div className="py-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary"><TbSparkles /></div>
                        <h5 className="mb-1">{tr('Ask about your leads, clients and income')}</h5>
                        <p className="mx-auto mb-4 max-w-md text-sm text-gray-500">{tr('The assistant sees the same figures as the analyses: totals, rates and company names. Never emails, phone numbers or addresses.')}</p>
                        <div className="flex flex-wrap justify-center gap-2">{IDEAS().map((i) => <button key={i} type="button" onClick={() => send(i)} className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300">{i}</button>)}</div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={classNames('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
                        <div className={classNames('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base', m.role === 'user' ? 'bg-gray-100 text-gray-500 dark:bg-gray-700' : 'bg-primary/10 text-primary')}>{m.role === 'user' ? <TbUser /> : <TbSparkles />}</div>
                        <div className={classNames('max-w-[85%] rounded-2xl px-4 py-2.5', m.role === 'user' ? 'bg-primary text-white' : m.error ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-gray-50 dark:bg-gray-700/50')}>
                            {m.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : m.error ? <p className="text-sm">{m.content}</p> : <div className={MD}><ReactMarkdown>{m.content}</ReactMarkdown></div>}
                            {m.role === 'assistant' && !m.error && (
                                <div className="mt-1.5 flex items-center justify-between gap-4 text-xs text-gray-400">
                                    <span>{m.meta}</span>
                                    <button type="button" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" onClick={() => { navigator.clipboard?.writeText(m.content); notify('success', tr('Copied')) }}><TbCopy />{tr('Copy')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="flex gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base text-primary"><TbSparkles /></div>
                        <div className="flex items-center gap-1 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-700/50">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d * 150}ms` }} />)}</div>
                    </div>
                )}
                <div ref={end} />
            </div>

            <div className="border-t border-gray-100 p-3 dark:border-gray-700">
                <div className="flex items-end gap-2">
                    <textarea
                        rows={1} value={text} maxLength={4000} placeholder={tr('Ask a question… (Enter to send, Shift+Enter for a new line)')}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
                        className="max-h-40 min-h-[40px] flex-1 resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-600"
                    />
                    <Button variant="solid" icon={<TbSend />} loading={sending} disabled={!text.trim() || !provider || !model} onClick={() => send()}>{tr('Send')}</Button>
                </div>
            </div>
        </div>
    )
}

export default AiChat
