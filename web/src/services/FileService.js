import ApiService from './ApiService'

export async function apiGetFiles(params) {
    return ApiService.fetchDataWithAxios({
        url: '/api/files',
        method: 'get',
        params,
    })
}
