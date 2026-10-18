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
