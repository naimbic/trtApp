/*! © 2026 TRT Digital — trtCRM. */
import { tr } from '@/utils/t'
import { plainText, looksLikeHtml } from '@/lib/crm/richText'

// Tell every open notes list (Notes page, Tasks board) that a note was added, changed or removed.
export const NOTES_EVENT = 'crm:notes-changed'
export const notesChanged = () => window.dispatchEvent(new Event(NOTES_EVENT))

// Static class names (Tailwind must see the whole string).
export const COLORS = {
    yellow: { card: 'bg-amber-100 border-amber-200 dark:bg-amber-500/20 dark:border-amber-500/30', dot: 'bg-amber-300', label: 'Yellow' },
    red: { card: 'bg-rose-100 border-rose-200 dark:bg-rose-500/20 dark:border-rose-500/30', dot: 'bg-rose-300', label: 'Red' },
    orange: { card: 'bg-orange-100 border-orange-200 dark:bg-orange-500/20 dark:border-orange-500/30', dot: 'bg-orange-300', label: 'Orange' },
    green: { card: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/30', dot: 'bg-emerald-300', label: 'Green' },
    teal: { card: 'bg-teal-100 border-teal-200 dark:bg-teal-500/20 dark:border-teal-500/30', dot: 'bg-teal-300', label: 'Teal' },
    blue: { card: 'bg-sky-100 border-sky-200 dark:bg-sky-500/20 dark:border-sky-500/30', dot: 'bg-sky-300', label: 'Blue' },
    purple: { card: 'bg-violet-100 border-violet-200 dark:bg-violet-500/20 dark:border-violet-500/30', dot: 'bg-violet-300', label: 'Purple' },
    pink: { card: 'bg-pink-100 border-pink-200 dark:bg-pink-500/20 dark:border-pink-500/30', dot: 'bg-pink-300', label: 'Pink' },
    gray: { card: 'bg-gray-200 border-gray-300 dark:bg-gray-600/40 dark:border-gray-500/40', dot: 'bg-gray-400', label: 'Gray' },
}
// the same colours as flat hex values, for the tiles of the Tasks board
export const NOTE_HEX = { yellow: '#fcd34d', red: '#fda4af', orange: '#fdba74', green: '#6ee7b7', teal: '#5eead4', blue: '#7dd3fc', purple: '#c4b5fd', pink: '#f9a8d4', gray: '#d1d5db' }
export const PLAIN_CARD = 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
export const cardClass = (color) => COLORS[color]?.card || PLAIN_CARD

/** The text of a note without formatting (cards, search, the Tasks page). Old notes were plain text already. */
export const plainOf = (s) => (looksLikeHtml(s) ? plainText(s) : String(s || '')).replace(/\s+/g, ' ').trim()

export const labelOfColor = (c) => tr(COLORS[c]?.label || 'Default')

/** Upload a picture, a voice note or a file for a note. */
export async function uploadNoteFile(file, voice = false) {
    const fd = new FormData()
    fd.append('file', file)
    if (voice) fd.append('voice', '1')
    const r = await fetch('/api/crm/notes/upload', { method: 'POST', body: fd, credentials: 'include' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(tr(j.error || 'Upload failed, try again'))
    return j
}
