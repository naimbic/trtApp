import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import appConfig from '@/configs/app.config'
import { useAuth } from '@/auth'

const { authenticatedEntryPath } = appConfig

/** A sign-in that another app (Meet) asked for, /api/oauth/authorize?...: once signed in the browser goes back to it (a full page load), not to the CRM home. */
const oauthReturn = () => {
    const r = new URLSearchParams(window.location.search).get('redirectUrl')
    return r && r.startsWith('/api/oauth/') ? r : null
}

const PublicRoute = () => {
    const { authenticated } = useAuth()
    const back = authenticated ? oauthReturn() : null
    useEffect(() => { if (back) window.location.replace(back) }, [back])
    if (back) return null
    return authenticated ? <Navigate to={authenticatedEntryPath} /> : <Outlet />
}

export default PublicRoute
