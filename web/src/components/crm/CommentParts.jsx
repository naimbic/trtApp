/*! © 2026 TRT Digital — trtCRM. */
import RichEditor from '@/components/crm/RichEditor'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TbArrowBackUp, TbAt, TbPencil, TbTrash, TbX } from 'react-icons/tb'
import RemindMe from '@/components/crm/RemindMe'
import { mentionDirectory } from '@/utils/mentions'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ShareButton from '@/components/crm/ShareButton'
import EmojiPicker from '@/components/crm/EmojiPicker'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

/** Reply, edit and delete icons that appear when the pointer is over a comment (the parent needs the classes "group relative"). */
export const CommentTools = ({ onReply, onEdit, onDelete, share, inline = false }) => (
    <div className={inline ? 'flex gap-0.5' : 'absolute right-1.5 top-1.5 flex gap-0.5 rounded-lg bg-white/90 p-0.5 opacity-0 shadow-sm transition focus-within:opacity-100 group-hover:opacity-100 dark:bg-gray-800/90'}>
        {share && <ShareButton url={share.url} title={share.title} text={share.text} />}
        {onReply && <button type="button" title={tr('Reply')} aria-label={tr('Reply')} onClick={onReply} className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbArrowBackUp /></button>}
        {onEdit && <button type="button" title={tr('Edit')} aria-label={tr('Edit')} onClick={onEdit} className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbPencil /></button>}
        {onDelete && <button type="button" title={tr('Delete')} aria-label={tr('Delete')} onClick={onDelete} className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-gray-700"><TbTrash /></button>}
    </div>
)

/** The text of a comment being edited in place. */
export const CommentEdit = ({ initial, onSave, onCancel, plain = false }) => {
    const [text, setText] = useState(initial)
    const [busy, setBusy] = useState(false)
    return (
        <div className="mt-1 space-y-2">
            <RichEditor autoFocus minHeight={80} value={text} onChange={setText} mentions={!plain} images={!plain} />
            <div className="flex justify-end gap-2">
                <Button size="xs" onClick={onCancel}>{tr('Cancel')}</Button>
                <Button size="xs" variant="solid" loading={busy} disabled={!text.trim() || text.trim() === initial.trim()} onClick={async () => { setBusy(true); try { await onSave(text) } finally { setBusy(false) } }}>{tr('Save')}</Button>
            </div>
        </div>
    )
}

/** The comment a reply answers, shown above the reply. */
export const ReplyQuote = ({ r }) => r ? (
    <div className="mb-1 flex items-start gap-1.5 border-l-2 border-primary/40 pl-2 text-xs text-gray-500"><TbArrowBackUp className="mt-0.5 shrink-0" /><span className="min-w-0"><b className="font-semibold">{r.name}</b> {r.text}</span></div>
) : null

/** "Replying to Sara" above the writing box, with a way to cancel. */
export const ReplyingTo = ({ name, onCancel }) => name ? (
    <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary"><TbArrowBackUp />{tr('Replying to {name}', { name })}<button type="button" aria-label={tr('Cancel')} onClick={onCancel} className="ml-auto"><TbX /></button></div>
) : null

/** Under a comment: the emoji reactions it got (always shown) and, on hover, the picker plus share / reply / edit / delete. Nothing sits over the date. The parent needs the class "group". */
/** "@": pick a colleague to tag on a comment that is already sent. */
const MentionPick = ({ onPick }) => {
    const [pos, setPos] = useState(null)
    const [people, setPeople] = useState([])
    const [q, setQ] = useState('')
    const btn = useRef(null)
    useEffect(() => {
        if (!pos) return undefined
        mentionDirectory().then((d) => setPeople(d.staff || []))
        const away = (e) => { if (!btn.current?.contains(e.target) && !e.target.closest?.('[data-mention-pick]')) setPos(null) }
        const esc = (e) => { if (e.key === 'Escape') setPos(null) }
        document.addEventListener('pointerdown', away, true)
        document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc) }
    }, [pos])
    const open = () => {
        const r = btn.current.getBoundingClientRect()
        const w = 240, h = 280
        setQ('')
        setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: r.top > h + 16 ? r.top - h - 6 : Math.min(r.bottom + 6, window.innerHeight - h - 8) })
    }
    const list = people.filter((p) => p.name?.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 50)
    return (
        <>
            <button ref={btn} type="button" title={tr('Mention a colleague')} aria-label={tr('Mention a colleague')} onClick={() => (pos ? setPos(null) : open())} className={classNames('grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700', pos && 'bg-primary/15 text-primary')}><TbAt /></button>
            {pos && createPortal(
                <div data-mention-pick style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 100002, width: 240 }} className="rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-600 dark:bg-gray-800">
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search a colleague')} className="mb-1 h-8 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm outline-none focus:border-primary dark:border-gray-600" />
                    <div className="max-h-56 overflow-y-auto">
                        {list.map((p) => <button key={p.id} type="button" onClick={() => { setPos(null); onPick(p.id) }} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">{p.name}</button>)}
                        {!list.length && <p className="px-2 py-1.5 text-xs text-gray-400">{tr('Nobody found')}</p>}
                    </div>
                </div>, document.body)}
        </>
    )
}

export const CommentFoot = ({ reactions = [], onReact, onMention, remind, ...tools }) => (
    <div className="mt-1.5 flex min-h-6 flex-wrap items-center gap-1">
        {reactions.map((r) => (
            <button key={r.emoji} type="button" title={r.names.join(', ')} onClick={() => onReact?.(r.emoji)} className={classNames('flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition', r.mine ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary dark:border-gray-600 dark:text-gray-300')}><span className="text-sm leading-none">{r.emoji}</span>{r.count}</button>
        ))}
        <div className="flex items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            {onReact && <EmojiPicker title={tr('React')} onPick={onReact} className="!size-6" />}
            {onMention && <MentionPick onPick={onMention} />}
            {remind && <RemindMe iconOnly relType={remind.relType} relId={remind.relId} initialNote={remind.note} tab={remind.tab} />}
            <CommentTools inline {...tools} />
        </div>
    </div>
)

/** Comments as threads: each reply sits under the comment it answers, pushed to the right. `render(comment, depth)` draws one comment (wrap it in "group"). */
export const CommentThread = ({ comments, render }) => {
    const ids = new Set(comments.map((c) => c.id))
    const kids = {}
    const roots = []
    for (const c of comments) { if (c.replyToId && ids.has(c.replyToId)) (kids[c.replyToId] ||= []).push(c); else roots.push(c) }
    const node = (c, depth) => (
        <div key={c.id}>
            {render(c, depth)}
            {kids[c.id] && <div className={classNames('mt-3 space-y-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700', depth === 0 ? 'ml-5' : depth < 3 ? 'ml-3' : '')}>{kids[c.id].map((k) => node(k, depth + 1))}</div>}
        </div>
    )
    return roots.map((r) => node(r, 0))
}

/** Puts "@Name " (with the space) in an empty writing box and leaves the cursor after it, so typing can start at once. */
export const startReply = (editor, name) => {
    if (!editor || editor.isDestroyed) return
    if (editor.isEmpty && name) editor.commands.setContent(`<p>@${String(name).replace(/[<>&]/g, '')}&nbsp;</p>`, true)
    editor.commands.focus('end')
}
