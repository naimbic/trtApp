import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import { api, notify, qs } from '@/views/crm/kit/api'

/* ---------- picking an image from the file manager ---------- */
const MediaPicker = ({ open, onClose, onPick, kind = 'image' }) => {
    const [list, setList] = useState([])
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        if (!open) return
        const t = setTimeout(async () => {
            setLoading(true)
            try { setList((await api(`/api/crm/media?${qs({ kind, flat: 1, query: q, pageSize: 120 })}`)).list) } catch (e) { notify('danger', e.message) } finally { setLoading(false) }
        }, 250)
        return () => clearTimeout(t)
    }, [open, q, kind])
    return (
        <Dialog isOpen={open} width={760} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-3">Choose from the file manager</h5>
            <Input size="sm" placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
            <div className="grid max-h-[55vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
                {loading && !list.length ? <div className="col-span-full flex h-40 items-center justify-center"><Spinner size={28} /></div> : list.map((m) => (
                    <button key={m.id} type="button" onClick={() => onPick(m)} className="group overflow-hidden rounded-xl border border-gray-200 text-left hover:border-primary dark:border-gray-600">
                        <span className="flex h-24 items-center justify-center bg-gray-50 dark:bg-gray-700">{m.kind === 'image' ? <img src={m.url} alt="" className="h-full w-full object-contain" loading="lazy" /> : <span className="rounded-md bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-gray-500 dark:bg-gray-600">{String(m.name).split('.').pop()}</span>}</span>
                        <span className="block truncate px-2 py-1.5 text-xs">{m.name}</span>
                    </button>
                ))}
                {!loading && !list.length && <p className="col-span-full py-10 text-center text-gray-400">Nothing here yet. Upload in the file manager first, or use Upload.</p>}
            </div>
            <div className="mt-4 flex justify-end"><Button onClick={onClose}>Cancel</Button></div>
        </Dialog>
    )
}


export default MediaPicker
