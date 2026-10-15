import { TbList } from 'react-icons/tb'
import ToolButton from './ToolButton'
import { tr } from '@/utils/t'

const ToolButtonBulletList = ({ editor }) => {
    return (
        <ToolButton
            title={tr("Bullet List")}
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
            <TbList />
        </ToolButton>
    )
}

export default ToolButtonBulletList
