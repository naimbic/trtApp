# TRT global lead-form kit

One canonical multi-step lead form for **every** TRT site. Same UX as trtAds.ma,
themed per project. Each site **sends its own email** and **saves the lead to the
hub** (app.trtmaroc.com), where it appears in the trtApp dashboard tagged with the
site and the page it came from.

## Files

| File | Copy to (spoke) | What it is |
|---|---|---|
| `ContactForm.tsx` | `components/ContactForm.tsx` | The 4-step wizard (services → budget → timeline → details). Theme-agnostic. |
| `route.ts` | `app/api/contact/route.ts` | Emails + forwards the lead to the hub. |

> Next.js App Router + TypeScript version. For a **JS** project use the same code
> without type annotations; for a **Vite/Express** app (trtDigitals) put the
> `route.ts` logic in an Express handler and keep the same component.

## Install

```bash
npm i framer-motion   # if not already present
```

## Use

```tsx
import { ContactForm } from "@/components/ContactForm";

<ContactForm
  brand="#2563eb"                     // this site's primary color
  brandTo="#3b82f6"                   // optional gradient end
  agencyName="TRT Digital"
  heading="Get a free strategy session"
  privacyHref="/privacy"
  whatsappUrl="https://wa.me/2126XXXXXXXX"
  // services / budgets / timelines default to the TRT set — override per site
/>
```

## Env (set on the spoke, e.g. Coolify)

```
ADMIN_API_URL=https://app.trtmaroc.com      # the hub
PROXY_API_KEY=trt_<slug>_xxxxxxxx           # this site's key from Dashboard → Sites
SMTP_HOST=...
SMTP_PORT=465
SMTP_USER=commercial@trtdigital.ma
SMTP_PASS=...
SENT_TO=commercial@trtdigital.ma            # where notification emails go
SITE_NAME="TRT Digital"                     # email subject/branding
```

## What gets sent to the hub

`POST {ADMIN_API_URL}/api/submissions` with header `x-api-key: PROXY_API_KEY` and body:

```json
{ "form": "contact", "name": "...", "email": "...", "phone": "...",
  "company": "...", "website": "...", "needs": "svc1, svc2",
  "budget": "...", "deadline": "...", "message": "...",
  "pageUrl": "https://site.com/the/page" }
```

The hub tags the lead with the **site** (from the key) and stores **pageUrl** as
`page`. It does **not** send a second email (the spoke already did); it stores the
lead and notifies admins in-dashboard.

## Behavior guarantees

- Honeypot + per-IP rate limit + payload caps.
- Email and hub calls are timeout-bounded — a blocked SMTP port or hub hiccup can
  never hang or break the form.
- With no env set, the form still works (accepts + logs) so local dev never breaks.
