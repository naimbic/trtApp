import { createContext, useContext } from 'react'
import { tr } from '@/utils/t'

const CarouselContext = createContext(null)

export const CarouselContextProvider = CarouselContext.Provider

export function useCarousel() {
    const context = useContext(CarouselContext)
    if (!context) {
        throw new Error(tr("useCarousel must be used within a <Carousel />"))
    }
    return context
}

export default CarouselContext
