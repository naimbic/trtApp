import { TbQuote } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonBlockquote = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Blockquote")}
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
            <TbQuote />
        </ToolButton>
    )
}

export default ToolButtonBlockquote
