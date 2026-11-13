import { useCallback, useEffect, useState } from 'react'
import { TbKey, TbPlus } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import { api, qs } from '../kit/api'
import EntryDrawer from '../vault/EntryDrawer'
import { EntryCard } from '../vault/PasswordVault'
import { tr } from '@/utils/t'

/* The logins kept for this customer: the entries of the team Password vault that are linked to it (same sharing rules, same logged reveals). */
const ClientPasswords = ({ clientId }) => {
    const [data, setData] = useState({ list: [], categories: [], staff: [], can: {} })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: false, id: null })
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/vault/entries?${qs({ clientId })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [clientId])
    useEffect(() => { load() }, [load])
    const open = (id) => setDrawer({ open: true, id })
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500">{tr("Logins kept for this customer (website, hosting, social accounts...). Passwords are encrypted and every reveal is logged.")}</p>
                {data.can.create && <Button variant="solid" size="sm" icon={<TbPlus />} onClick={() => open(null)}>{tr("New entry")}</Button>}
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.list.map((e) => <EntryCard key={e.id} e={e} onOpen={open} api={api} />)}
            </div>
            {!loading && !data.list.length && !error && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-gray-500"><TbKey className="text-5xl text-gray-300" /><h5>{tr("No logins for this customer yet")}</h5>{data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("Add the first entry")}</Button>}</div>
            )}
            <EntryDrawer open={drawer.open} id={drawer.id} categories={data.categories} staff={data.staff} presets={{ clientId, access: 'team' }} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} onCategories={load} />
        </div>
    )
}

export default ClientPasswords
