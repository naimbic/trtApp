import { useEffect, useMemo, useState } from 'react'
import Select from '@/components/ui/Select'
import { api } from './api'
import { chooseBank } from '@/lib/crm/bank'
import { tr } from '@/utils/t'

/** The active bank accounts (payment methods with bank details), loaded once: [{ id, name, bank, rib, currencyId, isDefault }]. */
let cache = null
export function useBankAccounts() {
    const [list, setList] = useState(cache || [])
    useEffect(() => {
        let alive = true
        api('/api/crm/payment-modes?pageSize=200').then((d) => { cache = (d.list || []).filter((a) => a.active !== false && (a.rib || a.bank || a.holder || a.swift)); if (alive) setList(cache) }).catch(() => {})
        return () => { alive = false }
    }, [])
    return list
}

/**
 * Picks the bank account printed on a document or a client. Empty means "follow the rule": the document uses its client's account,
 * the client uses the company's default one. `emptyLabel` says which.
 */
const BankAccountSelect = ({ value, onChange, emptyLabel, isDisabled, clientId, currencyId }) => {
    const accounts = useBankAccounts()
    // on a document: the account that will really be printed when this field is left empty (the client's, else the one for the currency, else the default)
    const [clientAccountId, setClientAccountId] = useState(null)
    useEffect(() => {
        if (!clientId) { setClientAccountId(null); return undefined }
        let alive = true
        api(`/api/crm/customers/${clientId}`).then((c) => alive && setClientAccountId(c.bankAccountId || null)).catch(() => {})
        return () => { alive = false }
    }, [clientId])
    const printed = clientId !== undefined && !value ? chooseBank({ docAccountId: null, clientAccountId, currencyId, accounts }) : null
    const why = printed ? (printed.id === clientAccountId ? tr("client's account") : printed.currencyId && printed.currencyId === currencyId ? tr('account for this currency') : tr('default account')) : ''
    const def = accounts.find((a) => a.isDefault)
    const options = useMemo(() => accounts.map((a) => ({ value: a.id, label: `${a.name}${a.isDefault ? ` · ${tr('default')}` : ''}${a.rib ? ` · ${a.rib}` : ''}` })), [accounts])
    if (!accounts.length) return <p className="text-sm text-gray-400">{tr("No bank account yet: add them in Setup → Finance → Payment methods.")}</p>
    return <Select isClearable isDisabled={isDisabled} placeholder={printed ? tr('{n} ({why})', { n: printed.name, why }) : emptyLabel || (def ? tr('Default: {n}', { n: def.name }) : tr('Default account'))} options={options} value={options.find((o) => o.value === value) || null} onChange={(o) => onChange(o?.value || null)} />
}

export default BankAccountSelect
