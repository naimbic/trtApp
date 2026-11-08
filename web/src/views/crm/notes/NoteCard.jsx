/*! © 2026 TRT Digital — trtCRM. */
import { useState } from 'react'
import dayjs from 'dayjs'
import { TbArchive, TbArchiveOff, TbArrowRight, TbCalendar, TbBellRinging, TbChecklist, TbCheck, TbMessageCircle, TbPalette, TbPaperclip, TbPin, TbPinFilled, TbStar, TbStarFilled, TbTrash, TbUsers, TbLink } from 'react-icons/tb'
import RichView from '@/components/crm/RichView'
import { looksLikeHtml } from '@/lib/crm/richText'
import { RemindTag } from '../tasks/shared'
import { COLORS, cardClass, labelOfColor } from './noteKit'
import { tr } from '@/utils/t'

const Stat = ({ icon, children, title, tone = '' }) => <span title={title} className={`inline-flex items-center gap-0.5 rounded-full bg-black/5 px-1.5 py-0.5 font-semibold dark:bg-white/10 ${tone}`}>{icon}{children}</span>

const ToolBtn = ({ title, onClick, active, danger, children }) => (
    <button type="button" title={title} aria-label={title} onClick={(e) => { e.stopPropagation(); onClick?.(e) }} className={`grid size-7 place-items-center rounded-full text-base transition hover:bg-black/10 dark:hover:bg-white/10 ${active ? 'text-primary' : danger ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>{children}</button>
)

/** One note as a Keep-style card: coloured, with its text or checklist, pictures, voice notes, links, labels and a bar of quick tools. */
const NoteCard = ({ note: n, onOpen, onPatch, onDelete, onToTask, compact = false }) => {
    const [palette, setPalette] = useState(false)
    const mine = n.mine
    const open = n.checklist.filter((c) => !c.done)
    const done = n.checklist.filter((c) => c.done)
    const images = n.attachments.filter((a) => a.kind === 'image')
    const audios = n.attachments.filter((a) => a.kind === 'audio')
    const files = n.attachments.filter((a) => a.kind !== 'image' && a.kind !== 'audio')
    const toggle = (id) => onPatch(n, { checklist: n.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) })
    return (
        <div role="button" tabIndex={0} onClick={() => onOpen(n)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(n) }}
            className={`group relative mb-4 inline-block w-full break-inside-avoid cursor-pointer overflow-hidden rounded-2xl border text-start shadow-sm transition hover:shadow-md ${cardClass(n.color)}`}>
            {images.length > 0 && (
                <div className={`grid gap-0.5 ${images.length > 1 ? 'grid-cols-2' : ''}`}>
                    {images.slice(0, 4).map((a) => <img key={a.url} src={a.url} alt={a.name} loading="lazy" className="max-h-56 w-full object-cover" />)}
                </div>
            )}
            <div className="p-3.5">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 font-semibold dark:bg-white/10" title={dayjs(n.updatedAt).format('DD MMM YYYY, HH:mm')}><TbCalendar />{dayjs(n.updatedAt).format('DD MMM')}</span>
                    <span className="ms-auto flex flex-wrap items-center justify-end gap-1">
                        {n.remindAt && <Stat icon={<TbBellRinging />} tone="text-amber-700 dark:text-amber-400" title={tr('Reminder')}>{dayjs(n.remindAt).format('DD MMM HH:mm')}<RemindTag when={n.remindAt} /></Stat>}
                        {n.kind === 'list' && <Stat icon={<TbChecklist />} title={tr('Checklist')}>{done.length}/{n.checklist.length}</Stat>}
                        {n.attachments.length > 0 && <Stat icon={<TbPaperclip />} title={tr('Pictures, voice and files')}>{n.attachments.length}</Stat>}
                        {n.links.length > 0 && <Stat icon={<TbLink />} title={tr('Links')}>{n.links.length}</Stat>}
                        {n.comments > 0 && <Stat icon={<TbMessageCircle />} title={tr('Comments')}>{n.comments}</Stat>}
                        {n.sharedWith.length > 0 && <Stat icon={<TbUsers />} title={n.sharedWith.map((x) => x.name).join(', ')}>{n.sharedWith.length}</Stat>}
                    </span>
                </div>
                <div className="flex items-start gap-2">
                    {n.title ? <h6 className="min-w-0 flex-1 break-words font-bold leading-snug text-gray-900 dark:text-gray-100">{n.title}</h6> : <span className="flex-1" />}
                    {(n.important || n.pinned) && <span className="flex shrink-0 gap-1 text-base">{n.important && <TbStarFilled className="text-amber-500" title={tr('Important')} />}{n.pinned && <TbPinFilled className="text-primary" title={tr('Pinned')} />}</span>}
                </div>
                {n.kind === 'list' ? (
                    <ul className="mt-1.5 space-y-0.5 text-sm">
                        {open.slice(0, compact ? 4 : 12).map((c) => (
                            <li key={c.id} className="flex items-start gap-2"><button type="button" disabled={!mine} aria-label={tr('Done')} onClick={(e) => { e.stopPropagation(); toggle(c.id) }} className="mt-0.5 size-4 shrink-0 rounded border border-gray-500/60 bg-white/60 dark:bg-gray-900/30" /><span className="min-w-0 break-words">{c.text}</span></li>
                        ))}
                        {open.length > (compact ? 4 : 12) && <li className="text-xs text-gray-500">+{open.length - (compact ? 4 : 12)}</li>}
                        {done.length > 0 && !compact && (
                            <li className="pt-1 text-xs text-gray-500">{tr('{n} done', { n: done.length })}</li>
                        )}
                        {!compact && done.slice(0, 4).map((c) => (
                            <li key={c.id} className="flex items-start gap-2 text-gray-500 line-through"><button type="button" disabled={!mine} aria-label={tr('Undo')} onClick={(e) => { e.stopPropagation(); toggle(c.id) }} className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-gray-500/40 bg-primary text-[10px] text-white no-underline"><TbCheck /></button><span className="min-w-0 break-words">{c.text}</span></li>
                        ))}
                    </ul>
                ) : n.description ? (
                    <div className={`mt-1.5 overflow-hidden text-sm text-gray-700 dark:text-gray-200 ${compact ? 'max-h-24' : 'max-h-64'}`}>
                        {looksLikeHtml(n.description) ? <RichView html={n.description} /> : <p className="whitespace-pre-line break-words">{n.description}</p>}
                    </div>
                ) : null}
                {audios.map((a) => <audio key={a.url} controls preload="none" src={a.url} onClick={(e) => e.stopPropagation()} className="mt-2 h-9 w-full" />)}
                {files.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{files.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex max-w-full items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10"><TbPaperclip className="shrink-0" /><span className="truncate">{a.name}</span></a>)}</div>}
                {n.links.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{n.links.slice(0, 4).map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} className="inline-flex max-w-full items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs text-primary dark:bg-white/10"><TbLink className="shrink-0" /><span className="truncate">{l.title || l.url.replace(/^https?:\/\/(www\.)?/, '')}</span></a>)}</div>}
                {(n.labels.length > 0 || n.owner || n.sharedWith.length > 0) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        {n.labels.length > 0 && <span className="flex min-w-0 flex-wrap gap-1">{n.labels.map((l) => <span key={l} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-gray-800 ${COLORS[n.color]?.dot || 'bg-gray-300 dark:bg-gray-500 dark:text-gray-100'}`}>{l}</span>)}</span>}
                        <span className="ms-auto flex min-w-0 max-w-full items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300" title={[n.owner && `${tr('From {name}', { name: n.owner })}`, n.sharedWith.length ? `${tr('Shared with')}: ${n.sharedWith.map((x) => x.name).join(', ')}` : ''].filter(Boolean).join(' · ')}>
                            {n.owner && <span className="inline-flex min-w-0 items-center gap-1"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-black/10 text-[9px] font-bold dark:bg-white/15">{n.owner.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span><span className="truncate">{n.own ? tr('You') : n.owner}</span></span>}
                            {n.sharedWith.length > 0 && <span className="inline-flex min-w-0 items-center gap-1 truncate"><TbArrowRight className="shrink-0" /><span className="truncate">{n.sharedWith.map((x) => x.name.split(' ')[0]).slice(0, 2).join(', ')}{n.sharedWith.length > 2 ? ` +${n.sharedWith.length - 2}` : ''}</span></span>}
                        </span>
                    </div>
                )}
            </div>
            {mine && !compact && (
                <div className="relative flex items-center gap-0.5 px-2 pb-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <ToolBtn title={n.pinned ? tr('Unpin') : tr('Pin')} active={n.pinned} onClick={() => onPatch(n, { pinned: !n.pinned })}>{n.pinned ? <TbPinFilled /> : <TbPin />}</ToolBtn>
                    <ToolBtn title={n.important ? tr('Not important') : tr('Mark as important')} active={n.important} onClick={() => onPatch(n, { important: !n.important })}>{n.important ? <TbStarFilled /> : <TbStar />}</ToolBtn>
                    <ToolBtn title={tr('Colour')} onClick={() => setPalette((p) => !p)}><TbPalette /></ToolBtn>
                    <ToolBtn title={n.archived ? tr('Unarchive') : tr('Archive')} onClick={() => onPatch(n, { archived: !n.archived })}>{n.archived ? <TbArchiveOff /> : <TbArchive />}</ToolBtn>
                    <ToolBtn title={tr('Make it a task')} onClick={() => onToTask(n)}><TbChecklist /></ToolBtn>
                    <ToolBtn title={tr('Delete')} danger onClick={() => onDelete(n)}><TbTrash /></ToolBtn>
                    {palette && (
                        <div className="absolute bottom-10 start-2 z-10 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                            <button type="button" title={tr('Default')} onClick={() => { setPalette(false); onPatch(n, { color: null }) }} className="size-6 rounded-full border border-gray-300 bg-white" />
                            {Object.entries(COLORS).map(([k, c]) => <button key={k} type="button" title={labelOfColor(k)} onClick={() => { setPalette(false); onPatch(n, { color: k }) }} className={`size-6 rounded-full ${c.dot} ${n.color === k ? 'ring-2 ring-primary' : ''}`} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default NoteCard
