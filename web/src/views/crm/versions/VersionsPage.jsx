import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PiSparkleDuotone, PiWrenchDuotone, PiGitCommitDuotone, PiTagDuotone, PiCopyDuotone, PiCheckBold, PiMagnifyingGlassDuotone, PiCaretDownBold, PiUserCircleDuotone, PiRocketLaunchDuotone } from 'react-icons/pi'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Tag from '@/components/ui/Tag'
import Timeline from '@/components/ui/Timeline'
import Tooltip from '@/components/ui/Tooltip'
import classNames from '@/utils/classNames'
import { CHANGELOG, VERSION } from '@/configs/changelog'
import commits from '@/configs/versions.generated'
import { tr, trn } from '@/utils/t'

dayjs.extend(relativeTime)
/* eslint-disable no-undef */
const BUILD_COMMIT = __APP_COMMIT__
const BUILT = __APP_BUILT__

const parts = (v) => v.split('.').map(Number)
// a release that raises the major or minor number is a feature release, a patch release is a fix
const kindOf = (v, older) => {
    if (!older) return 'feature'
    const [a, b] = [parts(v), parts(older)]
    return a[0] !== b[0] || a[1] !== b[1] ? 'feature' : 'fix'
}
const KIND = {
    feature: { label: tr("Feature"), icon: <PiSparkleDuotone />, tone: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', tag: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
    fix: { label: tr("Fix"), icon: <PiWrenchDuotone />, tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20', tag: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' },
}

const CommitChip = ({ hash, full }) => {
    const [done, setDone] = useState(false)
    const copy = () => { navigator.clipboard?.writeText(full || hash).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }).catch(() => {}) }
    return (
        <Tooltip title={done ? tr("Copied") : tr("Copy {v1}", { v1: full || hash })}>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 hover:text-primary dark:bg-gray-700 dark:text-gray-300"><PiGitCommitDuotone />{hash}{done ? <PiCheckBold className="text-emerald-500" /> : <PiCopyDuotone className="opacity-50" />}</button>
        </Tooltip>
    )
}

