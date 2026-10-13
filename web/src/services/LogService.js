import ApiService from './ApiService'

export async function apiGetLogs(params) {
    return ApiService.fetchDataWithAxios({
        url: '/api/logs',
        method: 'get',
        params,
    })
}
