'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactHtmlParser from 'html-react-parser'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import IconText from '@/components/shared/IconText'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import FileIcon from '@/components/view/FileIcon'
import classNames from '@/utils/classNames'
import { HiOutlineClock } from 'react-icons/hi'
import { TbArrowLeft, TbSend, TbAlertTriangle } from 'react-icons/tb'

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '')

const Attachments = ({ items }) =>
    items.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-4">
            {items.map((a) => (
                <div
                    key={a.id}
                    className="min-w-full md:min-w-[280px] rounded-2xl border border-gray-200 dark:border-gray-700 py-4 px-3.5 flex items-center gap-3"
                >
                    <FileIcon type={a.fileType?.split('/').pop() || 'file'} />
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{a.fileName}</div>
                        {a.missing && (
                            <span className="text-xs text-red-500 flex items-center gap-1">
                                <TbAlertTriangle /> File missing from backup
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )

const TicketThread = ({ ticket }) => {
    const router = useRouter()
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    const submit = async () => {
        if (!message.trim()) return
        setSending(true)
        try {
            const res = await fetch('/api/crm/ticket-replies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId: ticket.id,
                    message: message.trim(),
                    admin: ticket.viewerId,
                }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setMessage('')
            toast.push(<Notification type="success">Reply sent</Notification>, { placement: 'top-center' })
            router.refresh()
        } catch (e) {
            toast.push(<Notification type="danger">Could not send reply</Notification>, { placement: 'top-center' })
        } finally {
            setSending(false)
        }
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => router.push('/crm/tickets')} />
                        <h4>
                            {ticket.number ? `#${ticket.number} ` : ''}
                            {ticket.subject}
                        </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {ticket.status && (
                            <Tag
                                className="text-white"
                                style={{ backgroundColor: ticket.status.color || undefined, borderColor: ticket.status.color || undefined }}
                            >
                                {ticket.status.name}
                            </Tag>
                        )}
                        {ticket.priority && <Tag>{ticket.priority.name}</Tag>}
                        {ticket.service && <Tag>{ticket.service}</Tag>}
                        {ticket.client && <span>Client: <b>{ticket.client.name}</b></span>}
                        {ticket.contact && <span>Contact: <b>{ticket.contact.name}</b></span>}
                        {ticket.assignee && <span>Assigned to: <b>{ticket.assignee.name}</b></span>}
                    </div>
                </div>

                <div className="mt-6">
                    {ticket.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={classNames(
                                'py-6 px-4 rounded-xl my-3',
                                msg.admin
                                    ? 'bg-primary/5 dark:bg-primary/10 ltr:ml-8 rtl:mr-8'
                                    : 'bg-gray-50 dark:bg-gray-800 ltr:mr-8 rtl:ml-8',
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Avatar shape="circle">{(msg.name || '?').charAt(0).toUpperCase()}</Avatar>
                                    <div>
                                        <div className="font-bold truncate heading-text">
                                            {msg.name}{' '}
                                            <Tag className="ml-1">{msg.admin ? 'Staff' : 'Customer'}</Tag>
                                        </div>
                                        {msg.email && <div className="text-xs text-gray-500">{msg.email}</div>}
                                    </div>
                                </div>
                                <IconText icon={<HiOutlineClock className="text-lg" />}>
                                    <span className="font-semibold">{formatDate(msg.date)}</span>
                                </IconText>
                            </div>
                            <div className="mt-6 prose dark:prose-invert max-w-none">{ReactHtmlParser(msg.message)}</div>
                            <Attachments items={msg.attachments} />
                        </div>
                    ))}
                </div>

                <div className="mt-6">
                    <h5 className="mb-2">Reply</h5>
                    <Input
                        textArea
                        rows={6}
                        value={message}
                        placeholder="Write your reply..."
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <div className="mt-3 flex justify-end">
                        <Button variant="solid" icon={<TbSend />} loading={sending} disabled={!message.trim()} onClick={submit}>
                            Send reply
                        </Button>
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default TicketThread
