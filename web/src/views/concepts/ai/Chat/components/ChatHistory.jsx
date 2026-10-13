import { Fragment } from 'react'
import ScrollBar from '@/components/ui/ScrollBar'
import ChatHistoryItem from './ChatHistoryItem'
import { usGenerativeChatStore } from '../store/generativeChatStore'

const ChatHistory = ({ queryText = '', onClick }) => {
    const {
        chatHistory,
        setChatHistory,
        setRenameDialog,
        setSelectedConversation,
        selectedConversation,
    } = usGenerativeChatStore()

    const handleDelete = (id) => {
        setChatHistory(chatHistory.filter((item) => item.id !== id))
        setSelectedConversation('')
    }

    const handleArchive = (id) => {
        setChatHistory(chatHistory.filter((item) => item.id !== id))
        setSelectedConversation('')
    }

    const handleRename = (id, title) => {
        setRenameDialog({
            id,
            title,
            open: true,
        })
    }

    const handleClick = (id) => {
        setSelectedConversation(id)
        onClick?.()
    }

    return (
        <ScrollBar className="h-full">
            <div className="flex flex-col gap-2 py-2 px-3">
                {chatHistory
                    .filter((item) =>
                        item.title
                            .toLowerCase()
                            .includes(queryText.toLowerCase()),
                    )
                    .map((item) => {
                        if (!item.enable) {
                            return <Fragment key={item.id} />
                        }
                        return (
                            <ChatHistoryItem
                                key={item.id}
                                data-testid={item.id}
                                title={item.title}
                                conversation={item.lastConversation}
                                active={selectedConversation === item.id}
                                onDelete={() => handleDelete(item.id)}
                                onArchive={() => handleArchive(item.id)}
                                onRename={() =>
                                    handleRename(item.id, item.title)
                                }
                                onClick={() => handleClick(item.id)}
                            />
                        )
                    })}
            </div>
        </ScrollBar>
    )
}

export default ChatHistory
