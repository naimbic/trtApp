import { apiGetRolesPermissionsUsers } from '@/services/AccontsService'
import { useRolePermissionsStore } from '../store/rolePermissionsStore'
import useSWR from 'swr'

export default function useRolePermissonsUsers() {
    const { tableData, filterData } = useRolePermissionsStore()

    const { data, isLoading, error, mutate } = useSWR(
        ['/api/rbac/user', { ...tableData, ...filterData }],
        // eslint-disable-next-line no-unused-vars
        ([_, params]) => apiGetRolesPermissionsUsers(params),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        },
    )

    const userList = data?.list || []

    const userListTotal = data?.total || 0

    return {
        userList,
        userListTotal,
        error,
        isLoading,
        mutate,
    }
}
