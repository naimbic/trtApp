// Where the CRM uses AI, one row each. Every one has its own switch (on / off), its own provider (Claude, ChatGPT, DeepSeek...)
// and its own model; left empty they follow the default provider of Settings > AI. Free of the database: the options come in as an object.
export const AI_FEATURES = [
    { id: 'email', label: 'Email writing', desc: 'The "Write with AI" button in the mails of leads and customers: write, improve, shorten, fix and translate a mail.', extra: 'emailInstructions' },
    { id: 'grow', label: 'Grow and coaching', desc: 'The ideas of the Grow routine and the growth coach.' },
    { id: 'insights', label: 'AI insights and chat', desc: 'The analyses and the assistant that read your own CRM data.' },
    { id: 'ideas', label: 'Client ideas', desc: 'The ideas written for a client.' },
    { id: 'messages', label: 'Scheduled chat messages', desc: 'The messages written by AI for the team chat.' },
    { id: 'items', label: 'Catalog items', desc: 'The descriptions written for the items you sell.' },
]
export const featureIds = AI_FEATURES.map((f) => f.id)

export const featOn = (id) => `ai_feat_${id}_on`
export const featProvider = (id) => `ai_feat_${id}_provider`
export const featModel = (id) => `ai_feat_${id}_model`
export const EMAIL_INSTRUCTIONS = 'ai_email_instructions'
export const featureOptionNames = () => [...AI_FEATURES.flatMap((f) => [featOn(f.id), featProvider(f.id), featModel(f.id)]), EMAIL_INSTRUCTIONS]

/** The setting of every feature from the stored options: { id: { on, provider, model } } (on by default: what already worked keeps working). */
export function readFeatures(o = {}, providerIds = []) {
    return Object.fromEntries(AI_FEATURES.map((f) => {
        const p = String(o[featProvider(f.id)] || '')
        return [f.id, { on: o[featOn(f.id)] !== '0', provider: providerIds.includes(p) ? p : '', model: String(o[featModel(f.id)] || '') }]
    }))
}

/** What to use for a feature: its own provider/model when set, else the default ones. `have` = the providers that have a key. Returns null when the feature is off. */
export function pickFor(feature, features, { provider, model, models = {}, have = [] }) {
    const f = features[feature]
    if (!f || !f.on) return null
    const id = f.provider && have.includes(f.provider) ? f.provider : provider
    if (!id) return { provider: '', model: '' }
    // its own model only goes with its own provider; otherwise the model of the provider chosen
    const m = f.provider && id === f.provider && f.model ? f.model : (id === provider ? model : '') || models[id] || ''
    return { provider: id, model: m }
}
