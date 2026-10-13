import { useManageArticleStore } from '../store/manageArticleStore'
import { apiGetArticleList } from '@/services/HelpCenterService'
import useSWR from 'swr'

const useManageArticle = () => {
    const tableData = useManageArticleStore((state) => state.tableData)
    const filterData = useManageArticleStore((state) => state.filterData)

    const { data, isLoading, mutate } = useSWR(
        ['/helps/manage/articles', { ...tableData, ...filterData }],
        // eslint-disable-next-line no-unused-vars
        ([_, params]) => apiGetArticleList(params),
        {
            revalidateOnFocus: false,
        },
    )

    return {
        articleList: data?.list || [],
        articleTotal: data?.total || 0,
        isLoading,
        mutate,
    }
}

export default useManageArticle
