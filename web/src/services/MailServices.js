import ApiService from './ApiService'

export async function apiGetMails(params) {
    return ApiService.fetchDataWithAxios({
        url: '/api/mails',
        method: 'get',
        params,
    })
}

export async function apiGetMail({ id }) {
    return ApiService.fetchDataWithAxios({
        url: `/api/mails/${id}`,
        method: 'get',
    })
}
