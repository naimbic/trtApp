import { TbListNumbers } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonOrderedList = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Ordered List")}
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
            <TbListNumbers />
        </ToolButton>
    )
}

export default ToolButtonOrderedList
