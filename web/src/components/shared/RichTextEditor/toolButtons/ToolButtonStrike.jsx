import { TbStrikethrough } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonStrike = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Strikethrough")}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
        >
            <TbStrikethrough />
        </ToolButton>
    )
}

export default ToolButtonStrike
