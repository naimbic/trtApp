import { create } from 'zustand'

// The notification feed of the signed-in person, shared by the bell and the Notifications page.
const post = (body) => fetch('/api/crm/notifications', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).catch(() => {})

export const useNotifs = create((set, get) => ({
    items: [], counts: { unread: 0, total: 0, byKind: {} }, loaded: false,
    load: async () => {
        try {
            const r = await fetch('/api/crm/notifications', { credentials: 'include' })
            if (r.ok) { const j = await r.json(); set({ items: j.items || [], counts: j.counts || { unread: 0, total: 0, byKind: {} }, loaded: true }) } else set({ loaded: true })
        } catch { set({ loaded: true }) } // offline: keep the last list
    },
    // shown at once, saved in the background
    setRead: (ids, read) => {
        const want = new Set(ids)
        const items = get().items.map((i) => (want.has(i.id) ? { ...i, read } : i))
        const unread = items.filter((i) => !i.read)
        const byKind = {}
        for (const i of unread) byKind[i.kind] = (byKind[i.kind] || 0) + 1
        set({ items, counts: { ...get().counts, unread: unread.length, byKind } })
        return post({ action: read ? 'read' : 'unread', ids })
    },
    markAll: () => {
        set({ items: get().items.map((i) => ({ ...i, read: true })), counts: { ...get().counts, unread: 0, byKind: {} } })
        return post({ action: 'all' })
    },
}))
