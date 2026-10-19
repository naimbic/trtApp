import test from 'node:test'
import assert from 'node:assert/strict'

// docStyle imports the app's settings reader; the totals helper alone is pure, so load it from the source text
import fs from 'node:fs'
const src = fs.readFileSync(new URL('./docStyle.js', import.meta.url), 'utf8')
const body = src.slice(src.indexOf('export const attachTotals')).replace('export const attachTotals', 'const attachTotals')
const attachTotals = new Function(`${body}; return attachTotals`)()

test('totals move into the foot of the items table', () => {
    const html = '<div class="sc"><table class="items"><thead><tr><th>#</th><th>Item</th><th>Amount</th></tr></thead><tbody><tr><td>1</td><td>A</td><td>10</td></tr></tbody></table></div>\n<table class="tot"><tr><td>Sub total</td><td>10</td></tr><tr class="grand"><td>Total</td><td>12</td></tr></table>'
    const out = attachTotals(html)
    assert.ok(!out.includes('class="tot"'))
    assert.match(out, /<\/tbody><tfoot>.*<\/tfoot><\/table><\/div>/s)
    assert.match(out, /<tr class="ft"><td colspan="99"><div class="fr"><span class="fl">Sub total<\/span><b class="fv">10<\/b>/)
    assert.match(out, /<tr class="ft grand">.*Total.*12/s)
})
test('a document without a totals table is left alone', () => {
    const html = '<table class="items"><tbody></tbody></table><p>x</p>'
    assert.equal(attachTotals(html), html)
})
