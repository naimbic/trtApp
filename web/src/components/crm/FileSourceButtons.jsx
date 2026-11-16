import { useState } from 'react'
import { TbPhotoSearch, TbLink } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import MediaPicker from '@/components/crm/MediaPicker'
import { notify } from '@/views/crm/kit/api'
import cn from '@/utils/classNames'
import { tr } from '@/utils/t'

/** The file of the file manager as a File, ready to be attached like one picked from the computer. */
export async function mediaAsFile(m) {
    const r = await fetch(`/api/crm/media/raw?id=${m.id}`, { credentials: 'include' })
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || tr("Could not read this file"))
    const blob = await r.blob()
    return new File([blob], m.name || 'file', { type: m.mime || blob.type || 'application/octet-stream' })
}

/**
 * Beside an "attach" button, the two other ways to add something to a message: Select (a file already in the file manager,
 * or uploaded on a record) and Link (a web address). onFiles(files) receives the chosen file like an upload; onLink(url, name)
 * receives the link (leave it out where a link makes no sense). Staff screens only: the client area has no file manager.
 */
const FileSourceButtons = ({ onFiles, onLink, disabled = false, className, btnClass }) => {
    const [picker, setPicker] = useState(false)
    const [busy, setBusy] = useState(false)
    const [link, setLink] = useState(null)
    const cls = btnClass || 'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-lg text-gray-500 transition hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-600'
    const pick = async (m) => {
        setPicker(false)
        if (m.kind === 'link') { if (onLink) onLink(m.url, m.name); else notify('warning', tr("A link cannot be attached here")); return }
        setBusy(true)
        try { await onFiles([await mediaAsFile(m)]) } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const addLink = () => {
        const raw = (link?.url || '').trim()
        if (!raw) return
        const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
        try { new URL(url) } catch { return notify('warning', tr("Enter a valid web address")) }
        onLink(url, (link.name || '').trim()); setLink(null)
    }
    return (
        <span className={cn('inline-flex items-center gap-1.5', className)}>
            <button type="button" disabled={disabled || busy} title={tr("Select from the files")} aria-label={tr("Select from the files")} className={cls} onClick={() => setPicker(true)}><TbPhotoSearch /></button>
            {onLink && <button type="button" disabled={disabled} title={tr("Add a link")} aria-label={tr("Add a link")} className={cls} onClick={() => setLink({ url: '', name: '' })}><TbLink /></button>}
            <MediaPicker open={picker} kind="" onClose={() => setPicker(false)} onPick={pick} />
            <Dialog isOpen={!!link} width={460} onClose={() => setLink(null)} onRequestClose={() => setLink(null)}>
                <h5 className="mb-3">{tr("Add a link")}</h5>
                <div className="flex flex-col gap-2">
                    <Input autoFocus value={link?.url || ''} placeholder={tr("Link address (https://…)")} onChange={(e) => setLink({ ...link, url: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
                    <Input value={link?.name || ''} placeholder={tr("Name (optional)")} onChange={(e) => setLink({ ...link, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
                </div>
                <div className="mt-4 flex justify-end gap-2"><Button size="sm" onClick={() => setLink(null)}>{tr("Cancel")}</Button><Button size="sm" variant="solid" disabled={!(link?.url || '').trim()} onClick={addLink}>{tr("Add")}</Button></div>
            </Dialog>
        </span>
    )
}

/** A link written into a rich text message (HTML). */
export const linkHtml = (url, name) => { const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); return `<p><a href="${esc(url)}">${esc(name || url)}</a></p>` }

export default FileSourceButtons
