import { create } from 'zustand'

const initialState = {
    mailList: [],
    mailListFetched: false,
    mail: {},
    selectedMailId: [],
    mobileSideBarExpand: false,
    selectedCategory: {},
    messageDialog: {
        mode: '',
        open: false,
    },
}

export const useMailStore = create((set) => ({
    ...initialState,
    setMailList: (payload) => set(() => ({ mailList: payload })),
    setMailListFetched: (payload) => set(() => ({ mailListFetched: payload })),
    setMail: (payload) => set(() => ({ mail: payload })),
    setSelectedMail: (payload) => set(() => ({ selectedMailId: payload })),
    setSelectedCategory: (payload) =>
        set(() => ({ selectedCategory: payload })),
    toggleMessageDialog: (payload) => set(() => ({ messageDialog: payload })),
    toggleMobileSidebar: (payload) =>
        set(() => ({ mobileSideBarExpand: payload })),
}))
