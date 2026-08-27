# Fyxer Omnibar

Internal [bunnylol](https://github.com/ccheever/bunny1)-style dispatcher for the Fyxer support stack: Plain, Parahelp, Notion, Slack, Fyxer admin, Linear, GitHub, Stripe, HubSpot, PostHog, GrowthBook, GCP, Cursor, Claude.

Type in Chrome’s **address bar**. First token is the command, the rest is the argument. Unknown input falls back to Google.

```text
b st jane@acme.com     → Stripe search
b u jane@acme.com      → User 360 (Stripe + HubSpot)
b pl                   → Plain
b lin                  → Linear
b list                 → command list
b help st              → docs for the Stripe command (not the Help Center)
b hc                   → support.fyxer.com
b asdfasdf             → Google
```

## Add to Chrome (~2 minutes)

Keyword **`b`** is a Chrome **site search** shortcut. It is not the extension (that one is **`fx`**).

### 1. Check the hosted URL

Open [https://mynameisyannis.github.io/fyxer-omnibar/](https://mynameisyannis.github.io/fyxer-omnibar/)

| What you see | What to do |
| --- | --- |
| Command list | Continue — paste the URL below into Chrome. |
| **404** | **Stop.** GitHub Pages is off or not serving this `index.html`. That is a repo-admin setting (`Settings → Pages → Deploy from branch`, folder `/ (root)`), and Pages usually publishes **`main`**. Today `main` is only `commands.json`, so Pages must be enabled **and** this dispatcher must be merged (or Pages pointed at a branch that has `index.html`). You cannot fix this from Chrome. Use [localhost](#until-pages-is-live) or the [extension](#chrome-extension-keyword-fx) until then. |

Do not add the github.io search engine while it 404s — every `b` query will 404 too.

### 2. Add site search (do not replace Google)

1. Open `chrome://settings/searchEngines`
2. Scroll to **Site search** → **Add** (leave Google as the default search engine)

| Field | Copy exactly |
| --- | --- |
| Name | `Fyxer` |
| Shortcut / keyword | `b` |
| URL | `https://mynameisyannis.github.io/fyxer-omnibar/?q=%s` |

`%s` is required. **`?q=` is enough — do not add `&go=1`.**

### 3. Try it

Address bar → `b` → Tab or Space → `list` → Enter.

Empty `b`, `list`, `help`, and `?` open this command list.

## Until Pages is live

Needs the repo on disk:

```bash
python3 -m http.server 4173
```

Then add a **second** site-search engine (or only this one, for a local pilot):

| Field | Value |
| --- | --- |
| Name | `Fyxer local` |
| Shortcut | `b` (or `bl` if `b` is taken) |
| URL | `http://localhost:4173/?q=%s` |

Same rule: `?q=%s` only, no `&go=1`. Open [http://localhost:4173](http://localhost:4173) — that page **is** `list`. `?palette=1` is the old fuzzy palette.

## Chrome extension (keyword `fx`)

Use this for a personal pilot, and for **User 360**, which is more reliable here than on the web hop.

1. `chrome://extensions` → **Developer mode** → **Load unpacked** → this repo folder
2. Address bar → `fx` → Tab or Space → `list` or `u jane@acme.com`

Toolbar icon still opens the palette. Chrome may bind **Ctrl+Shift+K** / **⌘⇧K**; change it in `chrome://extensions/shortcuts`.

## User 360 and popup blockers

`u jane@acme.com` opens **two** tabs: Stripe search and HubSpot search (EU portal `144759091`).

Plain and PostHog are **not** in User 360. Plain has no public email-search URL without a workspace id. PostHog person search needs a project id. Do not guess those.

- **`b` on GitHub Pages / localhost:** the first tab redirects; the extra tab is `window.open`. Chrome often blocks it. If so, use the fallback links on the hop page, or allow pop-ups for the omnibar origin, or use the extension.
- **`fx` extension:** extra tabs use `chrome.tabs.create`, so they usually all open.

## Naming traps

| You want | Type | Trap |
| --- | --- | --- |
| Docs for a command | `help st` | `help` is dispatcher help, **not** the Help Center |
| Help Center | `hc` or `helpcenter` | Not a primary tool — public docs only |
| Fyxer dashboard / admin | `admin` / `fyxer` / `app` | Admin settings live in the left nav after sign-in |
| AE playbook | `sp` or `playbook` | Notion page, not Linear |
| Linear | `lin` | Opens `linear.app` until we have a workspace slug |

Paste a bare email and User 360 is selected. `b list` is the full catalog.

## Commands

| Alias | App | Opens |
| --- | --- | --- |
| `u` / `user` | User 360 | Stripe + HubSpot for an email |
| `pl` / `plain` | Plain | `app.plain.com` (in-app search) |
| `para` / `parahelp` | Parahelp | `app.parahelp.com` |
| `sl` / `slack` | Slack | `app.slack.com` (no workspace id) |
| `st` / `stripe` | Stripe | Dashboard home, or search with a query |
| `admin` / `fyxer` / `app` | Fyxer admin | `app.fyxer.com` |
| `nt` / `notion` | Notion | `notion.so/fyxerai` |
| `gl` / `glossary` | Notion | Fyxer AI glossary |
| `sp` / `playbook` | Notion | AE playbook |
| `lin` / `linear` | Linear | `linear.app` (no team slug) |
| `gh` / `github` | GitHub | Search, or `github.com/Fyxer-AI` with no query |
| `hs` / `hubspot` | HubSpot | EU portal home, or CRM search |
| `po` / `posthog` | PostHog | `app.posthog.com` (no project id) |
| `gb` / `growthbook` | GrowthBook | `app.growthbook.io` |
| `gcp` / `gcloud` | GCP | `console.cloud.google.com` |
| `cur` / `cursor` | Cursor | `cursor.com/dashboard` |
| `cl` / `claude` | Claude | `claude.ai` |
| `g` / `google` | Google | Also the unknown-command fallback |
| `hc` / `helpcenter` | Help Center | `support.fyxer.com` (optional, not in the daily stack) |

URLs that still need a slug from Yannis (home is used until then): Linear workspace, Slack workspace, PostHog project, GCP project, Plain workspace. Prefer a working home URL over a broken deep link.

## If a URL is wrong

1. `b help <alias>` shows the destination (or open `list` and read the row).
2. Change `commands.json` and open a PR, or ping the person who can merge this repo.
3. Keyword `b` reads `commands.json` **from GitHub Pages**. A merge does not update `b` until Pages is serving the new file (hard-refresh if it looks stale). Local `b` / unpacked `fx` update as soon as the file on disk does.

The list lives in `commands.json` in this repo. There is no separate Fyxer owner yet — whoever can merge here owns the shortcuts.

## Add a command

Edit `commands.json`, keep aliases unique, send a PR.

```json
{
  "id": "stripe",
  "aliases": ["st", "stripe"],
  "title": "Stripe",
  "description": "Search customers, payments, and subscriptions",
  "category": "Support",
  "url": "https://dashboard.stripe.com/search?query={query}",
  "home": "https://dashboard.stripe.com/",
  "example": "st jane@acme.com"
}
```

- `{query}` is replaced with the URL-encoded argument.
- `home` is used when there is no argument (`st` vs `st jane@acme.com`).
- Built-ins `list`, `help`, and `palette` use `"action"` instead of a URL.
- Unknown input uses the command whose id is `fallback` (`_default` → Google).

`node scripts/validate-commands.js` checks unique aliases and broken `{query}` placeholders.

## Public repo / internal IDs

This GitHub repo is **public**. Command URLs include the HubSpot portal id and the Notion workspace slug. That is a launch risk (they are in git history), not a reason to paste those IDs into Slack or this README. Prefer a private repo when you can. Do not add more IDs to docs.

## Why `b` is a short hop, not an instant redirect

GitHub Pages is static. It cannot send an HTTP 302 the way Meta’s bunny1 server does. The page loads `commands.json` and then `location.replace`s. Expect a brief “Going…” hop, not a zero-latency redirect.
