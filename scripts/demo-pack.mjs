#!/usr/bin/env node
// Writes the demo video pack (English voiceover, scene list, prompt for the AI) to docs/demo-video/ without opening the app.
//   node scripts/demo-pack.mjs
// The same files can be downloaded from the "Demo tour" panel on dev.trtcrm.com (with the real timings of a recorded tour).
import fs from 'node:fs'
import { SCENES, plannedSeconds, WORDS_PER_SECOND } from '../web/src/demo/scenes.js'
import { voiceoverText, promptText } from '../web/src/demo/exportPack.js'

let t = 0
const tl = SCENES.map((s) => { const start = t; t += plannedSeconds(s); return { ...s, start, end: t, seconds: plannedSeconds(s) } })
fs.mkdirSync('docs/demo-video', { recursive: true })
fs.writeFileSync('docs/demo-video/voiceover-EN.txt', voiceoverText(tl))
fs.writeFileSync('docs/demo-video/prompt-for-claude.txt', promptText(tl))
fs.writeFileSync('docs/demo-video/scenes.json', JSON.stringify({ product: 'trtCRM', language: 'en', wordsPerSecond: WORDS_PER_SECOND, scenes: tl.map((s, i) => ({ n: i + 1, id: s.id, title: s.title, page: s.path, start: s.start, end: s.end, seconds: s.seconds, voiceover: s.say })) }, null, 2))
console.log(`${SCENES.length} scenes, about ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}, written to docs/demo-video/`)
