import { BiParagraph } from 'react-icons/bi'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonParagraph = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Paragraph")}
            active={editor.isActive('paragraph')}
            onClick={() => editor.chain().focus().setParagraph().run()}
        >
            <BiParagraph />
        </ToolButton>
    )
}

export default ToolButtonParagraph
