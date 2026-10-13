import ApiService from './ApiService'

export async function apiGetSupportHubCategories() {
    return ApiService.fetchDataWithAxios({
        url: '/helps/categories',
        method: 'get',
    })
}

export async function apiGetSupportHubArticles(params) {
    return ApiService.fetchDataWithAxios({
        url: '/helps/articles',
        method: 'get',
        params,
    })
}

export async function apiGetSupportHubArticle({ id }) {
    return ApiService.fetchDataWithAxios({
        url: `/helps/articles/${id}`,
        method: 'get',
    })
}

export async function apiGetArticleList(params) {
    return ApiService.fetchDataWithAxios({
        url: '/helps/manage/articles',
        method: 'get',
        params,
    })
}
