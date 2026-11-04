/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import { TbExternalLink, TbInfoCircle, TbPencil } from 'react-icons/tb'
import Tooltip from '@/components/ui/Tooltip'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

const memory = new Map() // website -> answer, for the length of the visit

/** The web address on its own: without scheme or path noise, ready to open. */
export const siteHref = (v) => {
    const m = /(?:https?:\/\/|www\.)[^\s<>"'|]+|[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?:\/[^\s<>"'|]*)?/i.exec(String(v || ''))
    if (!m) return ''
    const s = m[0].replace(/[),.;:]+$/, '')
    return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

const FIGURES = [['da', 'Domain authority'], ['traffic', 'Organic traffic'], ['keywords', 'Organic keywords'], ['backlinks', 'Backlinks'], ['refDomains', 'Referring domains'], ['opr', 'Page rank (0-10)'], ['rank', 'World rank']]
const fmt = (n) => (n == null ? '–' : new Intl.NumberFormat().format(n))

/** What is known about a website: online or not, domain age, hosting, and the SEO figures. Loaded the first time it is shown. */
export const SiteInfoBody = ({ website }) => {
    const [d, setD] = useState(memory.get(website) || null)
    const [err, setErr] = useState('')
    useEffect(() => {
        if (memory.has(website)) return
        let off = false
        api(`/api/crm/pipeline/leads/site-info?url=${encodeURIComponent(website)}`).then((r) => { memory.set(website, r); if (!off) setD(r) }).catch((e) => { if (!off) setErr(e.message) })
        return () => { off = true }
    }, [website])
    if (err) return <div className="max-w-xs text-xs">{err}</div>
    if (!d) return <div className="flex items-center gap-2 text-xs"><Spinner size={14} />{tr("Looking at the website…")}</div>
    const s = d.site
    return (
        <div className="w-full text-xs leading-5">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-bold"><span className={`h-2.5 w-2.5 rounded-full ${s?.online ? 'bg-emerald-400' : 'bg-red-400'}`} />{d.domain}</div>
            <div className="space-y-0.5">
                {d.rows.map(([k, v]) => <div key={k} className="flex gap-2"><span className="w-[84px] shrink-0 opacity-60">{tr(k)}</span><span className="min-w-0 break-words font-semibold">{v}</span></div>)}
            </div>
            {d.seo && !d.seo.error && (
                <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-white/15 pt-2">
                    {FIGURES.filter(([k]) => d.seo[k] != null).map(([k, label]) => <div key={k} className="rounded-md bg-white/10 px-1.5 py-1 text-center"><div className="text-sm font-bold">{fmt(d.seo[k])}</div><div className="text-[10px] leading-3 opacity-70">{tr(label)}</div></div>)}
                </div>
            )}
            {d.seo?.error && <div className="mt-2 border-t border-white/15 pt-2 opacity-80">{tr("SEO figures")}: {d.seo.error}</div>}
            {d.seo === null && <div className="mt-2 border-t border-white/15 pt-2 opacity-60">{tr("SEO figures (authority, traffic, keywords, backlinks) appear here once an Ahrefs, Ubersuggest or free Open PageRank key is saved in Settings → AI.")}</div>}
        </div>
    )
}

/** The website of a lead: grey while it is filled in, with an icon to open it in a new tab, one for what is known about it, and a pencil to change it. */
const WebsiteField = ({ value, onChange, disabled, size }) => {
    const [edit, setEdit] = useState(false)
    const href = siteHref(value)
    const locked = !!href && !edit
    return (
        <Input size={size} disabled={disabled || locked} readOnly={locked} value={locked ? href : value} placeholder="https://" onChange={(e) => onChange(e.target.value)} onBlur={() => { if (href) setEdit(false) }} className={locked ? '!bg-gray-100 !text-gray-500 dark:!bg-gray-700/40 dark:!text-gray-400' : ''}
            suffix={href ? (
                <span className="flex items-center gap-1.5 text-base text-gray-500">
                    <Tooltip title={<SiteInfoBody website={href} />} placement="top" className="!w-[340px] !max-w-[92vw] !whitespace-normal !p-3"><span className="cursor-help hover:text-primary"><TbInfoCircle /></span></Tooltip>
                    <a href={href} target="_blank" rel="noreferrer noopener" title={tr("Open the website in a new tab")} className="hover:text-primary"><TbExternalLink /></a>
                    {!disabled && locked && <button type="button" title={tr("Change the website")} onClick={() => setEdit(true)} className="hover:text-primary"><TbPencil /></button>}
                </span>
            ) : undefined} />
    )
}

export default WebsiteField
