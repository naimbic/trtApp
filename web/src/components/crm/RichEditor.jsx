/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TbBold, TbItalic, TbUnderline, TbStrikethrough, TbH2, TbList, TbListNumbers, TbQuote, TbCode, TbLink, TbPhoto, TbArrowBackUp, TbArrowForwardUp } from 'react-icons/tb'
import { cleanHtml } from '@/lib/crm/richText'
import { STYLE } from '@/views/crm/kit/RichText'
import { notify } from '@/views/crm/kit/api'
import { MentionBox, mentionItems, MENTION_TRIGGER } from './MentionLayer'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

const uploadImage = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch('/api/crm/media/inline', { method: 'POST', body: fd, credentials: 'include' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || tr('Upload failed, try again'))
    return j.url
}

const Btn = ({ on, active, title, children, disabled }) => (
    <button type="button" title={title} aria-label={title} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={on}
        className={classNames('grid size-7 place-items-center rounded-md text-[17px] transition', active ? 'bg-primary/15 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700', disabled && 'opacity-40')}>{children}</button>
)

/**
 * A rich text box (bold, italic, underline, lists, quote, code, links and pictures) that stores HTML. value / onChange are HTML strings;
 * an empty box gives ''. Old plain text is shown as paragraphs. Pictures are pasted, dropped or chosen and kept in the Space.
 * "@" suggests colleagues and "#" tags, like in every other text box.
 */
