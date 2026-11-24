import { useAppSettings } from '@/store/appSettingsStore'
import { tr } from '@/utils/t'

const DEF = { lost: 'Lost', junk: 'Junk', refused: 'Refused' }
export const ENDS = ['lost', 'junk', 'refused']
const COLOR = { lost: '#dc2626', junk: '#d97706', refused: '#475569' }

/** The three ways a lead ends without becoming a client. Their names are set in Settings, Leads; a name left as it was follows the language of the screen. */
export const useLeadEnds = () => {
    const app = useAppSettings() || {}
    const name = (k) => { const v = String(app[`lead_${k}_label`] || '').trim(); return !v || v === DEF[k] ? tr(DEF[k]) : v }
    return { lost: name('lost'), junk: name('junk'), refused: name('refused') }
}

/** Their colours (Settings, Leads): the colour itself, and the style of a small label in it. */
export const useEndColors = () => {
    const app = useAppSettings() || {}
    const c = (k) => (/^#[0-9a-f]{6}$/i.test(app[`lead_${k}_color`] || '') ? app[`lead_${k}_color`] : COLOR[k])
    return Object.fromEntries(ENDS.map((k) => [k, { color: c(k), tag: { background: `${c(k)}24`, color: c(k) } }]))
}
