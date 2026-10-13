import ApiService from './ApiService'
import endpointConfig from '@/configs/endpoint.config'

export async function apiSignIn(data) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.signIn,
        method: 'post',
        data,
    })
}

export async function apiSignUp(data) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.signUp,
        method: 'post',
        data,
    })
}

export async function apiSignOut() {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.signOut,
        method: 'post',
    })
}

const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw json.error || 'Something went wrong'
    return json
}

/** Asks for a reset link. Answers the same whether or not the email exists. Returns { ok, mailConfigured }. */
export async function apiForgotPassword(data) {
    return post('/api/crm/auth/forgot-password', data)
}

/** data: { token, password } */
export async function apiResetPassword(data) {
    return post('/api/crm/auth/reset-password', data)
}

export async function apiCheckResetToken(token) {
    const res = await fetch(`/api/crm/auth/reset-password?token=${encodeURIComponent(token || '')}`, { credentials: 'include' })
    return res.json()
}

export async function apiChangePassword(data) {
    return post('/api/crm/auth/change-password', data)
}

export async function apiSignOutEverywhere() {
    return post('/api/crm/auth/sign-out-everywhere', {})
}
