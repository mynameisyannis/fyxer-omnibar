# Fyxer Omnibar — post-launch roadmap

For Yannis and Fyxer support. Read this before broadcasting `b` to the whole team.

**Shipped:** Chrome search engine `b` + `/?q=%s`, `list` / `help`, Google fallback, home vs search URLs, User 360 (`u` + email), extension keyword `fx`, rich `commands.json`, GitHub Pages client-side hop (no HTTP 302).

**Rule:** `commands.json` stays the source of truth. A Worker, Slack slash, or personal overlay should *read* it, not grow a second catalog.

---

## 1. Primetime blockers

Do these before telling the whole team. This is launch hygiene, not a backlog.

| Order | Item | Why it matters for support | Effort | Dependency |
| --- | --- | --- | --- | --- |
| 1 | **Turn on GitHub Pages** (Settings → Pages → deploy from branch, `/ (root)`) | Without this, `b` only works on localhost. Nobody else can add the search engine. | S | Repo admin |
| 2 | **Confirm `cs` / `cus` titles** against the live Notion DBs | Those URLs are UUIDs. If the titles are wrong, people will “learn” the wrong database and we will spend a week undoing it. | S | Someone who lives in those DBs |
| 3 | **Search-engine one-pager** (4 steps, copy-paste URL, `b` then Tab) | Support will not read the README. A wrong keyword (`fx` vs `b`) or a `chrome-extension://` URL makes the tool look broken. | S | Real Pages URL from (1) |
| 4 | **User 360 + popup blockers, in writing** | `u jane@…` is the command that sells this tool. The Pages hop is a web page, so extra tabs get blocked. Until a Worker exists, the one-pager must say: **`u` → use extension `fx`**, or allow popups for the Pages origin. Single-tab commands (`st`, `ic`, `hs`) are fine on `b`. | S to document; do not “fix” it in JS | One-pager (3) |

Do not announce until 1–4 are done. Shipping a hop that silently opens one Intercom tab instead of five is worse than not shipping.

---

## 2. Next (high leverage)

Do these in this order. Stop after each one and use it for a while.

| Order | Item | Why it matters for support | Effort | Dependency |
| --- | --- | --- | --- | --- |
| 1 | **Shared Pages URL** | `publicBaseUrl` is currently a personal `*.github.io` URL. Once twenty people paste that into Chrome, a username or repo rename becomes an incident. Prefer a Fyxer-owned Pages URL (org repo or custom domain). | S (org Pages) / M (custom domain) | GitHub org / DNS. Do this *before* the team-wide add-to-Chrome push if you can; otherwise expect a migration. |
| 2 | **Real HTTP 302** (Cloudflare Worker or similar) | Meta bunnylol is a 302, not a “Going…” flash. A Worker that fetches `commands.json` and redirects matches that UX, works with JS blocked, and is the right place to later hang Slack. **It does not fully fix User 360** — a 302 can only land on one URL; extra tabs still need the extension or an explicit popup grant. Build the Worker for the 95% single-tab case, keep `fx` for `u`. | M | Canonical URL (1). Worker reads `commands.json`; do not fork the catalog. |
| 3 | **Command-add workflow** | Support will want a new shortcut the same week they start using this. Today the path is “edit JSON, run `node scripts/validate-commands.js`, PR”. Make that a 5-line checklist (unique aliases, `home` vs `{query}`, example). Do not build an admin UI. | S | None. Do this before asking the team to contribute commands. |
| 4 | **`who` — maybe** | `who` / `whois` / `icu` is Intercom identity. `u` is the five-tab 360. **Keep that split.** Support muscle memory: `who` = “is this the right person?”, `u` = “work the account”. Optional tweak: `who` opens Intercom + HubSpot (two tabs). Do not alias `who` to User 360. | S | Yannis: two tabs vs leave it. |

---

## 3. Soon

Only after the Worker (or a firm decision to stay on the JS hop).

