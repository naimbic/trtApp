'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import Dialog from '@/components/ui/Dialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    TbMail, TbMailOpened, TbSearch, TbRefresh,
    TbInbox, TbEye,
    TbEdit, TbTrash,
    TbChevronUp, TbChevronDown, TbSelector,
} from 'react-icons/tb'

const { Tr, Th, Td, THead, TBody } = Table

const PAGE_SIZE = 15

const formColors = {
    contact: 'bg-blue-500',
    'audit-seo': 'bg-emerald-500',
    'audit-ads': 'bg-amber-500',
    'audit-web': 'bg-purple-500',
    'audit-social': 'bg-pink-500',
    'audit-aeo': 'bg-cyan-500',
    'audit-analytics': 'bg-indigo-500',
    'audit-gratuit': 'bg-teal-500',
    newsletter: 'bg-orange-500',
    lead: 'bg-red-500',
    candidature: 'bg-lime-600',
}

const formOptions = [
    { value: 'contact', label: 'Contact' },
    { value: 'audit-seo', label: 'Audit SEO' },
    { value: 'audit-ads', label: 'Audit Ads' },
    { value: 'audit-web', label: 'Audit Web' },
    { value: 'audit-social', label: 'Audit Social' },
    { value: 'audit-aeo', label: 'Audit AEO' },
    { value: 'audit-analytics', label: 'Audit Analytics' },
    { value: 'audit-gratuit', label: 'Audit Gratuit' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'lead', label: 'Lead' },
    { value: 'candidature', label: 'Candidature' },
]

