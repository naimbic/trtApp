import {
    useState,
    useImperativeHandle,
    useRef,
    useCallback,
    cloneElement,
    createRef,
} from 'react'
import classNames from 'classnames'
import chainedFunction from '../utils/chainedFunction'
import { motion } from 'framer-motion'
import { getPlacementTransition } from './transition'
import { PLACEMENT } from '../utils/constants'
import { createRoot } from 'react-dom/client'

const useMessages = (msgKey) => {
    const [messages, setMessages] = useState([])

    // functional updates everywhere: several toasts fired in the same tick must all be kept (a stale
    // copy of the list used to make the last one overwrite the others)
    const push = useCallback(
        (message) => {
            const key = msgKey || '_' + Math.random().toString(36).substr(2, 12)
            setMessages((list) => [...list, { key, visible: true, node: message }])
            return key
        },
        [msgKey],
    )

    const removeAll = useCallback(() => {
        setMessages((list) => list.map((msg) => ({ ...msg, visible: false })))
        setTimeout(() => {
            setMessages([])
        }, 200)
    }, [])

    const remove = useCallback((key) => {
        setMessages((list) => {
            const k = typeof key === 'undefined' && list.length ? list[list.length - 1].key : key
            return list.map((elm) => (elm.key === k ? { ...elm, visible: false } : elm))
        })
        // let the exit animation (0.15s) finish before the toast is dropped
        setTimeout(() => {
            setMessages((list) => list.filter((msg) => msg.visible))
        }, 200)
    }, [])

    return { messages, push, removeAll, remove }
}

const ToastWrapper = (props) => {
    const rootRef = useRef(null)

    const {
        transitionType = 'scale',
        placement = PLACEMENT.TOP_END,
        offsetX = 30,
        offsetY = 30,
        messageKey,
        block = false,
        ref,
        callback,
        ...rest
    } = props

    const { push, removeAll, remove, messages } = useMessages(messageKey)

    useImperativeHandle(ref, () => {
        return { root: rootRef.current, push, removeAll, remove }
    })

    const placementTransition = getPlacementTransition({
        offsetX,
        offsetY,
        placement: placement,
        transitionType,
    })

    const toastProps = {
        triggerByToast: true,
        ...rest,
    }

    const messageElements = messages.map((item) => {
        return (
            <motion.div
                key={item.key}
                layout
                className={'toast-wrapper'}
                initial={placementTransition.variants.initial}
                variants={placementTransition.variants}
                animate={item.visible ? 'animate' : 'exit'}
                transition={{ duration: 0.15, type: 'tween' }}
            >
                {cloneElement(item.node, {
                    ...toastProps,
                    ref,
                    onClose: chainedFunction(item.node?.props?.onClose, () =>
                        remove(item.key),
                    ),
                    className: classNames(item.node?.props?.className),
                })}
            </motion.div>
        )
    })

    return (
        <div
            style={placementTransition.default}
            {...rest}
            ref={(thisRef) => {
                rootRef.current = thisRef
                callback?.(thisRef)
            }}
            className={classNames('toast', block && 'w-full')}
        >
            {messageElements}
        </div>
    )
}

ToastWrapper.getInstance = (props) => {
    const { wrapper, ...rest } = props

    const wrapperRef = createRef()

    const wrapperElement =
        (typeof wrapper === 'function' ? wrapper() : wrapper) || document.body

    return new Promise((resolve) => {
        const renderCallback = () => {
            resolve([wrapperRef, unmount])
        }

        function renderElement(element) {
            const mountElement = document.createElement('div')

            wrapperElement.appendChild(mountElement)

            const root = createRoot(mountElement)

            root.render(element)

            return root
        }

        const { unmount } = renderElement(
            <ToastWrapper
                {...rest}
                ref={wrapperRef}
                callback={renderCallback}
            />,
        )
    })
}

export default ToastWrapper
