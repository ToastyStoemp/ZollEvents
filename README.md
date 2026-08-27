# ZollEvents

Publishes Phuong Ninjin convention events from **one source of truth** — the
events you already log in **ZollTool** — as three outputs that update
automatically:

1. **Public events page** (`/`) — a branded "Where to find us" page.
2. **Shopify embed** (`/embed.js`) — a widget you drop into your store.
3. **iCal feed** (`/events.ics`) — subscribe once in Google/Apple/Outlook.
4. **Instagram bio** (`/instagram.txt`) — an auto-composed profile bio for the
   current/next event, e.g. `@animemesse, booth 5823, 17-19th July`.

It reads ZollTool over its read API with a scoped, read-only `zt_` token and
exposes only safe display fields (name, dates, city, country, plus your own
extras) — never transactions.

## Run

```bash
npm run web               # → http://localhost:4300, then open /admin
```

**No `.env` needed.** On first launch, `/admin` shows a **setup wizard** that
captures the admin password, the ZollTool source (server URL + read token), the
public base URL, and branding — saved to `data/config.json`. Change any of it
later from **⚙ Site settings** in the admin. Mint the read token in ZollTool →
Settings → **Admin & diagnostics → API access**; until a source is set the
service runs and simply shows no events.

Prefer to preset things (or provision headlessly)? Copy `.env.example` → `.env`
and set any keys you want — environment variables always override the wizard.

### Docker

```bash
docker compose up -d --build      # then open http://localhost:4300/admin and follow the wizard
```

**No `.env` needed.** The image is zero-dependency (source + `node`, no build
step). The first-run wizard's config (`data/config.json`) and the per-event
overlay (`data/overlay.json` — booth/hall/handle, links, the IG bio template)
both live on the `./data` volume, so they survive `--build` redeploys. Every env
key in the compose file is optional and only overrides the wizard when set.

| Env | Purpose |
|-----|---------|
| `PORT` | Port (default 4300). |
| `PUBLIC_BASE_URL` | The public origin this service is served at (used in the embed + calendar URLs). |
| `ZOLLTOOL_URL` / `ZOLLTOOL_API_TOKEN` | ZollTool read API + scoped token. |
| `ORG_NAME` / `ORG_TAGLINE` | Page branding. |
| `SHOW_PAST` / `PAST_LIMIT` | Past-events section. |
| `ADMIN_PASSWORD` | Enables the `/admin` editor for per-event extras. Blank = disabled. |
| `ZOLLEVENTS_TRUST_PROXY` | Trust `X-Forwarded-For` behind a proxy (login rate limit). |

### Behind Caddy / a reverse proxy

