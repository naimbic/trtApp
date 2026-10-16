import { getOptions } from '@/lib/crm/mailer'
import { ALL_FIELDS } from '@/lib/crm/settings/registry'

/**
 * The platform settings a feature needs, with the defaults of the settings screen:
 *   const S = await readSettings(['new_task_auto_assign_current_member', 'default_task_priority'])
 *   S.on('new_task_auto_assign_current_member')  S.num('tasks_kanban_limit', 30)  S.get('default_task_priority')
 */
export async function readSettings(keys) {
    const o = await getOptions(keys)
    const get = (k) => o(k, ALL_FIELDS[k]?.default ?? '')
    return { get, on: (k) => get(k) === '1', num: (k, fb = 0) => { const n = Number(get(k)); return Number.isFinite(n) && get(k) !== '' ? n : fb } }
}
