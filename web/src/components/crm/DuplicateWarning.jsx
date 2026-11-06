import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { TbAlertTriangle } from 'react-icons/tb'
import { api, qs } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

const WHY = { email: 'same email', phone: 'same phone', company: 'same company' }

/** "Possible duplicate": looks for leads and clients with the same email, phone or company while you type (half a second after you stop). */
const DuplicateWarning = ({ email = '', phone = '', company = '', leadId, clientId, className = '' }) => {
    const [list, setList] = useState([])
    useEffect(() => {
        const e = String(email).trim(), p = String(phone).replace(/\D/g, ''), c = String(company).trim()
        if (!/.+@.+\..+/.test(e) && p.length < 7 && c.length < 3) { setList([]); return undefined }
        let live = true
        const t = setTimeout(() => { api(`/api/crm/duplicates?${qs({ email: e, phone, company: c, leadId, clientId })}`, { nocache: true }).then((d) => { if (live) setList(d.list || []) }).catch(() => {}) }, 500)
        return () => { live = false; clearTimeout(t) }
    }, [email, phone, company, leadId, clientId])
    if (!list.length) return null
    return (
        <div role="status" className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 ${className}`}>
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><TbAlertTriangle />{tr('Possible duplicate')}</div>
            <ul className="space-y-0.5">
                {list.map((d) => (
                    <li key={`${d.type}-${d.id}`}>
                        <Link to={d.link} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{d.type === 'client' ? tr('Client') : tr('Lead')} · {d.title}</Link>
                        {d.sub ? ` · ${d.sub}` : ''} <span className="text-xs opacity-80">({d.why.map((w) => tr(WHY[w])).join(', ')}{d.note ? ` · ${tr(d.note)}` : ''})</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default DuplicateWarning
