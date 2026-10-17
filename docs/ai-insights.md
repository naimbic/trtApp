# AI insights (super administrator only)

**Settings → AI** (MORE → AI) holds one card per provider: **Claude (Anthropic)**, **ChatGPT (OpenAI)**, **DeepSeek** and
**OpenRouter**. For each one the super administrator pastes the API key (stored encrypted with AES-256-GCM using the server's
`AUTH_SECRET`, never shown again, only the last four characters), picks the **model** from a dropdown (suggested models, the
models the key can really use after pressing refresh, or any model id typed by hand), presses **Test**, and chooses the
**default** provider. An optional text about the company is added to every analysis.

**Utilities → AI insights** (`/crm/ai`) shows three analyses, each with its figures drawn from the CRM and an AI reading:

| Analysis | Figures | The AI is asked for |
| --- | --- | --- |
| Leads | totals, conversion, days to convert, sources, owners, 12 months, leads needing attention | summary, what stands out, risks, actions |
| Clients | active / dormant, top clients by invoiced, concentration, overdue and outstanding, new clients per year | the same |
| Yearly income | every year of the company: invoiced, collected, expenses, growth, best month, this year to date against the same months last year | the same |

An optional question can be added; it is answered from the same figures.

## What leaves the server
Totals, rates and **company names** only: no emails, phone numbers or addresses. The AI is told to use only these figures.
Each use is written to the activity log (who, which analysis, which provider and model). Limit: 30 analyses an hour per person.
Amounts are per currency and never converted.

## Who can do what
Only a super administrator (`admin` / `crm.admin`): the page, the figures, the keys, the models and the analyses all refuse
anyone else (403), and the menu entry is hidden for them.

## Chat
The AI page opens on a Chat: a conversation about the same figures (leads, clients, yearly income, refreshed every 5 minutes), with the provider and model chosen above it. The last 20 turns are sent each time, 60 messages an hour per person, and every use is in the activity log. API: `POST /api/crm/ai/chat` `{ messages, provider?, model?, lang? }`.

## Environment
Nothing is required: keys are entered in the screen. Optional: `AI_BASE_URL_OPENAI`, `AI_BASE_URL_ANTHROPIC`,
`AI_BASE_URL_DEEPSEEK`, `AI_BASE_URL_OPENROUTER` point a provider at a proxy or a self-hosted compatible server.
`AI_KEY_SECRET` overrides the secret used to encrypt keys (default `AUTH_SECRET`; if it changes the saved keys become
unreadable and must be entered again).

## Try it without a key
```bash
node scripts/fake-ai.mjs                                                  # a stand-in provider on :4200
AI_BASE_URL_OPENAI=http://127.0.0.1:4200/v1 npx next dev -p 3000          # then add any key for ChatGPT in Settings → AI
```
`npm test` covers the key encryption, the request and answer of the four providers, model lists and error messages.
