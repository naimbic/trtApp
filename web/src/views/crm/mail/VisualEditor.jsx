import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { TbBold, TbItalic, TbUnderline, TbList, TbListNumbers, TbLink, TbClearFormatting, TbAlignLeft, TbAlignCenter, TbH2 } from 'react-icons/tb'
import Tooltip from '@/components/ui/Tooltip'
import { tr } from '@/utils/t'

const Btn = ({ title, onClick, children }) => (
    <Tooltip title={title}>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">{children}</button>
    </Tooltip>
)

/**
 * Visual (WYSIWYG) editor for email HTML. The message lives in a sandboxed iframe switched to design mode,
 * so layouts built with tables and inline styles are kept exactly as designed.
 * `docKey` changes when another template is opened; `value` is only read at that moment.
 */
const VisualEditor = ({ docKey, value, onChange, disabled, ref }) => {
    const frame = useRef(null)
    const latest = useRef(onChange)
    latest.current = onChange
    const [initial, setInitial] = useState('')
    useEffect(() => { setInitial(value) }, [docKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const doc = () => frame.current?.contentDocument
    const run = (cmd, arg) => { doc()?.execCommand(cmd, false, arg); sync() }
    const sync = () => { const d = doc(); if (d?.body) latest.current(d.body.innerHTML) }

    useImperativeHandle(ref, () => ({
        insert: (text) => { const d = doc(); if (!d) return; d.body.focus(); d.execCommand('insertText', false, text); sync() },
    }))

    const onLoad = () => {
        const d = doc()
        if (!d) return
        d.designMode = disabled ? 'off' : 'on'
        d.body.addEventListener('input', sync)
        d.addEventListener('click', (e) => { if (e.target.closest?.('a')) e.preventDefault() })
    }
    const link = () => {
        const url = window.prompt(tr("Link address (https://…)"))
        if (url) run('createLink', url)
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700/40">
                <Btn title={tr("Bold")} onClick={() => run('bold')}><TbBold /></Btn>
                <Btn title={tr("Italic")} onClick={() => run('italic')}><TbItalic /></Btn>
                <Btn title={tr("Underline")} onClick={() => run('underline')}><TbUnderline /></Btn>
                <Btn title={tr("Heading")} onClick={() => run('formatBlock', 'h2')}><TbH2 /></Btn>
                <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600" />
                <Btn title={tr("Align left")} onClick={() => run('justifyLeft')}><TbAlignLeft /></Btn>
                <Btn title={tr("Center")} onClick={() => run('justifyCenter')}><TbAlignCenter /></Btn>
                <Btn title={tr("Bulleted list")} onClick={() => run('insertUnorderedList')}><TbList /></Btn>
                <Btn title={tr("Numbered list")} onClick={() => run('insertOrderedList')}><TbListNumbers /></Btn>
                <Btn title={tr("Link")} onClick={link}><TbLink /></Btn>
                <Btn title={tr("Clear formatting")} onClick={() => run('removeFormat')}><TbClearFormatting /></Btn>
            </div>
            <iframe
                key={docKey}
                ref={frame}
                title={tr("Visual editor")}
                sandbox="allow-same-origin"
                onLoad={onLoad}
                srcDoc={`<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:sans-serif">${initial}</body></html>`}
                className="h-[540px] w-full bg-white"
            />
        </div>
    )
}

export default VisualEditor