The container is always named `zollevents` (pinned in `docker-compose.yml`), so a
separate Caddy container can `reverse_proxy zollevents:4300` by name — but only once
they share a Docker network. Don't hard-code that network in the tracked compose
(it would break `up` where the network doesn't exist, and conflict on `git pull`).
Instead create the shared network once and join it from a **gitignored**
`docker-compose.override.yml` on the server (which `deploy.sh` picks up automatically):

```sh
docker network create zollnet   # once, shared by Caddy + every app
```

```yaml
# docker-compose.override.yml (gitignored, per-host)
services:
  zollevents:
    networks: [default, zollnet]
networks:
  zollnet:
    external: true
```

Put Caddy on `zollnet` too, then in your Caddyfile: `reverse_proxy zollevents:4300`
(set `PUBLIC_BASE_URL` to the public HTTPS origin Caddy serves).

### Auto-deploy from GitHub

Every push to `main` runs `.github/workflows/deploy.yml`, which SSHes into the
server and runs `deploy.sh` — gated on `AUTO_DEPLOY=1` in the server's own `.env`,
so **pushing to GitHub never touches a server that hasn't opted in locally**:

```sh
# on the server, one-time
echo "AUTO_DEPLOY=1" >> .env
```

Then add these repo secrets on GitHub (Settings → Secrets and variables → Actions):

- `DEPLOY_HOST` — the server's hostname or IP
- `DEPLOY_USER` — the SSH user to log in as
- `DEPLOY_SSH_KEY` — a dedicated private key whose public key is in that user's `~/.ssh/authorized_keys`
- `DEPLOY_PATH` — absolute path to this repo's checkout on the server
- `DEPLOY_PORT` — optional, only if SSH isn't on port 22

`deploy.sh` runs `git pull --ff-only` then `docker compose up -d --build` (adding
`docker-compose.override.yml` if present), failing loudly rather than doing
something surprising if the checkout has diverged. You can also trigger it from
the **Actions** tab (`workflow_dispatch`). If you already deploy ZollTool this way
on the same box, reuse the same `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` —
only `DEPLOY_PATH` differs (this repo's own checkout).

## Event extras (booth, link, blurb)

ZollTool stores name, dates, and city/country. For public-facing extras — a
**link** to the convention's site, its **hall** and **booth**, the convention's
**Instagram handle**, a short **blurb**, an optional **hero image**, or a
**hide** toggle — set `ADMIN_PASSWORD` and edit them at `/admin`. They're stored
in `data/overlay.json` (gitignored), keyed by event id, and merged on top of the
live ZollTool data.

## Instagram bio

`/admin` composes an Instagram profile bio from the **current or next** event and
serves it at **`/instagram.txt`** (and `/api/instagram.json`). A **template**
(edited in `/admin`, stored in the overlay `settings`) with a `{event}`
placeholder expands to a one-liner like `@animemesse, booth 5823, 17-19th July`;
finer tokens are also available:

| Token | Example |
|-------|---------|
| `{event}` | `@animemesse, booth 5823, 17-19th July` (handle → hall → booth → dates) |
| `{event_handle}` | `@animemesse` |
| `{event_hall}` / `{event_booth}` | `A1` / `5823` |
| `{event_dates}` | `17-19th July` |
| `{event_name}` / `{event_city}` / `{event_country}` | `Anime Messe` / `Berlin` / `Germany` |

The admin editor shows a **live preview** (with a 150-char counter — Instagram's
limit) and a **Copy** button.

> **Note:** Instagram has **no official API to write a profile bio**, so the
> final paste into Instagram is manual by design. To semi-automate it, point an
> [Apple/Android Shortcut](https://support.apple.com/guide/shortcuts/welcome/ios)
> at `https://YOUR-ZOLLEVENTS-HOST/instagram.txt` (it needs no auth — the bio is
> public) to fetch the current text on demand. Avoid unofficial bio-writing bots;
> they violate Instagram's terms and risk the account.

## Shopify embed

Add a Custom Liquid section (or edit a template) on any page and paste:

```html
<div id="zollevents-events" data-limit="8"></div>
<script src="https://YOUR-ZOLLEVENTS-HOST/embed.js" async></script>
```

A clean "where to find us" card: one row per **upcoming** event with a date
chip, the name, its dates, and the **country / city** (plus hall & booth). Only
upcoming events are shown. Options via data-attributes: `data-limit` (max shown,
0/absent = all), `data-heading="Catch us at…"` (title), `data-max-width` (card
width in px, default 640 — the card is centered in its container). The widget is
self-contained and inherits your theme's font.

## Calendar subscription

- **Google Calendar:** Other calendars → **From URL** → paste
  `https://YOUR-ZOLLEVENTS-HOST/events.ics`.
- **Apple/Outlook:** the page's **Subscribe** button uses `webcal://…` to
  subscribe in one click.

Calendars refresh on their own schedule (the feed hints ~6h); events added or
edited in ZollTool flow through automatically.

## Hosting

Unlike the back-office tools, this service is **public-facing** (Shopify and
calendar apps fetch it). Put it behind a TLS reverse proxy and set
`PUBLIC_BASE_URL` to the HTTPS origin. It holds only a read-only token and
serves only sanitized event data.

## Deploy updates

Events refresh live from ZollTool (cached ~5 min). Redeploy only when the code
changes — `data/overlay.json` persists your event extras.
