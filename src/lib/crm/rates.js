// The "ALL currencies" view adds amounts of different currencies together by converting each into the base currency
// with the rate saved on the currency (1 unit of it = rate units of the base). A currency without a rate is left out and
// reported, never guessed. Pure helpers; the database read is in loadRates.
export const ALL = 'all'

/** currencies: [{ id, name, isDefault, rate }] -> { baseId, rates: { id: number }, missing: [name] } */
export function ratesOf(currencies = []) {
    const base = currencies.find((c) => c.isDefault) || currencies[0] || null
    const rates = {}, missing = []
    for (const c of currencies) {
        if (base && c.id === base.id) rates[c.id] = 1
        else if (Number(c.rate) > 0) rates[c.id] = Number(c.rate)
        else missing.push(c.name)
    }
    return { baseId: base?.id || null, rates, missing }
}

/** The amount in the base currency, or null when this currency has no rate (an amount without currency counts as base). */
export const toBase = (amount, currencyId, { rates, baseId }) => {
    const id = currencyId || baseId
    const r = id ? rates[id] : 1
    return r === undefined ? null : (Number(amount) || 0) * r
}

/** Shared by the APIs: the rows of `list` (any currency) as one list in the base currency, rows without a rate dropped. `fields` are the money fields to convert. */
export function convertRows(list, fields, rt) {
    const out = []
    for (const r of list) {
        const k = toBase(1, r.currencyId, rt)
        if (k === null) continue
        const c = { ...r, currencyId: ALL }
        for (const f of fields) if (typeof r[f] === 'number') c[f] = r[f] * k
        out.push(c)
    }
    return out
}

/** A per-currency tally plus the ALL entry (the same tally over the rows converted into the base currency). */
export function tallyWithAll(tally, rows, fields, rt) {
    const m = tally(rows)
    const a = tally(convertRows(rows, fields, rt))
    if (a[ALL] !== undefined) m[ALL] = a[ALL]
    return m
}
