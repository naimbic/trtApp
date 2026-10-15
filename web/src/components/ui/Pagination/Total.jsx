import { tr } from '@/utils/t'
const Total = (props) => {
    const { total } = props
    return (
        <div className="pagination-total">
            {tr("Total")} <span>{total}</span> {tr("Items")}
        </div>
    )
}

export default Total
