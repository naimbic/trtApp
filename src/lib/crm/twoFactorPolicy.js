// "Require two-step sign-in" (Settings → Sign-in & API): nobody | administrators | administrators and people who see money or the vault.
// Someone the rule covers who has not turned the second step on can only open their profile's Security page until they do:
// every other call answers 403 TWO_FACTOR_REQUIRED and the app sends them there. Looked up at most once a minute per person.
import prisma from '@/lib/prisma'
import { needsTwoFactor } from '@/lib/crm/twoFactorRule'

const MIN = 60000
let policyCache = { at: 0, value: '' }
const stateCache = new Map() // userId -> { at, on }

export function forgetTwoFactor(userId) { policyCache.at = 0; if (userId) stateCache.delete(String(userId)) }

async function policy() {
    if (Date.now() - policyCache.at < MIN) return policyCache.value
    const r = await prisma.crmOption.findUnique({ where: { name: 'require_2fa' } }).catch(() => null)
    policyCache = { at: Date.now(), value: r?.value || '' }
    return policyCache.value
}

/** Throws 403 TWO_FACTOR_REQUIRED when this signed-in person must set up the second step first. */
export async function enforceTwoFactor(session) {
    if (process.env.TWO_FACTOR_OFF === '1') return
    const p = await policy()
    if (!p || !needsTwoFactor(p, session?.user?.authority || [])) return
    const id = String(session.user.id)
    let s = stateCache.get(id)
    if (!s || Date.now() - s.at > MIN) {
        const r = await prisma.crmTwoFactor.findUnique({ where: { userId: id }, select: { totpEnabled: true, emailEnabled: true } }).catch(() => null)
        s = { at: Date.now(), on: !!(r?.totpEnabled || r?.emailEnabled) }
        stateCache.set(id, s)
    }
    if (!s.on) throw Object.assign(new Error('Your administrator requires two-step sign-in: turn it on in your profile, Security, to continue.'), { status: 403, code: 'TWO_FACTOR_REQUIRED' })
}
