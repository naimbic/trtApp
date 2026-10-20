/*! © 2026 TRT Digital — trtCRM. */
import { useState } from 'react'
import { TbCopy } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { tr } from '@/utils/t'

export const notify = (type, msg) => toast.push(<Notification type={type}>{msg}</Notification>, { placement: 'top-center' })

export const api = async (url, init) => {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || tr("Request failed ({status})", { status: res.status }))
    return json
}

/**
 * The account actions of a team member shared by the Team list and the staff profile: set a password, reset link,
 * one-time password, sign out everywhere, reset two-step. Open them with setConfirm({ member, kind }) / setSetPw({ member, value: '' }),
 * and render `dialogs` once on the page.
 */
export function useMemberActions({ reload }) {
    const [confirm, setConfirm] = useState(null) // { member, kind: 'reset' }
    const [setPw, setSetPw] = useState(null) // { member, value, saving, error }
    const [secret, setSecret] = useState(null) // { name, email, password } or { name, email, link, invite }

    const savePassword = async () => {
        const { member, value } = setPw
        setSetPw((d) => ({ ...d, saving: true, error: '' }))
        try {
            await api(`/api/crm/team/${member.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: value }) })
            notify('success', tr("Password set for {name}", { name: member.name }))
            setSetPw(null)
            reload()
        } catch (e) {
            setSetPw((d) => ({ ...d, saving: false, error: e.message }))
        }
    }

    const runConfirm = async () => {
        const { member, kind } = confirm
        try {
            if (kind === 'link') {
                const res = await api(`/api/crm/team/${member.id}/reset-link`, { method: 'POST', body: JSON.stringify({ purpose: 'reset' }) })
                setSecret({ name: member.name, email: member.email, link: res.link, emailed: res.emailed })
            } else if (kind === 'signout') {
                await api(`/api/crm/team/${member.id}/sign-out`, { method: 'POST' })
                notify('success', tr("{name} was signed out on every device", { name: member.name }))
            } else if (kind === 'twofactor') {
                await api(`/api/crm/team/${member.id}/two-factor`, { method: 'DELETE' })
                notify('success', tr("Two-step verification removed for {name}", { name: member.name }))
            } else if (kind === 'reset') {
                const res = await api(`/api/crm/team/${member.id}/reset-password`, { method: 'POST' })
                setSecret({ name: member.name, email: member.email, password: res.tempPassword })
            }
            reload()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setConfirm(null)
        }
    }

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            notify('success', tr("Copied"))
        } catch {
            notify('warning', tr("Copy failed — select and copy manually"))
        }
    }

    const dialogs = (
        <>
            <ConfirmDialog
                isOpen={!!confirm}
                type="warning"
                title={confirm?.kind === 'link' ? tr("Create a reset link?") : confirm?.kind === 'signout' ? tr("Sign out everywhere?") : confirm?.kind === 'twofactor' ? tr("Reset two-step verification?") : tr("Generate a one-time password?")}
                confirmText={confirm?.kind === 'link' ? tr("Create link") : confirm?.kind === 'signout' ? tr("Sign out") : confirm?.kind === 'twofactor' ? tr("Reset") : tr("Generate password")}
                onClose={() => setConfirm(null)}
                onRequestClose={() => setConfirm(null)}
                onCancel={() => setConfirm(null)}
                onConfirm={runConfirm}
            >
                <p>
                    {confirm?.kind === 'link'
                        ? tr("A one-time link (valid for 1 hour) will be created so {name} can choose a new password. Their current password keeps working until they use it. It is emailed when mail is configured, and shown here either way.", { name: confirm?.member.name })
                        : confirm?.kind === 'twofactor'
                          ? tr("{name} will no longer be asked for a code when signing in (use this if they lost their phone). They can set it up again from their profile.", { name: confirm?.member.name })
                          : confirm?.kind === 'signout'
                          ? tr("{name} will be signed out on every device and must sign in again.", { name: confirm?.member.name })
                          : tr("A new one-time password will be generated for {name}. Their current password stops working immediately.", { name: confirm?.member.name })}
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!setPw} onClose={() => setSetPw(null)} onRequestClose={() => setSetPw(null)}>
                <h5 className="mb-2">{tr("Set a password")}</h5>
                <p className="mb-4 text-sm text-gray-500">{tr("Type the new password for")} {setPw?.member.name} ({setPw?.member.email}{tr("). It replaces the current one at once and signs them out on every device. 8 characters or more.")}</p>
                <Input autoFocus autoComplete="off" placeholder={tr("New password")} value={setPw?.value || ''} onChange={(e) => setSetPw((d) => ({ ...d, value: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && (setPw?.value || '').length >= 8 && !setPw?.saving) savePassword() }} />
                {setPw?.error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{setPw.error}</div>}
                <div className="mt-6 flex justify-end gap-2">
                    <Button onClick={() => setSetPw(null)}>{tr("Cancel")}</Button>
                    <Button variant="solid" loading={setPw?.saving} disabled={(setPw?.value || '').length < 8} onClick={savePassword}>{tr("Set password")}</Button>
                </div>
            </Dialog>

            <Dialog isOpen={!!secret} onClose={() => setSecret(null)} onRequestClose={() => setSecret(null)}>
                <h5 className="mb-2">{secret?.link ? (secret.invite ? tr("Invite link") : tr("Reset link")) : tr("One-time password")}</h5>
                <p className="mb-4 text-sm text-gray-500">
                    {secret?.link
                        ? tr('Send this link to {name}{emailed}. It works once and expires ({when}).', { name: secret?.name, emailed: secret?.emailed ? tr(' (it was also emailed)') : '', when: secret?.invite ? tr('7 days') : tr('1 hour') })
                        : tr("Share these sign-in details with {name}. The password is shown only once — it cannot be retrieved later.", { name: secret?.name })}
                </p>
                <div className="flex flex-col gap-3">
                    <div><div className="mb-1 text-xs text-gray-500">{tr("Email")}</div><div className="font-semibold">{secret?.email}</div></div>
                    <div>
                        <div className="mb-1 text-xs text-gray-500">{secret?.link ? tr("Link") : tr("Password")}</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 break-all rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs dark:bg-gray-700">{secret?.link || secret?.password}</code>
                            <Button size="sm" icon={<TbCopy />} onClick={() => copy(secret.link || secret.password)}>{tr("Copy")}</Button>
                        </div>
                    </div>
                </div>
                <div className="mt-6 text-right"><Button variant="solid" onClick={() => setSecret(null)}>{tr("Done")}</Button></div>
            </Dialog>
        </>
    )
    return { setConfirm, setSetPw, setSecret, dialogs, copy }
}
