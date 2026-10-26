import { useCallback, useEffect, useState } from 'react'
import { usePageRange } from '@/store/pageFilterStore'
import { StatTile, TileGrid, StatusPills } from '@/components/crm/ListHeader'
import { useRegisterCurrency } from '@/store/pageFilterStore'
import { TbReceipt2, TbCash, TbHourglass, TbAlertTriangle, TbCircleCheck, TbFileText, TbCopy } from 'react-icons/tb'
import { useNavigate } from 'react-router'
import { TbPlus, TbSearch, TbDots, TbPercentage, TbExternalLink, TbPencil, TbDownload, TbMail, TbArrowsExchange, TbTrash, TbBan, TbSend, TbFileText as TbDraft } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Dialog from '@/components/ui/Dialog'
import RowMenu from '@/components/crm/RowMenu'
import SendMailDialog from '../mail/SendMailDialog'
import { InvoiceHead, InvoiceCash } from './InvoiceInsights'
import { compact } from '../kit/charts'
import { api as apiCall, notify } from '../kit/api'
import { useSessionUser } from '@/store/authStore'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import dayjs from 'dayjs'
import cn from '@/utils/classNames'
import { api, qs, useCan } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { useClientLookups, makeMoney } from '../clients/shared'
import { STATUS, StatusTag, fmtDate } from './shared'
import { tr } from '@/utils/t'
import { moneyChange } from '../kit/widgets'

const { Tr, Th, Td, THead, TBody } = Table
const ORDER = [6, 1, 3, 4, 2, 5]

