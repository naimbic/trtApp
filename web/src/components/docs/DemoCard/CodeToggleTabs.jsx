import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import CodeBox from './CodeBox'
import { BiLogoTypescript, BiLogoJavascript } from 'react-icons/bi'

const { TabNav, TabList, TabContent } = Tabs

const CodeToggleTabs = ({
    controlledValue,
    tsMarkdown,
    jsMarkdown,
    onChange,
    codeBoxClassName,
    languages = ['tsx', 'jsx'],
    tsCallback,
    jsCallback,
}) => {
    const [mdType, setMdType] = useState('js')

    const handleChange = (value) => {
        setMdType(value)
        onChange?.(value)
    }

    return (
        <Tabs value={controlledValue || mdType} onChange={handleChange}>
            <TabList>
                <TabNav value="ts">
                    <div className="flex items-center gap-1">
                        <BiLogoTypescript className="text-2xl" />
                        <span>Typescript</span>
                    </div>
                </TabNav>
                <TabNav value="js">
                    <div className="flex items-center gap-1">
                        <BiLogoJavascript className="text-2xl" />
                        <span>Javascript</span>
                    </div>
                </TabNav>
            </TabList>
            <div className="py-0">
                <TabContent value="ts">
                    {tsCallback ? (
                        tsCallback()
                    ) : (
                        <CodeBox
                            markdown={tsMarkdown}
                            className={codeBoxClassName}
                            language={languages[0]}
                        />
                    )}
                </TabContent>
                <TabContent value="js">
                    {jsCallback ? (
                        jsCallback()
                    ) : (
                        <CodeBox
                            markdown={jsMarkdown || tsMarkdown}
                            className={codeBoxClassName}
                            language={languages[1]}
                        />
                    )}
                </TabContent>
            </div>
        </Tabs>
    )
}

export default CodeToggleTabs
