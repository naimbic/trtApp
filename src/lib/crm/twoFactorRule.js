// Who the two-step sign-in rule covers. No database: tested on its own.
const SENSITIVE = ['crm.passwords.view', 'crm.payroll.view', 'crm.payments.view']
/** Does the policy cover somebody with this authority? (pure) */
export function needsTwoFactor(policy, authority = []) {
    if (policy !== 'admins' && policy !== 'sensitive') return false
    if (authority.includes('admin') || authority.includes('crm.admin')) return true
    return policy === 'sensitive' && SENSITIVE.some((a) => authority.includes(a))
}

