import Markdown from 'react-markdown'
import classNames from '@/utils/classNames'
import SyntaxHighlighter from '@/components/shared/SyntaxHighlighter'

const CodeBox = (props) => {
    const { markdown, className, language = 'tsx' } = props

    return (
        <Markdown
            components={{
                code: (props) => (
                    <SyntaxHighlighter
                        className={classNames('not-prose text-sm', className)}
                        language={language}
                    >
                        {props.children}
                    </SyntaxHighlighter>
                ),
            }}
        >
            {markdown}
        </Markdown>
    )
}

export default CodeBox