| Order | Item | Why it matters for support | Effort | Dependency |
| --- | --- | --- | --- | --- |
| 1 | **Live-sync `commands.json` into the extension** | Unpacked `fx` ships a frozen copy. After a command PR merges, extension users keep the old catalog until they reload. Fetch from the Pages/Worker URL on start. | S–M | Canonical URL. Host permission on that origin. |
| 2 | **Clipboard-email** | Support copies an email in Intercom, then types `u`. `u` with no argument should use the clipboard if it looks like an email. | S in the extension; skip on the public Pages hop (paste permission is noisy) | Extension. Do not block `u` when the clipboard is empty — show `help u`. |
| 3 | **Recents** | The same three commands get used all day (`u`, `st`, `ic`). Last-five on empty `b` / `fx` is enough. Store locally; no backend. | S–M | localStorage on Pages, `chrome.storage` in the extension. Sync later is not required. |
| 4 | **Personal overlays** | People have private Notion pages and one-off Retool apps. Those must not land in the shared catalog. A local JSON overlay that cannot collide with shared aliases is the whole feature. | M | Shared `commands.json` remains canonical. Overlay loses on alias clash. |
| 5 | **Slack slash *or* bookmarklet** | Support lives in Slack. `/fyxer u jane@…` is the real “everywhere” surface. A bookmarklet is a cheap fallback for browsers with no search-engine keyword. Prefer Slack if we already have an app; otherwise ship the bookmarklet (it is just the 302 URL) and skip a new Slack app. | Bookmarklet S; Slack slash L if it needs a new app | Worker URL. Slack: bot + workspace approval. |

---

## 4. Later / skip

| Item | Verdict |
| --- | --- |
| **Raycast** | Skip. Support is Chrome-first. A second catalog will drift. Revisit only if the Worker can be the backend for a thin Raycast extension. |
| **Usage stats** | Skip. We will learn the top commands by sitting next to support for a morning. Telemetry on an internal dispatcher becomes a project and a privacy discussion. |
| **Yubnub junk-drawer** (`yt`, `amzn`, `r`) | Skip. Unknown input already Googles. Extra aliases make `list` worse. |
| **Per-user dashboards** | Skip. That is Retool. This tool opens URLs; it should not grow a UI of its own. |

---

## Commands worth adding next

Proposals only — no invented URLs. Add via `commands.json` after the checklist in §2. Prefer tools support already opens ten times a day.

1. **Mixpanel** (`mp`) — user / event lookup by email. The usual “is this customer actually using the product?” hop after Intercom.
2. **Slack** (`sl`) — workspace search, or a pinned support channel. Only if we have a stable workspace URL we are willing to put in git.
3. **Linear *or* Jira** (`lin` / `jira`) — **if we use it** for support bugs. Add one, not both. If the tracker is Notion, do not add either.
4. **Notion search** (`nts`) — `nt` is workspace home. Support often wants “find the page,” not the sidebar.
5. **GitHub** (`gh`) — repo or issue search for the product + this omnibar repo. Skip if support never files bugs there.
6. **Billing portal / invoices** — `st` is Stripe *search*. A dedicated “open this customer’s billing surface” is only worth it if we already have a Retool app or a Stripe URL pattern that does not require an internal customer id. Do not guess a `/customers/{id}` URL.
7. **HubSpot company** (`hsc`) — `hs` is global CRM search. Company-record search is what CS actually wants when the ticket is about an account, not a person.
8. **Feature flags** (LaunchDarkly / Statsig / equivalent) — **if we use it** to debug “why is this user on the old composer?” Same bar as Mixpanel: daily support hop, or don’t add it.
9. **Sentry / error lookup** (`err`) — **if we use it** and there is a search-by-email or search-by-org URL. Otherwise keep using `status` for outages.
10. **Other Retool apps** — only named apps support already bookmarks (billing ops, impersonate, org settings). Same pattern as `rte`. Ask before adding; do not scrape the Retool folder.

Default no: YouTube, Amazon, Reddit, Twitter, ChatGPT. `g` covers curiosity searches.
