import NotFound from '@/components/shared/NotFound'
import getTicketThread from '@/server/actions/crm/support/getTicketThread'
import TicketThread from './_components/TicketThread'

export default async function Page(props) {
    const params = await props.params
    const ticket = await getTicketThread(params.id)

    if (!ticket) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <NotFound message="Ticket not found!" />
            </div>
        )
    }

    return <TicketThread ticket={ticket} />
}
