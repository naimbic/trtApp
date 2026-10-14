import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// away / muted are the person's own choices (kept in the browser); state is what the chat currently shows for them.
export const useChatStatus = create(
    persist(
        (set) => ({
            away: false,
            muted: false,
            state: 'online', // online | idle | away
            setAway: (away) => set({ away }),
            setMuted: (muted) => set({ muted }),
            setState: (state) => set({ state }),
        }),
        { name: 'chatStatus', partialize: (s) => ({ away: s.away, muted: s.muted }) },
    ),
)

export const STATUS = {
    online: { label: 'Available', dot: 'bg-emerald-500' },
    idle: { label: 'Idle', dot: 'bg-orange-400' },
    away: { label: 'Away', dot: 'bg-orange-400' },
    offline: { label: 'Offline', dot: 'bg-gray-300' },
}
