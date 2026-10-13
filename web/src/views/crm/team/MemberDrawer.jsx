import { useEffect, useState } from 'react'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Checkbox from '@/components/ui/Checkbox'
import Button from '@/components/ui/Button'
import { Form, FormItem } from '@/components/ui/Form'

const blank = { firstName: '', lastName: '', email: '', phone: '', roleId: null, departmentIds: [], admin: false, active: true, hourlyRate: '', password: '', applyRolePermissions: true }

/** props: open, member (null = new), lookups {roles, departments}, canAdmin, saving, error, onSubmit(values), onClose() */
const MemberDrawer = ({ open, member, lookups, canAdmin, saving, error, onSubmit, onClose }) => {
    const [v, setV] = useState(blank)
    const edit = !!member

    useEffect(() => {
        if (!open) return
        setV(member ? { ...blank, firstName: member.firstName, lastName: member.lastName, email: member.email || '', phone: member.phone, roleId: member.roleId, departmentIds: member.departments.map((d) => d.id), admin: member.admin, active: member.active, hourlyRate: member.hourlyRate || '' } : blank)
    }, [open, member])

    const roleOptions = lookups.roles.map((r) => ({ value: r.id, label: r.name }))
    const deptOptions = lookups.departments.map((d) => ({ value: d.id, label: d.name }))
    const set = (patch) => setV((p) => ({ ...p, ...patch }))
    const roleChanged = edit && (v.roleId || null) !== (member.roleId || null)

    return (
        <Drawer
            title={edit ? `Edit ${member.name}` : 'Add team member'}
            isOpen={open}
            onClose={onClose}
            onRequestClose={onClose}
            width={460}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="solid" loading={saving} onClick={() => onSubmit(v)}>{edit ? 'Save changes' : 'Create member'}</Button>
                </div>
            }
        >
            <Form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                <div className="grid grid-cols-2 gap-x-4">
                    <FormItem label="First name" asterisk>
                        <Input value={v.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="off" />
                    </FormItem>
                    <FormItem label="Last name">
                        <Input value={v.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="off" />
                    </FormItem>
                </div>
                <FormItem label="Email (used to sign in)" asterisk>
                    <Input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" />
                </FormItem>
                <div className="grid grid-cols-2 gap-x-4">
                    <FormItem label="Phone">
                        <Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
                    </FormItem>
                    <FormItem label="Hourly rate">
                        <Input type="number" step="0.01" value={v.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} />
                    </FormItem>
                </div>
                <FormItem label="Role">
                    <Select isClearable placeholder="No role" options={roleOptions} value={roleOptions.find((o) => o.value === v.roleId) || null} onChange={(o) => set({ roleId: o?.value || null })} />
                </FormItem>
                {roleChanged && (
                    <div className="-mt-2 mb-4 flex items-start gap-2 text-sm text-gray-500">
                        <Checkbox checked={v.applyRolePermissions} onChange={(c) => set({ applyRolePermissions: c })} />
                        <span>Replace this member&apos;s permissions with the new role&apos;s defaults</span>
                    </div>
                )}
                <FormItem label="Departments">
                    <Select isMulti placeholder="Select departments" options={deptOptions} value={deptOptions.filter((o) => v.departmentIds.includes(o.value))} onChange={(opts) => set({ departmentIds: (opts || []).map((o) => o.value) })} />
                </FormItem>
                {!edit && (
                    <FormItem label="Password" extra={<span className="ml-2 text-xs font-normal text-gray-400">Leave empty to generate a one-time password</span>}>
                        <Input type="password" autoComplete="new-password" value={v.password} onChange={(e) => set({ password: e.target.value })} placeholder="Min. 8 characters" />
                    </FormItem>
                )}
                <div className="mt-2 flex flex-col gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-600">
                    <div className="flex items-center justify-between gap-4">
                        <div><div className="font-semibold">Active</div><div className="text-sm text-gray-500">Inactive members cannot sign in</div></div>
                        <Switcher checked={v.active} onChange={(c) => set({ active: c })} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div><div className="font-semibold">Administrator</div><div className="text-sm text-gray-500">{canAdmin ? 'Full access, overrides all permissions' : 'Only administrators can change this'}</div></div>
                        <Switcher checked={v.admin} disabled={!canAdmin} onChange={(c) => set({ admin: c })} />
                    </div>
                </div>
            </Form>
        </Drawer>
    )
}

export default MemberDrawer
