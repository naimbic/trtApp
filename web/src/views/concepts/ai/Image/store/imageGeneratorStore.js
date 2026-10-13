import { create } from 'zustand'

const defaultGeneratoConfig = {
    aspectRatio: 'lanscape',
    style: 'noStyle',
    tone: 'noTone',
    lighting: 'noLighting',
    camera: 'noCamera',
}

const initialState = {
    isGeneratedImagesView: false,
    isGeneratingImage: false,
    generatedImage: [],
    generatorConfig: { ...defaultGeneratoConfig },
    imageDialog: {
        open: false,
        props: {},
    },
}

export const useImageGeneratorStore = create((set, get) => ({
    ...initialState,
    setGeneratorConfig: ({ key, value }) =>
        set(() => {
            const generatorConfig = get().generatorConfig
            generatorConfig[key] = value
            return { generatorConfig }
        }),
    resetGeneratorConfig: () =>
        set(() => ({ generatorConfig: { ...defaultGeneratoConfig } })),
    setImageDialog: (payload) => set(() => ({ imageDialog: payload })),
    onGenerateImage: () =>
        set(() => ({
            isGeneratedImagesView: true,
            isGeneratingImage: true,
        })),
    onGenerateImageComplete: () =>
        set(() => ({
            isGeneratingImage: false,
        })),
    setGeneratedImage: (payload) =>
        set(() => ({
            generatedImage: payload,
        })),
}))
