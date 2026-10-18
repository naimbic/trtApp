// same rule as isCrmAdmin in permissions.js (kept here so this file has no imports and can be tested on its own)
const isCrmAdmin = (authority = []) => authority.includes('admin') || authority.includes('crm.admin')

/**
 * A paid invoice or a signed contract is final: nobody changes it, except a super admin who confirms ("force") that they know what they do.
 * Returns null when the change may go on, else the message to send back: LOCKED (not allowed) or LOCKED_CONFIRM (a super admin must confirm).
 */
export function lockProblem({ authority, locked, force, noun }) {
    if (!locked) return null
    if (!isCrmAdmin(authority)) return `LOCKED: This ${noun} is final and cannot be changed. Only a super admin can do that.`
    if (!force) return `LOCKED_CONFIRM: This ${noun} is final. Changing it can upset your accounts; confirm to go on.`
    return null
}
