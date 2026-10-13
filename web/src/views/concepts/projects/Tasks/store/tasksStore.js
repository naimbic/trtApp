import { create } from 'zustand'

const initialState = {
    groups: {},
    ordered: [],
    boardMembers: [],
    allMembers: [],
}

export const useTasksStore = create((set) => ({
    ...initialState,
    updateOrdered: (payload) =>
        set(() => {
            return { ordered: payload }
        }),
    updateGroups: (payload) => set(() => ({ groups: payload })),
    updateBoardMembers: (payload) => set(() => ({ boardMembers: payload })),
    updateAllMembers: (payload) => set(() => ({ allMembers: payload })),
}))
