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
cp .env.example .env      # set ZOLLTOOL_URL + ZOLLTOOL_API_TOKEN + PUBLIC_BASE_URL
npm run web               # → http://localhost:4300
```

Mint the token in ZollTool → Settings → **Admin & diagnostics → API access**.
With no token set, the service still runs and simply shows no events.

### Docker

```bash
cp .env.example .env      # set PUBLIC_BASE_URL, ZOLLTOOL_URL/TOKEN, ADMIN_PASSWORD
docker compose up -d --build
```

The image is zero-dependency (source + `node`, no build step). The per-event
overlay (`data/overlay.json` — booth/hall/handle, links, the IG bio template) is
kept on the `./data` volume, so it survives `--build` redeploys. `PUBLIC_BASE_URL`
is required; the rest of the env keys below map 1:1 to the compose file.

| Env | Purpose |
|-----|---------|
| `PORT` | Port (default 4300). |
| `PUBLIC_BASE_URL` | The public origin this service is served at (used in the embed + calendar URLs). |
| `ZOLLTOOL_URL` / `ZOLLTOOL_API_TOKEN` | ZollTool read API + scoped token. |
| `ORG_NAME` / `ORG_TAGLINE` | Page branding. |
| `SHOW_PAST` / `PAST_LIMIT` | Past-events section. |
| `ADMIN_PASSWORD` | Enables the `/admin` editor for per-event extras. Blank = disabled. |
| `ZOLLEVENTS_TRUST_PROXY` | Trust `X-Forwarded-For` behind a proxy (login rate limit). |

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
<div id="zollevents-events" data-past="true" data-limit="8"></div>
<script src="https://YOUR-ZOLLEVENTS-HOST/embed.js" async></script>
```

Options via data-attributes on the div: `data-limit` (max upcoming shown),
`data-past="true"` (also list past events), `data-heading="Catch us at…"`.
The widget is self-contained and inherits your theme's font/colors.

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
