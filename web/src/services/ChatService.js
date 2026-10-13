import ApiService from './ApiService'

export async function apiGetChats() {
    return ApiService.fetchDataWithAxios({
        url: '/api/chats',
        method: 'get',
    })
}

export async function apiGetConversation({ id }) {
    return ApiService.fetchDataWithAxios({
        url: `/api/conversation/${id}`,
        method: 'get',
    })
}

export async function apiGetContacts() {
    return ApiService.fetchDataWithAxios({
        url: `/api/contacts`,
        method: 'get',
    })
}

export async function apiGetContactDetails({ id }) {
    return ApiService.fetchDataWithAxios({
        url: `/api/contacts/${id}`,
        method: 'get',
    })
}
