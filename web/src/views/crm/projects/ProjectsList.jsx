import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { TbClipboardCheck, TbStar, TbStarFilled, TbSearch, TbCalendar } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { api, qs } from '../kit/api'
import ProjectDialog from './ProjectDialog'
import { STATUS, StatusTag, Bar, fmt } from './shared'
import { tr } from '@/utils/t'

const FAV_KEY = 'projects.favourites'
const readFav = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] } }

const members = (p) => p.members.map((m) => ({ id: m.id, name: m.name, img: m.image }))
const Tasks = ({ p }) => <div className="inline-flex items-center rounded-full border border-gray-300 px-2 py-1 text-xs font-semibold dark:border-gray-600"><TbClipboardCheck className="text-base" /><span className="ml-1 whitespace-nowrap">{p.tasksDone} / {p.tasksTotal}</span></div>

const ProjectsList = () => {
    const nav = useNavigate()
    const [data, setData] = useState({ list: [], counts: {}, can: {} })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState(null)
    const [fav, setFav] = useState(readFav)
    const [dialog, setDialog] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/work/projects?${qs({ query, status: status?.value })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, status])
    useEffect(() => { load() }, [load])

    const toggle = (id) => setFav((f) => { const n = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; try { localStorage.setItem(FAV_KEY, JSON.stringify(n)) } catch { /* private mode */ } return n })
    const favs = useMemo(() => data.list.filter((p) => fav.includes(p.id)), [data.list, fav])
    const others = useMemo(() => data.list.filter((p) => !fav.includes(p.id)), [data.list, fav])
    const opts = STATUS.map((s) => ({ value: s.value, label: `${s.label}${data.counts[s.value] ? ` (${data.counts[s.value]})` : ''}` }))

    return (
        <Container>
            <div className="flex items-center justify-between gap-4">
                <div><div className="mb-1 text-sm text-gray-500"><Link to="/crm/projects" className="hover:text-primary">{tr("Projects")}</Link></div><h3>{tr("All projects")}</h3></div>
                {data.can.create && <Button variant="solid" onClick={() => setDialog(true)}>{tr("Create project")}</Button>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search projects")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-52"><Select size="sm" isClearable placeholder={tr("All statuses")} options={opts} value={status ? opts.find((o) => o.value === status.value) : null} onChange={(o) => setStatus(o)} /></div>
            </div>
            {error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            {loading ? <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Card key={i}><Skeleton height={90} /></Card>)}</div> : (
                <>
                    {favs.length > 0 && (
                        <div className="mt-8">
                            <h5 className="mb-3">{tr("Favorite")}</h5>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {favs.map((p) => (
                                    <Card key={p.id} bodyClass="h-full">
                                        <div className="flex h-full flex-col justify-between">
                                            <div className="flex items-center justify-between gap-2">
                                                <Link to={`/crm/projects/${p.id}`}><h6 className="font-bold hover:text-primary">{p.name}</h6></Link>
                                                <div className="cursor-pointer text-lg text-amber-400" role="button" onClick={() => toggle(p.id)}><TbStarFilled /></div>
                                            </div>
                                            <p className="mt-3 text-sm text-gray-500">{p.client?.name || tr("No client")}</p>
                                            <div className="mt-3">
                                                <Bar value={p.progress} />
                                                <div className="mt-2 flex items-center justify-between"><UsersAvatarGroup users={members(p)} /><Tasks p={p} /></div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-8">
                        <h5 className="mb-3">{favs.length ? tr("Other projects") : tr("All projects")}</h5>
                        <div className="flex flex-col gap-4">
                            {others.map((p) => (
                                <Card key={p.id}>
                                    <div className="grid grid-cols-12 gap-x-4">
                                        <div className="col-span-12 my-1 sm:col-span-4 sm:my-0 md:flex md:items-center lg:col-span-3">
                                            <div className="flex flex-col"><h6 className="font-bold hover:text-primary"><Link to={`/crm/projects/${p.id}`}>{p.name}</Link></h6><span className="text-sm">{p.client?.name || tr("No client")}</span></div>
                                        </div>
                                        <div className="col-span-12 my-1 flex flex-wrap items-center gap-3 sm:col-span-4 sm:my-0 lg:col-span-3">
                                            <StatusTag status={p.status} />
                                            {p.deadline && <span className={`inline-flex items-center gap-1 text-xs ${p.overdue ? 'font-semibold text-red-500' : 'text-gray-500'}`}><TbCalendar />{fmt(p.deadline, 'DD MMM YYYY')}</span>}
                                        </div>
                                        <div className="col-span-12 my-1 sm:my-0 md:col-span-3 md:flex md:items-center lg:col-span-2"><div className="w-full"><Bar value={p.progress} /></div></div>
                                        <div className="col-span-6 my-1 sm:my-0 md:col-span-2 md:flex md:items-center"><UsersAvatarGroup users={members(p)} /></div>
                                        <div className="col-span-6 my-1 flex items-center justify-end gap-3 sm:my-0 lg:col-span-1"><Tasks p={p} /><div className="cursor-pointer text-lg" role="button" onClick={() => toggle(p.id)}><TbStar /></div></div>
                                    </div>
                                </Card>
                            ))}
                            {!others.length && !favs.length && <Card><div className="py-6 text-center text-gray-500">{tr("No projects")} {status ? tr("with status “{v1}”", { v1: status.label.replace(/ \(\d+\)$/, '') }) : tr("found")}.</div></Card>}
                        </div>
                    </div>
                </>
            )}
            <ProjectDialog open={dialog} onClose={() => setDialog(false)} onCreated={(id) => nav(`/crm/projects/${id}`)} />
        </Container>
    )
}

export default ProjectsList