const Release = ({ r, open, toggle }) => {
    const k = KIND[r.kind]
    const c = r.commit
    return (
        <div className="pb-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-base font-bold heading-text">v{r.version}</span>
                <Tag className={k.tag}>{k.label}</Tag>
                {r.current && <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"><PiRocketLaunchDuotone className="mr-1 inline" />{tr("Running now")}</Tag>}
                {(c?.tags || []).map((t) => <Tag key={t} className="bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300"><PiTagDuotone className="mr-1 inline" />{t}</Tag>)}
                <span className="ml-auto text-xs text-gray-400" title={dayjs(r.when).format('YYYY-MM-DD HH:mm')}>{dayjs(r.when).format('MMM D, YYYY')}{c ? ` · ${dayjs(r.when).format('HH:mm')}` : ''} · {dayjs(r.when).fromNow()}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{r.title}</div>
            {c && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
                    <CommitChip hash={c.commit} full={c.full} />
                    <span className="inline-flex items-center gap-1"><PiUserCircleDuotone />{c.author}</span>
                    <span><b className="font-semibold text-emerald-600">+{c.added}</b> <b className="font-semibold text-red-500">−{c.removed}</b> {tr("in")} {trn(c.files, "file")}</span>
                    {c.commits > 1 && <span>{c.commits} {tr("commits")}</span>}
                </div>
            )}
            {!c && r.buildCommit && <div className="mt-2"><CommitChip hash={r.buildCommit} /></div>}
            <button type="button" onClick={toggle} className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary"><PiCaretDownBold className={classNames('transition', open && 'rotate-180')} />{open ? tr("Hide") : tr("Show")} {trn(r.items.length, "change")}</button>
            {open && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">{r.items.map((i) => <li key={i}>{i}</li>)}</ul>}
        </div>
    )
}

const Stat = ({ label, value, sub }) => (
    <Card><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div><div className="mt-1 text-2xl font-bold heading-text">{value}</div>{sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}</Card>
)

const VersionsPage = () => {
    const [q, setQ] = useState('')
    const [kind, setKind] = useState('all')
    const [opened, setOpened] = useState({})
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const all = useMemo(() => CHANGELOG.map((c, i) => {
        const commit = commits[c.version]
        const current = c.version === VERSION
        return { ...c, kind: kindOf(c.version, CHANGELOG[i + 1]?.version), commit, current, buildCommit: current && !commit ? BUILD_COMMIT : null, when: commit?.date || c.date }
    }), [])
    const shown = all.filter((r) => (kind === 'all' || r.kind === kind) && (!q.trim() || `${r.version} ${r.title} ${r.items.join(' ')} ${r.commit?.commit || ''} ${(r.commit?.tags || []).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())))
    const isOpen = (r, i) => opened[r.version] ?? (i < 2 && !q && page === 1)
    const features = all.filter((r) => r.kind === 'feature').length
    const lines = Object.values(commits).reduce((n, c) => ({ a: n.a + c.added, r: n.r + c.removed }), { a: 0, r: 0 })
    const months = []
    const pageRows = shown.slice((page - 1) * pageSize, page * pageSize)
    pageRows.forEach((r) => { const m = dayjs(r.when).format('MMMM YYYY'); if (months[months.length - 1]?.m !== m) months.push({ m, list: [] }); months[months.length - 1].list.push(r) })

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{tr("Versions")}</h3><p className="text-gray-500">{tr("trtCRM v")}{VERSION} {tr("· build")} {BUILD_COMMIT} · {dayjs(BUILT).isValid() ? dayjs(BUILT).format('MMM D, YYYY HH:mm') : BUILT}</p></div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label={tr("Releases")} value={all.length} sub={tr("since {v1}", { v1: dayjs(all[all.length - 1].when).format('MMM YYYY') })} />
                <Stat label={tr("Features")} value={features} sub={tr("{v1} fixes", { v1: all.length - features })} />
                <Stat label={tr("Code changed")} value={`+${lines.a.toLocaleString('en-US')}`} sub={tr("−{v1} lines", { v1: lines.r.toLocaleString('en-US') })} />
                <Stat label={tr("Latest release")} value={dayjs(all[0].when).fromNow()} sub={dayjs(all[0].when).format('MMM D, YYYY')} />
            </div>
            <Card>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-72"><Input size="sm" value={q} prefix={<PiMagnifyingGlassDuotone />} placeholder={tr("Search a version, commit or change")} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
                    <Segment size="sm" value={kind} onChange={(v) => { if (v) { setKind(v); setPage(1) } }}><Segment.Item value="all">{tr("All")}</Segment.Item><Segment.Item value="feature">{tr("Features")}</Segment.Item><Segment.Item value="fix">{tr("Fixes")}</Segment.Item></Segment>
                    <span className="ml-auto text-xs text-gray-400">{shown.length} {tr("of")} {all.length} {tr("releases")}</span>
                </div>
                {months.map((g) => (
                    <div key={g.m} className="mb-2">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{g.m}</div>
                        <Timeline>
                            {g.list.map((r) => (
                                <Timeline.Item key={r.version} media={<Avatar size={28} shape="circle" className={KIND[r.kind].tone}>{KIND[r.kind].icon}</Avatar>}>
                                    <Release r={r} open={isOpen(r, shown.indexOf(r))} toggle={() => setOpened((o) => ({ ...o, [r.version]: !isOpen(r, shown.indexOf(r)) }))} />
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    </div>
                ))}
                {!shown.length && <div className="py-12 text-center text-sm text-gray-400">{tr("No release matches.")}</div>}
                {shown.length ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                        <span className="text-sm text-gray-500">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, shown.length)} {tr("of")} {shown.length}</span>
                        <Pagination total={shown.length} pageSize={pageSize} currentPage={page} onChange={setPage} />
                        <div className="w-36"><Select size="sm" isSearchable={false} menuPlacement="top" options={[5, 10, 20, 50].map((n) => ({ value: n, label: `${n} / page` }))} value={{ value: pageSize, label: `${pageSize} / page` }} onChange={(o) => { setPageSize(o.value); setPage(1) }} /></div>
                    </div>
                ) : null}
            </Card>
        </Container>
    )
}

export default VersionsPage
