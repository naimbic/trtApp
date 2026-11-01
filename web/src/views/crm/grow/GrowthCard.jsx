import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { TbFlag, TbCertificate, TbLanguage, TbRobot, TbFile, TbBolt, TbStar, TbCrown, TbTrophy, TbLock, TbCheck, TbArrowRight } from 'react-icons/tb'
import cn from '@/utils/classNames'
import { api } from '../kit/api'
import { tr } from '@/utils/t'

const ICONS = { flag: TbFlag, certificate: TbCertificate, language: TbLanguage, robot: TbRobot, file: TbFile, bolt: TbBolt, star: TbStar, crown: TbCrown }
export const TrophyIcon = ({ name, className }) => { const I = ICONS[name] || TbTrophy; return <I className={className} /> }
export const LEVEL_TONE = { rookie: 'bg-gray-100 text-gray-600', learner: 'bg-sky-100 text-sky-700', skilled: 'bg-emerald-100 text-emerald-700', expert: 'bg-violet-100 text-violet-700', master: 'bg-amber-100 text-amber-700' }
export const money = (n) => `${Math.round(Number(n || 0)).toLocaleString('fr-FR').replace(/ | /g, ' ')} MAD`

/** Points, level and the way to the next one. */
export const LevelBar = ({ r, big = false }) => {
    const from = r.level.min, to = r.next ? r.next.min : r.points, pct = r.next ? Math.min(100, ((r.points - from) / Math.max(1, to - from)) * 100) : 100
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', LEVEL_TONE[r.level.key])}>{tr(r.level.label)}</span><span className={cn('font-bold heading-text', big ? 'text-3xl' : 'text-xl')}>{r.points} <span className="text-sm font-medium text-gray-500">{tr("points")}</span></span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><i className="block h-full rounded-full bg-gradient-to-r from-primary to-amber-400" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-xs text-gray-500">{r.next ? `${r.next.missing} ${tr("points to")} ${tr(r.next.label)}` : tr("Top level reached")}</p>
        </div>
    )
}

/** One trophy: bright when won, grey with its progress and prize while locked. */
export const Trophy = ({ t, showMoney = true, small = false }) => (
    <div title={`${tr(t.label)}: ${tr(t.desc)}`} className={cn('relative rounded-2xl border p-3 text-center transition', t.earned ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10' : 'border-gray-200 bg-gray-50 opacity-80 dark:border-gray-700 dark:bg-gray-800/50', small && 'p-2')}>
        <span className={cn('mx-auto flex items-center justify-center rounded-full', small ? 'h-9 w-9 text-xl' : 'h-12 w-12 text-2xl', t.earned ? 'bg-amber-400 text-white shadow' : 'bg-gray-200 text-gray-400 dark:bg-gray-700')}>{t.earned ? <TrophyIcon name={t.icon} /> : <TbLock />}</span>
        <div className={cn('mt-1.5 font-semibold leading-tight', small ? 'text-[11px]' : 'text-sm')}>{tr(t.label)}</div>
        {!small && <div className="mt-0.5 text-xs text-gray-500">{tr(t.desc)}</div>}
        {!small && !t.earned && t.target > 1 && <div className="mt-2"><div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><i className="block h-full rounded-full bg-primary" style={{ width: `${(t.progress / t.target) * 100}%` }} /></div><div className="mt-0.5 text-[11px] text-gray-500">{t.progress}/{t.target}</div></div>}
        {showMoney && t.prize > 0 && !small && <div className={cn('mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold', t.earned ? (t.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-200 text-amber-800') : 'bg-primary/10 text-primary')}>{t.earned && t.paid ? <><TbCheck className="inline" /> {tr("paid")} · </> : null}{money(t.prize)}</div>}
    </div>
)

/** The learning picture of one person for a profile page: level, points, trophies, what they passed lately. */
const GrowthCard = ({ staffId, own = false, className }) => {
    const [r, setR] = useState(null)
    useEffect(() => { api(`/api/crm/growth/profile${staffId ? `?staffId=${staffId}` : ''}`).then(setR).catch(() => setR(false)) }, [staffId])
    if (r === false) return null
    if (!r) return <section className={cn('pt-card', className)}><p className="py-4 text-center text-sm text-gray-400">{tr("Loading…")}</p></section>
    const won = r.trophies.filter((t) => t.earned)
    return (
        <section className={cn('pt-card', className)}>
            <h3>{tr("Growth: skills and trophies")}<Link to="/crm/my-growth" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{own || r.own ? tr("My growth") : tr("Team growth")}<TbArrowRight /></Link></h3>
            <LevelBar r={r} />
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">{r.trophies.map((t) => <Trophy key={t.key} t={t} small showMoney={false} />)}</div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500"><span>{won.length}/{r.trophies.length} {tr("trophies")} · {r.passed} {tr("passed")}</span>{r.money && won.some((t) => t.prize > 0 && !t.paid) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{tr("Prize to pay")}: {money(won.filter((t) => !t.paid).reduce((a, t) => a + t.prize, 0))}</span>}</div>
            {r.recent.length > 0 && <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-sm dark:border-gray-700">{r.recent.map((g) => <li key={g.id} className="flex items-center gap-2"><TbCertificate className="shrink-0 text-emerald-500" /><span className="min-w-0 flex-1 truncate">{g.title}</span><span className="shrink-0 text-xs text-gray-400">{g.doneDate ? new Date(g.doneDate).toISOString().slice(0, 10) : ''}</span></li>)}</ul>}
        </section>
    )
}

export default GrowthCard
