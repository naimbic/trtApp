// Merges translator output into web/src/locales/staff/<lang>.js.
// Input: /tmp/tr/all.txt (N|english) and /tmp/tr/out-<lang>-*.txt (N|translation). Usage: node scripts/i18n-merge.mjs fr es ja ar
import fs from 'node:fs'
const unesc = (s) => s.replace(/\\n/g, '\n')
const all = new Map()
for (const line of fs.readFileSync('/tmp/tr/all.txt', 'utf8').split('\n')) { const i = line.indexOf('|'); if (i > 0) all.set(Number(line.slice(0, i)), unesc(line.slice(i + 1))) }
for (const lang of process.argv.slice(2)) {
    const out = {}
    const files = fs.readdirSync('/tmp/tr').filter((f) => f.startsWith(`out-${lang}-`)).sort()
    let n = 0
    const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join()
    const bad = []
    for (const f of files) for (const line of fs.readFileSync(`/tmp/tr/${f}`, 'utf8').split('\n')) {
        const i = line.indexOf('|')
        if (i <= 0) continue
        const id = Number(line.slice(0, i)); const en = all.get(id)
        if (en === undefined) continue
        const tx = unesc(line.slice(i + 1))
        if (!tx.trim()) continue
        if (placeholders(en) !== placeholders(tx)) { bad.push(`${id}|${en}|${tx}`); continue }
        out[en] = tx; n++
    }
    fs.writeFileSync(`web/src/locales/staff/${lang}.js`, `// Staff area: ${lang}. The key is the English text; what is missing shows in English. Generated from the translators' files by scripts/i18n-merge.mjs, then maintained by hand.\nexport default ${JSON.stringify(Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))), null, 4)}\n`)
    console.log(lang, n, 'of', all.size, 'placeholder mismatches:', bad.length)
    if (bad.length) fs.writeFileSync(`/tmp/tr/bad-${lang}.txt`, bad.join('\n'))
}
