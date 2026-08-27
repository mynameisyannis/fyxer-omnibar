# Fyxer Omnibar

Internal [bunnylol](https://github.com/ccheever/bunny1)-style dispatcher for the Fyxer tools you already jump between: Intercom, Retool, Stripe, HubSpot, Metabase, and Notion.

This is a command dispatcher, not only a command palette. First token is the command, the rest is the argument. Unknown input falls back to Google.

```text
b st jane@acme.com     → Stripe search
b st                   → Stripe dashboard home
b u jane@acme.com      → User 360 (5 tabs)
b list                 → this command list
b help st              → docs for Stripe
b g fyxer billing      → Google
b asdfasdf             → Google fallback
```

## Chrome search engine (primary)

This is the bunnylol UX: type in the regular address bar, never open a palette.

1. Enable GitHub Pages on this repo (**Settings → Pages → Deploy from branch**, folder `/ (root)`), **or** run a local server (below).
2. Chrome → **Settings → Search engine → Manage search engines and site search → Add**
3. Fill in:

| Field | Value |
| --- | --- |
| Name | `Fyxer` |
| Shortcut / keyword | `b` |
| URL | `https://mynameisyannis.github.io/fyxer-omnibar/?q=%s` |

Local equivalent:

```text
http://localhost:4173/?q=%s
```

4. In the address bar type `b` then Tab or Space, then a command (`st jane@acme.com`) and Enter.

`?q=` dispatches immediately. You do **not** need `&go=1`. Empty `b`, `list`, `help`, and `?` open the command list.

### GitHub Pages limitation

Pages is static hosting. It cannot send an HTTP 302 the way Meta’s bunny1 server does. The page loads `commands.json` and then `location.replace`s. A tiny boot script hides the UI first so the palette does not flash. Expect a short hop, not a zero-latency redirect.

## Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this repo folder
4. In the address bar, type `fx` then Tab or Space
5. Try `u jane@acme.com`, `st jane@acme.com`, `list`, or a typo (falls back to Google)

The toolbar icon still opens the fuzzy palette. Chrome may bind **Ctrl+Shift+K** / **⌘⇧K**; change it in `chrome://extensions/shortcuts`. User 360’s extra tabs are more reliable from the extension than from the search-engine hop (popup blockers).

## Local web list

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173). That page **is** the command list (`list`). `http://localhost:4173/?q=st%20jane@acme.com` redirects. `?palette=1` opens the old fuzzy palette.

## Commands

| Alias | Opens |
| --- | --- |
| `u` / `user` | User 360: Intercom, Retool, Stripe, HubSpot, Metabase (needs an email) |
| `ic` | Intercom inbox |
| `icu` / `who` / `whois` | Intercom user search |
| `rte` | Retool user by email (no query → the manage-user app) |
| `st` | Stripe home, or Stripe search with a query |
| `hs` | HubSpot home, or CRM search with a query |
| `stats` | Metabase user stats (needs an email) |
| `g` / `google` | Google (also the unknown-command fallback) |
| `gm` / `gmail` | Gmail home / search |
| `cal` | Google Calendar |
| `list` / `ls` / `?` | Command list |
| `help st` | Document one command |
| `hc` / `helpcenter` | Fyxer Help Center |
| `gl` | Notion glossary |
| `cs` | Customer Success Notion DB |
| `cus` | Customers Notion DB |
| `sp` | AE playbook |
| `app` | Fyxer dashboard |
| `status` | status.fyxer.com |

Paste an email with no command and User 360 is selected. `help` is the dispatcher help command; use `hc` for support.fyxer.com.

## Add a command

Edit `commands.json` and send a PR. A command looks like this:

```json
{
  "id": "stripe",
  "aliases": ["st", "stripe"],
  "title": "Stripe",
  "description": "Search customers, payments, and subscriptions",
  "category": "Billing",
  "url": "https://dashboard.stripe.com/search?query={query}",
  "home": "https://dashboard.stripe.com/",
  "example": "st jane@acme.com"
}
```

- `{query}` is replaced with `encodeURIComponent` of the argument.
- `home` / `noQueryUrl` is used when the command is invoked with no argument (`st` vs `st jane@acme.com`).
- Built-ins `list`, `help`, and `palette` use `"action"` instead of a URL.
- Unknown input uses the command whose id is `fallback` (`_default` → Google).

Keep aliases unique. `node scripts/validate-commands.js` checks that, plus broken `{query}` placeholders. `node test/omnibar.test.js` covers dispatch, fallback, help/list, and home vs search URLs.
