/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { createPortal } from 'react-dom'
import { TbBold, TbItalic, TbUnderline, TbStrikethrough, TbH2, TbList, TbListNumbers, TbQuote, TbCode, TbLink, TbPhoto, TbArrowBackUp, TbArrowForwardUp, TbTextColor, TbHighlight, TbAlignLeft, TbAlignCenter, TbAlignRight, TbClearFormatting } from 'react-icons/tb'
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

const TEXT_COLORS = ['#111827', '#6b7280', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777']
const MARK_COLORS = ['#fef08a', '#fed7aa', '#fecaca', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#ddd6fe', '#fbcfe8']

/** A toolbar button that opens a small palette of colours (and a free colour) under it. */
const SwatchMenu = ({ title, icon, colors, current, onPick, onClear, indicator }) => {
    const [open, setOpen] = useState(null)
    const btn = useRef(null)
    useEffect(() => {
        if (!open) return
        const away = (e) => { if (!btn.current?.contains(e.target) && !e.target.closest?.('[data-swatches]')) setOpen(null) }
        document.addEventListener('pointerdown', away, true)
        return () => document.removeEventListener('pointerdown', away, true)
    }, [open])
    const show = () => { const r = btn.current.getBoundingClientRect(); setOpen({ left: Math.min(r.left, window.innerWidth - 200), top: r.bottom + 4 }) }
    return (
        <>
            <button ref={btn} type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={() => (open ? setOpen(null) : show())}
                className={classNames('relative grid size-7 place-items-center rounded-md text-[17px] transition', open || current ? 'bg-primary/15 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}>
                {icon}
                <i className="absolute bottom-0.5 left-1.5 right-1.5 h-[3px] rounded-full" style={{ background: indicator || current || 'transparent' }} />
            </button>
            {open && createPortal(
                <div data-swatches style={{ position: 'fixed', left: open.left, top: open.top, zIndex: 100000, width: 188 }} onMouseDown={(e) => e.preventDefault()} className="rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800">
                    <div className="grid grid-cols-5 gap-1.5">
                        {colors.map((c) => <button key={c} type="button" aria-label={c} onClick={() => { onPick(c); setOpen(null) }} className="size-6 rounded-full border border-black/10" style={{ background: c }} />)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                        <input type="color" aria-label={title} value={/^#[0-9a-f]{6}$/i.test(current || '') ? current : '#2563eb'} onChange={(e) => onPick(e.target.value)} className="h-6 w-8 cursor-pointer rounded border border-gray-200 bg-transparent p-0.5" />
                        <button type="button" className="ml-auto text-xs font-semibold text-gray-500 hover:text-primary" onClick={() => { onClear(); setOpen(null) }}>{tr('Remove')}</button>
                    </div>
                </div>, document.body)}
        </>
    )
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
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
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
                    <SwatchMenu title={tr('Text colour')} icon={<TbTextColor />} colors={TEXT_COLORS} current={editor.getAttributes('textStyle').color} onPick={(c) => editor.chain().focus().setColor(c).run()} onClear={() => editor.chain().focus().unsetColor().run()} indicator={editor.getAttributes('textStyle').color || '#dc2626'} />
                    <SwatchMenu title={tr('Highlight')} icon={<TbHighlight />} colors={MARK_COLORS} current={editor.getAttributes('highlight').color} onPick={(c) => editor.chain().focus().setHighlight({ color: c }).run()} onClear={() => editor.chain().focus().unsetHighlight().run()} indicator={editor.getAttributes('highlight').color || '#fef08a'} />
                    <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <Btn title={tr('Heading')} active={editor.isActive('heading', { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><TbH2 /></Btn>
                    <Btn title={tr('Bulleted list')} active={editor.isActive('bulletList')} on={() => editor.chain().focus().toggleBulletList().run()}><TbList /></Btn>
                    <Btn title={tr('Numbered list')} active={editor.isActive('orderedList')} on={() => editor.chain().focus().toggleOrderedList().run()}><TbListNumbers /></Btn>
                    <Btn title={tr('Quote')} active={editor.isActive('blockquote')} on={() => editor.chain().focus().toggleBlockquote().run()}><TbQuote /></Btn>
                    <Btn title={tr('Code')} active={editor.isActive('code')} on={() => editor.chain().focus().toggleCode().run()}><TbCode /></Btn>
                    <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <Btn title={tr('Align left')} active={editor.isActive({ textAlign: 'left' })} on={() => editor.chain().focus().setTextAlign('left').run()}><TbAlignLeft /></Btn>
                    <Btn title={tr('Align centre')} active={editor.isActive({ textAlign: 'center' })} on={() => editor.chain().focus().setTextAlign('center').run()}><TbAlignCenter /></Btn>
                    <Btn title={tr('Align right')} active={editor.isActive({ textAlign: 'right' })} on={() => editor.chain().focus().setTextAlign('right').run()}><TbAlignRight /></Btn>
                    <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <Btn title={tr('Link')} active={editor.isActive('link')} on={link}><TbLink /></Btn>
                    <Btn title={tr('Clear formatting')} on={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><TbClearFormatting /></Btn>
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
