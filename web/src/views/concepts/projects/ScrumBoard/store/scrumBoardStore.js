import { create } from 'zustand'

const initialState = {
    columns: {},
    ordered: [],
    boardMembers: [],
    allMembers: [],
    dialogOpen: false,
    dialogView: '',
    ticketId: '',
    board: '',
}

export const useScrumBoardStore = create((set) => ({
    ...initialState,
    updateOrdered: (payload) =>
        set(() => {
            return { ordered: payload }
        }),
    updateColumns: (payload) => set(() => ({ columns: payload })),
    updateBoardMembers: (payload) => set(() => ({ boardMembers: payload })),
    updateAllMembers: (payload) => set(() => ({ allMembers: payload })),
    openDialog: () => set({ dialogOpen: true }),
    closeDialog: () =>
        set({
            dialogOpen: false,
        }),
    resetView: () =>
        set({
            ticketId: '',
            board: '',
            dialogView: '',
        }),
    updateDialogView: (payload) => set(() => ({ dialogView: payload })),
    setSelectedTicketId: (payload) => set(() => ({ ticketId: payload })),
    setSelectedBoard: (payload) => set(() => ({ board: payload })),
}))
