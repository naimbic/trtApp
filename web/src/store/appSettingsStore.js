import { create } from 'zustand'

/** Platform settings the screens behave by (rows per page, language selector...), loaded once per visit. */
export const useAppSettingsStore = create((set, get) => ({
    app: null,
    loading: false,
    load: async () => {
        if (get().app || get().loading) return
        set({ loading: true })
        try {
            const r = await fetch('/api/crm/settings/app', { credentials: 'include' })
            set({ app: r.ok ? await r.json() : {}, loading: false })
        } catch { set({ app: {}, loading: false }) }
    },
}))

/** { app } is null until the settings arrive; a screen should work with its own defaults meanwhile. */
export const useAppSettings = () => {
    const app = useAppSettingsStore((s) => s.app)
    const load = useAppSettingsStore((s) => s.load)
    if (!app) load()
    return app
}
