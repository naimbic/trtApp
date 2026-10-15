import { TbSpacingVertical } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonHardBreak = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Horizontal Rule")}
            onClick={() => editor.chain().focus().setHardBreak().run()}
        >
            <TbSpacingVertical />
        </ToolButton>
    )
}

export default ToolButtonHardBreak
