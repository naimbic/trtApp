import { create } from 'zustand'

const initialState = {
    productList: [],
    productOption: [],
    selectedProduct: [],
}

export const useOrderFormStore = create((set) => ({
    ...initialState,
    setProductOption: (payload) => set(() => ({ productOption: payload })),
    setProductList: (payload) => set(() => ({ productList: payload })),
    setSelectedProduct: (payload) => set(() => ({ selectedProduct: payload })),
}))
