import { useRef, useEffect, useMemo } from 'react'
import Card from '@/components/ui/Card'
import ChatBox from '@/components/view/ChatBox'
import ChatLandingView from './ChatLandingView'
import ChatMobileNav from './ChatMobileNav'
import ChatCustomContent from './ChatCustomContent'
import ChatCustomAction from './ChatCustomAction'
import { usGenerativeChatStore } from '../store/generativeChatStore'
import useChatSend from '../hooks/useChatSend'

const ChatView = () => {
    const scrollRef = useRef(null)
    const { selectedConversation, chatHistory, isTyping, disabledChatFresh } =
        usGenerativeChatStore()
    const { handleSend } = useChatSend()

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [selectedConversation, chatHistory])

    const messageList = useMemo(() => {
        const chat = chatHistory.find(
            (chat) => chat.id === selectedConversation,
        )
        return chat?.conversation || []
    }, [selectedConversation, chatHistory])

    const handleInputChange = async ({ value }) => {
        await handleSend(value)
    }

    const handleFinish = (id) => {
        disabledChatFresh(id)
        scrollToBottom()
    }

    return (
        <Card className="flex-1 h-full" bodyClass="h-full">
            <ChatMobileNav />
            <ChatBox
                ref={scrollRef}
                messageList={messageList}
                placeholder="Enter a prompt here"
                showMessageList={Boolean(selectedConversation)}
                showAvatar={true}
                avatarGap={true}
                containerClass="h-[calc(100%-30px)] xl:h-full"
                messageListClass="h-[calc(100%-100px)] xl:h-[calc(100%-70px)]"
                typing={
                    isTyping
                        ? {
                              id: 'ai',
                              name: 'Chat AI',
                              avatarImageUrl: '/img/thumbs/ai.jpg',
                          }
                        : false
                }
                customRenderer={(message) => {
                    if (message.sender.id === 'ai') {
                        return (
                            <ChatCustomContent
                                content={message.content}
                                triggerTyping={
                                    message.fresh ? message.fresh : false
                                }
                                onFinish={() => handleFinish(message.id)}
                            />
                        )
                    }

                    return message.content
                }}
                customAction={(message) => {
                    if (message.sender.id === 'ai') {
                        return <ChatCustomAction content={message.content} />
                    }

                    return null
                }}
                onInputChange={handleInputChange}
            >
                {!selectedConversation && <ChatLandingView />}
            </ChatBox>
        </Card>
    )
}

export default ChatView
