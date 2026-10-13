import { apiGetOrderList } from '@/services/OrderService'
import useSWR from 'swr'
import { useOrderListStore } from '../store/orderListStore'

export default function useOrderList() {
    const { tableData, filterData, setTableData, setFilterData } =
        useOrderListStore((state) => state)

    const { data, error, isLoading, mutate } = useSWR(
        ['/api/orders', { ...tableData, ...filterData }],
        // eslint-disable-next-line no-unused-vars
        ([_, params]) => apiGetOrderList(params),
        {
            revalidateOnFocus: false,
        },
    )

    const orderList = data?.list || []

    const orderListTotal = data?.total || 0

    return {
        orderList,
        orderListTotal,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
    }
}
