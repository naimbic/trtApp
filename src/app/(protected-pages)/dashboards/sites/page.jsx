'use client'
import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Switcher from '@/components/ui/Switcher'
import Dialog from '@/components/ui/Dialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    TbWorld, TbCircleCheck, TbInbox, TbEye,
    TbPlus, TbEdit, TbTrash, TbRefresh, TbKey, TbCopy,
} from 'react-icons/tb'

const { Tr, Th, Td, THead, TBody } = Table

const emptyForm = { name: '', slug: '', domain: '', origins: '', color: '' }

const Page = () => {
    const [sites, setSites] = useState([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [rotateConfirm, setRotateConfirm] = useState(null)
    const [newKey, setNewKey] = useState(null) // { slug, apiKey }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/sites', { cache: 'no-store' })
            const json = await res.json()
            setSites(Array.isArray(json.data) ? json.data : [])
        } catch { setSites([]) }
        setLoading(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const totalLeads = sites.reduce((a, s) => a + (s.leadCount || 0), 0)
    const totalViews = sites.reduce((a, s) => a + (s.viewCount || 0), 0)
    const activeCount = sites.filter(s => s.active).length

    const copyKey = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.push(<Notification type="success" title="Copied" />)
        } catch {
            toast.push(<Notification type="danger" title="Copy failed">Copy manually</Notification>)
        }
    }

    const createSite = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            toast.push(<Notification type="warning" title="Name and slug are required" />)
            return
        }
        setSaving(true)
        try {
            const res = await fetch('/api/sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const json = await res.json()
            if (json.data?.apiKey) {
                setCreateOpen(false)
                setForm(emptyForm)
                setNewKey({ slug: json.data.slug, apiKey: json.data.apiKey })
                fetchData()
            } else {
                toast.push(<Notification type="danger" title="Error">{json.error || 'Failed'}</Notification>)
            }
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to create site</Notification>)
        }
        setSaving(false)
    }

    const saveEdit = async () => {
        if (!editItem) return
        setSaving(true)
        try {
            const res = await fetch(`/api/sites/${editItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editItem.name,
                    domain: editItem.domain,
                    origins: editItem.origins,
                    active: editItem.active,
                }),
            })
            const json = await res.json()
            if (json.data) {
                toast.push(<Notification type="success" title="Saved" />)
                setEditItem(null)
                fetchData()
            } else {
                toast.push(<Notification type="danger" title="Error">{json.error || 'Failed'}</Notification>)
            }
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to save</Notification>)
        }
        setSaving(false)
    }

    const toggleActive = async (site) => {
        try {
            await fetch(`/api/sites/${site.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !site.active }),
            })
            setSites(prev => prev.map(s => s.id === site.id ? { ...s, active: !s.active } : s))
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to update</Notification>)
        }
    }

    const rotateKey = async () => {
        const site = rotateConfirm
        setRotateConfirm(null)
        if (!site) return
        try {
            const res = await fetch(`/api/sites/${site.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotateKey: true }),
            })
            const json = await res.json()
            if (json.data?.apiKey) {
                setNewKey({ slug: json.data.slug, apiKey: json.data.apiKey })
                fetchData()
            }
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to rotate key</Notification>)
        }
    }

    const deleteSite = async () => {
        const site = deleteConfirm
        setDeleteConfirm(null)
        if (!site) return
        try {
            await fetch(`/api/sites/${site.id}`, { method: 'DELETE' })
            setSites(prev => prev.filter(s => s.id !== site.id))
            toast.push(<Notification type="success" title="Deleted" />)
        } catch {
            toast.push(<Notification type="danger" title="Error">Failed to delete</Notification>)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h4>Sites</h4>
                <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => { setForm(emptyForm); setCreateOpen(true) }}>
                    Add Site
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600"><TbWorld size={20} /></div>
                        <div><div className="text-xs text-gray-500">Sites</div><h4>{sites.length}</h4></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600"><TbCircleCheck size={20} /></div>
                        <div><div className="text-xs text-gray-500">Active</div><h4 className="text-emerald-600">{activeCount}</h4></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600"><TbInbox size={20} /></div>
                        <div><div className="text-xs text-gray-500">Total Leads</div><h4>{totalLeads}</h4></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600"><TbEye size={20} /></div>
                        <div><div className="text-xs text-gray-500">Total Views</div><h4>{totalViews}</h4></div>
                    </div>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <div className="flex justify-end mb-2">
                    <Button size="sm" variant="plain" icon={<TbRefresh />} onClick={fetchData}>Refresh</Button>
                </div>
                <div className="overflow-auto">
                    <Table compact>
                        <THead>
                            <Tr>
                                <Th>Site</Th>
                                <Th>Slug</Th>
                                <Th>Domain</Th>
                                <Th className="w-20 text-right">Leads</Th>
                                <Th className="w-20 text-right">Views</Th>
                                <Th>API Key</Th>
                                <Th className="w-20">Active</Th>
                                <Th className="w-32">Actions</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {loading ? (
                                <Tr><Td colSpan={8} className="text-center py-8 text-gray-400">Loading...</Td></Tr>
                            ) : sites.length === 0 ? (
                                <Tr><Td colSpan={8} className="text-center py-8 text-gray-400">No sites yet — add your first spoke site.</Td></Tr>
                            ) : sites.map(s => (
                                <Tr key={s.id}>
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color || '#64748b' }} />
                                            <span className="font-semibold">{s.name}</span>
                                        </div>
                                    </Td>
                                    <Td><code className="text-xs">{s.slug}</code></Td>
                                    <Td><span className="text-sm">{s.domain || '—'}</span></Td>
                                    <Td className="text-right">{s.leadCount}</Td>
                                    <Td className="text-right">{s.viewCount}</Td>
                                    <Td>
                                        {s.hasKey
                                            ? <Badge className="bg-gray-400" content={`${s.apiKeyPrefix}…`} />
                                            : <span className="text-xs text-red-500">no key</span>}
                                    </Td>
                                    <Td><Switcher checked={s.active} onChange={() => toggleActive(s)} /></Td>
                                    <Td>
                                        <div className="flex gap-0.5">
                                            <Button size="xs" variant="plain" icon={<TbEdit />} onClick={() => setEditItem({ ...s, origins: (s.origins || []).join('\n') })} />
                                            <Button size="xs" variant="plain" title="Rotate key" icon={<TbKey />} onClick={() => setRotateConfirm(s)} />
                                            <Button size="xs" variant="plain" className="text-red-400 hover:text-red-600" icon={<TbTrash />} onClick={() => setDeleteConfirm(s)} />
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            </Card>

            {/* Create Dialog */}
            <Dialog isOpen={createOpen} onClose={() => setCreateOpen(false)} onRequestClose={() => setCreateOpen(false)} width={520}>
                <h5 className="mb-4">Add Site</h5>
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Name</label>
                            <Input size="sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="TRT Digital" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Slug</label>
                            <Input size="sm" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="trtdigital" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Domain</label>
                            <Input size="sm" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="trtdigital.com" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Badge color</label>
                            <Input size="sm" type="color" value={form.color || '#2563eb'} onChange={e => setForm({ ...form, color: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Allowed origins (one per line)</label>
                        <Input textArea size="sm" value={form.origins} onChange={e => setForm({ ...form, origins: e.target.value })} placeholder={'https://trtdigital.com\nhttps://www.trtdigital.com'} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button size="sm" variant="plain" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button size="sm" variant="solid" loading={saving} onClick={createSite}>Create</Button>
                </div>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog isOpen={!!editItem} onClose={() => setEditItem(null)} onRequestClose={() => setEditItem(null)} width={520}>
                {editItem && (
                    <>
                        <h5 className="mb-4">Edit {editItem.name}</h5>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Name</label>
                                <Input size="sm" value={editItem.name || ''} onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Domain</label>
                                <Input size="sm" value={editItem.domain || ''} onChange={e => setEditItem({ ...editItem, domain: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Allowed origins (one per line)</label>
                                <Input textArea size="sm" value={editItem.origins || ''} onChange={e => setEditItem({ ...editItem, origins: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switcher checked={!!editItem.active} onChange={() => setEditItem({ ...editItem, active: !editItem.active })} />
                                <span className="text-sm">Active</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button size="sm" variant="plain" onClick={() => setEditItem(null)}>Cancel</Button>
                            <Button size="sm" variant="solid" loading={saving} onClick={saveEdit}>Save</Button>
                        </div>
                    </>
                )}
            </Dialog>

            {/* New key reveal (shown once) */}
            <Dialog isOpen={!!newKey} onClose={() => setNewKey(null)} onRequestClose={() => setNewKey(null)} width={560}>
                {newKey && (
                    <>
                        <h5 className="mb-2">API key for {newKey.slug}</h5>
                        <p className="text-sm text-amber-600 mb-3">
                            Copy this now — it is shown only once and cannot be retrieved again.
                        </p>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded p-3">
                            <code className="text-xs break-all flex-1">{newKey.apiKey}</code>
                            <Button size="xs" variant="solid" icon={<TbCopy />} onClick={() => copyKey(newKey.apiKey)}>Copy</Button>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">
                            Add to the site&apos;s environment:
                            <pre className="bg-gray-50 dark:bg-gray-700 rounded p-3 mt-1 whitespace-pre-wrap">{`TRT_PLATFORM_URL=<this hub URL>\nTRT_PLATFORM_KEY=${newKey.apiKey}`}</pre>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button size="sm" variant="solid" onClick={() => setNewKey(null)}>Done</Button>
                        </div>
                    </>
                )}
            </Dialog>

            <ConfirmDialog
                type="warning"
                title="Rotate API key"
                isOpen={!!rotateConfirm}
                onCancel={() => setRotateConfirm(null)}
                onConfirm={rotateKey}
                confirmText="Rotate"
                cancelText="Cancel"
            >
                <p>Rotating the key for <strong>{rotateConfirm?.name}</strong> immediately invalidates the old key. The site will stop sending data until you update its <code>TRT_PLATFORM_KEY</code>.</p>
            </ConfirmDialog>

            <ConfirmDialog
                type="danger"
                title="Delete site"
                isOpen={!!deleteConfirm}
                onCancel={() => setDeleteConfirm(null)}
                onConfirm={deleteSite}
                confirmText="Delete"
                cancelText="Cancel"
            >
                <p>Delete <strong>{deleteConfirm?.name}</strong>? Its existing leads and analytics stay, but it can no longer send new data. This cannot be undone.</p>
            </ConfirmDialog>
        </div>
    )
}

export default Page
