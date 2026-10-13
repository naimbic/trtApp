import { useState } from 'react'
import Container from '@/components/shared/Container'
import PasswordInput from '@/components/shared/PasswordInput'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { Form, FormItem } from '@/components/ui/Form'
import { apiChangePassword, apiSignOutEverywhere } from '@/services/AuthService'
import { useAuth } from '@/auth'
import { useSessionUser } from '@/store/authStore'

const Security = ({ embedded = false }) => {
    const { signOut } = useAuth()
    const user = useSessionUser((s) => s.user)
    const [v, setV] = useState({ current: '', next: '', confirm: '' })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [confirmAll, setConfirmAll] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        if (v.next.length < 8) return setError('Use at least 8 characters for the new password')
        if (v.next !== v.confirm) return setError('The new passwords do not match')
        setBusy(true)
        try {
            await apiChangePassword({ currentPassword: v.current, newPassword: v.next })
            await signOut() // every session (including this one) is ended after a password change
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Could not change the password')
            setBusy(false)
        }
    }

    const endAll = async () => {
        try {
            await apiSignOutEverywhere()
        } finally {
            setConfirmAll(false)
            await signOut()
        }
    }

    const Wrap = embedded ? 'div' : Container
    return (
        <Wrap>
            {!embedded && (
                <div className="mb-4">
                    <h3>Account security</h3>
                    <p className="text-sm text-gray-500">{user.userName} · {user.email}</p>
                </div>
            )}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                    <h5 className="mb-1">Change password</h5>
                    <p className="mb-5 text-sm text-gray-500">After changing it you are signed out on every device and sign in again with the new password.</p>
                    {error && <Alert showIcon type="danger" className="mb-4">{error}</Alert>}
                    <Form onSubmit={submit}>
                        <FormItem label="Current password">
                            <PasswordInput autoComplete="current-password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} />
                        </FormItem>
                        <FormItem label="New password">
                            <PasswordInput autoComplete="new-password" value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} />
                        </FormItem>
                        <FormItem label="Confirm new password">
                            <PasswordInput autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} />
                        </FormItem>
                        <Button variant="solid" type="submit" loading={busy} disabled={!v.current || !v.next}>Change password</Button>
                    </Form>
                </Card>
                <Card>
                    <h5 className="mb-1">Sign out everywhere</h5>
                    <p className="mb-5 text-sm text-gray-500">Ends your session on every browser and device, including this one. Use it if you lost a device or think someone else got in.</p>
                    <Button onClick={() => setConfirmAll(true)}>Sign out of all devices</Button>
                </Card>
            </div>
            <ConfirmDialog isOpen={confirmAll} type="warning" title="Sign out of all devices?" confirmText="Sign out everywhere" onClose={() => setConfirmAll(false)} onRequestClose={() => setConfirmAll(false)} onCancel={() => setConfirmAll(false)} onConfirm={endAll}>
                <p>You will be signed out here too and need to sign in again.</p>
            </ConfirmDialog>
        </Wrap>
    )
}

export default Security
