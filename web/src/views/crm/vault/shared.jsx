import { useState } from 'react'
import { TbCopy, TbCheck } from 'react-icons/tb'
import { notify } from '../kit/api'
import { tr } from '@/utils/t'

export const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#64748b']
export const colorOf = (c) => c?.color || '#64748b'
export const initials = (t = '') => t.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?'

/** Cryptographically random password from the chosen character sets. */
export function generate({ length = 20, upper = true, lower = true, digits = true, symbols = true } = {}) {
    const sets = [upper && 'ABCDEFGHJKLMNPQRSTUVWXYZ', lower && 'abcdefghijkmnopqrstuvwxyz', digits && '23456789', symbols && '!@#$%^&*()-_=+?'].filter(Boolean)
    if (!sets.length) return ''
    const rnd = (n) => { const a = new Uint32Array(1); let x; do { crypto.getRandomValues(a); x = a[0] } while (x >= Math.floor(0x100000000 / n) * n); return x % n }
    const all = sets.join('')
    const out = sets.map((s) => s[rnd(s.length)])
    while (out.length < length) out.push(all[rnd(all.length)])
    for (let i = out.length - 1; i > 0; i--) { const j = rnd(i + 1); [out[i], out[j]] = [out[j], out[i]] }
    return out.join('')
}

export function strength(p = '') {
    if (!p) return { score: 0, label: '', color: '#e5e7eb' }
    let s = 0
    if (p.length >= 8) s++
    if (p.length >= 12) s++
    if (p.length >= 16) s++
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
    if (/\d/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    const score = Math.min(4, Math.round((s / 6) * 4))
    return [{ label: tr("Very weak"), color: '#ef4444' }, { label: tr("Weak"), color: '#f97316' }, { label: tr("Fair"), color: '#f59e0b' }, { label: tr("Good"), color: '#10b981' }, { label: tr("Strong"), color: '#059669' }][score] && { score, ...[{ label: tr("Very weak"), color: '#ef4444' }, { label: tr("Weak"), color: '#f97316' }, { label: tr("Fair"), color: '#f59e0b' }, { label: tr("Good"), color: '#10b981' }, { label: tr("Strong"), color: '#059669' }][score] }
}

export const CopyButton = ({ text, onCopied, title = 'Copy', get }) => {
    const [done, setDone] = useState(false)
    const copy = async (e) => {
        e.stopPropagation()
        try { await navigator.clipboard.writeText(get ? await get() : text); setDone(true); setTimeout(() => setDone(false), 1500); onCopied?.() } catch (err) { notify('danger', err.message || tr("Could not copy")) }
    }
    return <button type="button" title={title} onClick={copy} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700">{done ? <TbCheck className="text-emerald-500" /> : <TbCopy />}</button>
}
