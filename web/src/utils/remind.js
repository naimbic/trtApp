import dayjs from 'dayjs'

/** The time a reminder starts with: one hour from now when that is inside the notification hours, else the first hour of the next opening. nh = { on, from, to } from /api/crm/me. */
export function defaultRemindAt(nh) {
    const from = nh?.from ?? 10, to = nh?.to ?? 17
    const now = dayjs()
    const soon = now.add(1, 'hour').minute(0).second(0).millisecond(0)
    if (nh?.on === false) return soon.toDate()
    if (soon.isSame(now, 'day') && soon.hour() >= from && soon.hour() < to) return soon.toDate()
    return (now.hour() < from ? now : now.add(1, 'day')).hour(from).minute(0).second(0).millisecond(0).toDate()
}
