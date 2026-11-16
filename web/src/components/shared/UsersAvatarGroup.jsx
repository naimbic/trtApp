import { useMemo } from 'react'
import { StaffTip } from '@/components/crm/StaffRing'
import Tooltip from '@/components/ui/Tooltip'
import Avatar from '@/components/ui/Avatar'
import acronym from '@/utils/acronym'
import useRandomBgColor from '@/utils/hooks/useRandomBgColor'

/** A team member (has an id) gets the profile card; anyone else the plain name. */
const Wrap = ({ elm, name, children }) => (elm.id ? <StaffTip id={elm.id} name={name}>{children}</StaffTip> : <Tooltip wrapperClass="flex" title={name}>{children}</Tooltip>)

const UsersAvatarGroup = (props) => {
    const {
        avatarGroupProps = {},
        avatarProps = {},
        imgKey = 'img',
        nameKey = 'name',
        onAvatarClick,
        users = [],
        ...rest
    } = props

    const bgColor = useRandomBgColor()

    const defaultAvatarProps = useMemo(() => {
        return {
            shape: 'circle',
            size: 30,
            className: 'cursor-pointer',
            ...avatarProps,
        }
    }, [avatarProps])

    const handleAvatarClick = (avatar) => {
        onAvatarClick?.(avatar)
    }

    return (
        <Avatar.Group
            omittedAvatarTooltip
            chained
            omittedAvatarProps={defaultAvatarProps}
            omittedAvatarTooltipProps={{
                wrapperClass: 'flex',
            }}
            {...avatarGroupProps}
            {...rest}
        >
            {users.map((elm, index) => (
                <Wrap
                    key={elm[nameKey] + index}
                    elm={elm}
                    name={elm[nameKey]}
                >
                    <Avatar
                        {...defaultAvatarProps}
                        className={`${
                            elm[imgKey] ? '' : bgColor(elm[nameKey])
                        } ${defaultAvatarProps.className}`}
                        src={elm[imgKey]}
                        onClick={() => handleAvatarClick(elm)}
                    >
                        {acronym(elm.name)}
                    </Avatar>
                </Wrap>
            ))}
        </Avatar.Group>
    )
}

export default UsersAvatarGroup
