/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useFloating, autoUpdate, offset, flip, shift, useHover, useFocus, useDismiss, useRole, useInteractions, safePolygon, FloatingPortal } from '@floating-ui/react'
import { TbStar, TbTrophy, TbChecklist, TbAlertTriangle, TbArrowUpRight } from 'react-icons/tb'
import ScoreRing, { toneOf } from './ScoreRing'
import { api } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

// One request for every avatar on the page (and a few minutes of memory), shared by all of them.
let cache = null
let at = 0
let inflight = null
const EMPTY = { people: {}, scores: {} }
const load = () => {
    if (cache && Date.now() - at < 300000) return Promise.resolve(cache)
    inflight ||= api('/api/crm/team/cards').then((d) => ({ people: d.people || {}, scores: d.scores || {} })).catch(() => EMPTY).then((m) => { cache = m; at = Date.now(); inflight = null; return m })
    return inflight
}
const useCards = () => {
    const [d, setD] = useState(cache || EMPTY)
    useEffect(() => { let on = true; load().then((m) => { if (on) setD(m) }); return () => { on = false } }, [])
    return d
}
export const useStaffScores = () => useCards().scores

const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const TONE = { high: 'text-emerald-600 dark:text-emerald-400', mid: 'text-amber-600 dark:text-amber-400', low: 'text-red-600 dark:text-red-400', none: 'text-gray-400' }
const BAR = { high: 'bg-emerald-500', mid: 'bg-amber-400', low: 'bg-red-500', none: 'bg-gray-300' }

const Tile = ({ icon, value, label, tone = '' }) => (
    <div className="min-w-0 flex-1 rounded-xl bg-white/60 px-2 py-1.5 text-center dark:bg-white/5">
        <div className={`flex items-center justify-center gap-1 text-base font-extrabold tabular-nums leading-tight ${tone || 'text-gray-900 dark:text-gray-100'}`}>{icon}{value}</div>
        <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    </div>
)
const Bar = ({ label, value }) => value === null || value === undefined ? null : (
    <div className="flex items-center gap-2 text-xs">
        <span className="w-28 shrink-0 truncate text-gray-600 dark:text-gray-300">{label}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/10"><span className={`block h-full rounded-full ${BAR[toneOf(value)]}`} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} /></span>
        <span className="w-9 shrink-0 text-end font-bold tabular-nums text-gray-800 dark:text-gray-100">{value}%</span>
    </div>
)

