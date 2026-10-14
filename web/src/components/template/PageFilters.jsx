import { useState } from 'react'
import dayjs from 'dayjs'
import { PiCalendarDotsDuotone, PiXBold } from 'react-icons/pi'
import Segment from '@/components/ui/Segment'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import RangeCalendar from '@/components/ui/RangeCalendar'
import Tooltip from '@/components/ui/Tooltip'
import classNames from '@/utils/classNames'
import { PAGE_PRESETS, PAGE_FILTERS, usePageFilters, useTopCurrency, resolveRange } from '@/store/pageFilterStore'

/** Date and currency filters for every list and report, in the top bar like the dashboard. */
const PageFilters = ({ pathname }) => {
    const cfg = PAGE_FILTERS[pathname]
    const page = usePageFilters((s) => s.pages[cfg?.key])
    const { setRange, setCustom, clear } = usePageFilters()
    const cur = useTopCurrency()
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState([null, null])
    if (!cfg) return null
    const range = page?.range || cfg.default || 'all'
    const custom = range === 'custom' ? resolveRange('custom', page?.from, page?.to) : [null, null]
    const apply = () => { if (draft[0] && draft[1]) { setCustom(cfg.key, dayjs(draft[0]).format('YYYY-MM-DD'), dayjs(draft[1]).format('YYYY-MM-DD')); setOpen(false) } }
    const title = range === 'custom' && custom[0] ? `${dayjs(custom[0]).format('DD MMM YYYY')} → ${dayjs(custom[1]).format('DD MMM YYYY')}` : 'Custom dates'
    return (
        <div className="flex max-w-full items-center gap-2 overflow-x-auto py-1" aria-label={cfg.label}>
            <span className="hidden shrink-0 text-xs font-semibold uppercase text-gray-400 2xl:block">{cfg.label}</span>
            <Segment size="sm" value={PAGE_PRESETS.some(([k]) => k === range) ? range : ''} onChange={(v) => { if (!v) return; if (v === range && cfg.default !== v) clear(cfg.key); else setRange(cfg.key, v) }}>
                {PAGE_PRESETS.map(([key, label]) => <Segment.Item key={key} value={key} className="whitespace-nowrap px-2.5">{label}</Segment.Item>)}
            </Segment>
            <Tooltip title={title}>
                <button type="button" onClick={() => { setDraft(range === 'custom' && custom[0] ? custom : [null, null]); setOpen(true) }} className={classNames('flex h-9 shrink-0 items-center gap-1 rounded-xl px-2.5 text-xl transition-colors', range === 'custom' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:text-primary dark:bg-gray-700')} aria-label="Custom dates">
                    <PiCalendarDotsDuotone />{range === 'custom' && custom[0] && <span className="hidden text-xs font-semibold xl:block">{dayjs(custom[0]).format('DD MMM')} → {dayjs(custom[1]).format('DD MMM')}</span>}
                </button>
            </Tooltip>
            {range !== (cfg.default || 'all') && <Tooltip title="Clear the period"><button type="button" onClick={() => clear(cfg.key)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><PiXBold /></button></Tooltip>}
            {cur.options.length > 1 && (
                <>
                    <span className="hidden h-6 w-px shrink-0 bg-gray-200 md:block dark:bg-gray-600" />
                    <Segment size="sm" value={cur.value || ''} onChange={(v) => v && cur.onChange?.(v)}>
                        {cur.options.map((c) => <Segment.Item key={c.id} value={c.id} className="whitespace-nowrap px-2.5">{c.name}</Segment.Item>)}
                    </Segment>
                </>
            )}
            <Dialog isOpen={open} width={420} onClose={() => setOpen(false)} onRequestClose={() => setOpen(false)}>
                <h5 className="mb-3">Pick the dates</h5>
                <div className="flex justify-center"><RangeCalendar value={draft} onChange={(v) => setDraft(Array.isArray(v) ? v : [null, null])} /></div>
                <div className="mt-4 flex justify-between gap-2"><span className="self-center text-sm text-gray-500">{draft[0] && draft[1] ? `${dayjs(draft[0]).format('DD MMM YYYY')} → ${dayjs(draft[1]).format('DD MMM YYYY')}` : 'Pick a start and an end day'}</span><div className="flex gap-2"><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="solid" disabled={!(draft[0] && draft[1])} onClick={apply}>Apply</Button></div></div>
            </Dialog>
        </div>
    )
}

export default PageFilters
