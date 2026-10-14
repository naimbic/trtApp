import { useSessionUser } from '@/store/authStore'

export const MASK = '***'

/** Administrators and anyone with "See money amounts" (Roles & permissions → Financial figures). */
export const canSeeMoney = (authority = []) => authority.includes('admin') || authority.includes('crm.admin') || authority.includes('crm.finance.view_amounts')

/** True when the signed-in person may NOT see financial figures: every money formatter then returns ***. */
export const moneyHidden = () => !canSeeMoney(useSessionUser.getState().user?.authority || [])

export const useMoneyHidden = () => !canSeeMoney(useSessionUser((s) => s.user?.authority) || [])
