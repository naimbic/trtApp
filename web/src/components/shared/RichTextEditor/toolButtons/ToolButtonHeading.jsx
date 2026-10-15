import {
    LuHeading,
    LuHeading1,
    LuHeading2,
    LuHeading3,
    LuHeading4,
    LuHeading5,
    LuHeading6,
} from 'react-icons/lu'
import ToolButton from './ToolButton'
import Dropdown from '@/components/ui/Dropdown'
import { tr } from '@/utils/t'

const headingMap = {
    1: { label: tr("Heading 1"), value: 1, icon: <LuHeading1 /> },
    2: { label: tr("Heading 2"), value: 2, icon: <LuHeading2 /> },
    3: { label: tr("Heading 3"), value: 3, icon: <LuHeading3 /> },
    4: { label: tr("Heading 4"), value: 4, icon: <LuHeading4 /> },
    5: { label: tr("Heading 5"), value: 5, icon: <LuHeading5 /> },
    6: { label: tr("Heading 6"), value: 6, icon: <LuHeading6 /> },
}

const ToolButtonCodeBlock = ({ editor, headingLevel = [1, 2, 3, 4, 5, 6] }) => {
    return (
        <>
            <Dropdown
                renderTitle={
                    <ToolButton title={tr("Heading")}>
                        <LuHeading />
                    </ToolButton>
                }
            >
                {headingLevel.map((level) => (
                    <Dropdown.Item
                        key={`heading-${level}`}
                        eventKey={`heading-${level}`}
                        active={editor.isActive('heading', {
                            level: headingMap[level].value,
                        })}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({
                                    level: headingMap[level].value,
                                })
                                .run()
                        }
                    >
                        <span className="text-lg">
                            {headingMap[level].icon}
                        </span>
                        {headingMap[level].label}
                    </Dropdown.Item>
                ))}
            </Dropdown>
        </>
    )
}

export default ToolButtonCodeBlock
