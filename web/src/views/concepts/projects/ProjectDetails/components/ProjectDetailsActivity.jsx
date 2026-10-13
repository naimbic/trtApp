import { useState, useEffect } from 'react'
import Timeline from '@/components/ui/Timeline'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import { apiGetLogs } from '@/services/LogService'
import { ActivityAvatar, ActivityEvent } from '@/components/view/Activity'
import isEmpty from 'lodash/isEmpty'
import dayjs from 'dayjs'

const ProjectDetailsActivity = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [activityIndex, setActivityIndex] = useState(1)
    const [loadable, seLoadable] = useState(true)
    const [activities, setActivities] = useState([])

    const getLogs = async () => {
        setIsLoading(true)
        const resp = await apiGetLogs({ activityIndex })
        setActivities((prevActivities) => [...prevActivities, ...resp.data])
        seLoadable(resp.loadable)
        setIsLoading(false)
    }

    useEffect(() => {
        getLogs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onLoadMore = () => {
        setActivityIndex((prevIndex) => prevIndex + 1)
        getLogs()
    }

    return (
        <Loading loading={isLoading}>
            <div>
                {activities.map((log, index) => (
                    <div key={log.id + index} className="mb-8">
                        <div className="mb-4 font-semibold uppercase">
                            {dayjs.unix(log.date).format('dddd, DD MMMM')}
                        </div>
                        <Timeline>
                            {isEmpty(log.events) ? (
                                <Timeline.Item>No Activities</Timeline.Item>
                            ) : (
                                log.events.map((event, index) => (
                                    <Timeline.Item
                                        key={log.id + event.type + index}
                                        media={<ActivityAvatar data={event} />}
                                    >
                                        <div className="mt-1">
                                            <ActivityEvent data={event} />
                                        </div>
                                    </Timeline.Item>
                                ))
                            )}
                        </Timeline>
                    </div>
                ))}
                <div className="text-center">
                    {loadable ? (
                        <Button loading={isLoading} onClick={onLoadMore}>
                            Load More
                        </Button>
                    ) : (
                        'No more activity to load'
                    )}
                </div>
            </div>
        </Loading>
    )
}

export default ProjectDetailsActivity
