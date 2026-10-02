'use client'
import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Link from 'next/link'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import IconText from '@/components/shared/IconText'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import reorderDragable from '@/utils/reorderDragable'
import { TbMessageCircle, TbListCheck, TbCalendar } from 'react-icons/tb'

const PRIORITY = {
    1: { label: 'Low', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100' },
    2: { label: 'Medium', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100' },
    3: { label: 'High', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100' },
    4: { label: 'Urgent', cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-100' },
}

const TaskCard = ({ task, innerRef, ...rest }) => (
    <Card
        ref={innerRef}
        clickable
        className="hover:shadow-lg rounded-lg mb-4 border-0"
        bodyClass="p-4"
        {...rest}
    >
        <Link
            href={`/crm/tasks/${task.id}`}
            className="mb-2 block font-bold heading-text text-base"
            onClick={(e) => e.stopPropagation()}
        >
            {task.name}
        </Link>
        <div className="mb-2">
            <Tag className={`mr-2 rtl:ml-2 ${PRIORITY[task.priority]?.cls || ''}`}>
                {PRIORITY[task.priority]?.label || 'Medium'}
            </Tag>
            {task.relType && <Tag className="mr-2 rtl:ml-2">{task.relType}</Tag>}
        </div>
        <div className="flex items-center justify-between mt-3">
            <UsersAvatarGroup avatarProps={{ size: 25 }} users={task.members} />
            <div className="flex items-center gap-2">
                {task.dueDate && (
                    <IconText className="gap-1" icon={<TbCalendar className="text-base" />}>
                        {task.dueDate.slice(0, 10)}
                    </IconText>
                )}
                {task.checklist > 0 && (
                    <IconText className="gap-1" icon={<TbListCheck className="text-base" />}>
                        {task.checklist}
                    </IconText>
                )}
                {task.comments > 0 && (
                    <IconText className="font-semibold gap-1" icon={<TbMessageCircle className="text-base" />}>
                        {task.comments}
                    </IconText>
                )}
            </div>
        </div>
    </Card>
)

const TasksBoard = ({ initialColumns }) => {
    // quote map: droppableId (status code as string) -> tasks
    const [columns, setColumns] = useState(() =>
        Object.fromEntries(initialColumns.map((c) => [String(c.status), c.tasks])),
    )

    const patchStatus = async (taskId, status) => {
        const res = await fetch(`/api/crm/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result
        if (!destination) return
        if (source.droppableId === destination.droppableId && source.index === destination.index) return

        const previous = columns
        const { quoteMap } = reorderDragable({ quoteMap: columns, source, destination })
        setColumns(quoteMap)

        if (source.droppableId !== destination.droppableId) {
            const status = Number(destination.droppableId)
            try {
                await patchStatus(draggableId, status)
            } catch (e) {
                setColumns(previous)
                toast.push(
                    <Notification type="danger" title="Could not update task status" />,
                    { placement: 'top-center' },
                )
            }
        }
    }

    return (
        <AdaptiveCard className="h-full" bodyClass="h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
                <h3>Tasks board</h3>
                <Link href="/crm/tasks" className="text-primary">List view</Link>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="board-container flex flex-auto gap-4 overflow-x-auto pb-2">
                    {initialColumns.map((col) => {
                        const id = String(col.status)
                        return (
                            <div
                                key={id}
                                className="flex flex-col min-w-[300px] w-[300px] max-w-[300px] mb-3 dark:bg-gray-900 bg-gray-50 rounded-2xl"
                            >
                                <div className="px-5 py-4 flex items-center justify-between">
                                    <h6>{col.label}</h6>
                                    <span className="text-sm text-gray-500">{columns[id]?.length || 0}</span>
                                </div>
                                <Droppable droppableId={id} type="TASK">
                                    {(dropProvided) => (
                                        <div
                                            ref={dropProvided.innerRef}
                                            {...dropProvided.droppableProps}
                                            className="board-dropzone px-5 flex-auto min-h-[80px]"
                                        >
                                            {(columns[id] || []).map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(dragProvided) => (
                                                        <TaskCard
                                                            task={task}
                                                            innerRef={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            {...dragProvided.dragHandleProps}
                                                        />
                                                    )}
                                                </Draggable>
                                            ))}
                                            {dropProvided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )
                    })}
                </div>
            </DragDropContext>
        </AdaptiveCard>
    )
}

export default TasksBoard
