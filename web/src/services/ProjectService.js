import ApiService from './ApiService'

export async function apiGetProjects() {
    return ApiService.fetchDataWithAxios({
        url: '/projects',
        method: 'get',
    })
}

export async function apiPostProject(data) {
    return ApiService.fetchDataWithAxios({
        url: '/projects',
        method: 'post',
        data,
    })
}

export async function apiGetProject({ id, ...params }) {
    return ApiService.fetchDataWithAxios({
        url: `/projects/${id}`,
        method: 'get',
        params,
    })
}

export async function apiGetScrumBoards() {
    return ApiService.fetchDataWithAxios({
        url: '/projects/scrum-board',
        method: 'get',
    })
}

export async function apiGetProjectMembers() {
    return ApiService.fetchDataWithAxios({
        url: '/projects/scrum-board/members',
        method: 'get',
    })
}

export async function apiGetProjectTasks() {
    return ApiService.fetchDataWithAxios({
        url: '/projects/tasks',
        method: 'get',
    })
}

export async function apiGetProjectTask({ id, ...params }) {
    return ApiService.fetchDataWithAxios({
        url: `/projects/tasks/${id}`,
        method: 'get',
        params,
    })
}
