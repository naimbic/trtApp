import { useRef, useImperativeHandle, useState, useEffect } from 'react'
import AuthContext from './AuthContext'
import appConfig from '@/configs/app.config'
import { useSessionUser } from '@/store/authStore'
import Loading from '@/components/shared/Loading'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useNavigate } from 'react-router'

const IsolatedNavigator = ({ ref }) => {
    const navigate = useNavigate()

    useImperativeHandle(ref, () => {
        return {
            navigate,
        }
    }, [navigate])

    return <></>
}

const toUser = (u) => ({
    userName: u.name,
    email: u.email,
    avatar: u.image,
    authority: u.authority || [],
})

const fetchSession = async () => {
    const res = await fetch('/api/auth/session', { credentials: 'include' })
    const data = res.ok ? await res.json() : null
    return data?.user ? toUser(data.user) : null
}

function AuthProvider({ children }) {
    const signedIn = useSessionUser((state) => state.session.signedIn)
    const user = useSessionUser((state) => state.user)
    const setUser = useSessionUser((state) => state.setUser)
    const setSessionSignedIn = useSessionUser((state) => state.setSessionSignedIn)
    const [checking, setChecking] = useState(true)
    const navigatorRef = useRef(null)

    const authenticated = Boolean(signedIn)

    // The NextAuth cookie is the source of truth; resync the store on load.
    useEffect(() => {
        let alive = true
        fetchSession()
            .then((u) => {
                if (!alive) return
                if (u) {
                    setUser(u)
                    setSessionSignedIn(true)
                } else {
                    setUser({ userName: '', email: '', avatar: '', authority: [] })
                    setSessionSignedIn(false)
                }
            })
            .catch(() => {})
            .finally(() => alive && setChecking(false))
        return () => {
            alive = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const redirect = () => {
        const params = new URLSearchParams(window.location.search)
        const redirectUrl = params.get(REDIRECT_URL_KEY)
        navigatorRef.current?.navigate(redirectUrl ? redirectUrl : appConfig.authenticatedEntryPath)
    }

    const signIn = async ({ email, password, otp }) => {
        try {
            // first step: does this account need a second check?
            if (!otp) {
                const chk = await fetch('/api/crm/auth/2fa/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then((r) => r.json()).catch(() => ({}))
                if (chk.twoFactor) return { status: 'otp', methods: chk.methods }
            }
            const { csrfToken } = await (await fetch('/api/auth/csrf', { credentials: 'include' })).json()
            // redirect: 'manual' — NextAuth answers with a redirect (possibly to another origin via a stale
            // callback-url cookie); we only need the session cookie it sets, never to follow that redirect.
            await fetch('/api/auth/callback/credentials', {
                method: 'POST',
                credentials: 'include',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ csrfToken, email, password, ...(otp ? { otp } : {}), callbackUrl: window.location.origin, json: 'true' }),
            })
            const u = await fetchSession()
            if (!u) {
                const st = await fetch(`/api/crm/auth/status?email=${encodeURIComponent(email)}`).then((r) => r.json()).catch(() => ({}))
                return {
                    status: 'failed',
                    message: st.locked ? `Too many failed attempts. Try again in ${st.minutes} minute${st.minutes === 1 ? '' : 's'}.` : otp ? 'That code is not right or has expired' : 'Invalid email or password, or the account is inactive',
                }
            }
            setUser(u)
            setSessionSignedIn(true)
            redirect()
            return { status: 'success', message: '' }
        } catch (e) {
            return { status: 'failed', message: e.toString() }
        }
    }

    const signUp = async () => ({ status: 'failed', message: 'Sign up is disabled' })

    const signOut = async () => {
        try {
            const { csrfToken } = await (await fetch('/api/auth/csrf', { credentials: 'include' })).json()
            await fetch('/api/auth/signout', {
                method: 'POST',
                credentials: 'include',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ csrfToken, json: 'true' }),
            })
        } finally {
            setUser({ userName: '', email: '', avatar: '', authority: [] })
            setSessionSignedIn(false)
            navigatorRef.current?.navigate('/')
        }
    }

    const oAuthSignIn = () => {}

    return (
        <AuthContext.Provider value={{ authenticated, user, signIn, signUp, signOut, oAuthSignIn }}>
            {checking ? <Loading loading={true} className="w-full h-screen" /> : children}
            <IsolatedNavigator ref={navigatorRef} />
        </AuthContext.Provider>
    )
}

export default AuthProvider
