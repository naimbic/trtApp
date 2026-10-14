import { themeConfig } from '@/configs/theme.config'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const inititialThemeState = themeConfig

export const useThemeStore = create()(
    persist(
        (set) => ({
            ...inititialThemeState,
            setSchema: (payload) => set(() => ({ themeSchema: payload })),
            // an explicit choice (header, profile menu, settings) is remembered so the profile's default theme does not undo it on refresh
            setMode: (payload) => {
                try { localStorage.setItem('themeModeChosen', payload) } catch { /* private mode */ }
                set(() => ({ mode: payload }))
            },
            setSideNavCollapse: (payload) =>
                set((state) => ({
                    layout: { ...state.layout, sideNavCollapse: payload },
                })),
            setDirection: (payload) => set(() => ({ direction: payload })),
            setPanelExpand: (payload) => set(() => ({ panelExpand: payload })),
            setLayout: (payload) =>
                set((state) => ({
                    layout: { ...state.layout, type: payload },
                })),
            setPreviousLayout: (payload) =>
                set((state) => ({
                    layout: { ...state.layout, previousType: payload },
                })),
        }),
        {
            name: 'theme',
        },
    ),
)
