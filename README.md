# fyxer-omnibar

A tiny, zero-dependency **omnibar**: it turns short keyword shortcuts into
destination URLs. The shortcuts live in [`commands.json`](./commands.json) as a
map of `shortcut -> URL`, where a `{query}` placeholder is replaced by whatever
you type after the shortcut.

```json
{
  "st": "https://dashboard.stripe.com/search?query={query}",
  "rt": "https://fyxer.retool.com/"
}
```

Typing `st acme inc` resolves to
`https://dashboard.stripe.com/search?query=acme%20inc`. A shortcut without a
`{query}` placeholder (like `rt`) is a direct link. Unknown shortcuts fall back
to a web search.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (no external dependencies).

## Setup

```bash
npm install      # no runtime deps; sets up package metadata
npm run validate # checks commands.json is well-formed
```

## Run the omnibar server

```bash
npm start                 # listens on http://localhost:8787
PORT=3000 npm start       # or choose a port
```

Then:

- Open `http://localhost:8787/` for a searchable list of shortcuts.
- `GET /go?q=st+acme` issues a `302` redirect to the resolved URL.
- `GET /commands` returns the raw command map as JSON.
- `GET /healthz` returns `{ "ok": true, ... }`.

To use it from your browser's address bar, add a custom search engine pointing at:

```
http://localhost:8787/go?q=%s
```

## Resolve from the command line

```bash
node src/cli.mjs st acme inc
# -> https://dashboard.stripe.com/search?query=acme%20inc
```

## Validate the command file

`npm run validate` fails on invalid JSON, non-string values, or malformed URLs,
and warns about suspicious entries (e.g. a malformed `{query}` placeholder or a
shortcut with stray whitespace).

## Test

```bash
npm test   # Node's built-in test runner
```
