import { CgUndo } from 'react-icons/cg'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonUndo = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Code")}
            disabled={!editor.can().chain().focus().undo().run()}
            onClick={() => editor.chain().focus().undo().run()}
        >
            <CgUndo />
        </ToolButton>
    )
}

export default ToolButtonUndo
