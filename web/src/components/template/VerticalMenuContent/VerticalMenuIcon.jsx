import navigationIcon from '@/configs/navigation-icon.config'

export const Icon = ({ component, ...props }) => {
    const Component = component
    return <Component {...props} />
}

// size: 'lg' (default) | 'sm'; color: any CSS colour (default: inherit)
const VerticalMenuIcon = ({ icon, size = 'lg', color }) => {
    if (typeof icon !== 'string' && !icon) {
        return <></>
    }

    return (
        <>
            {navigationIcon[icon] && (
                <span
                    className={size === 'sm' ? 'text-xl text-gray-400 dark:text-gray-500' : 'text-2xl'}
                    style={color ? { color } : undefined}
                >
                    {navigationIcon[icon]}
                </span>
            )}
        </>
    )
}

export default VerticalMenuIcon
