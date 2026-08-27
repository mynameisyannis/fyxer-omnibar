# Fyxer Omnibar

Internal launcher for the Fyxer tools you already jump between all day: Intercom, Retool, Stripe, HubSpot, Metabase, and Notion.

Type a short command, or paste a customer email.

## Use it

### Chrome extension (best)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this repo folder
4. In the address bar, type `fx` then Tab or Space
5. Try `u jane@acme.com`, `st jane@acme.com`, or `ic`

The toolbar icon opens the same command palette. Chrome may bind **Ctrl+Shift+K** / **⌘⇧K**; you can change it in `chrome://extensions/shortcuts`.

### Web palette

Open `index.html` through a local server, or enable GitHub Pages on this repo.

```bash
python3 -m http.server 4173
```

Then go to [http://localhost:4173](http://localhost:4173).

You can also add a Chrome site search shortcut pointing at:

```text
https://<your-pages-host>/index.html?q=%s&go=1
```

## Commands

| Alias | Opens |
| --- | --- |
| `u` / `user` | User 360: Intercom, Retool, Stripe, HubSpot, Metabase |
| `ic` | Intercom inbox |
| `icu` | Intercom user search |
| `rte` | Retool user by email |
| `st` | Stripe search |
| `hs` | HubSpot search |
| `stats` | Metabase user stats |
| `gl` | Notion glossary |
| `cs` | Customer Success Notion DB |
| `cus` | Customers Notion DB |
| `sp` | AE playbook |
| `app` | Fyxer dashboard |
| `hc` | Help Center |
| `status` | status.fyxer.com |

Paste an email with no command and User 360 is selected automatically.

## Add a command

Edit `commands.json` and send a PR. A command looks like this:

```json
{
  "id": "stripe",
  "aliases": ["st", "stripe"],
  "title": "Stripe",
  "description": "Search customers, payments, and subscriptions",
  "category": "Billing",
  "url": "https://dashboard.stripe.com/search?query={query}"
}
```

Use `{query}` where the typed search term or email should go. For a User 360-style jump, use `"urls": [ "...", "..." ]` instead of `"url"`.

Keep aliases unique. `node scripts/validate-commands.js` checks that, plus broken `{query}` placeholders.
