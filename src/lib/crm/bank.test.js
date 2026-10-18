import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseBank, bankTokens } from './bank.js'

const accounts = [
    { id: 'a', name: 'Attijari MAD', bank: 'Attijariwafa', rib: 'MA64 0001', swift: 'BCMAMAMC', isDefault: true, active: true },
    { id: 'b', name: 'BNP EUR', bank: 'BNP Paribas', rib: 'FR76 3000', swift: 'BNPAFRPP', isDefault: false, active: true },
    { id: 'c', name: 'Old account', bank: 'Old', rib: 'X', isDefault: false, active: false },
]

test('bank: the document wins, then the client, then the default account', () => {
    assert.equal(chooseBank({ docAccountId: 'b', clientAccountId: 'a', accounts }).id, 'b')
    assert.equal(chooseBank({ clientAccountId: 'b', accounts }).id, 'b')
    assert.equal(chooseBank({ accounts }).id, 'a')
})
test('bank: an inactive or unknown account is skipped, never printed', () => {
    assert.equal(chooseBank({ docAccountId: 'c', clientAccountId: 'zzz', accounts }).id, 'a')
    assert.equal(chooseBank({ accounts: [] }), null)
    assert.equal(chooseBank({ accounts: [{ id: 'x', name: 'N', isDefault: false, active: true }] }), null)
})
test('bank: the merge terms come from the chosen account, none means keep the company options', () => {
    assert.deepEqual(bankTokens(accounts[1]), { company_bank: 'BNP Paribas', company_rib: 'FR76 3000', company_swift: 'BNPAFRPP', company_bank_holder: '' })
    assert.equal(bankTokens(null), null)
})
