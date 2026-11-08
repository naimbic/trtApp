/*! © 2026 TRT Digital — trtCRM. */
import Container from '@/components/shared/Container'
import { ClosedDaysPanel } from '../calendar/ClosedDays'

/** Days off of the More menu = the Closed days of the Calendar: the same list, the same panel, the same options (the booking page does not offer them). */
const DaysOff = () => (
    <Container>
        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><ClosedDaysPanel /></div>
    </Container>
)

export default DaysOff
