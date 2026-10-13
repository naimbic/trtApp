/** Minimal iCalendar (RFC 5545) writer, enough for Google Calendar, Apple Calendar and Outlook. */
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
const utc = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const day = (d) => new Date(d).toISOString().slice(0, 10).replace(/-/g, '')
const fold = (line) => { const out = []; let l = line; while (l.length > 74) { out.push(l.slice(0, 74)); l = ` ${l.slice(74)}` } out.push(l); return out.join('\r\n') }

export function buildIcs(events, { name = 'CRM', domain = 'crm' } = {}) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CRM//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`]
    for (const e of events) {
        const start = new Date(e.start)
        const end = e.end ? new Date(e.end) : new Date(start.getTime() + 3600000)
        const desc = [e.description, e.meetingUrl && `Meeting link: ${e.meetingUrl}`].filter(Boolean).join('\n\n')
        lines.push('BEGIN:VEVENT', `UID:${e.id}@${domain}`, `DTSTAMP:${utc(e.updatedAt || new Date())}`)
        if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(new Date(end.getTime() + 86400000))}`)
        else lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(end)}`)
        lines.push(`SUMMARY:${esc(e.title)}`)
        if (desc) lines.push(`DESCRIPTION:${esc(desc)}`)
        if (e.location) lines.push(`LOCATION:${esc(e.location)}`)
        if (e.meetingUrl) lines.push(`URL:${e.meetingUrl}`)
        lines.push('END:VEVENT')
    }
    lines.push('END:VCALENDAR')
    return `${lines.map(fold).join('\r\n')}\r\n`
}
