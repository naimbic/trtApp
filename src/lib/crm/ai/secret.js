import crypto from 'node:crypto'

// API keys are stored encrypted (AES-256-GCM) with a key derived from the server secret, never in clear text in the database.
const keyOf = (secret) => crypto.createHash('sha256').update(`trtcrm-ai-keys:${secret}`).digest()

export function serverSecret(env = process.env) {
    const s = env.AI_KEY_SECRET || env.AUTH_SECRET || env.NEXTAUTH_SECRET
    if (!s) throw Object.assign(new Error('The server has no secret (AUTH_SECRET) to protect API keys with'), { status: 500 })
    return s
}

/** "v1.<iv>.<tag>.<data>" (base64url). */
export function seal(plain, secret = serverSecret()) {
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', keyOf(secret), iv)
    const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()])
    return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}

/** The plain text, or null when the value was not sealed with this secret (changed secret, damaged value). */
export function open(sealed, secret = serverSecret()) {
    try {
        const [v, iv, tag, data] = String(sealed || '').split('.')
        if (v !== 'v1') return null
        const d = crypto.createDecipheriv('aes-256-gcm', keyOf(secret), Buffer.from(iv, 'base64url'))
        d.setAuthTag(Buffer.from(tag, 'base64url'))
        return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8')
    } catch { return null }
}
