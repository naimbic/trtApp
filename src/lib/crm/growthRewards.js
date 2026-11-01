import { CATALOG } from './growthCatalog.js'

/* Points, levels and trophies for learning (certificates, languages, courses, skills). Pure: goals in, numbers out.
   Prizes (a cash amount in MAD) are between 200 and 1000: a trophy is won once, the prime of a certificate is set per goal. */

export const LEVELS = [
    { key: 'rookie', label: 'Rookie', min: 0 },
    { key: 'learner', label: 'Learner', min: 100 },
    { key: 'skilled', label: 'Skilled', min: 300 },
    { key: 'expert', label: 'Expert', min: 600 },
    { key: 'master', label: 'Master', min: 1000 },
]

const ITEMS = Object.fromEntries([...CATALOG.certifications, ...CATALOG.languages.map((l) => ({ ...l, category: 'language' }))].map((c) => [c.key, c]))
export const catalogInfo = (goal) => (goal?.catalogKey ? ITEMS[goal.catalogKey] || null : null)

const DAY = 86400000
const TROPHY_BONUS = 50
const OPEN_CAP = 5 // planned and learning goals earn a few points each, for the first five only

/** What one goal is worth: a passed one by its kind and level, +50 for AI; learning 20; planned 10. */
export function goalPoints(goal) {
    if (goal.status === 'passed') {
        const c = catalogInfo(goal)
        let p = goal.kind === 'language' ? 200 : goal.kind === 'course' ? 100 : goal.kind === 'skill' ? 80 : ({ beginner: 100, intermediate: 200, advanced: 300 }[c?.level] || 150)
        if (c?.category === 'ai') p += 50
        return p
    }
    return goal.status === 'learning' ? 20 : goal.status === 'planned' ? 10 : 0
}

export const TROPHIES = [
    { key: 'first-step', icon: 'flag', label: 'First step', desc: 'Set your first learning goal', prize: 0, target: 1, progress: (c) => c.goals.length },
    { key: 'first-pass', icon: 'certificate', label: 'First certificate', desc: 'Pass your first goal', prize: 200, target: 1, progress: (c) => c.passed.length },
    { key: 'polyglot', icon: 'language', label: 'Polyglot', desc: 'Pass a language exam', prize: 300, target: 1, progress: (c) => c.passed.filter((g) => g.kind === 'language').length },
    { key: 'ai-ready', icon: 'robot', label: 'AI ready', desc: 'Pass an AI certification or course', prize: 400, target: 1, progress: (c) => c.passed.filter((g) => catalogInfo(g)?.category === 'ai').length },
    { key: 'proof-kept', icon: 'file', label: 'Proof kept', desc: 'Attach the certificate of a passed goal', prize: 0, target: 1, progress: (c) => c.passed.filter((g) => (g.files || 0) > 0).length },
    { key: 'hat-trick', icon: 'bolt', label: 'Hat-trick', desc: 'Pass 3 goals within 12 months', prize: 600, target: 3, progress: (c) => c.recent.length },
    { key: 'high-five', icon: 'star', label: 'High five', desc: 'Pass 5 goals within 12 months', prize: 800, target: 5, progress: (c) => c.recent.length },
    { key: 'master', icon: 'crown', label: 'Master learner', desc: 'Reach 1000 points', prize: 1000, target: 1000, progress: (c) => c.base },
]

/** Points, level and trophies of one person from their goals (each goal: { status, kind, catalogKey, doneDate, files }). */
export function evaluate(goals = [], now = new Date()) {
    const passed = goals.filter((g) => g.status === 'passed')
    const open = goals.filter((g) => ['planned', 'learning'].includes(g.status)).slice(0, OPEN_CAP)
    const base = passed.reduce((a, g) => a + goalPoints(g), 0) + open.reduce((a, g) => a + goalPoints(g), 0)
    const recent = passed.filter((g) => +now - +new Date(g.doneDate || g.updatedAt || now) <= 365 * DAY)
    const ctx = { goals, passed, recent, base }
    const trophies = TROPHIES.map((t) => { const progress = Math.min(t.target, t.progress(ctx)); return { key: t.key, icon: t.icon, label: t.label, desc: t.desc, prize: t.prize, target: t.target, progress, earned: progress >= t.target } })
    const points = base + trophies.filter((t) => t.earned).length * TROPHY_BONUS
    const level = [...LEVELS].reverse().find((l) => points >= l.min) || LEVELS[0]
    const next = LEVELS.find((l) => l.min > points) || null
    return { points, base, level: { key: level.key, label: level.label, min: level.min }, next: next ? { key: next.key, label: next.label, min: next.min, missing: next.min - points } : null, passed: passed.length, trophies }
}
