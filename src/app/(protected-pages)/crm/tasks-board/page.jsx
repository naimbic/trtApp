import getTasksBoard from '@/server/actions/crm/work/getTasksBoard'
import TasksBoard from './_components/TasksBoard'

export default async function Page({ searchParams }) {
    const params = (await searchParams) || {}
    const projectId = typeof params.projectId === 'string' ? params.projectId : undefined
    const data = await getTasksBoard({ projectId })

    return <TasksBoard initialColumns={data.columns} />
}
