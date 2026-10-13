import ApiService from './ApiService'

export async function apiGetCalendar() {
    return ApiService.fetchDataWithAxios({
        url: '/calendar',
        method: 'get',
    })
}
