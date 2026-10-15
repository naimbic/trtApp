import { TbCodeDots } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonCodeBlock = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Code Block")}
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
            <TbCodeDots />
        </ToolButton>
    )
}

export default ToolButtonCodeBlock
