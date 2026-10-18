/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { PiCalendarDotsDuotone, PiCoinsDuotone, PiPaletteDuotone, PiGlobeDuotone, PiCheckBold } from 'react-icons/pi'
import DatePicker from '@/components/ui/DatePicker'
import Tooltip from '@/components/ui/Tooltip'
import { useDashFilters, ACCENTS } from '@/store/dashFilterStore'
import { useThemeStore } from '@/store/themeStore'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

const PRESETS = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['12m', '12 months']]
const SHORT = { today: 'Today', '7d': '7D', '30d': '30D', month: 'Month', lastmonth: 'Last', year: 'Year', '12m': '12M', custom: '···' }

/**
 * The period, currency and colour pickers, moved into the dock: an icon each with its current value underneath; pressing one opens a
 * small panel beside the dock. Shown on the pages that have these filters.
 */
const DockFilters = () => {
    const { range, from, to, currencyId, accent, currencies, setRange, setCustom, setCurrency, setAccent } = useDashFilters()
    const direction = useThemeStore((s) => s.direction)
    const [open, setOpen] = useState(null)
    const [top, setTop] = useState(0)
    const [noRate, setNoRate] = useState([])
    const box = useRef(null)
    const several = currencies.length > 1
    const place = direction === 'rtl' ? 'left' : 'right'

    useEffect(() => {
        if (!several) return
        fetch('/api/crm/currencies?pageSize=100', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
            setNoRate((j?.list || []).filter((c) => !c.isDefault && !(Number(c.rate) > 0)).map((c) => c.name))
        }).catch(() => {})
    }, [several, currencyId])
    useEffect(() => {
        if (!open) return undefined
        const away = (e) => { if (box.current && !box.current.contains(e.target) && !e.target.closest?.('.rp-fpanel') && !e.target.closest?.('.dp-popover, [data-radix-popper-content-wrapper], .picker')) setOpen(null) }
        const esc = (e) => { if (e.key === 'Escape') setOpen(null) }
        document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
    }, [open])

    const toggle = (key, e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setTop(Math.max(12, Math.min(r.top - 8, window.innerHeight - 380)))
        setOpen(open === key ? null : key)
    }
    const customValue = range === 'custom' && from && to ? [new Date(`${from}T00:00:00`), new Date(`${to}T00:00:00`)] : undefined
    const curLabel = currencyId === 'all' ? tr('ALL') : currencies.find((c) => c.id === currencyId)?.name || ''
    const Btn = ({ k, icon, label, tag }) => (
        <Tooltip title={label} placement={place}>
            <button type="button" className="rp-dock-btn rp-dock-filter" data-active={open === k} aria-label={label} aria-expanded={open === k} onClick={(e) => toggle(k, e)}>{icon}{tag && <span className="rp-dock-tag">{tag}</span>}</button>
        </Tooltip>
    )

    return (
        <div ref={box} className="contents">
            <span className="rp-dock-sep" />
            <Btn k="period" icon={<PiCalendarDotsDuotone />} label={tr('Period')} tag={tr(SHORT[range] || '')} />
            {several && <Btn k="currency" icon={<PiCoinsDuotone />} label={tr('Currency')} tag={curLabel} />}
            <Btn k="colour" icon={<PiPaletteDuotone />} label={tr('Colour')} tag={<span className="block h-2 w-2 rounded-full" style={{ background: ACCENTS.find((a) => a.key === accent)?.hex }} />} />
            {open && (
                <div className="rp-fpanel" style={{ top, ...(direction === 'rtl' ? { insetInlineStart: 'auto', right: 'calc(var(--rp-dock-x) + var(--rp-dock-w) + 12px)' } : { left: 'calc(var(--rp-dock-x) + var(--rp-dock-w) + 12px)' }) }}>
                    {open === 'period' && (
                        <>
                            <h6>{tr('Period')}</h6>
                            <div className="rp-fgrid">{PRESETS.map(([k, label]) => <button key={k} type="button" className="rp-fchip" data-on={range === k} onClick={() => { setRange(k); setOpen(null) }}>{tr(label)}</button>)}</div>
                            <h6>{tr('Custom range')}</h6>
                            <DatePicker.DatePickerRange size="sm" clearable={false} placeholder={tr('Custom range')} inputFormat="DD MMM YYYY" separator="→" maxDate={new Date()} value={customValue}
                                onChange={(vals) => { if (Array.isArray(vals) && vals[0] && vals[1]) { setCustom({ from: dayjs(vals[0]).format('YYYY-MM-DD'), to: dayjs(vals[1]).format('YYYY-MM-DD') }); setOpen(null) } }} />
                        </>
                    )}
                    {open === 'currency' && (
                        <>
                            <h6>{tr('Currency')}</h6>
                            <div className="rp-fgrid">{currencies.map((c) => (
                                <button key={c.id} type="button" className="rp-fchip" data-on={(currencyId || '') === c.id} onClick={() => { setCurrency(c.id); setOpen(null) }}>
                                    {c.id === 'all' ? <><PiGlobeDuotone />{tr('ALL')}{noRate.length > 0 && <i className="rp-fdot" />}</> : c.name}
                                </button>
                            ))}</div>
                            {noRate.length > 0 && <p className="rp-fnote">{tr('ALL leaves out {n} (no rate in Settings → Currencies).', { n: noRate.join(', ') })}</p>}
                        </>
                    )}
                    {open === 'colour' && (
                        <>
                            <h6>{tr('Colour')}</h6>
                            <div className="rp-fgrid">{ACCENTS.map((a) => (
                                <button key={a.key} type="button" className={classNames('rp-fswatch')} style={{ background: a.hex }} aria-label={tr(a.label)} onClick={() => { setAccent(a.key); setOpen(null) }}>{accent === a.key && <PiCheckBold />}</button>
                            ))}</div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default DockFilters
