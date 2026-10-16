import { useEffect, useState } from 'react'
import { TbShieldLock } from 'react-icons/tb'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import { tr } from '@/utils/t'

// what the server says by code (see MESSAGES in src/lib/crm/trtagency/logic.js)
const MESSAGES = () => ({
    not_configured: tr('Sign in with trtAgency is not set up on this server.'),
    access_denied: tr('You cancelled the sign-in with trtAgency.'),
    provider_error: tr('trtAgency could not sign you in. Try again.'),
    invalid_state: tr('This sign-in link is not valid any more. Start again.'),
    expired: tr('The sign-in took too long. Start again.'),
    token_failed: tr('trtAgency answered with something we could not verify. Try again, or use your email and password.'),
    no_subject: tr('trtAgency did not tell us who you are.'),
    no_email: tr('Your trtAgency account has no email address, which is needed to create your account here.'),
    no_account: tr('There is no account for you here yet. Ask an administrator to add you.'),
    conflict: tr('This email address already belongs to another trtAgency identity. Ask an administrator.'),
    blocked: tr('Your account is disabled. Ask an administrator.'),
})

/** "Sign in with trtAgency": shown only when the server is set up for it; also tells what went wrong when the provider sent the person back. */
const TrtAgencySignIn = () => {
    const [enabled, setEnabled] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('oidc_error')
        if (code) {
            setError(MESSAGES()[code] || MESSAGES().provider_error)
            params.delete('oidc_error')
            const q = params.toString()
            window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''))
        }
        fetch('/api/crm/auth/trtagency/status').then((r) => r.json()).then((j) => setEnabled(!!j.enabled)).catch(() => {})
    }, [])

    const go = () => {
        const next = new URLSearchParams(window.location.search).get('redirectUrl')
        window.location.assign(`/api/crm/auth/trtagency/login${next ? `?redirectUrl=${encodeURIComponent(next)}` : ''}`)
    }

    if (!enabled && !error) return null
    return (
        <div className="mt-6">
            {error && <Alert showIcon className="mb-4" type="danger" closable onClose={() => setError('')}><span>{error}</span></Alert>}
            {enabled && (
                <>
                    <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400"><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />{tr('or')}<span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div>
                    <Button block icon={<TbShieldLock />} onClick={go}>{tr('Sign in with trtAgency')}</Button>
                </>
            )}
        </div>
    )
}

export default TrtAgencySignIn
