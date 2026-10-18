import { lazy, Suspense } from 'react'
import {
    LAYOUT_COLLAPSIBLE_SIDE,
    LAYOUT_STACKED_SIDE,
    LAYOUT_TOP_BAR_CLASSIC,
    LAYOUT_FRAMELESS_SIDE,
    LAYOUT_CONTENT_OVERLAY,
    LAYOUT_BLANK,
    LAYOUT_RAPPORT,
} from '@/constants/theme.constant'
import Loading from '@/components/shared/Loading'
import AccountLanguage from '@/components/template/AccountLanguage'

const layouts = {
    [LAYOUT_COLLAPSIBLE_SIDE]: lazy(
        () => import('./components/CollapsibleSide'),
    ),
    [LAYOUT_STACKED_SIDE]: lazy(() => import('./components/StackedSide')),
    [LAYOUT_TOP_BAR_CLASSIC]: lazy(() => import('./components/TopBarClassic')),
    [LAYOUT_FRAMELESS_SIDE]: lazy(() => import('./components/FrameLessSide')),
    [LAYOUT_CONTENT_OVERLAY]: lazy(() => import('./components/ContentOverlay')),
    [LAYOUT_BLANK]: lazy(() => import('./components/Blank')),
    [LAYOUT_RAPPORT]: lazy(() => import('./components/RapportShell')),
}

const PostLoginLayout = ({ layoutType, children }) => {
    const AppLayout = layouts[layoutType] ?? layouts[Object.keys(layouts)[0]]

    return (
        <>
        <AccountLanguage />
        <Suspense
            fallback={
                <div className="flex flex-auto flex-col h-[100vh]">
                    <Loading loading={true} />
                </div>
            }
        >
            <AppLayout>{children}</AppLayout>
        </Suspense>
        </>
    )
}

export default PostLoginLayout
