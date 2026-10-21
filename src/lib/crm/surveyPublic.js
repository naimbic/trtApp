import { getOptions } from '@/lib/crm/mailer'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const T = {
    english: { send: 'Send my answers', required: 'required', thanks: 'Thank you!', thanksText: 'Your answers were sent.', closed: 'This survey is closed.', soon: 'This survey is not open yet.', off: 'This survey is not available.', poor: 'Poor', great: 'Great', error: 'Something went wrong, please try again.', pick: 'Please answer the required questions.' },
    french: { send: 'Envoyer mes réponses', required: 'obligatoire', thanks: 'Merci !', thanksText: 'Vos réponses ont été envoyées.', closed: 'Ce sondage est fermé.', soon: "Ce sondage n'est pas encore ouvert.", off: "Ce sondage n'est pas disponible.", poor: 'Mauvais', great: 'Excellent', error: 'Une erreur est survenue, veuillez réessayer.', pick: 'Merci de répondre aux questions obligatoires.' },
}

const CSS = `*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#f3f4f6;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827}
.wrap{max-width:680px;margin:0 auto;padding:28px 14px 60px}.top{font-weight:700;color:#6b7280;margin-bottom:12px;font-size:14px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:26px;margin-bottom:14px}h1{margin:0 0 8px;font-size:24px;letter-spacing:-.02em}.muted{color:#6b7280;margin:0;white-space:pre-line}
.q{padding:18px 0;border-top:1px solid #f1f5f9}.q:first-of-type{border-top:0}.q h3{margin:0 0 10px;font-size:16px}.req{color:#dc2626;font-size:12px;font-weight:600;margin-left:6px}
.opt{display:flex;gap:10px;align-items:center;padding:9px 12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;cursor:pointer}.opt:hover{border-color:#9ca3af}.opt input{width:18px;height:18px;margin:0}
input[type=text],textarea{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px 12px;font:inherit}
.stars{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.stars label{cursor:pointer}.stars input{position:absolute;opacity:0}.stars span{display:inline-grid;place-items:center;width:46px;height:46px;border:1px solid #d1d5db;border-radius:12px;font-size:18px;font-weight:700}
.stars input:checked+span{background:#111827;color:#fff;border-color:#111827}.stars small{color:#9ca3af;font-size:12px}
.btn{border:0;border-radius:12px;background:#111827;color:#fff;padding:13px 22px;font:inherit;font-weight:700;cursor:pointer}.btn:disabled{opacity:.5}.err{color:#dc2626;margin-top:10px;min-height:20px}.center{text-align:center;padding:44px 26px}`

const field = (q, T_) => {
    const name = `q_${q.id}`
    if (q.type === 'radio' || q.type === 'yesno') return q.options.map((o) => `<label class="opt"><input type="radio" name="${name}" value="${esc(o.id)}"><span>${esc(o.text)}</span></label>`).join('')
    if (q.type === 'checkbox') return q.options.map((o) => `<label class="opt"><input type="checkbox" name="${name}" value="${esc(o.id)}"><span>${esc(o.text)}</span></label>`).join('')
    if (q.type === 'rating') return `<div class="stars"><small>${T_.poor}</small>${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${name}" value="${n}"><span>${n}</span></label>`).join('')}<small>${T_.great}</small></div>`
    if (q.type === 'textarea') return `<textarea name="${name}" rows="4" maxlength="2000"></textarea>`
    return `<input type="text" name="${name}" maxlength="300">`
}

/** The public page of a survey: the questions, a send button, and a thank-you. found = { survey, state, questions }. */
export async function surveyPage({ survey, state, questions }) {
    const o = await getOptions(['active_language', 'companyname'])
    const T_ = T[o('active_language') === 'french' ? 'french' : 'english']
    const company = o('companyname') || ''
    const head = `<!doctype html><html lang="${o('active_language') === 'french' ? 'fr' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(survey.subject)}</title><link rel="icon" href="/api/crm/branding/favicon"><style>${CSS}</style></head><body><div class="wrap">${company ? `<div class="top">${esc(company)}</div>` : ''}`
    if (state !== 'open') return `${head}<div class="card center"><h1>${esc(survey.subject)}</h1><p class="muted">${state === 'scheduled' ? T_.soon : state === 'closed' ? T_.closed : T_.off}</p></div></div></body></html>`
    const body = questions.map((q) => `<div class="q" data-q="${esc(q.id)}" data-type="${q.type}" data-req="${q.required ? 1 : 0}"><h3>${esc(q.question)}${q.required ? `<span class="req">${T_.required}</span>` : ''}</h3>${field(q, T_)}</div>`).join('')
    return `${head}<div class="card"><h1>${esc(survey.subject)}</h1>${survey.description ? `<p class="muted">${esc(survey.description)}</p>` : ''}</div>
<form id="f" class="card">${body}<div class="err" id="e"></div><button class="btn" id="b" type="submit">${T_.send}</button></form>
<div class="card center" id="done" hidden><h1>${T_.thanks}</h1><p class="muted" id="tt">${T_.thanksText}</p></div></div>
<script>
const f=document.getElementById('f'),E=document.getElementById('e'),B=document.getElementById('b');
f.onsubmit=async(ev)=>{ev.preventDefault();E.textContent='';const answers={};let miss=false;
document.querySelectorAll('.q').forEach(q=>{const id=q.dataset.q,t=q.dataset.type;let v;
if(t==='checkbox')v=[...q.querySelectorAll('input:checked')].map(i=>i.value);else if(t==='input'||t==='textarea')v=q.querySelector('input,textarea').value.trim();else{const c=q.querySelector('input:checked');v=c?c.value:''}
const empty=v===''||(Array.isArray(v)&&!v.length);if(empty&&q.dataset.req==='1'){miss=true;q.style.outline='2px solid #fca5a5';q.style.borderRadius='10px'}else q.style.outline='';if(!empty)answers[id]=v});
if(miss){E.textContent=${JSON.stringify(T_.pick)};return}
B.disabled=true;try{const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers})});const j=await r.json().catch(()=>({}));
if(!r.ok)throw new Error(j.error||${JSON.stringify(T_.error)});f.hidden=true;document.getElementById('done').hidden=false;if(j.thankYou)document.getElementById('tt').textContent=j.thankYou;if(j.redirectUrl)setTimeout(()=>{location.href=j.redirectUrl},1800)}catch(x){E.textContent=x.message;B.disabled=false}};
</script></body></html>`
}
