import { plannedSeconds, wordsOf, WORDS_PER_SECOND } from './scenes.js'

const KEY = 'demo-tour-last-run'

export const saveRun = (timing) => { try { localStorage.setItem(KEY, JSON.stringify(timing)) } catch { /* storage blocked */ } }
export const loadRun = () => { try { const r = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(r) ? r : null } catch { return null } }

// scenes that live outside the staff area, so the tour cannot drive them: record them by hand and add them at the end
const MANUAL = [
    {
        id: 'client-area', title: 'The client area (recorded by hand)',
        say: 'Your clients get their own space. They sign in, see their invoices and estimates, accept proposals, sign contracts, follow their projects and open support requests, all with your logo and in their own language.',
        how: 'Open /portal/sign-in in a private window, sign in as a test contact, and show: Overview, Invoices, Estimates, Projects, Support.',
    },
]

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** The scenes with their start and end second: the real ones of the last tour when they are known, otherwise the planned ones. */
function timeline(scenes, last) {
    let t = 0
    return scenes.map((s) => {
        const real = last?.find((x) => x.id === s.id)
        const start = real ? real.start : t
        const end = real ? real.end : t + plannedSeconds(s)
        t = end
        return { ...s, start, end, seconds: Math.max(1, Math.round(end - start)) }
    })
}

const save = (name, text, type = 'text/plain') => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
    a.download = name
    document.body.appendChild(a); a.click(); a.remove()
}

export function voiceoverText(tl) {
    const lines = ['trtCRM - product tour - VOICEOVER (English master text)', `Speaking pace used for the timings: about ${WORDS_PER_SECOND} words per second.`, '']
    for (const [i, s] of tl.entries()) lines.push(`[${mmss(s.start)} - ${mmss(s.end)}]  SCENE ${i + 1}: ${s.title}  (${s.seconds}s, ${wordsOf(s.say)} words)`, s.say, '')
    for (const m of MANUAL) lines.push(`[to add by hand at the end]  ${m.title}  (about ${plannedSeconds(m)}s)`, m.say, '')
    return lines.join('\n')
}

export function promptText(tl) {
    const table = tl.map((s, i) => `${i + 1}. [${mmss(s.start)}-${mmss(s.end)}] (${s.seconds}s max ${Math.floor(s.seconds * 2.2)} words) ${s.title}\n   EN: ${s.say}`).join('\n')
    const manual = MANUAL.map((m) => `+. [after the tour] (${plannedSeconds(m)}s) ${m.title}\n   EN: ${m.say}\n   Recording note: ${m.how}`).join('\n')
    return `You are a video producer and a professional translator for software product videos.

GOAL
Turn the screen recording of the CRM "trtCRM" into a polished presentation video with a voiceover, first in ARABIC, then in FRENCH, to send to prospects (agencies and small companies in Morocco and the Arabic- and French-speaking markets).

WHAT I GIVE YOU
1. The screen recording of the tour (trtcrm-demo-....webm): one continuous take, with a coloured dot showing the cursor. It is made of the scenes below, in this order, each starting at the time given.
2. This list of scenes with the English master voiceover and the time each scene lasts.

SCENES (start-end, duration, English text)
${table}
${manual}

STEP 1 - ARABIC VOICEOVER
Translate every scene into Modern Standard Arabic that sounds natural when SPOKEN (warm, confident, simple; understandable in Morocco and the Gulf). Rules:
- Keep "trtCRM" and well-known product words (PDF, WhatsApp...) as they are; translate the rest.
- Each scene must be speakable within its duration: stay under the word limit shown (about 2.2 words per second). Shorten rather than rush.
- Write numbers and symbols in words the way a narrator would say them. Add full diacritics only where a word would be ambiguous.
- Output the result as "voiceover-AR.txt" in the same layout as the English text (time range, scene number, title, then the Arabic text), and as "subtitles-AR.srt" (SubRip, UTF-8, right-to-left text, at most 2 lines of 42 characters, split inside the scene time range).

STEP 2 - FRENCH VOICEOVER
Do the same in French (natural spoken French, "vous" form, clear and professional): "voiceover-FR.txt" and "subtitles-FR.srt".

STEP 3 - AUDIO
Create the voice track for each language with the best text-to-speech voice available to you (a calm, warm, professional voice: a woman or a man, your choice, the same voice for the whole video). Export one audio file per scene named scene-01-ar.mp3 ... and a single full track per language where every scene starts exactly at its start time (pad with silence). If you cannot generate audio yourself, give me the exact text per scene ready to paste into a TTS tool (ElevenLabs, Azure, Google), with pause marks.

STEP 4 - VIDEO
Convert the recording to MP4 (1920x1080, H.264, 30 fps) and produce two final videos: trtcrm-demo-ar.mp4 and trtcrm-demo-fr.mp4, each with its voice track, a soft background music bed at low volume if you have one, the subtitles available as a separate track (and a version with burned-in subtitles). Add a short title card at the start ("trtCRM - the all-in-one CRM for your agency") and an end card ("Ask for a live demo"). If the tour is shorter or longer than the voiceover in a scene, adjust the video speed of that scene slightly (never more than 15 percent) rather than cutting words.
Useful commands:
  ffmpeg -i trtcrm-demo.webm -vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2 -r 30 -c:v libx264 -pix_fmt yuv420p -crf 18 video.mp4
  ffmpeg -i video.mp4 -i voice-ar.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -shortest trtcrm-demo-ar.mp4
  ffmpeg -i trtcrm-demo-ar.mp4 -vf subtitles=subtitles-AR.srt trtcrm-demo-ar-subtitled.mp4

QUALITY CHECK BEFORE YOU ANSWER
Read the Arabic and French texts once more as if you were the listener: no word-for-word translation, no invented features, every sentence short enough to say in one breath. Tell me the total length and anything you changed.
`
}

export function downloadPack(scenes, last) {
    const tl = timeline(scenes, last)
    const day = new Date().toISOString().slice(0, 10)
    save(`trtcrm-voiceover-EN-${day}.txt`, voiceoverText(tl))
    setTimeout(() => save(`trtcrm-demo-scenes-${day}.json`, JSON.stringify({ product: 'trtCRM', language: 'en', wordsPerSecond: WORDS_PER_SECOND, scenes: tl.map((s, i) => ({ n: i + 1, id: s.id, title: s.title, page: s.path, start: s.start, end: s.end, seconds: s.seconds, voiceover: s.say })), manual: MANUAL.map((m) => ({ id: m.id, title: m.title, voiceover: m.say, how: m.how })) }, null, 2), 'application/json'), 350)
    setTimeout(() => save(`trtcrm-prompt-for-claude-${day}.txt`, promptText(tl)), 700)
}
