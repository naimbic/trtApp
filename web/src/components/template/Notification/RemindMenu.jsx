import dayjs from 'dayjs'
import { TbAlarm } from 'react-icons/tb'
import Dropdown from '@/components/ui/Dropdown'
import { api, notify } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

const SNOOZE = [['In 1 hour', () => dayjs().add(1, 'hour')], ['This evening, 18:00', () => (dayjs().hour() < 18 ? dayjs().hour(18).minute(0) : dayjs().add(1, 'day').hour(9).minute(0))], ['Tomorrow, 09:00', () => dayjs().add(1, 'day').hour(9).minute(0)], ['Next Monday, 09:00', () => dayjs().add(1, 'week').startOf('week').add(1, 'day').hour(9).minute(0)]]

/** The "Remind me" alarm of a notification: pick when, and a reminder about the same record is set (the bell and the Notifications page share it). */
const RemindMenu = ({ i, className = '', stop = false }) => {
    const remind = async (when) => {
        try { await api('/api/crm/my-reminders/all', { method: 'POST', body: { note: [tr(i.title), i.detail].filter(Boolean).join(' — ').slice(0, 480), date: when.toDate().toISOString(), link: i.link } }); notify('success', `${tr('Reminder set')} · ${when.format('ddd D MMM, HH:mm')}`) } catch (e) { notify('danger', e.message) }
    }
    return (
        <span onClick={stop ? (e) => e.stopPropagation() : undefined}>
            <Dropdown placement="bottom-end" renderTitle={<span role="button" tabIndex={0} aria-label={tr('Remind me')} title={tr('Remind me')} className={className}><TbAlarm /></span>}>
                {SNOOZE.map(([label, when]) => <Dropdown.Item key={label} eventKey={label} onClick={() => remind(when())}>{tr(label)}</Dropdown.Item>)}
            </Dropdown>
        </span>
    )
}

export default RemindMenu
