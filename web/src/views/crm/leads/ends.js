import { useAppSettings } from '@/store/appSettingsStore'
import { tr } from '@/utils/t'

const DEF = { lost: 'Lost', junk: 'Junk', refused: 'Refused' }
export const ENDS = ['lost', 'junk', 'refused']
export const END_TONE = { lost: 'bg-red-100 text-red-600', junk: 'bg-amber-100 text-amber-700', refused: 'bg-slate-200 text-slate-700' }

/** The three ways a lead ends without becoming a client. Their names are set in Settings, Leads; a name left as it was follows the language of the screen. */
export const useLeadEnds = () => {
    const app = useAppSettings() || {}
    const name = (k) => { const v = String(app[`lead_${k}_label`] || '').trim(); return !v || v === DEF[k] ? tr(DEF[k]) : v }
    return { lost: name('lost'), junk: name('junk'), refused: name('refused') }
}
