/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { TbDots, TbExternalLink, TbPencil, TbDownload, TbMail, TbArrowsExchange, TbTrash, TbFileInvoice } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RowMenu from '@/components/crm/RowMenu'
import SendMailDialog from '../mail/SendMailDialog'
import Table from '@/components/ui/Table'
import { api, notify, useCan } from '../kit/api'
import { tr } from '@/utils/t'

const { Th, Td } = Table

/**
 * The three-dots menu of a document list (estimates, proposals, purchase orders, contracts): Open, Edit, Download, Send, Change status,
 * Convert and Delete, with the pieces each document type has. Returns a header cell, a row cell and the dialogs to render once.
 *   cfg  { path, apiBase, perm, mail:{ kind, template }, statuses:[{ label, action, icon, current(r) }], convert:{ label, perm, when(r), url, body, to(res) },
 *          extra(r, ctx) -> items, remove(r) -> promise, canEdit(r), name(r) }
 */
export const useDocMenu = (cfg, reload) => {
    const navigate = useNavigate()
    const can = useCan()
    const [menu, setMenu] = useState(null)
    const [mail, setMail] = useState(null)
    const [confirm, setConfirm] = useState(null)
    const act = async (fn, ok) => { try { const r = await fn(); notify('success', ok); reload(); return r } catch (e) { notify('danger', e.message) } }
    const state = (r, action, ok) => act(() => api(`${cfg.apiBase}/${r.id}/state`, { method: 'POST', body: { action } }), ok)
    const name = (r) => (cfg.name ? cfg.name(r) : r.number || r.subject || r.name || '')
    const items = (r) => {
        if (cfg.items) return cfg.items(r, { navigate, act, can, confirmDelete: () => setConfirm({ row: r, kind: 'delete' }) })
        const editable = can(cfg.perm, 'edit') && (cfg.canEdit ? cfg.canEdit(r) : true)
        return [
            { label: tr("Open"), icon: <TbExternalLink />, onClick: () => navigate(`${cfg.path}/${r.id}`) },
            ...(editable ? [{ label: tr("Edit"), icon: <TbPencil />, onClick: () => navigate(`${cfg.path}/${r.id}/edit`) }] : []),
            { label: tr("Download"), icon: <TbDownload />, onClick: () => { window.location.href = `${cfg.apiBase}/${r.id}/pdf?download=1` } },
            ...(cfg.mail && editable ? [{ label: tr("Send"), icon: <TbMail />, onClick: () => setMail({ id: r.id }) }] : []),
            ...(cfg.statuses && editable ? [{ label: tr("Change status"), icon: <TbArrowsExchange />, sub: cfg.statuses.map((s) => ({ label: s.label, icon: s.icon, checked: s.current(r), onClick: () => !s.current(r) && state(r, s.action, tr("Status changed")) })) }] : []),
            ...(cfg.convert && can(cfg.convert.perm, 'create') && cfg.convert.when(r) ? [{ label: cfg.convert.label, icon: <TbFileInvoice />, onClick: () => setConfirm({ row: r, kind: 'convert' }) }] : []),
            ...(cfg.extra ? cfg.extra(r, { act, navigate, can }) : []),
            ...(can(cfg.perm, 'delete') ? [{ label: tr("Delete"), icon: <TbTrash />, danger: true, after: true, onClick: () => setConfirm({ row: r, kind: 'delete' }) }] : []),
        ]
    }
    const doConvert = async (r) => {
        const res = await act(() => api(cfg.convert.url(r), { method: 'POST', body: cfg.convert.body }), tr("Invoice created"))
        const to = res && cfg.convert.to?.(res)
        if (to) navigate(to)
    }
    return {
        head: <Th className="w-12" />,
        cell: (r) => (
            <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-gray-500 transition hover:rotate-90 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={tr("Actions")} aria-haspopup="menu" onClick={(e) => setMenu({ row: r, el: e.currentTarget })}><TbDots /></button>
            </Td>
        ),
        dialogs: (
            <>
                {menu && <RowMenu anchor={menu.el} items={items(menu.row)} onClose={() => setMenu(null)} />}
                {cfg.mail && <SendMailDialog open={!!mail} kind={cfg.mail.kind} id={mail?.id} template={cfg.mail.template} onClose={() => setMail(null)} onSent={reload} />}
                <ConfirmDialog isOpen={!!confirm} type={confirm?.kind === 'delete' ? 'danger' : 'info'} title={confirm?.kind === 'delete' ? tr("Delete this document?") : cfg.convert?.label} confirmText={confirm?.kind === 'delete' ? tr("Delete") : tr("Convert")} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)}
                    onConfirm={() => { const c = confirm; setConfirm(null); if (c.kind === 'delete') act(() => (cfg.remove ? cfg.remove(c.row) : api(`${cfg.apiBase}/${c.row.id}`, { method: 'DELETE' })), tr("Deleted")); else doConvert(c.row) }}>
                    <p>{confirm && name(confirm.row)}</p>
                </ConfirmDialog>
            </>
        ),
    }
}
