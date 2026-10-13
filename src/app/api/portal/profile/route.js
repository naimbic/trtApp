import { updateProfile } from '@/lib/portal/data'
import { json, fail } from '@/lib/portal/http'

export async function PUT(request) {
    try { return json(await updateProfile(await request.json().catch(() => ({})))) } catch (e) { return fail(e) }
}
