/** How a lead is named in pickers and on cards: "Natura Volt (Fousenou Saouanera)", or "(nan) Fousenou Saouanera" when it has no company. */
export const leadLabel = (l) => (String(l?.company || '').trim() ? `${String(l.company).trim()} (${l.name || ''})` : `(nan) ${l?.name || ''}`).trim()
