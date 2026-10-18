import { useEffect, useMemo, useState } from 'react'
import Select from '@/components/ui/Select'
import { api } from './api'
import { tr } from '@/utils/t'

/** The active bank accounts, loaded once: [{ id, name, bank, rib, isDefault }]. */
let cache = null
export function useBankAccounts() {
    const [list, setList] = useState(cache || [])
    useEffect(() => {
        let alive = true
        api('/api/crm/bank-accounts?pageSize=100').then((d) => { cache = (d.list || []).filter((a) => a.active !== false); if (alive) setList(cache) }).catch(() => {})
        return () => { alive = false }
    }, [])
    return list
}

/**
 * Picks the bank account printed on a document or a client. Empty means "follow the rule": the document uses its client's account,
 * the client uses the company's default one. `emptyLabel` says which.
 */
const BankAccountSelect = ({ value, onChange, emptyLabel, isDisabled }) => {
    const accounts = useBankAccounts()
    const def = accounts.find((a) => a.isDefault)
    const options = useMemo(() => accounts.map((a) => ({ value: a.id, label: `${a.name}${a.isDefault ? ` · ${tr('default')}` : ''}${a.rib ? ` · ${a.rib}` : ''}` })), [accounts])
    if (!accounts.length) return <p className="text-sm text-gray-400">{tr("No bank account yet: add them in Settings → Company → Bank accounts.")}</p>
    return <Select isClearable isDisabled={isDisabled} placeholder={emptyLabel || (def ? tr('Default: {n}', { n: def.name }) : tr('Default account'))} options={options} value={options.find((o) => o.value === value) || null} onChange={(o) => onChange(o?.value || null)} />
}

export default BankAccountSelect
