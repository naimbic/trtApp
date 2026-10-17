# Sign in with trtAgency (OpenID Connect)

trtAgency is the in-house identity provider (a rebranded self-hosted Puter). The CRM signs people in with the
authorization code flow + PKCE (S256); the ID token (RS256) is verified against the provider's JWKS (signature, issuer,
audience, expiry, nonce) before anything is trusted. The provider has no refresh token and no logout endpoint yet: the CRM
keeps its own session (same cookie as a password sign-in) and when it ends the person simply signs in again.

## Settings (environment variables, never committed)

| Variable | Meaning |
| --- | --- |
| `TRTAGENCY_ISSUER` | `https://<agency domain>` (local: `http://trtagency.localhost:4100`) |
| `TRTAGENCY_CLIENT_ID` | the client id the trtAgency administrator registered (`oidc_provider.clients`), e.g. `crm` |
| `TRTAGENCY_CLIENT_SECRET` | its secret |
| `TRTAGENCY_REDIRECT_URI` | the callback, **exactly** as registered (matching is exact): `https://<crm domain>/api/crm/auth/trtagency/callback` |
| `TRTAGENCY_DEV_IP` | optional, address of a `*.localhost` provider (default `127.0.0.1`) |
| `TRTAGENCY_AUTO_CREATE` | optional, `false` = someone without a CRM account is refused instead of getting one |
| `TRTAGENCY_LINK_BY_EMAIL` | optional, `false` = never attach a trtAgency identity to an existing account by its verified email |

Nothing set = the button is hidden. A partial or malformed set is logged as an error and the button stays hidden
(`TRTAGENCY_REDIRECT_URI` must be written the way a URL parser normalises it: no query, no fragment, no missing path).

## What the person sees

- `/sign-in` shows **Sign in with trtAgency** when the server is set up for it. It opens `/api/crm/auth/trtagency/login`
  (optional `?redirectUrl=/crm/leads`, only addresses of this site are kept).
- `/api/crm/auth/trtagency/callback` checks the state, exchanges the code, verifies the ID token, finds or creates the
  account and starts the normal session.
- Problems come back to `/sign-in?oidc_error=<code>` and are shown in a friendly message (cancelled, invalid or expired
  link, token problem, no account, disabled account, ...).

## Which account a trtAgency identity gets

1. The user already linked to this `sub` (the stable uuid of the identity).
2. Otherwise a user with the same **verified** email: the identity is attached to it (never for an unverified email, never
   if that email is tied to another identity).
3. Otherwise a new user + team member is created (name, email, `sub`, username; no password). It gets only what every
   team member gets (their own records); an administrator gives it a role in Team. Switch off with `TRTAGENCY_AUTO_CREATE=false`.

Deactivated team members are refused. The provider is trusted to authenticate: the local password and the local two-step
verification are not asked for this way of signing in.

## Run a login locally

No trtAgency running? Use the fake provider (same endpoints, RS256, PKCE):

```bash
# 1. the fake provider, registered for the local callback
PORT=4100 CLIENT_ID=crm CLIENT_SECRET=local-secret \
  REDIRECT_URI=http://127.0.0.1:3200/api/crm/auth/trtagency/callback node scripts/fake-trtagency.mjs

# 2. the CRM API with the settings (the web app on :3200 proxies /api to :3000)
TRTAGENCY_ISSUER=http://trtagency.localhost:4100 TRTAGENCY_CLIENT_ID=crm TRTAGENCY_CLIENT_SECRET=local-secret \
TRTAGENCY_REDIRECT_URI=http://127.0.0.1:3200/api/crm/auth/trtagency/callback npx next dev -p 3000

# 3. the web app
cd web && npx vite --port 3200
```

Open http://127.0.0.1:3200/sign-in and click **Sign in with trtAgency**; the fake provider lists a few people (one with
an unverified email, one without email, one to cancel).

With the real provider: ask the trtAgency administrator to register the client in Puter's `config.json` under
`oidc_provider.clients` with the exact redirect URI above, then use its issuer, client id and secret. Node cannot resolve
`*.localhost` on this Mac (browsers can), so the CRM reaches a `*.localhost` provider by IP with its own Host header
(`TRTAGENCY_DEV_IP`, default `127.0.0.1`); a production issuer needs nothing special.

## Tests

`npm test` runs the callback logic (state, replay, expiry, other browser, matching and linking rules) and the whole exchange
against the fake provider (a good login, wrong nonce, expired token, wrong audience or issuer, a signature from another key,
a reused code, a wrong PKCE verifier, userinfo fallback).

# Sign in with Google and GitHub

Both stay available next to trtAgency and the password. A button shows only when its keys are set:

| Variable | Meaning |
| --- | --- |
| `GOOGLE_AUTH_CLIENT_ID`, `GOOGLE_AUTH_CLIENT_SECRET` | Google Cloud → APIs & Services → Credentials → OAuth client (web). Authorized redirect URI: `https://<crm domain>/api/auth/callback/google` |
| `GITHUB_AUTH_CLIENT_ID`, `GITHUB_AUTH_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Authorization callback URL: `https://<crm domain>/api/auth/callback/github` |
| `AUTH_URL` | optional, the public address of the web app, only needed when the server cannot tell it from the request (local development: `http://localhost:3200`) |

Rules (see `src/lib/crm/socialLogin.js`):

- Only people who **already have an account here** can sign in this way: the account is the user with the same email, and the
  provider must vouch for it (Google says `email_verified`; GitHub only hands out its verified primary or public email).
  Nobody gets an account just by having a Google or GitHub login: an administrator adds the person in Team first.
- An unverified email, no email, no account or a deactivated team member goes back to `/sign-in` with a clear message.
- Like trtAgency, the provider authenticates: the local password and two-step verification are not asked for this way of signing in.
- The session is the CRM user's own (same cookie and 30-second re-check as a password sign-in).

Local testing: use `localhost` (not `127.0.0.1`) in the browser and in `AUTH_URL`, because the provider cookies must stay on the
host used for the callback. `npm test` covers the matching rules.
