import classNames from '@/utils/classNames'

const ChatContainer = (props) => {
    const { header, children, className, input } = props

    return (
        <div
            className={classNames(
                'h-full flex flex-col justify-between',
                className,
            )}
        >
            {header}
            {children}
            {input}
        </div>
    )
}

export default ChatContainer
