/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useRef, useState } from 'react'
import { TbSparkles, TbArrowBackUp } from 'react-icons/tb'
import RichEditor from '@/components/crm/RichEditor'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import confirmDelete from '@/components/crm/useConfirm'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

/** The merge fields of a contract: replaced by the real values when the client opens it or the PDF is printed. */
export const TOKENS = ['contract_subject', 'contract_datestart', 'contract_dateend', 'contract_contract_value', 'contract_type', 'contract_id', 'contract_today', 'client_company', 'client_street', 'client_city', 'client_vat_number', 'company_name', 'address', 'vat_number_with_label']
const LANGS = ['', 'French', 'English', 'Arabic', 'Spanish', 'Japanese', 'German', 'Italian', 'Portuguese']
const hasText = (h) => !!String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()

/** "Write with AI": describe the contract and the AI writes its text with the merge fields; it can also improve or translate what is written. Undo puts the old text back. */
const AiContractWriter = ({ value, onChange, type, subject }) => {
    const [st, setSt] = useState(null)
    const [open, setOpen] = useState(false)
    const [instruction, setInstruction] = useState('')
    const [language, setLanguage] = useState('')
    const [busy, setBusy] = useState('')
    const [undo, setUndo] = useState(null)
    useEffect(() => { api('/api/crm/ai/contract').then(setSt).catch(() => setSt({ available: false })) }, [])
    if (!st?.available) return null

    const filled = hasText(value)
    const go = async (action) => {
        setBusy(action)
        try {
            const r = await api('/api/crm/ai/contract', { method: 'POST', body: { action, instruction: instruction || (action === 'write' ? subject || '' : ''), text: value, language, type } })
            setUndo({ text: value }); onChange(r.html)
        } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    // writing over a text that is already there asks first; improving and translating work on it, so they do not
    const run = (action) => (action === 'write' && filled ? confirmDelete(tr("Replace the text with what the AI writes?"), () => go(action), { text: tr("The AI starts from what is written and rewrites it. Undo puts the old text back."), confirmText: tr("Write"), type: 'warning' }) : go(action))
    const A = ({ id, children, needs, solid }) => <Button size="sm" variant={solid ? 'solid' : 'default'} icon={solid ? <TbSparkles /> : undefined} loading={busy === id} disabled={!!busy || (needs === 'text' && !filled) || (id === 'translate' && !language)} onClick={() => run(id)}>{children}</Button>
    return (
        <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50/60 p-2.5 dark:border-violet-500/30 dark:bg-violet-500/5">
            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" icon={<TbSparkles />} onClick={() => setOpen(!open)}>{tr('Write with AI')}</Button>
                <span className="text-xs text-gray-500">{st.provider} · {st.model}</span>
                {busy && <span className="text-xs text-violet-600">{tr("Writing the contract… this takes up to a minute.")}</span>}
                {undo && !busy && <Button size="sm" variant="plain" icon={<TbArrowBackUp />} onClick={() => { onChange(undo.text); setUndo(null) }}>{tr('Undo')}</Button>}
            </div>
            {open && (
                <div className="mt-2 space-y-2">
                    <Input size="sm" textArea rows={3} value={instruction} placeholder={tr("What is the contract about? (for example: yearly website maintenance with monthly reports, 30 days notice, payment every quarter)")} onChange={(e) => setInstruction(e.target.value)} />
                    <div className="flex flex-wrap items-center gap-1.5">
                        <div className="w-48"><Select size="sm" isSearchable={false} options={LANGS.map((l) => ({ value: l, label: l ? tr(l) : tr('Language: automatic') }))} value={{ value: language, label: language ? tr(language) : tr('Language: automatic') }} onChange={(o) => setLanguage(o.value)} /></div>
                        <A id="write" solid>{tr('Write')}</A>
                        <A id="improve" needs="text">{tr('Improve')}</A>
                        <A id="translate" needs="text">{tr('Translate')}</A>
                    </div>
                    <p className="text-xs text-gray-500">{tr("The AI uses the merge fields for the client, the dates and the value, and leaves out the letterhead, the parties and the signatures. Read the result and have it checked before you use it: it is a draft, not legal advice.")}</p>
                </div>
            )}
        </div>
    )
}

/**
 * The text of a contract or of a contract template: the full editor (headings, colours, lists, tables, pictures, alignment, undo)
 * with "Write with AI" and the merge fields above it; pressing a field puts it where the caret is.
 */
const ContractText = ({ value, onChange, disabled = false, minHeight = 520, placeholder, type, subject }) => {
    const ed = useRef(null)
    return (
        <>
            {!disabled && <AiContractWriter value={value} onChange={onChange} type={type} subject={subject} />}
            <div className="mb-3 flex flex-wrap gap-1.5">{TOKENS.map((t) => <button key={t} type="button" disabled={disabled} onClick={() => ed.current?.chain().focus().insertContent(`{${t}}`).run()} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary disabled:opacity-50 dark:bg-gray-700">{`{${t}}`}</button>)}</div>
            <RichEditor value={value} onChange={onChange} disabled={disabled} minHeight={minHeight} mentions={false} onReady={(e) => { ed.current = e }} placeholder={placeholder || tr("Write the contract: headings for the articles, lists, tables, pictures…")} />
        </>
    )
}

export default ContractText
