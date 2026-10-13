import { create } from 'zustand'

const initialState = {
    projectList: [],
    memberList: [],
    newProjectDialog: false,
}

export const useProjectListStore = create((set) => ({
    ...initialState,
    setProjectList: (payload) => set(() => ({ projectList: payload })),
    updateProjectList: (payload) =>
        set((state) => ({
            projectList: [...state.projectList, ...[payload]],
        })),
    updateProjectFavorite: (payload) =>
        set((state) => {
            const { id, value } = payload
            const newList = state.projectList.map((project) => {
                if (project.id === id) {
                    project.favourite = value
                }
                return project
            })

            return {
                projectList: [...newList],
            }
        }),
    setMembers: (payload) => set(() => ({ memberList: payload })),
}))
