import ChatContainer from './components/ChatContainer'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'

const ChatBox = (props) => {
    const {
        messageList,
        showMessageList = true,
        children,
        header,
        placeholder,
        onInputChange,
        showAvatar,
        avatarGap,
        customRenderer,
        customAction,
        bubbleClass,
        typing,
        messageListClass,
        containerClass,
        ref,
    } = props

    return (
        <ChatContainer
            className={containerClass}
            header={header}
            input={
                <ChatInput
                    placeholder={placeholder}
                    onInputChange={onInputChange}
                />
            }
        >
            {showMessageList && (
                <MessageList
                    ref={ref}
                    list={messageList}
                    showAvatar={showAvatar}
                    avatarGap={avatarGap}
                    customRenderer={customRenderer}
                    customAction={customAction}
                    typing={typing}
                    messageListClass={messageListClass}
                    bubbleClass={bubbleClass}
                />
            )}
            {children}
        </ChatContainer>
    )
}

export default ChatBox
