import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TbUserShare, TbArrowBackUp } from 'react-icons/tb'
import { tr } from '@/utils/t'
import { clearUserData } from '@/utils/clearUserData'

const call = async (method, body) => {
    const res = await fetch('/api/crm/auth/login-as', { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || tr("Request failed ({status})", { status: res.status }))
    return json
}

/** Opens the CRM as another team member, then reloads so nothing of the previous person stays in memory. */
export async function loginAs(staffId) {
    await call('POST', { staffId })
    clearUserData()
    window.location.assign('/')
}

/** The bar shown the whole time an administrator works inside another member's account. */
const LoginAsBanner = () => {
    const [info, setInfo] = useState(null)
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        let alive = true
        fetch('/api/crm/me', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d?.loginAs) setInfo({ name: d.name, by: d.loginAs.by }) }).catch(() => {})
        return () => { alive = false }
    }, [])
    const back = async () => {
        setBusy(true)
        try { await call('DELETE'); clearUserData(); window.location.assign('/crm/staff') } catch { setBusy(false) }
    }
    return (
        <AnimatePresence>
            {info && (
                <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className="fixed bottom-4 left-1/2 z-[1200] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-full py-1.5 pe-1.5 ps-4 text-sm shadow-xl"
                    style={{ background: 'var(--rp-ink, #17171c)', color: 'var(--rp-on-ink, #fff)' }} role="status">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-amber-950"><TbUserShare /></span>
                    <span className="min-w-0 truncate">{tr("You are logged in as {name}", { name: info.name })}{info.by ? <span className="opacity-60"> · {tr("by {name}", { name: info.by })}</span> : null}</span>
                    <button type="button" disabled={busy} onClick={back} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 font-semibold text-amber-950 transition hover:bg-amber-300 disabled:opacity-60"><TbArrowBackUp />{tr("Back to my account")}</button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default LoginAsBanner
