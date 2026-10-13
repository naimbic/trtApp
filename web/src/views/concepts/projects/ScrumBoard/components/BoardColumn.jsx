import { Draggable } from '@hello-pangea/dnd'
import BoardTitle from './BoardTitle'
import BoardCardList from './BoardCardList'

const BoardColumn = (props) => {
    const { title, contents, index, isScrollable, isCombineEnabled, useClone } =
        props

    return (
        <Draggable draggableId={title} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    className="board-column flex flex-col mb-3 min-w-[300px] w-[300px] max-w-[300px] p-0rounded-lg dark:bg-gray-900 bg-gray-50 rounded-2xl"
                    {...provided.draggableProps}
                >
                    <BoardTitle
                        title={title}
                        dragHandleProps={provided.dragHandleProps}
                    />
                    <BoardCardList
                        listId={title}
                        listType="CONTENT"
                        className={snapshot.isDragging ? 'is-dragging' : ''}
                        contents={contents}
                        internalScroll={isScrollable}
                        isCombineEnabled={isCombineEnabled}
                        useClone={useClone}
                    />
                </div>
            )}
        </Draggable>
    )
}

export default BoardColumn
