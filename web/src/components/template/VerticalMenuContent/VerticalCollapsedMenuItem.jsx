import Menu from '@/components/ui/Menu'
import Dropdown from '@/components/ui/Dropdown'
import VerticalMenuIcon from './VerticalMenuIcon'
import AuthorityCheck from '@/components/shared/AuthorityCheck'

const { MenuItem, MenuCollapse } = Menu

const GROUP_COLORS = {
    'crm.group.customers': '#0ea5e9',
    'crm.group.leads': '#f59e0b',
    'crm.group.projects': '#8b5cf6',
    'crm.group.tasks': '#10b981',
    'crm.group.sales': '#3b82f6',
    'crm.group.support': '#f43f5e',
    'crm.group.knowledge-base': '#14b8a6',
    'crm.group.administration': '#6366f1',
    'crm.group.setup': '#f97316',
    'crm.group.utilities': '#ec4899',
}

const DefaultItem = ({
    nav,
    indent,
    dotIndent,
    children,
    userAuthority,
    t,
    open,
    onToggle,
}) => {
    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            <MenuCollapse
                open={open}
                onToggle={onToggle}
                key={nav.key}
                label={
                    <span className={`flex items-center gap-2 ${dotIndent ? 'ps-3' : ''}`}>
                        <VerticalMenuIcon icon={nav.icon} size={dotIndent ? 'sm' : 'lg'} color={dotIndent ? undefined : GROUP_COLORS[nav.key]} />
                        <span>{t(nav.translateKey, nav.title)}</span>
                    </span>
                }
                eventKey={nav.key}
                expanded={false}
                dotIndent={false}
                indent={indent}
            >
                {children}
            </MenuCollapse>
        </AuthorityCheck>
    )
}

const CollapsedItem = ({
    nav,
    direction,
    children,
    t,
    renderAsIcon,
    userAuthority,
    parentKeys,
}) => {
    const menuItem = (
        <MenuItem
            key={nav.key}
            isActive={parentKeys?.includes(nav.key)}
            eventKey={nav.key}
            className="mb-2"
        >
            <VerticalMenuIcon icon={nav.icon} />
        </MenuItem>
    )

    const dropdownItem = (
        <div key={nav.key}>{t(nav.translateKey, nav.title)}</div>
    )

    return (
        <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
            <Dropdown
                trigger="hover"
                renderTitle={renderAsIcon ? menuItem : dropdownItem}
                placement={direction === 'rtl' ? 'left-start' : 'right-start'}
            >
                {children}
            </Dropdown>
        </AuthorityCheck>
    )
}

const VerticalCollapsedMenuItem = ({ sideCollapsed, ...rest }) => {
    return sideCollapsed ? (
        <CollapsedItem {...rest} />
    ) : (
        <DefaultItem {...rest} />
    )
}

export default VerticalCollapsedMenuItem
