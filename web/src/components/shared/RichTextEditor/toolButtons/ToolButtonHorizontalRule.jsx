import { TbMinus } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonHorizontalRule = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Horizontal Rule")}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
            <TbMinus />
        </ToolButton>
    )
}

export default ToolButtonHorizontalRule
