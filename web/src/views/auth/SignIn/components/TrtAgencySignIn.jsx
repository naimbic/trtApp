import { useEffect, useState } from 'react'
import { TbShieldLock } from 'react-icons/tb'
import { FcGoogle } from 'react-icons/fc'
import { FaGithub } from 'react-icons/fa'
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
    unverified: tr('Your email address is not verified by your provider.'),
})

/** "Sign in with trtAgency": shown only when the server is set up for it; also tells what went wrong when the provider sent the person back. */
const TrtAgencySignIn = () => {
    const [ways, setWays] = useState({})
    const [error, setError] = useState('')

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        // our own codes, or the ones Google / GitHub sign-in raise (?error=AccessDenied, OAuthCallbackError...)
        const code = params.get('oidc_error') || (params.get('error') ? (params.get('error') === 'AccessDenied' ? 'access_denied' : 'provider_error') : '')
        if (code) {
            setError(MESSAGES()[code] || MESSAGES().provider_error)
            params.delete('oidc_error'); params.delete('error')
            const q = params.toString()
            window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''))
        }
        fetch('/api/crm/auth/providers').then((r) => r.json()).then(setWays).catch(() => {})
    }, [])

    // Google and GitHub go through the sign-in of the app (a form post with its anti-forgery token), then come back signed in
    const social = async (id) => {
        const next = new URLSearchParams(window.location.search).get('redirectUrl') || '/'
        try {
            const { csrfToken } = await (await fetch('/api/auth/csrf', { credentials: 'include' })).json()
            const form = document.createElement('form')
            form.method = 'POST'; form.action = `/api/auth/signin/${id}`
            for (const [k, v] of Object.entries({ csrfToken, callbackUrl: next })) { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i) }
            document.body.appendChild(form); form.submit()
        } catch { setError(MESSAGES().provider_error) }
    }
    const go = () => {
        const next = new URLSearchParams(window.location.search).get('redirectUrl')
        window.location.assign(`/api/crm/auth/trtagency/login${next ? `?redirectUrl=${encodeURIComponent(next)}` : ''}`)
    }

    const any = ways.trtagency || ways.google || ways.github
    if (!any && !error) return null
    return (
        <div className="mt-6">
            {error && <Alert showIcon className="mb-4" type="danger" closable onClose={() => setError('')}><span>{error}</span></Alert>}
            {any && (
                <>
                    <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400"><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />{tr('or')}<span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div>
                    <div className="flex flex-col gap-2">
                        {ways.trtagency && <Button block icon={<TbShieldLock />} onClick={go}>{tr('Sign in with trtAgency')}</Button>}
                        {(ways.google || ways.github) && (
                            <div className="flex items-center gap-2">
                                {ways.google && <Button className="flex-1" type="button" onClick={() => social('google')}><span className="flex items-center justify-center gap-2"><FcGoogle className="text-2xl" /><span>{tr('Google')}</span></span></Button>}
                                {ways.github && <Button className="flex-1" type="button" onClick={() => social('github')}><span className="flex items-center justify-center gap-2"><FaGithub className="text-2xl" /><span>{tr('Github')}</span></span></Button>}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default TrtAgencySignIn
