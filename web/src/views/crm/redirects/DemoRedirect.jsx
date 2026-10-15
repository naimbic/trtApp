import { Navigate, useParams } from 'react-router'

const OID = /^[a-f0-9]{24}$/i
/** The template's /concepts/projects/... addresses lead to the real pages: ?to=scrum-board|tasks|task|project|projects. */
const make = (kind) => function DemoRedirect() {
    const { id } = useParams()
    const to = {
        'scrum-board': '/crm/scrum-board',
        tasks: '/crm/my-tasks',
        projects: '/crm/projects/list',
        task: OID.test(id || '') ? `/crm/tasks/${id}` : '/crm/my-tasks',
        project: OID.test(id || '') ? `/crm/projects/${id}` : '/crm/projects/list',
    }[kind]
    return <Navigate to={to} replace />
}
export const ToScrumBoard = make('scrum-board')
export const ToTasks = make('tasks')
export const ToProjects = make('projects')
export const ToTask = make('task')
export const ToProject = make('project')
