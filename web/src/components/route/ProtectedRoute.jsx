import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/auth'
import PublicProposalGate from './PublicProposalGate'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
    const { authenticated } = useAuth()

    const pathName = location.pathname

    const getPathName =
        pathName === '/' ? '' : `?${REDIRECT_URL_KEY}=${pathName}`

    if (!authenticated) {
        // the address of a proposal sent to a lead opens its public page without signing in
        const m = /^\/crm\/proposals\/([0-9a-f]{24})\/?$/i.exec(pathName)
        if (m) return <PublicProposalGate id={m[1]} signIn={`${unAuthenticatedEntryPath}${getPathName}`} />
        return (
            <Navigate
                replace
                to={`${unAuthenticatedEntryPath}${getPathName}`}
            />
        )
    }

    return <Outlet />
}

export default ProtectedRoute
