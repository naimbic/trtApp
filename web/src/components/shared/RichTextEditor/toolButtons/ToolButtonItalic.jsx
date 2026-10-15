import { TbItalic } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonItalic = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Italic")}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
        >
            <TbItalic />
        </ToolButton>
    )
}

export default ToolButtonItalic
