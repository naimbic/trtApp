import { useEffect, useState } from 'react'
import { TbBellRinging, TbBellOff } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import { api, notify } from './api'
import { tr } from '@/utils/t'

/**
 * The "send reminders to the client" switch right on a document's page: on by default; off means the scheduled job never emails
 * the client a reminder for it. It saves at once. `field` is the document's own flag (`remindClient`, or the invoice's
 * `cancelOverdueReminders`, which is the same switch the other way round).
 */
const ReminderCard = ({ resource, id, field = 'remindClient', inverted = false, value, canEdit, title, hint }) => {
    const [on, setOn] = useState(!!value)
    const [busy, setBusy] = useState(false)
    useEffect(() => setOn(!!value), [value])
    const change = async (v) => {
        setBusy(true)
        try {
            await api(`/api/crm/${resource}/${id}`, { method: 'PATCH', body: { [field]: inverted ? !v : v } })
            setOn(v)
            notify('success', v ? tr('Reminders are on for this client') : tr('No reminder will be emailed to this client'))
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Card bodyClass="p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl ${on ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>{on ? <TbBellRinging /> : <TbBellOff />}</span>
                    <div className="min-w-0"><div className="font-semibold">{title}</div><div className="text-sm text-gray-500">{hint} <span className="text-gray-400">{on ? tr('The client is reminded automatically.') : tr('Nothing is emailed to the client automatically.')}</span></div></div>
                </div>
                <Switcher checked={on} disabled={!canEdit || busy} onChange={change} />
            </div>
        </Card>
    )
}

export default ReminderCard
