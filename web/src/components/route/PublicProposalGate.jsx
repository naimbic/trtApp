import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import Spinner from '@/components/ui/Spinner'

/** A visitor who is not signed in opens /crm/proposals/<id>: a proposal sent to a lead goes to its public page, anything else to the sign-in page. */
const PublicProposalGate = ({ id, signIn }) => {
    const [state, setState] = useState('checking')
    useEffect(() => {
        let alive = true
        fetch(`/api/crm/public/proposal-open/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!alive) return; if (d?.url) window.location.replace(d.url); else setState('no') })
            .catch(() => alive && setState('no'))
        return () => { alive = false }
    }, [id])
    if (state === 'no') return <Navigate replace to={signIn} />
    return <div className="flex min-h-screen items-center justify-center"><Spinner size={40} /></div>
}

export default PublicProposalGate
