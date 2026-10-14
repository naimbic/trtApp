import { useEffect } from 'react'
import { create } from 'zustand'

/** Tabs a page puts in the top bar. Pages call usePageTabs(); the header renders them while the page is open. */
export const usePageTabsStore = create(() => ({ tabs: null, active: null, onChange: null }))

export function usePageTabs(tabs, active, onChange) {
    const signature = JSON.stringify(tabs.map((t) => [t.key, t.label, t.count]))
    useEffect(() => {
        usePageTabsStore.setState({ tabs, active, onChange })
    }, [signature, active, onChange]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => usePageTabsStore.setState({ tabs: null, active: null, onChange: null }), [])
}
