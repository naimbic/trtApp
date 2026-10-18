import Switcher from '@/components/ui/Switcher'
import { tr } from '@/utils/t'

/** "Send reminders to the client": on by default; off means the CRM never emails that client a reminder about this document. */
const ReminderSwitch = ({ checked, onChange, title, hint, className }) => (
    <div className={className || 'flex items-center justify-between gap-4'}>
        <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-gray-500">{hint}{' '}<span className="text-gray-400">{checked ? tr("The client is reminded automatically.") : tr("Nothing is emailed to the client automatically.")}</span></div>
        </div>
        <Switcher checked={checked} onChange={onChange} />
    </div>
)

export default ReminderSwitch
