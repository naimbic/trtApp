import { apiGetProductList } from '@/services/ProductService'
import useSWR from 'swr'
import { useProductListStore } from '../store/productListStore'

const useProductList = () => {
    const {
        tableData,
        filterData,
        setTableData,
        setFilterData,
        selectedProduct,
        setSelectedProduct,
        setSelectAllProduct,
    } = useProductListStore((state) => state)

    const { data, error, isLoading, mutate } = useSWR(
        ['/api/products', { ...tableData, ...filterData }],
        // eslint-disable-next-line no-unused-vars
        ([_, params]) => apiGetProductList(params),
        {
            revalidateOnFocus: false,
        },
    )

    const productList = data?.list || []

    const productListTotal = data?.total || 0

    return {
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        productList,
        productListTotal,
        setTableData,
        selectedProduct,
        setSelectedProduct,
        setSelectAllProduct,
        setFilterData,
    }
}

export default useProductList
