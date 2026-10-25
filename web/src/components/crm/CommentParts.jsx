/*! © 2026 TRT Digital — trtCRM. */
import RichEditor from '@/components/crm/RichEditor'
import { useState } from 'react'
import { TbArrowBackUp, TbPencil, TbTrash, TbX } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { tr } from '@/utils/t'

/** Reply, edit and delete icons that appear when the pointer is over a comment (the parent needs the classes "group relative"). */
export const CommentTools = ({ onReply, onEdit, onDelete }) => (
    <div className="absolute right-1.5 top-1.5 flex gap-0.5 rounded-lg bg-white/90 p-0.5 opacity-0 shadow-sm transition focus-within:opacity-100 group-hover:opacity-100 dark:bg-gray-800/90">
        {onReply && <button type="button" title={tr('Reply')} aria-label={tr('Reply')} onClick={onReply} className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbArrowBackUp /></button>}
        {onEdit && <button type="button" title={tr('Edit')} aria-label={tr('Edit')} onClick={onEdit} className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbPencil /></button>}
        {onDelete && <button type="button" title={tr('Delete')} aria-label={tr('Delete')} onClick={onDelete} className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-gray-700"><TbTrash /></button>}
    </div>
)

/** The text of a comment being edited in place. */
export const CommentEdit = ({ initial, onSave, onCancel }) => {
    const [text, setText] = useState(initial)
    const [busy, setBusy] = useState(false)
    return (
        <div className="mt-1 space-y-2">
            <RichEditor autoFocus minHeight={80} value={text} onChange={setText} />
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
