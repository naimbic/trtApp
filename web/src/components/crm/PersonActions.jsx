/*! © 2026 TRT Digital — trtCRM. */
import { Link } from 'react-router'
import { TbMessageCircle, TbBrandWhatsapp, TbMail, TbPhone } from 'react-icons/tb'
import Tooltip from '@/components/ui/Tooltip'
import { tr } from '@/utils/t'

const digits = (v) => String(v || '').replace(/[^\d]/g, '')

/** Quick ways to reach a team member: chat message, WhatsApp, email, call. Hidden until the row (a parent with the "group" class) is hovered or focused.
 *  person = { id, email, phone, whatsapp }; an icon is left out when there is nothing behind it. */
const PersonActions = ({ person, always = false, className = '' }) => {
    if (!person) return null
    const wa = digits(person.whatsapp || person.phone)
    const item = 'grid size-7 place-items-center rounded-full text-base text-gray-500 transition hover:bg-primary hover:text-white'
    return (
        <span className={`inline-flex items-center gap-0.5 transition ${always ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} ${className}`}>
            {person.id && <Tooltip title={tr('Send a chat message')}><Link to={`/crm/chat?with=${person.id}`} className={item} aria-label={tr('Send a chat message')}><TbMessageCircle /></Link></Tooltip>}
            {wa.length >= 7 && <Tooltip title={tr('WhatsApp message')}><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={item} aria-label={tr('WhatsApp message')}><TbBrandWhatsapp /></a></Tooltip>}
            {person.email && <Tooltip title={tr('Send an email')}><a href={`mailto:${person.email}`} className={item} aria-label={tr('Send an email')}><TbMail /></a></Tooltip>}
            {person.phone && <Tooltip title={tr('Call')}><a href={`tel:${person.phone.replace(/\s+/g, '')}`} className={item} aria-label={tr('Call')}><TbPhone /></a></Tooltip>}
        </span>
    )
}

export default PersonActions
