// Task statuses: the five that come with the app (their codes are stored on every task) plus any the team adds.
export const TASK_STATUS_DEFAULTS = [
    { code: 1, name: 'Not started', color: '#9ca3af', statusOrder: 1 },
    { code: 4, name: 'In progress', color: '#3b82f6', statusOrder: 2 },
    { code: 3, name: 'Testing', color: '#8b5cf6', statusOrder: 3 },
    { code: 2, name: 'Awaiting feedback', color: '#f59e0b', statusOrder: 4 },
    { code: 5, name: 'Complete', color: '#10b981', statusOrder: 5 },
]
// 1 is the status of a new task, 4 is set when a timer starts, 5 means finished: the app relies on them, so they cannot be deleted
export const PROTECTED_CODES = [1, 4, 5]
export const DONE_CODE = 5
export const START_CODE = 1

/** The code of a new status: the next free number after every existing one (never below 6). */
export const nextCode = (codes = []) => Math.max(5, ...codes.map(Number).filter(Number.isFinite)) + 1

export const deleteBlock = (code) => (PROTECTED_CODES.includes(+code) ? 'This status is used by the app (new tasks, timers, finished tasks) and cannot be deleted. Rename or recolour it instead.' : null)

/** Rows in board order with the plain shape the screens use. */
export const shapeStatuses = (rows = []) => [...rows].sort((a, b) => (a.statusOrder - b.statusOrder) || (a.code - b.code)).map((r) => {
    const d = TASK_STATUS_DEFAULTS.find((x) => x.code === r.code)
    return { id: r.id, value: r.code, name: r.name, color: r.color || d?.color || '#9ca3af', order: r.statusOrder, builtIn: !!d, custom: !d || r.name !== d.name || (r.color || d.color) !== d.color, protected: PROTECTED_CODES.includes(r.code) }
})
