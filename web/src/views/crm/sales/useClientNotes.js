import { useEffect, useRef } from 'react'
import { api } from '../kit/api'

/**
 * On a new estimate or invoice, the client note and the terms follow the language of the chosen client
 * (the predefined texts of the settings, translated). A text the user already changed is never replaced.
 */
export default function useClientNotes(kind, isNew, clientId, setV) {
    const auto = useRef(null) // what was last filled in automatically
    useEffect(() => {
        if (!isNew || !clientId) return undefined
        let on = true
        api(`/api/crm/sales/notes?kind=${kind}&clientId=${clientId}`).then((r) => {
            if (!on) return
            const same = (a, b) => String(a || '').trim() === String(b || '').trim()
            setV((s) => {
                if (!s || s.clientId !== clientId) return s
                const untouched = (key) => same(s[key], r.base?.[key]) || (auto.current && same(s[key], auto.current[key]))
                const next = { ...s, ...(untouched('clientNote') ? { clientNote: r.clientNote || '' } : {}), ...(untouched('terms') ? { terms: r.terms || '' } : {}) }
                auto.current = { clientNote: r.clientNote || '', terms: r.terms || '' }
                return next
            })
        }).catch(() => { /* the notes stay as written in the settings */ })
        return () => { on = false }
    }, [kind, isNew, clientId, setV])
}
