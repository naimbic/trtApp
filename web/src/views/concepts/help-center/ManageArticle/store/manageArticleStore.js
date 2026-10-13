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
    category: [
        'introduction',
        'setupGuide',
        'basicFeatures',
        'survey',
        'analytic',
        'dataVisualization',
        'chatbot',
        'media',
        'security',
        'integration',
        'themes',
        'commission',
    ],
}

const initialState = {
    tableData: initialTableData,
    filterData: initialFilterData,
    selectedArticle: [],
}

export const useManageArticleStore = create((set) => ({
    ...initialState,
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setTableData: (payload) => set(() => ({ tableData: payload })),
    setSelectedArticle: (checked, row) =>
        set((state) => {
            const prevData = state.selectedArticle
            if (checked) {
                return { selectedArticle: [...prevData, ...[row]] }
            } else {
                if (prevData.some((prevArticle) => row.id === prevArticle.id)) {
                    return {
                        selectedArticle: prevData.filter(
                            (prevArticle) => prevArticle.id !== row.id,
                        ),
                    }
                }
                return { selectedArticle: prevData }
            }
        }),
    setSelectAllArticle: (row) => set(() => ({ selectedArticle: row })),
}))