/** What the card says about one member: who they are, their points and (for people allowed to see it) their score. */
export const ProfileCard = ({ name, person, score: s, link }) => {
    const p = person?.points
    const parts = s?.parts || {}
    const c = s?.counts
    const has = s && s.score !== null && s.score !== undefined
    return (
        <div className="w-72 text-start">
            <div className="flex items-center gap-3">
                <span className="relative shrink-0">
                    {person?.image
                        ? <img src={person.image} alt="" className="size-11 rounded-full object-cover ring-2 ring-white/80 dark:ring-white/10" />
                        : <span className="grid size-11 place-items-center rounded-full bg-primary text-sm font-bold text-white ring-2 ring-white/80 dark:ring-white/10">{initials(person?.name || name)}</span>}
                    {person?.online && <span title={tr('Online')} className="absolute bottom-0 end-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-gray-900 group-hover/card:text-primary dark:text-white">{person?.name || name}</div>
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">{person?.jobTitle || (person?.online ? tr('Online') : tr('Team member'))}</div>
                </div>
                {link && <span title={tr('Open profile')} className="grid size-7 shrink-0 place-items-center rounded-full bg-gray-900/5 text-base text-gray-500 transition group-hover/card:bg-primary group-hover/card:text-white dark:bg-white/10 dark:text-gray-300"><TbArrowUpRight /></span>}
            </div>
            {(p || has) && (
                <div className="mt-3 flex gap-1.5">
                    {p && <Tile icon={<TbStar className="text-amber-500" />} value={p.month} label={tr('Month')} />}
                    {p && <Tile icon={<TbTrophy className="text-amber-500" />} value={p.rank ? `#${p.rank}` : '—'} label={tr('Rank')} />}
                    {p && <Tile value={p.total} label={tr('Total')} />}
                </div>
            )}
            {s && (
                <div className="mt-3 border-t border-gray-900/10 pt-2.5 dark:border-white/10">
                    <div className="mb-1.5 flex items-baseline justify-between text-xs">
                        <span className="font-bold text-gray-700 dark:text-gray-200">{tr('Score · last {d} days', { d: s.days || 30 })}</span>
                        <span className={`text-sm font-extrabold tabular-nums ${TONE[toneOf(has ? s.score : null)]}`}>{has ? `${s.score}%` : '—'}</span>
                    </div>
                    {has ? (
                        <div className="space-y-1">
                            <Bar label={tr('Tasks completed')} value={parts.completion} />
                            <Bar label={tr('Finished on time')} value={parts.onTime} />
                            <Bar label={tr('Time tracked')} value={parts.hours} />
                        </div>
                    ) : <p className="text-xs text-gray-500 dark:text-gray-400">{tr('Nothing to measure yet')}</p>}
                    {c && (c.open > 0 || c.overdue > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-900/5 px-2 py-0.5 text-gray-700 dark:bg-white/10 dark:text-gray-200"><TbChecklist />{tr('{n} open task(s)', { n: c.open })}</span>
                            {c.overdue > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400"><TbAlertTriangle />{tr('{n} late', { n: c.overdue })}</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/** Shows the profile card over whatever is inside (a picture), on hover or keyboard focus. The mouse can travel onto the card; a click on it opens the member's profile. */
export const ProfileTip = ({ id, name, person, score, children }) => {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const { refs, floatingStyles, context } = useFloating({ open, onOpenChange: setOpen, placement: 'top', whileElementsMounted: autoUpdate, middleware: [offset(8), flip({ fallbackAxisSideDirection: 'start' }), shift({ padding: 8 })] })
    const { getReferenceProps, getFloatingProps } = useInteractions([useHover(context, { move: false, delay: { open: 180, close: 120 }, handleClose: safePolygon({ buffer: 2 }) }), useFocus(context), useDismiss(context), useRole(context, { role: 'dialog' })])
    const stop = (e) => e.stopPropagation() // the card lives inside rows and cards that react to clicks and drags themselves
    const go = (e) => { e.stopPropagation(); e.preventDefault(); if (id) { setOpen(false); navigate(`/crm/staff/${id}`) } }
    return (
        <>
            <span ref={refs.setReference} {...getReferenceProps()} className="tooltip-wrapper inline-flex">{children}</span>
            {open && (
                <FloatingPortal>
                    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 100003 }} {...getFloatingProps()} onClick={stop} onMouseDown={stop} onPointerDown={stop}>
                        <div role={id ? 'link' : undefined} tabIndex={id ? 0 : undefined} onClick={go} onKeyDown={(e) => { if (e.key === 'Enter') go(e) }} className={`profile-tip group/card rounded-2xl border border-white/70 bg-white/70 p-3.5 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 transition dark:border-white/10 dark:bg-gray-900/70 dark:ring-white/5 ${id ? 'cursor-pointer hover:ring-primary/40' : ''}`}>
                            <ProfileCard name={name} person={person} score={score} link={!!id} />
                        </div>
                    </div>
                </FloatingPortal>
            )}
        </>
    )
}

/** The profile card on any picture of a team member (no score ring): `id` is the member. Without an id the picture is shown as it is. */
export const StaffTip = ({ id, name, children }) => {
    const { people, scores } = useCards()
    if (!id) return children
    return <ProfileTip id={id} name={name} person={people[id]} score={scores[id]}>{children}</ProfileTip>
}

/**
 * A team member's picture with their score ring around it (when the viewer may see scores).
 * Put the avatar inside; `size` is the avatar's size. Hovering shows the profile card: who they are, their points, their score.
 */
const StaffRing = ({ id, name, size = 28, children }) => {
    const { people, scores } = useCards()
    const s = id ? scores[id] : null
    const person = id ? people[id] : null
    if (!s && !person && !name) return children
    const w = size >= 40 ? 3 : 2
    return <ProfileTip id={id} name={name} person={person} score={s}>{s ? <ScoreRing tip={false} score={s} size={size + 2 * (w + 1)} width={w}>{children}</ScoreRing> : <span className="inline-flex">{children}</span>}</ProfileTip>
}

export default StaffRing
