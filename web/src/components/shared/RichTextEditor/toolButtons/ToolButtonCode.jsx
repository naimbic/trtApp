import { TbCode } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonCode = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Code")}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
        >
            <TbCode />
        </ToolButton>
    )
}

export default ToolButtonCode
