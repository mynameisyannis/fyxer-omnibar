# Launch checklist

Do this **before** asking support to add keyword `b`. Suggested Slack text lives in the review write-up, not here, so it does not go stale.

## Blockers (do not Slack `b` until these are true)

- [ ] **GitHub Pages returns the command list**, not 404, at `https://mynameisyannis.github.io/fyxer-omnibar/`
- [ ] Pages is publishing a branch that **includes this `index.html`** (usually `main` after merge). Enabling Pages while `main` is still only `commands.json` will not give people an omnibar.
- [ ] Enabling Pages is **Settings → Pages → Deploy from branch**, folder `/ (root)`. Needs repo admin. Do not expect a teammate to do this from Chrome.
- [ ] You have added site search yourself at `chrome://settings/searchEngines` (**Site search → Add**, do not replace Google): name `Fyxer`, keyword `b`, URL `https://mynameisyannis.github.io/fyxer-omnibar/?q=%s` — no `&go=1`.
- [ ] Announce **`b` = hosted search engine** and **`fx` = unpacked extension**. Mixing them is the usual setup fail.

## Smoke

- [ ] `b list` — catalog, including a `?q=%s` snippet (not `&go=1`)
- [ ] `b help st` — Stripe command docs, **not** the Help Center
- [ ] `b hc` — support.fyxer.com
- [ ] `b u <your fyxer email>` — User 360; extra tabs are often popup-blocked on the web hop. Extension (`fx`) is the reliable 5-tab path.
- [ ] `b cs`, `b cus`, `b sp` — confirm Notion targets. `cs` / `cus` titles were guessed; `sp` is the AE playbook.

## Nits (do not block a small `fx` / localhost pilot)

- Unpacked extension is a fallback, not the company-wide path
- Repo is public and already contains internal app IDs — do not paste those IDs in Slack
- Making the repo private is a follow-up, not an emergency scramble
- Confirm `cs` / `cus` in Notion when someone has a minute
