// Pure helpers of the scheduled messages (tested on their own).

/** The AI's answer (JSON, or plain text when it ignored the format) as a title and the editor's HTML: no markdown marks, paragraphs, at most 1900 characters. */
export function shapeAiMessage(text) {
    const raw = String(text || '')
    let title = '', message = raw
    const body = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    try { const j = JSON.parse(body); title = String(j.title || ''); message = String(j.message || raw) } catch {
        // a model sometimes writes real line breaks inside the JSON text: read the two fields by hand; else it is plain text
        const m = /"title"\s*:\s*"([^"]*)"\s*,\s*"message"\s*:\s*"([\s\S]*)"\s*}/.exec(body)
        if (m) { title = m[1]; message = m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"') }
    }
    message = message.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim().slice(0, 1900)
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const html = message.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
    return { title: title.trim().slice(0, 100), html }
}
