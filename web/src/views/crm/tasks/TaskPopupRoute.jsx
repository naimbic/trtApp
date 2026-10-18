import { useNavigate, useParams } from 'react-router'
import TasksBoard from './TasksBoard'

/** A link to one task (/crm/tasks/:id) shows the tasks board with that task open in the new popup. */
const TaskPopupRoute = () => {
    const { id } = useParams()
    const nav = useNavigate()
    return <TasksBoard key={id} openId={id} onClosePopup={() => nav('/crm/tasks', { replace: true })} />
}

export default TaskPopupRoute
