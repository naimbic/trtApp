/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import { api } from '@/views/crm/kit/api'
import { WorkDays, hm, clock } from '@/views/crm/team/WorkHours'
import { tr } from '@/utils/t'

const Tile = ({ label, value, sub }) => (
    <div className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="text-xs text-gray-400">{label}</div>
        <div className="mt-1 text-xl font-extrabold">{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
)

/** My own hours: today, this week against the working week, and the last 14 days. */
const MyWorkHours = () => {
    const [wh, setWh] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => {
        api(`/api/crm/work-hours?staffId=me&from=${dayjs().subtract(13, 'day').format('YYYY-MM-DD')}&to=${dayjs().format('YYYY-MM-DD')}`).then((x) => setWh(x.people?.[0] || null)).catch((e) => setError(e.message))
    }, [])
    if (error) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
    if (!wh) return <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>
    const t = wh.totals
    const today = wh.rows[wh.rows.length - 1]
    return (
        <Card>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Tile label={tr('Today')} value={hm(today?.hours)} sub={today?.first !== null && today?.first !== undefined ? `${tr('Opened')} ${clock(today.first)}` : tr('Not opened yet')} />
                <Tile label={tr('Last 14 days')} value={hm(t.active)} sub={`${tr('Expected')} ${hm(t.expected)}${t.ratio === null ? '' : ` · ${t.ratio}%`}`} />
                <Tile label={tr('Overtime')} value={t.overtime > 0 ? `+${hm(t.overtime)}` : '–'} />
                <Tile label={tr('Usually opens at')} value={clock(t.avgFirst)} sub={`${tr('Usually leaves at')} ${clock(t.avgLast)}`} />
            </div>
            <WorkDays wh={wh} />
            <p className="mt-4 text-xs text-gray-400">{tr('Hours are the time the CRM is open and in use (a click, key press or scroll in the last two minutes). Nothing outside the CRM is measured. The working week is set in Settings → Localization → Working hours.')}</p>
        </Card>
    )
}

export default MyWorkHours
