import { PiAtDuotone, PiLifebuoyDuotone, PiChecksDuotone, PiAlarmDuotone, PiCurrencyCircleDollarDuotone, PiFileTextDuotone, PiPresentationChartDuotone, PiTargetDuotone, PiEyeDuotone, PiWarningCircleDuotone, PiBellRingingDuotone, PiChatCircleTextDuotone, PiNotePencilDuotone, PiBugBeetleDuotone, PiLightbulbDuotone, PiUserPlusDuotone, PiRocketLaunchDuotone, PiCalendarCheckDuotone } from 'react-icons/pi'
import { tr } from '@/utils/t'

/** The icon and colour of each kind of notification. */
export const KIND = {
    ticket: [PiLifebuoyDuotone, 'bg-purple-100 text-purple-600'], task: [PiChecksDuotone, 'bg-sky-100 text-sky-600'], reminder: [PiAlarmDuotone, 'bg-amber-100 text-amber-600'],
    payment: [PiCurrencyCircleDollarDuotone, 'bg-emerald-100 text-emerald-600'], invoice: [PiWarningCircleDuotone, 'bg-red-100 text-red-600'], estimate: [PiFileTextDuotone, 'bg-amber-100 text-amber-600'],
    mention: [PiAtDuotone, 'bg-amber-100 text-amber-600'], proposal: [PiPresentationChartDuotone, 'bg-purple-100 text-purple-600'], lead: [PiTargetDuotone, 'bg-blue-100 text-blue-600'], view: [PiEyeDuotone, 'bg-gray-100 text-gray-600'],
    comment: [PiChatCircleTextDuotone, 'bg-sky-100 text-sky-600'], note: [PiNotePencilDuotone, 'bg-yellow-100 text-yellow-700'], request: [PiBugBeetleDuotone, 'bg-fuchsia-100 text-fuchsia-600'],
    idea: [PiLightbulbDuotone, 'bg-violet-100 text-violet-600'], team: [PiUserPlusDuotone, 'bg-blue-100 text-blue-600'], grow: [PiRocketLaunchDuotone, 'bg-emerald-100 text-emerald-600'], calendar: [PiCalendarCheckDuotone, 'bg-blue-100 text-blue-600'],
    other: [PiBellRingingDuotone, 'bg-gray-100 text-gray-600'],
}
export const TONE = { red: 'bg-red-100 text-red-600', green: 'bg-emerald-100 text-emerald-600' }
export const kindLabel = (k) => ({ ticket: tr('Tickets'), task: tr('Tasks'), reminder: tr('Reminders'), mention: tr('Mentions'), payment: tr('Payments'), invoice: tr('Invoices'), estimate: tr('Estimates'), proposal: tr('Proposals'), lead: tr('Leads'), view: tr('Views'), comment: tr('Comments'), note: tr('Notes'), request: tr('Requests'), idea: tr('Ideas'), team: tr('Team'), grow: tr('Growth'), calendar: tr('Calendar'), other: tr('Other') }[k] || k)
/** Icon component and classes of one notification. */
export const look = (i) => { const [Icon, cls] = KIND[i.kind] || KIND.other; return [Icon, TONE[i.tone] && !['ticket', 'reminder', 'request', 'idea'].includes(i.kind) ? TONE[i.tone] : cls] }
