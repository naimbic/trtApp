import { create } from 'zustand'

export const initialTableData = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: {
        order: '',
        key: '',
    },
}

export const initialFilterData = {
    status: '',
    role: '',
}

const initialState = {
    tableData: initialTableData,
    filterData: initialFilterData,
    selectedUser: [],
    selectedRole: '',
    roleDialog: {
        type: '',
        open: false,
    },
}

export const useRolePermissionsStore = create((set) => ({
    ...initialState,
    setTableData: (payload) => set(() => ({ tableData: payload })),
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setSelectedUser: (checked, row) =>
        set((state) => {
            const prevData = state.selectedUser
            if (checked) {
                return { selectedUser: [...prevData, ...[row]] }
            } else {
                if (prevData.some((prevUser) => row.id === prevUser.id)) {
                    return {
                        selectedUser: prevData.filter(
                            (prevUser) => prevUser.id !== row.id,
                        ),
                    }
                }
                return { selectedUser: prevData }
            }
        }),
    setSelectAllUser: (payload) => set(() => ({ selectedUser: payload })),
    setSelectedRole: (payload) => set(() => ({ selectedRole: payload })),
    setRoleDialog: (payload) => set(() => ({ roleDialog: payload })),
}))
