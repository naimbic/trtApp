# trtCRM presentation video

Record a guided tour of the CRM, then have an AI add a voiceover in Arabic and French.

## 1. Record (on https://dev.trtcrm.com only)
1. Sign in as an administrator with the demo data. Use a full-screen window (F11) around 1920x1080 (16:9).
2. Click the **Demo tour** pill at the bottom left (or press Ctrl+Shift+D).
3. Untick the scenes you do not want ("Tour only" / "How-to only" buttons; scenes marked **writes** create "Demo ..." records: a client, an invoice and its payment, a lead, a task, an expense, a reminder; "Delete demo records" removes them afterwards). Pace: Relaxed / Normal / Quick. "Subtitles in the video" burns the English text in (leave it off if the voiceover is added later).
4. **Rehearse** shows the tour without recording. **Record the tour**: in the browser dialog choose **This tab**. A red dot moves through the pages and clicks; Esc stops it.
5. At the end the video (`trtcrm-demo-YYYY-MM-DD.webm`) downloads and the panel reopens.
6. Click **Download the voiceover pack**: English voiceover with real timings, scenes.json and the prompt for the AI.

## 2. Voiceover
Give the three files and the `.webm` to Claude (or another AI). The prompt asks for Arabic first, then French: translated text per scene sized to the scene duration, SRT subtitles, audio, and the final MP4 per language.
The client area (/portal) is outside the tour: record it by hand and append it (its narration is in the pack).

`node scripts/demo-pack.mjs` writes the planned version of the same files to this folder without opening the app.

## Free recording (your own moves and voice)
In the same panel, **Free recording** records the tab while you work yourself and talk into the microphone: choose "This tab", allow the microphone, and after the 3-2-1 do what you want to show. A dot follows your mouse (the browser does not record the system cursor) and a faint control at the bottom left shows the time, Pause and Stop; Ctrl+Shift+E stops, Ctrl+Shift+P pauses. The video (`trtcrm-free-....webm`, with your voice) downloads when you stop. Do not reload the page while recording.
