import { apiGetRolesPermissionsRoles } from '@/services/AccontsService'
import useSWR from 'swr'

export default function useRolePermissonsRoles() {
    const { data, isLoading, error, mutate } = useSWR(
        ['/api/rbac/roles'],
        () => apiGetRolesPermissionsRoles(),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        },
    )

    const roleList = data || []

    return {
        roleList,
        error,
        isLoading,
        mutate,
    }
}
