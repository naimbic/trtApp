import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanHtml, plainText, looksLikeHtml, unescapeHtml } from './richText.js'

test('richText: escaped HTML from the old system is understood, plain text is not mistaken for HTML', () => {
    assert.equal(unescapeHtml('&lt;p&gt;Hi &amp;amp; bye&lt;/p&gt;'), '<p>Hi &amp; bye</p>')
    assert.ok(looksLikeHtml('<p>Hi</p>') && looksLikeHtml('&lt;strong&gt;x&lt;/strong&gt;'))
    assert.ok(!looksLikeHtml('2 < 3 and 4 > 1') && !looksLikeHtml('Plain text\nsecond line'))
})
test('richText: cleanHtml keeps harmless tags, drops attributes, scripts and unknown tags', () => {
    assert.equal(cleanHtml('<p style="color:red" onclick="x()">Hello <strong>you</strong></p>'), '<p>Hello <strong>you</strong></p>')
    assert.equal(cleanHtml('<p>a</p><script>alert(1)</script><iframe src="//x"></iframe><img src=x onerror=1>'), '<p>a</p>')
    assert.equal(cleanHtml('&lt;ul&gt;&lt;li&gt;One&lt;/li&gt;&lt;/ul&gt;'), '<ul><li>One</li></ul>')
    assert.equal(cleanHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>')
    assert.equal(cleanHtml('<a href="https://x.com/?a=1&b=2" onclick="y">x</a>'), '<a href="https://x.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">x</a>')
})
test('richText: plain text keeps its line breaks and is escaped', () => {
    assert.equal(cleanHtml('Line one\n2 < 3 & 4 > 1'), 'Line one<br>2 &lt; 3 &amp; 4 &gt; 1')
    assert.equal(cleanHtml(''), '')
})
test('richText: plainText turns HTML into readable lines', () => {
    assert.equal(plainText('<p>First&nbsp;line</p><p>Second</p><ul><li>A</li><li>B</li></ul>'), 'First line\nSecond\n• A\n• B')
    assert.equal(plainText('&lt;p&gt;Escaped &amp;amp; fine&lt;/p&gt;'), 'Escaped & fine')
    assert.equal(plainText('Just text'), 'Just text')
})

test('a picture from this site or over https is kept, anything else is dropped', async () => {
    const { cleanHtml } = await import('./richText.js')
    assert.match(cleanHtml('<p>hi</p><img src="https://x.com/a.webp" alt="a" onerror="x()">'), /<img src="https:\/\/x\.com\/a\.webp" alt="a" loading="lazy">/)
    assert.doesNotMatch(cleanHtml('<img src="javascript:alert(1)">'), /<img/)
    assert.doesNotMatch(cleanHtml('<img src="data:image/png;base64,AAAA">'), /<img/)
    assert.doesNotMatch(cleanHtml('<p onclick="x()">t</p>'), /onclick/)
})

test('storeRich: safe HTML or plain text, nothing for an empty box', async () => {
    const { storeRich } = await import('./richText.js')
    assert.equal(storeRich('<p></p>'), null)
    assert.equal(storeRich('   '), null)
    assert.equal(storeRich('Plain text'), 'Plain text')
    assert.equal(storeRich('<p>Hi <script>x()</script><b>there</b></p>'), '<p>Hi <b>there</b></p>')
    assert.match(storeRich('<img src="/api/x.webp" alt="a">'), /<img src="\/api\/x\.webp"/)
})

test('colour, highlight and alignment survive, anything else in a style does not', async () => {
    const { cleanHtml } = await import('./richText.js')
    assert.match(cleanHtml('<p><span style="color: #dc2626">red</span></p>'), /<span style="color:#dc2626">red<\/span>/)
    assert.match(cleanHtml('<mark data-color="#fde047" style="background-color: #fde047; color: inherit">y</mark>'), /<mark style="background-color:#fde047">y<\/mark>/)
    assert.match(cleanHtml('<p style="text-align: center">c</p>'), /<p style="text-align:center">c<\/p>/)
    const bad = cleanHtml('<span style="color: red; background: url(javascript:alert(1))">x</span><span style="color:expression(alert(1))">y</span>')
    assert.doesNotMatch(bad, /url|expression|javascript/)
})
