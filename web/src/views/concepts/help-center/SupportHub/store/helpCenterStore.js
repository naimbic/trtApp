import { create } from 'zustand'

const initialState = {
    queryText: '',
    selectedTopic: '',
}

export const useHelpCenterStore = create((set) => ({
    ...initialState,
    setQueryText: (payload) => set(() => ({ queryText: payload })),
    setSelectedTopic: (payload) => set(() => ({ selectedTopic: payload })),
}))
