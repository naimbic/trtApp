import useCustomerList from '../hooks/useOrderlist'
import DebouceInput from '@/components/shared/DebouceInput'
import OrderListTableFilter from './OrderListTableFilter'
import { TbSearch } from 'react-icons/tb'
import cloneDeep from 'lodash/cloneDeep'

const OrderListTableTools = () => {
    const { tableData, setTableData } = useCustomerList()

    const handleInputChange = (event) => {
        const val = event.target.value
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        if (typeof val === 'string' && val.length > 1) {
            setTableData(newTableData)
        }

        if (typeof val === 'string' && val.length === 0) {
            setTableData(newTableData)
        }
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <DebouceInput
                placeholder="Search"
                suffix={<TbSearch className="text-lg" />}
                onChange={handleInputChange}
            />
            <OrderListTableFilter />
        </div>
    )
}

export default OrderListTableTools
