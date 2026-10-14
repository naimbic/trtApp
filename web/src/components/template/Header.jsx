import classNames from '@/utils/classNames'
import { HEADER_HEIGHT } from '@/constants/theme.constant'
import { useLocation } from 'react-router'
import DashboardFilters from './DashboardFilters'
import PageTabs from './PageTabs'
import { usePageTabsStore } from '@/store/pageTabsStore'
import { PAGE_FILTERS } from '@/store/pageFilterStore'

const Header = (props) => {
    const {
        headerStart,
        headerEnd,
        headerMiddle,
        className,
        container,
        wrapperClass,
    } = props

    // The dashboard puts its date / currency / colour filters in the top bar.
    const { pathname } = useLocation()
    const hasTabs = usePageTabsStore((st) => !!st.tabs)
    const middle = headerMiddle || (hasTabs ? <PageTabs /> : null) || (pathname === '/dashboard' || PAGE_FILTERS[pathname] ? <DashboardFilters /> : null)

    return (
        <header className={classNames('header', className)}>
            <div
                className={classNames(
                    'header-wrapper',
                    container && 'container mx-auto',
                    wrapperClass,
                )}
                style={{ height: HEADER_HEIGHT }}
            >
                <div className="header-action header-action-start">
                    {headerStart}
                </div>
                {middle && (
                    <div className="header-action header-action-middle min-w-0 flex-1 justify-center px-2">
                        {middle}
                    </div>
                )}
                <div className="header-action header-action-end">
                    {headerEnd}
                </div>
            </div>
        </header>
    )
}

export default Header
