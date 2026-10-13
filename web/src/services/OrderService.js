import ApiService from './ApiService'

export async function apiGetOrderList(params) {
    return ApiService.fetchDataWithAxios({
        url: '/orders',
        method: 'get',
        params,
    })
}

export async function apiGetOrder({ id, ...params }) {
    return ApiService.fetchDataWithAxios({
        url: `/orders/${id}`,
        method: 'get',
        params,
    })
}
