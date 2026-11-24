/*! © 2026 TRT Digital — trtCRM. */
import { useRef } from 'react'
import RichEditor from '@/components/crm/RichEditor'
import { tr } from '@/utils/t'

/** The merge fields of a contract: replaced by the real values when the client opens it or the PDF is printed. */
export const TOKENS = ['contract_subject', 'contract_datestart', 'contract_dateend', 'contract_contract_value', 'contract_type', 'contract_id', 'contract_today', 'client_company', 'client_street', 'client_city', 'client_vat_number', 'company_name', 'address', 'vat_number_with_label']

/**
 * The text of a contract or of a contract template: the full editor (headings, colours, lists, tables, pictures, alignment, undo)
 * with the merge fields above it; pressing a field puts it where the caret is.
 */
const ContractText = ({ value, onChange, disabled = false, minHeight = 520, placeholder }) => {
    const ed = useRef(null)
    return (
        <>
            <div className="mb-3 flex flex-wrap gap-1.5">{TOKENS.map((t) => <button key={t} type="button" disabled={disabled} onClick={() => ed.current?.chain().focus().insertContent(`{${t}}`).run()} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary disabled:opacity-50 dark:bg-gray-700">{`{${t}}`}</button>)}</div>
            <RichEditor value={value} onChange={onChange} disabled={disabled} minHeight={minHeight} mentions={false} onReady={(e) => { ed.current = e }} placeholder={placeholder || tr("Write the contract: headings for the articles, lists, tables, pictures…")} />
        </>
    )
}

export default ContractText
