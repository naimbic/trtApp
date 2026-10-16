import { portalUpload } from '@/lib/portal/chat'
import { json, fail } from '@/lib/portal/http'
import { rateLimit, clientIp } from '@/lib/rateLimit'

export async function POST(request) {
    try {
        rateLimit(`upload:ip:${clientIp(request)}`, 30, 60000)
        const form = await request.formData()
        return json(await portalUpload(form.get('file'), form.get('voice') === '1'), { status: 201 })
    } catch (e) { return fail(e) }
}