const RichEditor = ({ value, onChange, placeholder, minHeight = 110, disabled = false, autoFocus = false, className }) => {
    const last = useRef(null)
    const fileRef = useRef(null)
    const [busy, setBusy] = useState(false)
    const [mention, setMention] = useState(null) // { kind, from, to, items, rect }
    const [active, setActive] = useState(0)
    const mref = useRef(null)
    mref.current = { mention, active }

    const insertImages = useCallback(async (files, editor) => {
        const list = [...files].filter((f) => f.type.startsWith('image/'))
        if (!list.length) return false
        setBusy(true)
        try { for (const f of list) { const url = await uploadImage(f); editor.chain().focus().setImage({ src: url, alt: f.name.replace(/\.[^.]+$/, '') }).run() } } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
        return true
    }, [])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] } }),
            Underline,
            Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
            Image.configure({ inline: false }),
            Placeholder.configure({ placeholder: placeholder || '' }),
        ],
        content: cleanHtml(value),
        editable: !disabled,
        autofocus: autoFocus ? 'end' : false,
        editorProps: {
            handlePaste: (view, e) => { const f = e.clipboardData?.files; if (f?.length && [...f].some((x) => x.type.startsWith('image/'))) { insertImages(f, editorRef.current); return true } return false },
            handleDrop: (view, e) => { const f = e.dataTransfer?.files; if (f?.length && [...f].some((x) => x.type.startsWith('image/'))) { e.preventDefault(); insertImages(f, editorRef.current); return true } return false },
            handleKeyDown: (view, e) => {
                const { mention: m, active: a } = mref.current
                if (!m) return false
                if (e.key === 'ArrowDown') { setActive((a + 1) % m.items.length); return true }
                if (e.key === 'ArrowUp') { setActive((a - 1 + m.items.length) % m.items.length); return true }
                if (e.key === 'Enter' || e.key === 'Tab') { pick(m, m.items[a]); return true }
                if (e.key === 'Escape') { setMention(null); return true }
                return false
            },
        },
        onUpdate: ({ editor: ed }) => {
            const html = ed.isEmpty ? '' : ed.getHTML()
            last.current = html
            onChange?.(html)
            // "@" or "#" right before the caret
            const { $from } = ed.state.selection
            const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
            const m = MENTION_TRIGGER.exec(before)
            if (!m) return setMention(null)
            const kind = m[2], q = m[3]
            const to = $from.pos, from = to - (kind.length + q.length)
            mentionItems(kind, q).then((items) => {
                if (!items.length) return setMention(null)
                const c = ed.view.coordsAtPos(to)
                setActive(0)
                setMention({ kind, from, to, items, rect: { left: c.left, bottom: c.bottom, top: c.top } })
            })
        },
        onBlur: () => setTimeout(() => setMention(null), 150),
    })
    const editorRef = useRef(null)
    editorRef.current = editor

    const pick = (m, item) => { editor.chain().focus().deleteRange({ from: m.from, to: m.to }).insertContent(item.insert).run(); setMention(null) }

    // the parent changed the value (cleared after sending, or another record opened)
    useEffect(() => {
        if (!editor) return
        if ((value ?? '') !== (last.current ?? '')) { editor.commands.setContent(cleanHtml(value), false); last.current = value ?? '' }
    }, [value, editor])
    useEffect(() => { editor?.setEditable(!disabled) }, [disabled, editor])

    if (!editor) return null
    const link = () => {
        const prev = editor.getAttributes('link').href || ''
        const url = window.prompt(tr('Link address'), prev || 'https://')
        if (url === null) return
        if (!url.trim()) return editor.chain().focus().unsetLink().run()
        editor.chain().focus().extendMarkRange('link').setLink({ href: /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}` }).run()
    }
    return (
        <div className={classNames('overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-primary dark:border-gray-600 dark:bg-gray-800', disabled && 'opacity-70', className)}>
            {!disabled && (
                <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-1.5 py-1 dark:border-gray-700 dark:bg-gray-700/40">
                    <Btn title={tr('Bold')} active={editor.isActive('bold')} on={() => editor.chain().focus().toggleBold().run()}><TbBold /></Btn>
                    <Btn title={tr('Italic')} active={editor.isActive('italic')} on={() => editor.chain().focus().toggleItalic().run()}><TbItalic /></Btn>
                    <Btn title={tr('Underline')} active={editor.isActive('underline')} on={() => editor.chain().focus().toggleUnderline().run()}><TbUnderline /></Btn>
                    <Btn title={tr('Strikethrough')} active={editor.isActive('strike')} on={() => editor.chain().focus().toggleStrike().run()}><TbStrikethrough /></Btn>
                    <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <Btn title={tr('Heading')} active={editor.isActive('heading', { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><TbH2 /></Btn>
                    <Btn title={tr('Bulleted list')} active={editor.isActive('bulletList')} on={() => editor.chain().focus().toggleBulletList().run()}><TbList /></Btn>
                    <Btn title={tr('Numbered list')} active={editor.isActive('orderedList')} on={() => editor.chain().focus().toggleOrderedList().run()}><TbListNumbers /></Btn>
                    <Btn title={tr('Quote')} active={editor.isActive('blockquote')} on={() => editor.chain().focus().toggleBlockquote().run()}><TbQuote /></Btn>
                    <Btn title={tr('Code')} active={editor.isActive('code')} on={() => editor.chain().focus().toggleCode().run()}><TbCode /></Btn>
                    <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <Btn title={tr('Link')} active={editor.isActive('link')} on={link}><TbLink /></Btn>
                    <Btn title={tr('Picture')} disabled={busy} on={() => fileRef.current?.click()}><TbPhoto /></Btn>
                    <span className="ml-auto flex gap-0.5">
                        <Btn title={tr('Undo')} disabled={!editor.can().undo()} on={() => editor.chain().focus().undo().run()}><TbArrowBackUp /></Btn>
                        <Btn title={tr('Redo')} disabled={!editor.can().redo()} on={() => editor.chain().focus().redo().run()}><TbArrowForwardUp /></Btn>
                    </span>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { insertImages(e.target.files, editor); e.target.value = '' }} />
                </div>
            )}
            <EditorContent editor={editor} className={classNames('rich-editor px-3 py-2 text-sm', STYLE)} style={{ minHeight }} />
            {busy && <div className="border-t border-gray-100 px-3 py-1 text-xs text-gray-400 dark:border-gray-700">{tr('Uploading the picture…')}</div>}
            {mention && <MentionBox kind={mention.kind} items={mention.items} active={active} setActive={setActive} rect={mention.rect} onPick={(it) => pick(mention, it)} />}
        </div>
    )
}

export default RichEditor
