import { create } from 'zustand'

const initialState = {
    paymentCycle: 'monthly',
    paymentDialog: false,
    selectedPlan: {},
}

export const usePricingStore = create((set) => ({
    ...initialState,
    setPaymentCycle: (payload) => set(() => ({ paymentCycle: payload })),
    setPaymentDialog: (payload) => set(() => ({ paymentDialog: payload })),
    setSelectedPlan: (payload) => set(() => ({ selectedPlan: payload })),
}))
