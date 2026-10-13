import ApiService from './ApiService'

export async function apiPostChat(data) {
    return ApiService.fetchDataWithAxios({
        url: '/ai/chat',
        method: 'post',
        data,
    })
}

export async function apiGetChatHistory() {
    return ApiService.fetchDataWithAxios({
        url: '/ai/chat/history',
        method: 'get',
    })
}

export async function apiGetImages(params) {
    return ApiService.fetchDataWithAxios({
        url: '/ai/images',
        method: 'get',
        params,
    })
}

export async function apiPostImages(data) {
    return ApiService.fetchDataWithAxios({
        url: '/ai/images',
        method: 'post',
        data,
    })
}
