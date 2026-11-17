/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'

/** How many cards a page of a card grid should hold so that every row is full: the grid decides its own number of columns from the
 *  width of the screen, and the page takes whole rows of it (at least `rows` rows and at least `min` cards).
 *  Returns [ref for the grid element, page size or null until the grid is measured]. */
export default function useGridPageSize({ rows = 3, min = 12 } = {}) {
    const [el, setEl] = useState(null)
    const [size, setSize] = useState(null)
    const ref = useCallback((n) => setEl(n), [])
    useEffect(() => {
        if (!el) { setSize(null); return undefined }
        const measure = () => {
            const cols = Math.max(1, getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length)
            setSize(Math.max(rows, Math.ceil(min / cols)) * cols)
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        window.addEventListener('resize', measure)
        return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
    }, [el, rows, min])
    return [ref, size]
}
