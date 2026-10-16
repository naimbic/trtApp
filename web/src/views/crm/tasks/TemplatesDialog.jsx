import { useCallback, useEffect, useState } from 'react'
import { TbPlus, TbTrash, TbPlayerPlay, TbListCheck, TbHierarchy2 } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { api, notify } from '../kit/api'
import { PRIORITY } from './shared'
import { tr, trn } from '@/utils/t'

const lines = (text) => String(text || '').split('\n').map((x) => x.trim()).filter(Boolean)
// subtasks, one per line: "Name" or "Name | 3" (due 3 days after the start)
const parseSubtasks = (text) => lines(text).map((l) => { const [name, d] = l.split('|'); return { name: name.trim(), dueInDays: parseInt(d, 10) || 0 } })

/** Task templates: use one (creates the task with its checklist and subtasks) or keep a new one. */
const TemplatesDialog = ({ isOpen, onClose, onUsed, context = {} }) => {
    const [list, setList] = useState([])
    const [form, setForm] = useState(null)
    const [busy, setBusy] = useState('')
    const load = useCallback(() => api('/api/crm/work/task-templates').then((r) => setList(r.list || [])).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { if (isOpen) { load(); setForm(null) } }, [isOpen, load])

    const use = async (t) => {
        setBusy(t.id)
        try { const r = await api('/api/crm/work/task-templates/use', { method: 'POST', body: { templateId: t.id, ...context } }); notify('success', tr('Task created from the template')); onClose(); onUsed?.(r.id) } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const remove = async (t) => { try { await api(`/api/crm/work/task-templates/${t.id}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        try {
            await api('/api/crm/work/task-templates', { method: 'POST', body: { name: form.name, description: form.description, priority: form.priority, dueInDays: form.dueInDays, checklist: lines(form.checklist), subtasks: parseSubtasks(form.subtasks) } })
            setForm(null); load(); notify('success', tr('Template saved'))
        } catch (e) { notify('danger', e.message) }
    }

    return (
        <Dialog isOpen={isOpen} width={620} onClose={onClose} onRequestClose={onClose}>
            <div className="mb-4 flex items-center justify-between pr-8"><h5>{tr('Task templates')}</h5>{!form && <Button size="sm" icon={<TbPlus />} onClick={() => setForm({ name: '', description: '', priority: 2, dueInDays: 0, checklist: '', subtasks: '' })}>{tr('New template')}</Button>}</div>
            {form ? (
                <div className="space-y-3">
                    <Input autoFocus placeholder={tr('Template name, e.g. Website launch')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <Input textArea rows={2} placeholder={tr('Description (optional)')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                        <div><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Priority')}</div><Select size="sm" isSearchable={false} menuPortalTarget={document.body} menuPosition="fixed" options={Object.entries(PRIORITY).map(([v, l]) => ({ value: +v, label: l }))} value={{ value: form.priority, label: PRIORITY[form.priority] }} onChange={(o) => setForm({ ...form, priority: o.value })} /></div>
                        <div><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Due after (days)')}</div><Input size="sm" type="number" min="0" value={form.dueInDays} onChange={(e) => setForm({ ...form, dueInDays: e.target.value })} /></div>
                    </div>
                    <div><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Checklist, one item per line')}</div><Input textArea rows={3} value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} /></div>
                    <div><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Subtasks, one per line (add " | 3" for a due date 3 days after the start)')}</div><Input textArea rows={3} value={form.subtasks} onChange={(e) => setForm({ ...form, subtasks: e.target.value })} /></div>
                    <div className="flex justify-end gap-2"><Button onClick={() => setForm(null)}>{tr('Cancel')}</Button><Button variant="solid" disabled={!form.name.trim()} onClick={save}>{tr('Save template')}</Button></div>
                </div>
            ) : (
                <div className="max-h-[420px] space-y-2 overflow-y-auto">
                    {list.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-600">
                            <div className="min-w-0 flex-1"><div className="truncate font-bold heading-text">{t.name}</div><div className="flex gap-3 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><TbListCheck />{trn(t.checklist.length, 'checklist item')}</span><span className="inline-flex items-center gap-1"><TbHierarchy2 />{trn(t.subtasks.length, 'subtask')}</span></div></div>
                            <Button size="xs" variant="solid" icon={<TbPlayerPlay />} loading={busy === t.id} onClick={() => use(t)}>{tr('Use')}</Button>
                            <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => remove(t)} />
                        </div>
                    ))}
                    {!list.length && <p className="py-8 text-center text-sm text-gray-400">{tr('No template yet. Create one, or open a task and choose "Save as template".')}</p>}
                </div>
            )}
        </Dialog>
    )
}

export default TemplatesDialog
