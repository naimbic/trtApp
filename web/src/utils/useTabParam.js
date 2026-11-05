import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

/** The open tab, taken from "?tab=" in the address (so a notification can land on the exact tab) and changeable by hand. */
export default function useTabParam(valid, fallback) {
    const [params] = useSearchParams()
    const want = params.get('tab')
    const pick = (w) => (w && valid.includes(w) ? w : fallback)
    const [tab, setTab] = useState(() => pick(want))
    useEffect(() => { if (want && valid.includes(want)) setTab(want) }, [want]) // eslint-disable-line react-hooks/exhaustive-deps
    return [tab, setTab]
}
