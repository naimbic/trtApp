import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbUserPlus, TbBrandGoogle, TbBrandGithub, TbCheck, TbX } from 'react-icons/tb'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { api, notify } from './MemberActions'
import { tr } from '@/utils/t'

/** People who asked for an account by signing in with Google or GitHub: the administrators approve (with a role) or refuse. Shown only when someone is waiting. */
const SignupRequests = ({ roles, onApproved }) => {
    const [d, setD] = useState(null)
    const [role, setRole] = useState({})
    const [busy, setBusy] = useState('')
    const load = useCallback(() => api('/api/crm/team/signup-requests').then(setD).catch(() => setD({ list: [], pending: 0 })), [])
    useEffect(() => { load() }, [load])
    const opts = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles])
    if (!d || !d.list.length) return null
    const decide = async (r, action) => {
        setBusy(`${action}${r.id}`)
        try {
            await api(`/api/crm/team/signup-requests/${r.id}/${action}`, { method: 'POST', body: action === 'approve' ? { roleId: role[r.id] || null } : {} })
            notify('success', action === 'approve' ? tr("Account created for {name}. They were told by email.", { name: r.name || r.email }) : tr("Request declined"))
            await load()
            if (action === 'approve') onApproved?.()
        } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    return (
        <div id="signup-requests" className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/30 dark:bg-blue-500/5">
            <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-lg text-white"><TbUserPlus /></span><div><h5>{tr("Account requests")} <span className="rounded-full bg-blue-500 px-2 py-0.5 align-middle text-xs text-white">{d.list.length}</span></h5><p className="text-xs text-gray-500">{tr("These people signed in with Google or GitHub and have no account. Nobody gets access before you approve.")}</p></div></div>
            <div className="space-y-2">
                {d.list.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 dark:bg-gray-800">
                        <Avatar size={36} shape="circle" src={r.picture || undefined}>{(r.name || r.email)[0]?.toUpperCase()}</Avatar>
                        <div className="min-w-[180px] flex-1"><div className="flex items-center gap-1.5 font-semibold">{r.name || r.email}{r.provider === 'github' ? <TbBrandGithub className="text-gray-500" /> : <TbBrandGoogle className="text-red-500" />}</div><div className="text-xs text-gray-500">{r.email} · {dayjs(r.createdAt).format('DD MMM HH:mm')}{r.tries > 1 ? ` · ${tr("{n} tries", { n: r.tries })}` : ''}</div></div>
                        <div className="w-48"><Select isClearable size="sm" placeholder={tr("Role")} options={opts} value={opts.find((o) => o.value === role[r.id]) || null} onChange={(o) => setRole({ ...role, [r.id]: o?.value || null })} /></div>
                        <Button size="sm" variant="solid" icon={<TbCheck />} loading={busy === `approve${r.id}`} onClick={() => decide(r, 'approve')}>{tr("Approve")}</Button>
                        <Button size="sm" variant="plain" className="text-red-500" icon={<TbX />} loading={busy === `reject${r.id}`} onClick={() => decide(r, 'reject')}>{tr("Decline")}</Button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default SignupRequests
