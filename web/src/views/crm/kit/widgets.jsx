import Card from '@/components/ui/Card'
import { KpiCard } from './KpiCard'

// Small building blocks shared by the dashboards and the scrum board.
export const TONES = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20', red: 'bg-red-100 text-red-600 dark:bg-red-500/20', amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20', violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', teal: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20',
}

export { Delta, pctChange, moneyChange, KpiCard } from './KpiCard'

/** The figure card (see KpiCard): kept under its old name for the screens that already use it. */
export const StatCard = (props) => <KpiCard {...props} />

export const Panel = ({ title, subtitle, action, className, children }) => (
    <Card className={className}>
        <div className="flex items-start justify-between gap-3"><div><h4>{title}</h4>{subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}</div>{action}</div>
        <div className="mt-4">{children}</div>
    </Card>
)
