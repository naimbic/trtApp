import { useRef } from 'react'
import ToggleDrawer from '@/components/shared/ToggleDrawer'
import ChatSideNav from './ChatSideNav'
import useResponsive from '@/utils/hooks/useResponsive'

const ChatMobileNav = () => {
    const drawerRef = useRef(null)

    const { smaller } = useResponsive()

    return (
        <>
            {smaller.xl && (
                <ToggleDrawer ref={drawerRef} bodyClass="p-0" closable={false}>
                    <ChatSideNav
                        className="border-0"
                        bodyClass="p-0"
                        onClick={() => drawerRef.current?.handleCloseDrawer()}
                    />
                </ToggleDrawer>
            )}
        </>
    )
}

export default ChatMobileNav
