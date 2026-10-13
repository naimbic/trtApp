import { BrowserRouter, useLocation } from 'react-router'
import { lazy, Suspense } from 'react'
import Theme from '@/components/template/Theme'
import Layout from '@/components/layouts'
import { AuthProvider } from '@/auth'
import Views from '@/views'
import appConfig from './configs/app.config'

const PortalApp = lazy(() => import('@/views/portal/PortalApp'))

// Clients use their own area (/portal) with its own sign-in; staff use the CRM.
const Root = () => {
    const { pathname } = useLocation()
    if (pathname === '/portal' || pathname.startsWith('/portal/')) return <Suspense fallback={null}><PortalApp /></Suspense>
    return (
        <AuthProvider>
            <Layout>
                <Views />
            </Layout>
        </AuthProvider>
    )
}

if (appConfig.enableMock) {
    import('./mock')
}

function App() {
    return (
        <Theme>
            <BrowserRouter>
                <Root />
            </BrowserRouter>
        </Theme>
    )
}

export default App
