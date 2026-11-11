import { useEffect, useState } from 'react'
import { TbSparkles, TbArrowBackUp } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const TONES = [['neutral', 'Professional'], ['friendly', 'Friendly'], ['formal', 'Formal'], ['short', 'Short and direct'], ['persuasive', 'Persuasive']]
const LANGS = ['', 'English', 'French', 'Spanish', 'Arabic', 'Japanese', 'German', 'Italian', 'Portuguese']

const plain = (html) => String(html || '').replace(/<\/p>|<\/div>|<\/li>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim()

/** The last mails of the lead or customer, as text for the AI (what they wrote, what we answered). */
const contextOf = (mails, leadEmail, kind) => {
    const last = (mails || []).filter((m) => m.direction === 'in' || m.direction === 'out').slice(0, 3).reverse()
    const lines = last.map((m) => `${m.direction === 'in' ? 'Received' : 'Sent'}${m.date ? ` ${String(m.date).slice(0, 10)}` : ''} — subject: ${m.subject || ''}\n${plain(m.body).slice(0, 1500)}`)
    return [`This is a ${kind === 'client' ? 'customer' : 'lead'}${leadEmail ? ` (${leadEmail})` : ''}.`, ...lines].join('\n\n')
}

/** "Write with AI" in the mail form: write, reply, improve, shorten, fix, translate and suggest a subject. The result goes into the mail; Undo puts the old text back. */
const AiMailWriter = ({ form, set, mails, leadEmail, kind }) => {
    const [st, setSt] = useState(null)
    const [open, setOpen] = useState(false)
    const [instruction, setInstruction] = useState('')
    const [tone, setTone] = useState('neutral')
    const [language, setLanguage] = useState('')
    const [busy, setBusy] = useState('')
    const [undo, setUndo] = useState(null)
    useEffect(() => { api('/api/crm/ai/email').then(setSt).catch(() => setSt({ available: false })) }, [])
    if (!st?.available) return null

    const text = plain(form.body)
    const hasReceived = (mails || []).some((m) => m.direction === 'in')
    const run = async (action) => {
        setBusy(action)
        try {
            const r = await api('/api/crm/ai/email', { method: 'POST', body: { action, instruction, text, tone, language, context: contextOf(mails, leadEmail, kind) } })
            if (action === 'subject') { setUndo({ subject: form.subject }); set({ subject: r.text }) } else { setUndo({ body: form.body }); set({ body: r.html }) }
        } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const A = ({ id, children, needs, solid }) => <Button size="sm" variant={solid ? 'solid' : 'default'} loading={busy === id} disabled={!!busy || (needs === 'text' && !text)} onClick={() => run(id)}>{children}</Button>
    return (
        <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2.5 dark:border-violet-500/30 dark:bg-violet-500/5">
            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" icon={<TbSparkles />} onClick={() => setOpen(!open)}>{tr('Write with AI')}</Button>
                <span className="text-xs text-gray-500">{st.provider} · {st.model}</span>
                {undo && <Button size="sm" variant="plain" icon={<TbArrowBackUp />} onClick={() => { set(undo); setUndo(null) }}>{tr('Undo')}</Button>}
            </div>
            {open && (
                <div className="mt-2 space-y-2">
                    <Input size="sm" textArea rows={2} value={instruction} placeholder={tr('What should the email say? (for example: thank them for the call and propose a meeting on Tuesday)')} onChange={(e) => setInstruction(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                        <Select size="sm" isSearchable={false} options={TONES.map(([v, l]) => ({ value: v, label: tr(l) }))} value={{ value: tone, label: tr(TONES.find((t) => t[0] === tone)[1]) }} onChange={(o) => setTone(o.value)} />
                        <Select size="sm" isSearchable={false} options={LANGS.map((l) => ({ value: l, label: l || tr('Language: automatic') }))} value={{ value: language, label: language || tr('Language: automatic') }} onChange={(o) => setLanguage(o.value)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <A id="write" solid>{tr('Write')}</A>
                        {hasReceived && <A id="reply">{tr('Reply to the last mail')}</A>}
                        <A id="improve" needs="text">{tr('Improve')}</A>
                        <A id="shorten" needs="text">{tr('Shorten')}</A>
                        <A id="fix" needs="text">{tr('Fix spelling')}</A>
                        <A id="translate" needs="text">{tr('Translate')}</A>
                        <A id="subject" needs="text">{tr('Suggest a subject')}</A>
                    </div>
                    <p className="text-xs text-gray-500">{tr('Read and change the result before sending. The signature of the company is added automatically.')}</p>
                </div>
            )}
        </div>
    )
}

export default AiMailWriter
