import { useState } from 'react'
import Card from '@/components/ui/Card'
import GanttChart from '@/components/shared/GanttChart'
import getStartEndDateForProject from '@/components/shared/GanttChart/getStartEndDateForProject'

const colorsMap = {
    overallDesign: '#fbbf24',
    design: '#fdba74',
    overallDevelopment: '#6ee7b7',
    development: '#7dd3fc',
}

const Schedule = ({ data = [] }) => {
    const [tasks, setTasks] = useState(data)

    const handleTaskChange = (task) => {
        let newTasks = tasks.map((t) => (t.id === task.id ? task : t))
        if (task.project) {
            const [start, end] = getStartEndDateForProject(
                newTasks,
                task.project,
            )
            const project =
                newTasks[newTasks.findIndex((t) => t.id === task.project)]
            if (
                project.start.getTime() !== start.getTime() ||
                project.end.getTime() !== end.getTime()
            ) {
                const changedProject = { ...project, start, end }
                newTasks = newTasks.map((t) =>
                    t.id === task.project ? changedProject : t,
                )
            }
        }
        setTasks(newTasks)
    }

    const handleProgressChange = async (task) => {
        setTasks(tasks.map((t) => (t.id === task.id ? task : t)))
    }

    const handleExpanderClick = (task) => {
        setTasks(tasks.map((t) => (t.id === task.id ? task : t)))
    }

    return (
        <Card>
            <div>
                <h4>Schedule</h4>
            </div>
            <div className="mt-4">
                <GanttChart
                    tasks={tasks}
                    colorsMap={colorsMap}
                    onDateChange={handleTaskChange}
                    onProgressChange={handleProgressChange}
                    onExpanderClick={handleExpanderClick}
                />
            </div>
        </Card>
    )
}

export default Schedule
