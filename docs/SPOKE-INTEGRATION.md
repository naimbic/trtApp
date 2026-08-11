# Connecting a site to the TRT hub (trtApp)

trtApp is the **central backend**. Every other TRT site (a "spoke") keeps its own
database and deployment but sends its **leads, analytics, and 404s** to the hub,
where they show up in one dashboard.

This guide is for wiring a spoke. It takes ~10 minutes per site.

---

## 1. Register the site in the hub

In trtApp, go to **Dashboard → Sites → Add Site**:

- **Name**: `TRT Digital`
- **Slug**: `trtdigital`  (stable id used to tag all data from this site)
- **Domain**: `trtdigital.com`
- **Allowed origins**: every origin the browser might call from, one per line:
  ```
  https://trtdigital.com
  https://www.trtdigital.com
  ```

On save you get an **API key, shown once**. Copy it.

> CLI alternative:
> ```bash
> node scripts/create-site.mjs "TRT Digital" trtdigital trtdigital.com "https://trtdigital.com,https://www.trtdigital.com"
> ```

---

## 2. Add env vars on the spoke (Coolify)

```
TRT_PLATFORM_URL=https://<hub-domain>      # e.g. https://trtmaroc.com
TRT_PLATFORM_KEY=trt_trtdigital_xxxxxxxxxxxxxxxxxxxx
```

Keep `TRT_PLATFORM_KEY` **server-side only** — never ship it to the browser.

---

## 3. Drop in the client

Copy [`platform-client/trt-platform.js`](../platform-client/trt-platform.js) into the
spoke (e.g. `lib/trt-platform.js`).

### Leads — from a server action / API route

```js
import { trackLead } from '@/lib/trt-platform'

export async function POST(request) {
    const body = await request.json()
    const result = await trackLead({
        form: 'contact',           // or audit-seo, lead, newsletter, ...
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        message: body.message,
    })
    return Response.json({ ok: result.ok })
}
```

The lead appears in **Dashboard → Submissions**, tagged with this site, and the
team gets the usual email + notification.

### Analytics — one small API route + a client ping

Because the key is server-side, proxy events through your own route:

```js
// app/api/track/route.js  (on the spoke)
import { trackEvent } from '@/lib/trt-platform'
export async function POST(request) {
    const ev = await request.json()
    await trackEvent({
        slug: ev.slug,
        type: ev.type || 'view',
        referrer: request.headers.get('referer') || '',
        utmMedium: ev.utmMedium,
    })
    return Response.json({ ok: true })
}
```

```js
// client: fire a page view
fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: window.location.pathname, type: 'view' }),
})
```

Data shows up in **Dashboard → Analytic** (real device + channel breakdowns).

### 404s — from the spoke's not-found handling

```js
import { log404 } from '@/lib/trt-platform'
await log404({ path: pathname, referrer, ua })
```

Shows up in **Dashboard → Redirects & 404s**.

---

## 4. Endpoints (reference)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/submissions` | `x-api-key` | leads / form submissions |
| POST | `/api/platform/events` | `x-api-key` | analytics events (view/like/share) |
| POST | `/api/404-log` | `x-api-key` | 404 aggregation |

All are CORS-restricted to the origins you registered for the site.

---

## 5. Turn on enforcement (after all spokes are wired)

During migration the hub still accepts legacy keyless calls (tagged `trtmaroc`).
Once **every** spoke sends its key, set on the hub:

```
PLATFORM_REQUIRE_KEY=true
```

After that, any ingest call without a valid key is rejected (401).

---

## 6. Deploy checklist for the hub (trtApp) — one-time

The multi-site schema adds a required `site` field to existing collections, so
run the backfill **before** syncing indexes:

```bash
node scripts/backfill-site.mjs   # tags legacy docs site="trtmaroc", fills page_event dates
npx prisma db push               # creates the sites collection + compound indexes
```

Then deploy the new code.
