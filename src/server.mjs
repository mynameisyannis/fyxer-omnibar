import { createServer } from "node:http";
import { loadCommands } from "./commands.mjs";
import { resolve } from "./resolve.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function renderHome(commands) {
  const rows = Object.entries(commands)
    .map(([k, v]) => {
      const templated = v.includes("{query}");
      return `<tr><td><code>${escapeHtml(k)}</code></td><td>${
        templated ? "search" : "link"
      }</td><td><span class="url">${escapeHtml(v)}</span></td></tr>`;
    })
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fyxer Omnibar</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 860px; margin: 3rem auto; padding: 0 1.25rem; line-height: 1.5; }
  h1 { margin-bottom: .25rem; }
  .sub { opacity: .7; margin-top: 0; }
  form { display: flex; gap: .5rem; margin: 1.5rem 0; }
  input[type=text] { flex: 1; padding: .7rem .9rem; font-size: 1.05rem;
    border: 1px solid #8884; border-radius: 10px; }
  button { padding: .7rem 1.1rem; font-size: 1.05rem; border: 0; border-radius: 10px;
    background: #4f46e5; color: #fff; cursor: pointer; }
  table { border-collapse: collapse; width: 100%; font-size: .92rem; margin-top: 1rem; }
  th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid #8883; vertical-align: top; }
  code { background: #8882; padding: .1rem .35rem; border-radius: 6px; }
  .url { opacity: .8; word-break: break-all; }
  .hint { opacity: .7; font-size: .9rem; }
</style>
</head>
<body>
  <h1>Fyxer Omnibar</h1>
  <p class="sub">Type a shortcut and an optional query. Unknown shortcuts fall back to a web search.</p>
  <form action="/go" method="get">
    <input type="text" name="q" placeholder="e.g. st acme inc" autofocus autocomplete="off" />
    <button type="submit">Go</button>
  </form>
  <p class="hint">Set your browser's custom search engine to
    <code>http://${escapeHtml(process.env.PUBLIC_HOST ?? `localhost:${PORT}`)}/go?q=%s</code>
    to use these shortcuts from the address bar.</p>
  <h2>Available shortcuts (${Object.keys(commands).length})</h2>
  <table>
    <thead><tr><th>Shortcut</th><th>Type</th><th>Destination</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

async function start() {
  let commands = await loadCommands();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, commands: Object.keys(commands).length }));
      return;
    }

    if (url.pathname === "/commands") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(commands, null, 2));
      return;
    }

    if (url.pathname === "/go") {
      const q = url.searchParams.get("q") ?? "";
      const result = resolve(commands, q);
      if (!result.url) {
        res.writeHead(400, { "content-type": "text/plain" });
        res.end("empty query");
        return;
      }
      res.writeHead(302, { location: result.url });
      res.end(`Redirecting to ${result.url}`);
      return;
    }

    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderHome(commands));
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  server.listen(PORT, HOST, () => {
    console.log(`omnibar listening on http://${HOST}:${PORT} (${Object.keys(commands).length} shortcuts)`);
  });
}

start().catch((err) => {
  console.error("failed to start omnibar server:", err);
  process.exit(1);
});
