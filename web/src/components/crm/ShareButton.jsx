/*! © 2026 TRT Digital — trtCRM. */
import { useState } from 'react'
import { TbShare3, TbLink, TbCopy, TbMail, TbDownload, TbBrandWhatsapp, TbBrandTelegram, TbBrandLinkedin, TbBrandX, TbBrandFacebook } from 'react-icons/tb'
import RowMenu from '@/components/crm/RowMenu'
import Button from '@/components/ui/Button'
import { notify } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

/** A link that works from anywhere: relative addresses get this site in front of them. */
export const absUrl = (u) => { try { return new URL(u, window.location.origin).href } catch { return String(u || '') } }
/** The text of some rich HTML, on one line, for a message. */
export const plainOf = (html, max = 280) => { try { return (new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, max) } catch { return '' } }

const copy = async (text, done = 'Link copied') => { try { await navigator.clipboard.writeText(text); notify('success', tr(done)) } catch { notify('danger', tr('Could not copy')) } }
const open = (href) => window.open(href, '_blank', 'noopener,noreferrer')

/** Every way to hand something over: this device's own share sheet (mail, messages, AirDrop, apps...), copy, the common messengers, mail and social networks. */
export const shareItems = ({ url, title, text, file }) => {
    const link = absUrl(url || window.location.href), t = title || '', msg = [text, link].filter(Boolean).join('\n'), enc = encodeURIComponent
    const items = []
    if (typeof navigator !== 'undefined' && navigator.share) {
        items.push({ label: tr('Share…'), icon: <TbShare3 />, onClick: async () => {
            try {
                if (file && navigator.canShare) { // the file itself (an image, a PDF) goes through the share sheet when the device allows it
                    const blob = await (await fetch(absUrl(file.url), { credentials: 'include' })).blob()
                    const f = new File([blob], file.name || 'file', { type: file.type || blob.type })
                    if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: t, text }); return }
                }
                await navigator.share({ title: t, text, url: link })
            } catch (e) { if (e?.name !== 'AbortError') notify('danger', tr('Could not share')) }
        } })
    }
    items.push({ label: tr('Copy link'), icon: <TbLink />, onClick: () => copy(link) })
    if (text) {
        items.push({ label: tr('Copy text'), icon: <TbCopy />, onClick: () => copy(text, 'Text copied') })
        items.push({ label: tr('Copy text with link'), icon: <TbCopy />, onClick: () => copy(msg, 'Text copied') })
    }
    items.push({ label: 'WhatsApp', icon: <TbBrandWhatsapp />, onClick: () => open(`https://wa.me/?text=${enc(msg)}`) })
    items.push({ label: 'Telegram', icon: <TbBrandTelegram />, onClick: () => open(`https://t.me/share/url?url=${enc(link)}&text=${enc(text || t)}`) })
    items.push({ label: tr('Email'), icon: <TbMail />, onClick: () => { window.location.href = `mailto:?subject=${enc(t)}&body=${enc(msg)}` } })
    items.push({ label: 'LinkedIn', icon: <TbBrandLinkedin />, onClick: () => open(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`) })
    items.push({ label: 'X', icon: <TbBrandX />, onClick: () => open(`https://twitter.com/intent/tweet?text=${enc(text || t)}&url=${enc(link)}`) })
    items.push({ label: 'Facebook', icon: <TbBrandFacebook />, onClick: () => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`) })
    if (file) items.push({ label: tr('Download'), icon: <TbDownload />, after: true, onClick: () => { const a = document.createElement('a'); a.href = absUrl(file.url); a.download = file.name || ''; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove() } })
    return items
}

const BASE = 'grid size-6 place-items-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700'

/**
 * The share icon: press it for the menu (this device's share sheet, copy the link, WhatsApp, Telegram, email, LinkedIn, X, Facebook, download).
 *   url / title / text  what is sent   file  { url, name, type }: an attachment, an image or a PDF, shared as the file where the device can
 *   onToggle(open)      tells a floating parent to stay while the menu is open
 */
const ShareButton = ({ url, title, text, file, className, onToggle, asButton }) => {
    const [anchor, setAnchor] = useState(null)
    const close = () => { setAnchor(null); onToggle?.(false) }
    const toggle = (e) => { e.stopPropagation(); if (anchor) close(); else { setAnchor(e.currentTarget); onToggle?.(true) } }
    return (
        <>
            {asButton ? <Button size="sm" icon={<TbShare3 />} onClick={toggle}>{tr('Share')}</Button> : <button type="button" title={tr('Share')} aria-label={tr('Share')} aria-haspopup="menu" className={className || BASE} onClick={toggle}><TbShare3 /></button>}
            {anchor && <RowMenu anchor={anchor} items={shareItems({ url, title, text, file })} onClose={close} />}
        </>
    )
}

export default ShareButton
