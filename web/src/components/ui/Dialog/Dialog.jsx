import { useEffect, useRef } from 'react'
import Modal from 'react-modal'
import classNames from 'classnames'
import CloseButton from '../CloseButton'
import { motion } from 'framer-motion'
import useWindowSize from '../hooks/useWindowSize'

// a popup opened from another popup (a confirmation over a form) must be on top of it, whatever the order the two were mounted in
// (stays under the floating menus and tooltips, which are at 135 and above)
let openCount = 0

const Dialog = (props) => {
    const currentSize = useWindowSize()
    const stack = useRef({ open: false, z: 130 })

    const {
        bodyOpenClassName,
        children,
        className,
        closable = true,
        closeTimeoutMS = 150,
        contentClassName,
        height,
        isOpen,
        onClose,
        onRequestClose,
        overlayClassName,
        portalClassName,
        style,
        width = 520,
        ...rest
    } = props

    const onCloseClick = (e) => {
        onClose?.(e)
    }

    const renderCloseButton = (
        <CloseButton
            absolute
            className="ltr:right-6 rtl:left-6 top-4.5"
            onClick={onCloseClick}
        />
    )

    if (isOpen && !stack.current.open) stack.current = { open: true, z: Math.min(134, 131 + openCount) }
    else if (!isOpen && stack.current.open) stack.current = { ...stack.current, open: false }
    useEffect(() => {
        if (!isOpen) return undefined
        openCount++
        return () => { openCount = Math.max(0, openCount - 1) }
    }, [isOpen])

    const contentStyle = {
        content: {
            inset: 'unset',
        },
        ...style,
        overlay: { ...(style?.overlay || {}), '--dlg-z': stack.current.z },
    }

    if (width !== undefined) {
        contentStyle.content.width = width

        if (
            typeof currentSize.width !== 'undefined' &&
            currentSize.width <= width
        ) {
            contentStyle.content.width = 'auto'
        }
    }

    if (height !== undefined) {
        contentStyle.content.height = height
    }

    const defaultDialogContentClass = 'dialog-content'

    // never taller than the screen: a long form scrolls inside the popup, its buttons stay reachable
    const dialogClass = classNames(defaultDialogContentClass, 'max-h-[calc(100vh-3rem)] overflow-y-auto', contentClassName)

    return (
        <Modal
            className={{
                base: classNames('dialog', className),
                afterOpen: 'dialog-after-open',
                beforeClose: 'dialog-before-close',
            }}
            overlayClassName={{
                base: classNames('dialog-overlay', overlayClassName),
                afterOpen: 'dialog-overlay-after-open',
                beforeClose: 'dialog-overlay-before-close',
            }}
            portalClassName={classNames('dialog-portal rp-portal', portalClassName)}
            bodyOpenClassName={classNames('dialog-open', bodyOpenClassName)}
            ariaHideApp={false}
            isOpen={isOpen}
            style={{ ...contentStyle }}
            closeTimeoutMS={closeTimeoutMS}
            // Escape and a click outside close it, as the cross does (a dialog that only gave onClose used to ignore both)
            onRequestClose={onRequestClose ?? onClose}
            {...rest}
        >
            <motion.div
                className={dialogClass}
                initial={{ transform: 'scale(0.9)' }}
                animate={{
                    transform: isOpen ? 'scale(1)' : 'scale(0.9)',
                }}
            >
                {closable && renderCloseButton}
                {children}
            </motion.div>
        </Modal>
    )
}

Dialog.displayName = 'Dialog'

export default Dialog
