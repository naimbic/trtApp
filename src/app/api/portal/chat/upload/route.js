import { portalUpload } from '@/lib/portal/chat'
import { json, fail } from '@/lib/portal/http'

export async function POST(request) {
    try {
        const form = await request.formData()
        return json(await portalUpload(form.get('file'), form.get('voice') === '1'), { status: 201 })
    } catch (e) { return fail(e) }
}
