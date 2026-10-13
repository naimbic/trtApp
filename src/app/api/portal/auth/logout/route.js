import { json, clearCookie } from '@/lib/portal/http'

export async function POST() { return clearCookie(json({ success: true })) }
