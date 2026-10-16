import { Link } from 'react-router'
import Card from '@/components/ui/Card'
import classNames from '@/utils/classNames'

// Small building blocks shared by the dashboards and the scrum board.
export const TONES = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20', red: 'bg-red-100 text-red-600 dark:bg-red-500/20', amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20', violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', teal: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20',
}

export const StatCard = ({ icon, label, value, sub, tone = 'blue', to }) => {
    const body = (
        <Card className="h-full" bodyClass="p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-sm text-gray-500">{label}</div><h3 className="mt-1">{value}</h3>{sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}</div>
                <div className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl', TONES[tone])}>{icon}</div>
            </div>
        </Card>
    )
    return to ? <Link to={to} className="block h-full">{body}</Link> : body
}

export const Panel = ({ title, subtitle, action, className, children }) => (
    <Card className={className}>
        <div className="flex items-start justify-between gap-3"><div><h4>{title}</h4>{subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}</div>{action}</div>
        <div className="mt-4">{children}</div>
    </Card>
)
