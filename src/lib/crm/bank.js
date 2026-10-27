// Which bank account is printed on a document, and the merge terms it fills ({company_bank}, {company_rib}, {company_swift},
// {company_bank_holder}). Pure (no database): the document's own account wins, then its client's, then the account that receives the
// document's currency (BMCE EUR for a EUR invoice), then the company's default one.
// A bank account is a payment method with bank fields (the Payment methods page).
/** accounts: [{ id, name, bank, holder, rib, swift, currencyId, isDefault, active }] */
export function chooseBank({ docAccountId, clientAccountId, currencyId, accounts = [] }) {
    const usable = accounts.filter((a) => a.active !== false)
    const byId = (id) => (id ? usable.find((a) => String(a.id) === String(id)) : null)
    const byCurrency = currencyId ? usable.find((a) => a.currencyId === currencyId && a.isDefault) || usable.find((a) => a.currencyId === currencyId) : null
    return byId(docAccountId) || byId(clientAccountId) || byCurrency || usable.find((a) => a.isDefault) || null
}

/** The merge terms of an account (empty strings when there is none, so the options of the old single account still apply). */
export function bankTokens(account) {
    if (!account) return null
    return { company_bank: account.bank || account.name || '', company_rib: account.rib || '', company_swift: account.swift || '', company_bank_holder: account.holder || '' }
}