const Page = () => {
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [readFilter, setReadFilter] = useState('all')
    const [siteFilter, setSiteFilter] = useState('all')
    const [sort, setSort] = useState({ key: 'date', dir: 'desc' })
    const [page, setPage] = useState(1)
    const [detail, setDetail] = useState(null)
    const [editItem, setEditItem] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [selected, setSelected] = useState(new Set())
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = readFilter !== 'all' ? `?read=${readFilter === 'read'}` : ''
            const res = await fetch(`/api/submissions${params}`, { cache: 'no-store' })
            const json = await res.json()
            setSubmissions(Array.isArray(json.data) ? json.data : [])
        } catch { setSubmissions([]) }
        setLoading(false)
    }, [readFilter])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { setPage(1) }, [search, readFilter, siteFilter, sort])

    // Site categories: each site slug with its submission count (for the filter chips)
    const siteCategories = useMemo(() => {
        const m = {}
        submissions.forEach(s => { const k = s.site || 'trtmaroc'; m[k] = (m[k] || 0) + 1 })
        return [
            { value: 'all', label: 'All sites', count: submissions.length },
            ...Object.keys(m).sort().map(k => ({ value: k, label: k, count: m[k] })),
        ]
    }, [submissions])

    const toggleSort = (key) => setSort(cur =>
        cur.key === key
            ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
            : { key, dir: key === 'date' ? 'desc' : 'asc' }
    )
    const sortIcon = (k) => sort.key === k
        ? (sort.dir === 'asc' ? <TbChevronUp size={12} /> : <TbChevronDown size={12} />)
        : <TbSelector size={12} className="opacity-40" />

    const filtered = useMemo(() => {
        let list = submissions
        if (siteFilter !== 'all') list = list.filter(s => (s.site || 'trtmaroc') === siteFilter)
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(s =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q) ||
                (s.form || '').toLowerCase().includes(q) ||
                (s.company || '').toLowerCase().includes(q) ||
                (s.message || '').toLowerCase().includes(q)
            )
        }
        return list
    }, [submissions, search, siteFilter])

    const sorted = useMemo(() => {
        const { key, dir } = sort
        const mul = dir === 'asc' ? 1 : -1
        return [...filtered].sort((a, b) => {
            let av, bv
            if (key === 'date') {
                av = new Date(a.date || 0).getTime(); bv = new Date(b.date || 0).getTime()
            } else if (key === 'site') {
                av = (a.site || 'trtmaroc').toLowerCase(); bv = (b.site || 'trtmaroc').toLowerCase()
            } else {
                av = (a[key] || '').toString().toLowerCase(); bv = (b[key] || '').toString().toLowerCase()
            }
            if (av < bv) return -1 * mul
            if (av > bv) return 1 * mul
            return 0
        })
    }, [filtered, sort])

    const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const unreadCount = submissions.filter(s => !s.read).length
    const totalCount = submissions.length

    const markRead = async (id, read) => {
        try {
            await fetch(`/api/submissions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ read }),
            })
            setSubmissions(prev => prev.map(s => s.id === id ? { ...s, read } : s))
            if (detail?.id === id) setDetail(d => ({ ...d, read }))
            toast.push(<Notification type="success" title={read ? 'Marked as read' : 'Marked as unread'} />)
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to update</Notification>)
        }
    }

    const openDetail = (s) => {
        setDetail(s)
        if (!s.read) markRead(s.id, true)
    }

    const openEdit = (s) => {
        setEditItem({ ...s })
    }

    const saveEdit = async () => {
        if (!editItem) return
        setSaving(true)
        try {
            const res = await fetch(`/api/submissions/${editItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editItem.name,
                    email: editItem.email,
                    phone: editItem.phone,
                    company: editItem.company,
                    website: editItem.website,
                    needs: editItem.needs,
                    budget: editItem.budget,
                    deadline: editItem.deadline,
                    message: editItem.message,
                    form: editItem.form,
                }),
            })
            const json = await res.json()
            if (json.data) {
                setSubmissions(prev => prev.map(s => s.id === editItem.id ? json.data : s))
                if (detail?.id === editItem.id) setDetail(json.data)
                toast.push(<Notification type="success" title="Updated">Submission updated</Notification>)
            }
            setEditItem(null)
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to update</Notification>)
        }
        setSaving(false)
    }

    const deleteItem = async () => {
        if (!deleteConfirm) return
        const id = deleteConfirm.id
        setDeleteConfirm(null)
        try {
            await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
            setSubmissions(prev => prev.filter(s => s.id !== id))
            if (detail?.id === id) setDetail(null)
            toast.push(<Notification type="success" title="Deleted">Submission removed</Notification>)
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to delete</Notification>)
        }
    }

    const toggleSelect = (id) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    const toggleSelectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map(s => s.id)))
        }
    }

    const bulkMarkRead = async (read) => {
        if (!selected.size) return
        const ids = [...selected]
        let ok = 0
        for (const id of ids) {
            try {
                await fetch(`/api/submissions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read }) })
                ok++
            } catch {}
        }
        setSubmissions(prev => prev.map(s => selected.has(s.id) ? { ...s, read } : s))
        setSelected(new Set())
        toast.push(<Notification type="success" title={read ? 'Marked as read' : 'Marked as unread'}>{ok}/{ids.length} updated</Notification>)
    }

    const bulkDelete = async () => {
        setBulkDeleteConfirm(false)
        if (!selected.size) return
        setBulkDeleting(true)
        const ids = [...selected]
        let ok = 0
        for (const id of ids) {
            try {
                await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
                ok++
            } catch {}
        }
        setSubmissions(prev => prev.filter(s => !selected.has(s.id)))
        setSelected(new Set())
        setBulkDeleting(false)
        toast.push(<Notification type="success" title="Bulk Delete">{ok}/{ids.length} deleted</Notification>)
    }

    const fmtDate = (d) => {
        if (!d) return ''
        const dt = new Date(d)
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="flex flex-col gap-4">
            <h4>Submissions</h4>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600"><TbInbox size={20} /></div>
                        <div><div className="text-xs text-gray-500">Total</div><h4>{totalCount}</h4></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600"><TbMail size={20} /></div>
                        <div><div className="text-xs text-gray-500">Unread</div><h4 className="text-red-600">{unreadCount}</h4></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600"><TbMailOpened size={20} /></div>
                        <div><div className="text-xs text-gray-500">Read</div><h4 className="text-emerald-600">{totalCount - unreadCount}</h4></div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                    <Input prefix={<TbSearch className="text-lg" />} placeholder="Search name, email, form..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" size="sm" />
                    <Segment size="sm" value={[readFilter]} onChange={v => { const val = Array.isArray(v) ? v[0] : v; if (val) setReadFilter(val) }}>
                        <Segment.Item value="all">All</Segment.Item>
                        <Segment.Item value="unread">Unread</Segment.Item>
                        <Segment.Item value="read">Read</Segment.Item>
                    </Segment>
                    <Button size="sm" variant="plain" icon={<TbRefresh />} onClick={fetchData}>Refresh</Button>
                </div>
                {/* Site categories — filter by source site */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {siteCategories.map(c => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setSiteFilter(c.value)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                                siteFilter === c.value
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                            }`}
                        >
                            {c.label}
                            <span className={`rounded-full px-1.5 ${siteFilter === c.value ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}`}>{c.count}</span>
                        </button>
                    ))}
                </div>
                {selected.size > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500">{selected.size} selected</span>
                        <Button size="sm" variant="solid" color="emerald" onClick={() => bulkMarkRead(true)}>Mark Read</Button>
                        <Button size="sm" variant="solid" onClick={() => bulkMarkRead(false)}>Mark Unread</Button>
                        <Button size="sm" variant="solid" color="red" loading={bulkDeleting} onClick={() => setBulkDeleteConfirm(true)}>Delete</Button>
                    </div>
                )}
            </Card>

            {/* Table */}
            <Card>
                <div className="overflow-auto">
                    <Table compact>
                        <THead>
                            <Tr>
                                <Th className="w-8"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></Th>
                                <Th className="w-8"></Th>
                                <Th className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                                    <span className="inline-flex items-center gap-1">Name {sortIcon('name')}</span>
                                </Th>
                                <Th className="cursor-pointer select-none" onClick={() => toggleSort('email')}>
                                    <span className="inline-flex items-center gap-1">Email {sortIcon('email')}</span>
                                </Th>
                                <Th className="w-28 cursor-pointer select-none" onClick={() => toggleSort('form')}>
                                    <span className="inline-flex items-center gap-1">Form {sortIcon('form')}</span>
                                </Th>
                                <Th className="w-24 cursor-pointer select-none" onClick={() => toggleSort('site')}>
                                    <span className="inline-flex items-center gap-1">Site {sortIcon('site')}</span>
                                </Th>
                                <Th className="w-36 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                                    <span className="inline-flex items-center gap-1">Date {sortIcon('date')}</span>
                                </Th>
                                <Th className="w-28">Actions</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {loading ? (
                                <Tr><Td colSpan={8} className="text-center py-8 text-gray-400">Loading...</Td></Tr>
                            ) : paged.length === 0 ? (
                                <Tr><Td colSpan={8} className="text-center py-8 text-gray-400">No submissions</Td></Tr>
                            ) : paged.map(s => (
                                <Tr key={s.id} className={!s.read ? 'font-semibold' : 'opacity-75'}>
                                    <Td><Checkbox checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} /></Td>
                                    <Td>{!s.read ? <TbMail className="text-red-500" size={16} /> : <TbMailOpened className="text-gray-400" size={16} />}</Td>
                                    <Td><div className="truncate max-w-[160px]">{s.name || '—'}</div></Td>
                                    <Td><div className="truncate max-w-[200px] text-sm">{s.email || '—'}</div></Td>
                                    <Td><Badge className={formColors[s.form] || 'bg-gray-400'} content={s.form} /></Td>
                                    <Td><span className="text-xs text-gray-500">{s.site || 'trtmaroc'}</span></Td>
                                    <Td><span className="text-xs">{fmtDate(s.date)}</span></Td>
                                    <Td>
                                        <div className="flex gap-0.5">
                                            <Button size="xs" variant="plain" icon={<TbEye />} onClick={() => openDetail(s)} />
                                            <Button size="xs" variant="plain" icon={s.read ? <TbMail /> : <TbMailOpened />} onClick={() => markRead(s.id, !s.read)} />
                                            <Button size="xs" variant="plain" icon={<TbEdit />} onClick={() => openEdit(s)} />
                                            <Button size="xs" variant="plain" className="text-red-400 hover:text-red-600" icon={<TbTrash />} onClick={() => setDeleteConfirm(s)} />
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
                {filtered.length > PAGE_SIZE && (
                    <div className="flex justify-end mt-4">
                        <Pagination total={filtered.length} currentPage={page} pageSize={PAGE_SIZE} onChange={setPage} />
                    </div>
                )}
            </Card>

            {/* Detail Dialog */}
            <Dialog isOpen={!!detail} onClose={() => setDetail(null)} onRequestClose={() => setDetail(null)} width={960}>
                {detail && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <h5>Submission Detail</h5>
                            <Badge className={formColors[detail.form] || 'bg-gray-400'} content={detail.form} />
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            {[
                                ['Site', detail.site],
                                ['Name', detail.name],
                                ['Email', detail.email],
                                ['Phone', detail.phone],
                                ['Company', detail.company],
                                ['Website', detail.website],
                                ['Needs', detail.needs],
                                ['Budget', detail.budget],
                                ['Deadline', detail.deadline],
                                ['Date', fmtDate(detail.date)],
                            ].filter(([,v]) => v).map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                    <span className="text-gray-500 w-20 shrink-0">{k}</span>
                                    <span className="break-all">{v}</span>
                                </div>
                            ))}
                            {detail.page && (
                                <div className="flex gap-2">
                                    <span className="text-gray-500 w-20 shrink-0">Page</span>
                                    <a href={detail.page} target="_blank" rel="noopener noreferrer" className="break-all text-blue-500 hover:underline">{detail.page}</a>
                                </div>
                            )}
                            {detail.message && (
                                <div className="mt-2">
                                    <span className="text-gray-500 block mb-1">Message</span>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 whitespace-pre-wrap">{detail.message}</div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between gap-2 mt-6">
                            <div className="flex gap-2">
                                <Button size="sm" variant="plain" className="text-red-400 hover:text-red-600" icon={<TbTrash />} onClick={() => { setDetail(null); setDeleteConfirm(detail) }}>Delete</Button>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="plain" onClick={() => { setDetail(null); openEdit(detail) }}>
                                    Edit
                                </Button>
                                <Button size="sm" variant="plain" onClick={() => markRead(detail.id, !detail.read)}>
                                    {detail.read ? 'Mark Unread' : 'Mark Read'}
                                </Button>
                                <Button size="sm" variant="solid" onClick={() => setDetail(null)}>Close</Button>
                            </div>
                        </div>
                    </>
                )}
            </Dialog>

            {/* Edit Dialog */}
            <Dialog isOpen={!!editItem} onClose={() => setEditItem(null)} onRequestClose={() => setEditItem(null)} width={520}>
                {editItem && (
                    <>
                        <h5 className="mb-4">Edit Submission</h5>
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                                    <Input size="sm" value={editItem.name || ''} onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                                    <Input size="sm" value={editItem.email || ''} onChange={e => setEditItem({ ...editItem, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                                    <Input size="sm" value={editItem.phone || ''} onChange={e => setEditItem({ ...editItem, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Company</label>
                                    <Input size="sm" value={editItem.company || ''} onChange={e => setEditItem({ ...editItem, company: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Website</label>
                                    <Input size="sm" value={editItem.website || ''} onChange={e => setEditItem({ ...editItem, website: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Form Type</label>
                                    <Select
                                        size="sm"
                                        value={formOptions.find(o => o.value === editItem.form)}
                                        options={formOptions}
                                        onChange={o => setEditItem({ ...editItem, form: o.value })}
                                        isSearchable={false}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Needs</label>
                                <Input size="sm" value={editItem.needs || ''} onChange={e => setEditItem({ ...editItem, needs: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Budget</label>
                                <Input size="sm" value={editItem.budget || ''} onChange={e => setEditItem({ ...editItem, budget: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Deadline</label>
                                <Input size="sm" value={editItem.deadline || ''} onChange={e => setEditItem({ ...editItem, deadline: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Message</label>
                                <Input textArea size="sm" value={editItem.message || ''} onChange={e => setEditItem({ ...editItem, message: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button size="sm" variant="plain" onClick={() => setEditItem(null)}>Cancel</Button>
                            <Button size="sm" variant="solid" loading={saving} onClick={saveEdit}>Save</Button>
                        </div>
                    </>
                )}
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                type="danger"
                title="Delete Submission"
                isOpen={!!deleteConfirm}
                onCancel={() => setDeleteConfirm(null)}
                onConfirm={deleteItem}
                confirmText="Delete"
                cancelText="Cancel"
            >
                <p>Are you sure you want to delete the submission from <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.</p>
            </ConfirmDialog>

            {/* Bulk Delete Confirmation */}
            <ConfirmDialog
                type="danger"
                title="Bulk Delete Submissions"
                isOpen={bulkDeleteConfirm}
                onCancel={() => setBulkDeleteConfirm(false)}
                onConfirm={bulkDelete}
                confirmText="Delete All"
                cancelText="Cancel"
            >
                <p>Are you sure you want to delete <strong>{selected.size} submissions</strong>? This action cannot be undone.</p>
            </ConfirmDialog>
        </div>
    )
}

export default Page
