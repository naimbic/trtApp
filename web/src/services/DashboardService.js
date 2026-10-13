import ApiService from './ApiService'

export async function apiGetEcommerceDashboard() {
    return ApiService.fetchDataWithAxios({
        url: '/api/dashboard/ecommerce',
        method: 'get',
    })
}

export async function apiGetProjectDashboard() {
    return ApiService.fetchDataWithAxios({
        url: '/api/dashboard/project',
        method: 'get',
    })
}

export async function apiGetAnalyticDashboard() {
    return ApiService.fetchDataWithAxios({
        url: '/api/dashboard/analytic',
        method: 'get',
    })
}

export async function apiGetMarketingDashboard() {
    return ApiService.fetchDataWithAxios({
        url: '/api/dashboard/marketing',
        method: 'get',
    })
}