const InvoicesList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [data, setData] = useState({ list: [], total: 0, stats: { counts: {}, money: {} } })
    const [status, setStatus] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [range] = usePageRange('invoices')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [sort, setSort] = useState({ key: 'date', order: 'desc' })
    const [cur, setCur] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [menu, setMenu] = useState(null) // { row, el }
    const [payFor, setPayFor] = useState(null)
    const [pay, setPay] = useState({ amount: '', paymentModeId: null, paymentDate: dayjs().format('YYYY-MM-DD'), note: '', transactionId: '' })
    const [modes, setModes] = useState([])
    const [mail, setMail] = useState(null) // { id, template }
    const [confirm, setConfirm] = useState(null) // { row, kind }
    const [busy, setBusy] = useState(false)
    const [caution, setCaution] = useState(null) // a paid invoice a super admin is about to change: { row, fn }
    const authority = useSessionUser((st) => st.user.authority) || []
    const superAdmin = authority.includes('admin') || authority.includes('crm.admin')
    const pageSize = 15

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const d = await api(`/api/crm/sales/invoices?${qs({ query, status, clientId, from: range[0] && dayjs(range[0]).format('YYYY-MM-DD'), to: range[1] && dayjs(range[1]).format('YYYY-MM-DD'), pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`)
            setData(d)
            setCur((c) => c || Object.keys(d.stats.money)[0] || null)
            setError('')
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [query, status, clientId, range, page, sort])
    useEffect(() => { load() }, [load])

    const act = async (fn, ok) => { try { await fn(); notify('success', ok); load() } catch (e) { notify('danger', e.message) } }
    // a paid invoice is final: only a super admin can change it, and only after confirming (the server demands it too)
    const guard = (row, fn) => () => (row.status === 2 ? setCaution({ row, fn }) : fn(false))
    const state = (row, action, ok, force) => act(() => apiCall(`/api/crm/sales/invoices/${row.id}/state`, { method: 'POST', body: { action, force } }), ok)
    const openPay = async (row) => {
        if (!modes.length) apiCall('/api/crm/sales/lookups').then((l) => setModes(l.paymentModes || [])).catch(() => {})
        setPay({ amount: row.due || '', paymentModeId: null, paymentDate: dayjs().format('YYYY-MM-DD'), note: '', transactionId: '' })
        setPayFor(row)
    }
    const menuItems = (r) => {
        const cancelled = r.status === 5, draft = r.status === 6, paidFinal = r.status === 2
        const mayChange = !paidFinal || superAdmin
        return [
            ...(can('payments', 'create') && !cancelled && !draft && r.due > 0 ? [{ label: tr("Record payment"), icon: <TbCash />, onClick: () => openPay(r) }] : []),
            { label: tr("Open"), icon: <TbExternalLink />, onClick: () => navigate(`/crm/invoices/${r.id}`) },
            ...(can('invoices', 'create') ? [{ label: tr("Duplicate"), icon: <TbCopy />, onClick: () => navigate(`/crm/invoices/new?from=${r.id}`) }] : []),
            ...(can('invoices', 'edit') && !cancelled && mayChange ? [{ label: tr("Edit"), icon: <TbPencil />, onClick: guard(r, () => navigate(`/crm/invoices/${r.id}/edit`)) }] : []),
            { label: tr("Download"), icon: <TbDownload />, onClick: () => { window.location.href = `/api/crm/sales/invoices/${r.id}/pdf?download=1` } },
            ...(can('invoices', 'edit') && !draft && !cancelled ? [{ label: tr("Send"), icon: <TbMail />, onClick: () => setMail({ id: r.id, template: 'invoice-send-to-client' }) }] : []),
            ...(can('invoices', 'edit') && mayChange ? [{ label: tr("Change status"), icon: <TbArrowsExchange />, sub: [
                { label: tr("Draft"), icon: <TbDraft />, checked: draft, onClick: guard(r, (force) => !draft && state(r, 'draft', tr("Moved back to draft"), force)) },
                { label: tr("Sent"), icon: <TbSend />, checked: !draft && !cancelled && r.sent, onClick: guard(r, (force) => (cancelled ? state(r, 'uncancel', tr("Invoice reopened"), force) : state(r, 'markSent', tr("Marked as sent"), force))) },
                { label: tr("Cancel"), icon: <TbBan />, checked: cancelled, danger: true, onClick: guard(r, (force) => !cancelled && setConfirm({ row: r, kind: 'cancel', force })) },
            ] }] : []),
            ...(can('invoices', 'delete') && mayChange ? [{ label: tr("Delete"), icon: <TbTrash />, danger: true, after: true, onClick: guard(r, (force) => setConfirm({ row: r, kind: 'delete', force })) }] : []),
        ]
    }
    // short money for the charts: 12.5K, 1.2M, with the currency
    const short = (v) => {
        const c = lookups.currencies.find((x) => x.id === cur) || (cur === 'all' ? lookups.currencies.find((x) => x.isDefault) || lookups.currencies[0] : undefined)
        const sym = c?.symbol || c?.name || '', n = compact(v)
        return c?.placement === 'after' ? `${n} ${sym}` : `${sym ? sym + ' ' : ''}${n}`
    }
    const sortBy = (key) => setSort((s) => (s.key === key ? { key, order: s.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
    const th = (key, label, right) => <Th className={cn('cursor-pointer select-none', right && 'text-right')} onClick={() => sortBy(key)}>{label}{sort.key === key ? (sort.order === 'asc' ? ' ↑' : ' ↓') : ''}</Th>
    const m = data.stats.money[cur]
    const tc = (metric, goodUp) => moneyChange(data.stats.trend, cur, metric, goodUp)
    const currencies = Object.keys(data.stats.money)
    useRegisterCurrency(currencies.map((k) => ({ id: k, name: lookups.currencies.find((x) => x.id === k)?.name || '?' })), cur, setCur)

    return (
        <Container>
            <InvoiceHead
                title={tr("Invoices")}
                action={can('invoices', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => navigate('/crm/invoices/new')}>{tr("New invoice")}</Button>}
                stats={[
                    { icon: <TbCash />, label: tr("Revenue"), value: m ? money(m.paid, cur) : '—' },
                    { icon: <TbReceipt2 />, label: tr("Invoices"), value: String(Object.entries(data.stats.counts).filter(([k]) => ![5, 6].includes(+k)).reduce((n, [, v]) => n + v, 0)), badge: data.stats.counts[4] ? <span className="badge badge--tomato">{tr("{n} overdue", { n: data.stats.counts[4] })}</span> : null },
                    { icon: <TbPercentage />, label: tr("Cash flow"), value: m ? money(m.outstanding, cur) : '—' },
                ]}
            />

            {m && (
                <TileGrid cols={4}>
                    <StatTile title={tr("Invoiced")} change={tc('invoiced')} className="bg-sky-100" value={money(m.invoiced, cur)} icon={<TbReceipt2 />} sub={tr("Drafts and cancelled not counted")} />
                    <StatTile title={tr("Paid")} change={tc('paid')} className="bg-emerald-100" value={money(m.paid, cur)} icon={<TbCash />} />
                    <StatTile title={tr("Outstanding")} change={tc('outstanding', false)} className="bg-purple-100" value={money(m.outstanding, cur)} icon={<TbHourglass />} />
                    <StatTile title={tr("Overdue")} change={tc('overdue', false)} className={m.overdue > 0 ? 'bg-red-100' : 'bg-amber-100'} value={money(m.overdue, cur)} icon={<TbAlertTriangle />} sub={tr("For the current filters")} />
                </TileGrid>
            )}

            {m && data.stats.series?.[cur] && <InvoiceCash series={data.stats.series[cur]} money={(v) => money(v, cur)} moneyShort={short} />}

            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-60"><RelationSelect size="sm" placeholder={tr("Choose a client")} resource="clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1) }} /></div>
                    <StatusPills inline order={ORDER} labels={Object.fromEntries(ORDER.map((s) => [s, STATUS[s].label]))} counts={data.stats.counts} value={status} onChange={(s) => { setStatus(s); setPage(1) }} />
                    <div className="w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search number or client")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="overflow-x-auto">
                    <Table hoverable>
                        <THead><Tr>{th('number', tr("Invoice"))}{th('client', tr("Client"))}{th('date', tr("Date"))}{th('dueDate', tr("Due date"))}{th('total', tr("Amount"), true)}<Th className="text-right">{tr("Paid")}</Th>{th('due', tr("Balance"), true)}{th('status', tr("Status"))}<Th className="w-12" /></Tr></THead>
                        <TBody>
                            {data.list.map((r) => (
                                <Tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/crm/invoices/${r.id}`)}>
                                    <Td className="whitespace-nowrap font-semibold heading-text">{r.number}</Td>
                                    <Td className="max-w-[240px] truncate">{r.client}</Td>
                                    <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                                    <Td className={cn('whitespace-nowrap', r.status === 4 && 'text-red-500')}>{fmtDate(r.dueDate)}</Td>
                                    <Td className="text-right tabular-nums">{money(r.total, r.currencyId)}</Td>
                                    <Td className="text-right tabular-nums text-gray-500">{r.paid ? money(r.paid, r.currencyId) : '—'}</Td>
                                    <Td className="text-right tabular-nums">{r.due ? money(r.due, r.currencyId) : '—'}</Td>
                                    <Td><StatusTag status={r.status} />{!r.sent && r.status === 1 && <span className="ml-1.5 text-xs text-gray-400">{tr("not sent")}</span>}</Td>
                                    <Td className="text-right" onClick={(e) => e.stopPropagation()}><button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-gray-500 transition hover:rotate-90 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={tr("Actions")} aria-haspopup="menu" onClick={(e) => setMenu({ row: r, el: e.currentTarget })}><TbDots /></button></Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("No invoices found")}</div>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">{data.total ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, data.total), total: data.total }) : ''}</span>
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                </div>
            </AdaptiveCard>

            {menu && <RowMenu anchor={menu.el} items={menuItems(menu.row)} onClose={() => setMenu(null)} />}
            <SendMailDialog open={!!mail} kind="invoice" id={mail?.id} template={mail?.template} onClose={() => setMail(null)} onSent={load} />
            <Dialog isOpen={!!payFor} onClose={() => setPayFor(null)} onRequestClose={() => setPayFor(null)}>
                <h5 className="mb-1">{tr("Record payment")}</h5>
                <p className="mb-4 text-sm text-gray-500">{payFor?.number} · {payFor?.client}</p>
                <div className="flex flex-col gap-3">
                    <div><label className="form-label mb-2 block">{tr("Amount (max")} {payFor ? money(payFor.due, payFor.currencyId) : ''})</label><Input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Payment date")}</label><Input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Payment mode")}</label><Select isClearable options={modes.map((m) => ({ value: m.id, label: m.name }))} value={modes.filter((m) => m.id === pay.paymentModeId).map((m) => ({ value: m.id, label: m.name }))[0] || null} onChange={(o) => setPay({ ...pay, paymentModeId: o?.value || null })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Transaction id")}</label><Input value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Note")}</label><Input textArea rows={2} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setPayFor(null)}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} onClick={async () => { setBusy(true); try { await apiCall(`/api/crm/sales/invoices/${payFor.id}/payments`, { method: 'POST', body: pay }); notify('success', tr("Payment recorded")); setPayFor(null); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) } }}>{tr("Save")}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!caution} type="warning" title={tr("This invoice is paid")} confirmText={tr("Change it anyway")} onClose={() => setCaution(null)} onCancel={() => setCaution(null)} onConfirm={() => { const c = caution; setCaution(null); c.fn(true) }}>
                <p>{caution?.row?.number} · {caution?.row?.client}</p>
                <p className="mt-2 text-sm text-red-600">{tr("A paid invoice is final. Changing it can upset your accounts and reports. Only a super admin can do it, and only if you know why.")}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!confirm} type={confirm?.kind === 'delete' ? 'danger' : 'warning'} title={confirm?.kind === 'delete' ? tr("Delete this invoice?") : tr("Cancel this invoice?")} confirmText={confirm?.kind === 'delete' ? tr("Delete") : tr("Cancel invoice")} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)}
                onConfirm={() => { const c = confirm; setConfirm(null); if (c.kind === 'delete') act(() => apiCall(`/api/crm/sales/invoices/${c.row.id}${superAdmin ? '?force=1' : ''}`, { method: 'DELETE' }), tr("Invoice deleted")); else state(c.row, 'cancel', tr("Invoice cancelled"), c.force) }}>
                <p>{confirm?.row?.number} · {confirm?.row?.client}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default InvoicesList
