/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import Select from '@/components/ui/Select'
import RelationSelect from '../kit/RelationSelect'
import { api } from '../kit/api'
import { tr } from '@/utils/t'

const DOT = { blue: 'bg-blue-500', sky: 'bg-sky-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', orange: 'bg-orange-500', red: 'bg-red-500', pink: 'bg-pink-500', violet: 'bg-violet-500', slate: 'bg-slate-400' }
let memory = null // the catalogue, for the length of the visit (the editors of a document are opened often)

/** "Add from the catalogue" on a proposal, an estimate or an invoice: the items grouped by group name (coloured), searchable, with their rate. Falls back to the plain list when the person cannot see the Items page. */
const ItemPicker = ({ onChange }) => {
    const [board, setBoard] = useState(memory)
    const [failed, setFailed] = useState(false)
    useEffect(() => { if (!memory) api('/api/crm/items-board').then((d) => { memory = d; setBoard(d) }).catch(() => setFailed(true)) }, [])
    if (failed) return <RelationSelect resource="items" value={null} onChange={onChange} />
    const opt = (i) => ({ value: i.id, label: i.description, rate: i.rate, unit: i.unit, search: `${i.description} ${i.longDescription || ''}` })
    const groups = board ? [...board.groups.map((g) => ({ label: g.name, color: g.color, options: g.items.map(opt) })), { label: tr('No group'), color: 'slate', options: board.ungrouped.map(opt) }].filter((g) => g.options.length) : []
    const money = (n) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
    return (
        <Select
            size="sm" isLoading={!board} options={groups} value={null} placeholder={tr('Add from the catalogue…')} noOptionsMessage={() => tr('No items')}
            menuPortalTarget={document.body} menuPosition="fixed"
            filterOption={(o, input) => !input || o.data.search.toLowerCase().includes(input.toLowerCase())}
            formatGroupLabel={(g) => <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500"><span className={`h-2.5 w-2.5 rounded-full ${DOT[g.color] || DOT.slate}`} />{g.label}<span className="font-normal normal-case text-gray-400">· {g.options.length}</span></div>}
            formatOptionLabel={(o) => <div className="flex items-center justify-between gap-3"><span className="truncate">{o.label}</span><span className="shrink-0 text-xs text-gray-400">{money(o.rate)}{o.unit ? ` / ${o.unit}` : ''}</span></div>}
            onChange={(o) => o && onChange(o.value)}
        />
    )
}

export default ItemPicker
