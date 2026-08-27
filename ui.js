(function () {
  const CATEGORY_CLASS = {
    Support: "category-support",
    Billing: "category-billing",
    CRM: "category-crm",
    Docs: "category-docs",
    Analytics: "category-analytics",
    Product: "category-product",
    People: "category-people",
    Internal: "category-internal",
    Search: "category-search",
    Help: "category-help"
  };

  function commandsUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL("commands.json");
    }
    return new URL("commands.json", window.location.href).href;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text, query) {
    const source = escapeHtml(text);
    const needle = String(query || "").trim();
    if (!needle) return source;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return source.replace(new RegExp(escaped, "ig"), (match) => `<mark>${match}</mark>`);
  }

  function isExtension() {
    return typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create;
  }

  function isPopup() {
    return document.body.classList.contains("popup");
  }

  function localBaseUrl() {
    return new URL("./", window.location.href).href;
  }

  function extensionListUrl(query) {
    return `${chrome.runtime.getURL("index.html")}?q=${encodeURIComponent(query || "list")}`;
  }

  function setChromeIntro(visible) {
    const intro = document.querySelector("body.page > p.lede");
    if (intro) intro.hidden = !visible;
  }

  function openBlankWindow(url) {
    const win = window.open(url, "_blank");
    if (win) {
      try {
        win.opener = null;
      } catch (error) {
        /* ignore */
      }
    }
    return win;
  }

  function navigateTo(url, replace) {
    if (replace) window.location.replace(url);
    else window.location.assign(url);
  }

  async function openUrls(urls, { newWindow, replace } = {}) {
    if (!urls.length) return;

    if (isExtension()) {
      await chrome.tabs.create({ url: urls[0], active: true });
      await Promise.all(urls.slice(1).map((url) => chrome.tabs.create({ url, active: false })));
      if (isPopup()) window.close();
      return;
    }

    if (newWindow) {
      urls.forEach((url) => openBlankWindow(url));
      return;
    }

    if (urls.length === 1) {
      navigateTo(urls[0], replace);
      return;
    }

    const extras = urls.slice(1).map((url) => openBlankWindow(url));
    if (Omnibar.shouldStayOnLauncher(extras)) return;
    window.setTimeout(() => navigateTo(urls[0], replace), 0);
  }

  function searchEngineTemplate(catalog) {
    const published = catalog.publicBaseUrl
      ? Omnibar.searchEngineUrl(catalog.publicBaseUrl)
      : "https://mynameisyannis.github.io/fyxer-omnibar/?q=%s";
    const httpPage =
      window.location.protocol === "http:" || window.location.protocol === "https:";
    const local = httpPage
      ? Omnibar.searchEngineUrl(localBaseUrl())
      : "http://localhost:4173/?q=%s";
    return { local, published };
  }

  function setupHtml(catalog) {
    const keyword = catalog.searchEngineKeyword || "b";
    const templates = searchEngineTemplate(catalog);
    const published = templates.published;
    const local = templates.local;
    return `
      <div class="setup">
        <p>
          Chrome search engine (the bunnylol way):
          <strong>Settings → Search engine → Manage → Add</strong>
        </p>
        <p class="setup-fields">
          Name <code>Fyxer</code>
          · Keyword <code>${escapeHtml(keyword)}</code>
          · URL <code>${escapeHtml(published || local)}</code>
        </p>
        <p class="setup-note">
          Locally: <code>${escapeHtml(local)}</code>
          · Extension omnibox keyword is <code>${escapeHtml(catalog.keyword || "fx")}</code>
          · GitHub Pages cannot HTTP 302; <code>?q=</code> redirects in JavaScript after
          <code>commands.json</code> loads (usually one extra request).
        </p>
      </div>
    `;
  }

  function commandRow(command, query) {
    const categoryClass = CATEGORY_CLASS[command.category] || "";
    const aliases = command.aliases.join(", ");
    const example = Omnibar.exampleFor(command);
    return `
      <tr class="list-row" data-alias="${escapeHtml(command.aliases[0])}" data-id="${escapeHtml(command.id)}">
        <td class="list-alias"><code>${highlight(aliases, query)}</code></td>
        <td class="list-name">
          ${highlight(command.title, query)}
          <span class="category ${categoryClass}">${escapeHtml(command.category)}</span>
        </td>
        <td class="list-doc">${highlight(command.description, query)}</td>
        <td class="list-example"><code>${escapeHtml(example)}</code></td>
      </tr>
    `;
  }

  function helpCard(result) {
    if (!result.command) {
      const suggestions = (result.suggestions || [])
        .map(
          (item) =>
            `<a href="?q=${encodeURIComponent("help " + item.alias)}"><code>${escapeHtml(item.alias)}</code> ${escapeHtml(item.command.title)}</a>`
        )
        .join(" · ");
      return `
        <div class="help-card">
          <h2>Unknown command <code>${escapeHtml(result.query || "")}</code></h2>
          <p>No alias matched. ${suggestions ? `Did you mean ${suggestions}?` : "Try <code>list</code>."}</p>
        </div>
      `;
    }

    const command = result.command;
    const searchUrl = command.urls.find((url) => url.includes("{query}")) || command.urls[0] || "";
    const homeUrl = command.home || (!command.needsQuery && !command.action ? command.urls[0] : "");
    const didYouMean = result.didYouMean
      ? `<p class="did-you-mean">Interpreted <code>${escapeHtml(result.input || "")}</code> as <code>${escapeHtml(result.didYouMean.alias)}</code>.</p>`
      : "";
    return `
      <div class="help-card">
        <h2><code>${escapeHtml(command.aliases[0])}</code> — ${escapeHtml(command.title)}</h2>
        ${didYouMean}
        <p>${escapeHtml(command.description)}</p>
        <dl>
          <dt>Aliases</dt>
          <dd><code>${escapeHtml(command.aliases.join(" · "))}</code></dd>
          <dt>Example</dt>
          <dd><code>${escapeHtml(Omnibar.exampleFor(command))}</code></dd>
          ${
            homeUrl
              ? `<dt>No query</dt><dd><a href="${escapeHtml(homeUrl)}">${escapeHtml(homeUrl)}</a></dd>`
              : command.needsQuery
                ? `<dt>No query</dt><dd>Requires a search term or email</dd>`
                : command.action
                  ? `<dt>Type</dt><dd>Built-in <code>${escapeHtml(command.action)}</code></dd>`
                  : ""
          }
          ${
            searchUrl
              ? `<dt>With query</dt><dd><code>${escapeHtml(searchUrl)}</code></dd>`
              : ""
          }
        </dl>
        <p class="help-actions">
          ${
            command.action
              ? ""
              : `<a class="btn" href="?q=${encodeURIComponent(command.aliases[0])}">Open</a>`
          }
          <a class="btn btn-quiet" href="?q=list">All commands</a>
        </p>
      </div>
    `;
  }

  function mountList() {
    document.body.classList.add("list-mode");
    const brand = document.querySelector(".page-brand");
    if (brand) brand.textContent = "Fyxer Omnibar";
    const app = document.getElementById("app");
    app.innerHTML = `
      <section class="list-page">
        <h1>Commands</h1>
        <p class="lede">
          First token is the command, the rest is the argument.
          Empty <code>b</code>, <code>list</code>, <code>help</code>, or <code>?</code> shows this page.
        </p>
        <div id="setup"></div>
        <div id="notice"></div>
        <div class="list-filter-wrap">
          <input id="omnibar-input" type="search" autocomplete="off" spellcheck="false"
            placeholder="Filter, paste an email, or type st jane@acme.com and press Enter" aria-label="Filter commands" />
        </div>
        <div id="help"></div>
        <div id="groups"></div>
      </section>
    `;
    return {
      input: document.getElementById("omnibar-input"),
      groups: document.getElementById("groups"),
      help: document.getElementById("help"),
      setup: document.getElementById("setup"),
      notice: document.getElementById("notice")
    };
  }

  function renderList(state) {
    const { catalog, els, filter, result } = state;
    const visible = Omnibar.filterCommands(catalog.commands, filter);
    const groups = Omnibar.groupCommands(visible);
    els.setup.innerHTML = setupHtml(catalog);
    els.help.innerHTML =
      result && (result.type === "help" || result.type === "needs-query")
        ? helpCard(
            result.type === "needs-query"
              ? { type: "help", command: result.command, query: result.command.aliases[0], input: result.input, suggestions: [] }
              : result
          )
        : "";

    if (result && result.type === "needs-query") {
      els.notice.innerHTML = `<div class="notice">${escapeHtml(result.command.title)} needs a query. Try <code>${escapeHtml(Omnibar.exampleFor(result.command))}</code>.</div>`;
    } else if (result && result.didYouMean && result.type !== "help") {
      els.notice.innerHTML = `<div class="notice">Did you mean <code>${escapeHtml(result.didYouMean.alias)}</code>?</div>`;
    } else if (filter && Omnibar.looksLikeEmail(filter)) {
      els.notice.innerHTML = `<div class="notice">Enter opens User 360 for <code>${escapeHtml(filter.trim())}</code>.</div>`;
    } else {
      els.notice.innerHTML = "";
    }

    if (!visible.length) {
      els.groups.innerHTML = `<p class="empty-list">No commands match <code>${escapeHtml(filter)}</code>. Enter searches Google.</p>`;
      return;
    }

    els.groups.innerHTML = groups
      .map((group) => {
        return `
          <section class="list-group">
            <h2>${escapeHtml(group.category)}</h2>
            <table class="list-table">
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Command</th>
                  <th>Description</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                ${group.commands.map((command) => commandRow(command, filter)).join("")}
              </tbody>
            </table>
          </section>
        `;
      })
      .join("");
  }

  function mountPalette() {
    document.body.classList.remove("list-mode");
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="omnibar">
        <div class="omnibar-header">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M20 20L16.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input id="omnibar-input" type="text" autocomplete="off" spellcheck="false"
            placeholder="Type a command or paste an email…" aria-label="Omnibar" />
          <span class="keyword-pill">fx</span>
        </div>
        <ul class="results" id="results" role="listbox" aria-label="Commands"></ul>
        <div class="footer">
          <div class="hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>⌘</kbd><kbd>↵</kbd> extra tabs</span>
          </div>
          <div id="status"></div>
        </div>
      </div>
    `;

    return {
      input: document.getElementById("omnibar-input"),
      results: document.getElementById("results"),
      status: document.getElementById("status")
    };
  }

  function renderPalette(state) {
    const { results, status, input } = state.els;
    const items = state.matches;
    status.textContent = `${state.catalog.commands.length} commands`;

    if (!items.length) {
      const typed = input.value.trim();
      results.innerHTML = typed
        ? `<li class="empty"><strong>Search Google</strong> Press Enter to search for <code>${escapeHtml(typed)}</code>. Unknown commands fall back to Google.</li>`
        : `<li class="empty"><strong>No matching commands</strong> Try <code>u</code>, <code>st</code>, <code>ic</code>, or paste an email.</li>`;
      return;
    }

    results.innerHTML = items
      .map((item, index) => {
        const command = item.command;
        const selected = index === state.index;
        const queryHint =
          command.needsQuery && !item.query
            ? "Add a search term or email"
            : item.query
              ? `Query: ${escapeHtml(item.query)}`
              : command.urls.length > 1
                ? `Opens ${command.urls.length} tabs`
                : command.home
                  ? "Opens home · add a query to search"
                  : "";
        const categoryClass = CATEGORY_CLASS[command.category] || "";
        return `
          <li class="result" role="option" data-index="${index}"
            aria-selected="${selected ? "true" : "false"}" id="result-${index}">
            <div class="result-title">
              ${highlight(command.title, Omnibar.splitInput(input.value).token)}
              <span class="category ${categoryClass}">${escapeHtml(command.category)}</span>
            </div>
            <div class="aliases">${escapeHtml(command.aliases.join(" · "))}</div>
            <div class="result-description">${highlight(command.description, input.value)}</div>
            ${queryHint ? `<div class="result-meta">${queryHint}</div>` : ""}
          </li>
        `;
      })
      .join("");

    const selectedEl = results.querySelector(`[data-index="${state.index}"]`);
    if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
  }

  async function openAction(catalog, command, query) {
    const target = command.action === "help" && query ? `help ${query}` : command.action;
    if (isPopup() && isExtension()) {
      await chrome.tabs.create({ url: extensionListUrl(target), active: true });
      window.close();
      return;
    }
    window.location.assign(`?q=${encodeURIComponent(target)}`);
  }

  async function runPalette(state, { newWindow } = {}) {
    const typed = state.els.input.value.trim();
    if (!state.matches.length && typed) {
      const result = Omnibar.dispatch(state.catalog, typed);
      await applyDispatch(state.catalog, result, { replace: false, newWindow });
      return;
    }

    const selected = state.matches[state.index];
    if (!selected) return;
    if (selected.command.action) {
      await openAction(state.catalog, selected.command, selected.query);
      return;
    }
    if (selected.command.needsQuery && !selected.query) {
      state.els.input.value = `${selected.command.aliases[0]} `;
      state.index = 0;
      state.matches = Omnibar.searchCommands(state.catalog.commands, state.els.input.value);
      renderPalette(state);
      return;
    }
    const urls = Omnibar.buildUrls(selected.command, selected.query);
    if (!isExtension() && urls.length > 1 && !newWindow) {
      startLauncher(state.catalog, {
        type: "redirect",
        command: selected.command,
        query: selected.query,
        urls
      });
      return;
    }
    await openUrls(urls, { newWindow });
  }

  function startPalette(catalog, prefill, autoGo) {
    document.documentElement.classList.remove("dispatching");
    setChromeIntro(false);
    const els = mountPalette();
    const keyword = document.querySelector(".keyword-pill");
    if (keyword) keyword.textContent = catalog.keyword || "fx";
    if (prefill) els.input.value = prefill;

    const state = {
      els,
      catalog,
      matches: Omnibar.searchCommands(catalog.commands, els.input.value),
      index: 0
    };

    const refresh = () => {
      state.matches = Omnibar.searchCommands(catalog.commands, els.input.value);
      if (state.index >= state.matches.length) state.index = 0;
      renderPalette(state);
    };

    els.input.addEventListener("input", () => {
      state.index = 0;
      refresh();
    });

    els.input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.index = (state.index + 1) % Math.max(state.matches.length, 1);
        renderPalette(state);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        state.index =
          (state.index - 1 + Math.max(state.matches.length, 1)) %
          Math.max(state.matches.length, 1);
        renderPalette(state);
      } else if (event.key === "Enter") {
        event.preventDefault();
        runPalette(state, { newWindow: event.metaKey || event.ctrlKey });
      } else if (event.key === "Escape") {
        if (els.input.value) {
          els.input.value = "";
          state.index = 0;
          refresh();
        }
      }
    });

    els.results.addEventListener("mouseover", (event) => {
      const row = event.target.closest(".result");
      if (!row) return;
      state.index = Number(row.dataset.index);
      renderPalette(state);
    });

    els.results.addEventListener("click", (event) => {
      const row = event.target.closest(".result");
      if (!row) return;
      state.index = Number(row.dataset.index);
      runPalette(state, { newWindow: event.metaKey || event.ctrlKey });
    });

    refresh();
    els.input.focus();
    if (autoGo) runPalette(state);
  }

  function startLauncher(catalog, result) {
    document.documentElement.classList.remove("dispatching");
    document.body.classList.add("list-mode");
    setChromeIntro(true);
    const app = document.getElementById("app");
    const command = result.command;
    const links = result.urls
      .map(
        (url) =>
          `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a></li>`
      )
      .join("");
    app.innerHTML = `
      <section class="list-page launcher">
        <h1>${escapeHtml(command.title)}</h1>
        <p class="lede">
          Opening ${result.urls.length} tabs for <code>${escapeHtml(result.query || "")}</code>.
          If the browser blocked pop-ups, use <strong>Open all tabs</strong> or the links.
        </p>
        <p class="help-actions">
          <button type="button" class="btn" id="open-all-tabs">Open all tabs</button>
          <a class="btn btn-quiet" href="?q=list">All commands</a>
        </p>
        <ol class="launch-links">${links}</ol>
      </section>
    `;
    const openAll = () => {
      result.urls.forEach((url) => openBlankWindow(url));
    };
    const openAllBtn = document.getElementById("open-all-tabs");
    if (openAllBtn) openAllBtn.addEventListener("click", openAll);

    const extras = result.urls.slice(1).map((url) => openBlankWindow(url));
    if (Omnibar.shouldStayOnLauncher(extras)) return;
    window.setTimeout(() => {
      window.location.replace(result.urls[0]);
    }, 0);
  }

  async function applyDispatch(catalog, result, { replace, newWindow } = {}) {
    if (window.__fyxerDidRedirect) return;

    if (result.type === "palette") {
      startPalette(catalog, result.query || "", false);
      return;
    }

    if (
      (result.type === "redirect" || result.type === "fallback") &&
      result.urls &&
      result.urls.length > 1
    ) {
      startLauncher(catalog, result);
      return;
    }

    if (
      (result.type === "redirect" || result.type === "fallback") &&
      result.urls &&
      result.urls.length === 1
    ) {
      window.__fyxerDidRedirect = true;
      await openUrls(result.urls, { newWindow, replace: replace !== false });
      return;
    }

    startList(catalog, result);
  }

  function startList(catalog, result) {
    document.documentElement.classList.remove("dispatching");
    setChromeIntro(true);
    const els = mountList();
    const filter =
      result && result.type === "help"
        ? result.query || ""
        : result && result.type === "needs-query"
          ? `${result.command.aliases[0]} `
          : "";
    const state = { catalog, els, filter, result };

    renderList(state);
    if (filter) els.input.value = filter;
    els.input.focus();
    if (result && result.type === "needs-query") {
      els.input.setSelectionRange(els.input.value.length, els.input.value.length);
    }

    els.input.addEventListener("input", () => {
      state.filter = els.input.value;
      state.result = state.result && state.result.type === "help" ? state.result : null;
      renderList(state);
    });

    els.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const value = els.input.value.trim();
        if (!value) return;
        const next = Omnibar.dispatch(catalog, value);
        applyDispatch(catalog, next, { replace: true });
      } else if (event.key === "Escape") {
        els.input.value = "";
        state.filter = "";
        state.result = null;
        renderList(state);
      }
    });

    els.groups.addEventListener("click", (event) => {
      const example = event.target.closest(".list-example");
      const row = event.target.closest(".list-row");
      if (!row) return;
      const alias = example ? example.textContent.trim() : row.dataset.alias;
      applyDispatch(catalog, Omnibar.dispatch(catalog, alias), { replace: true });
    });
  }

  async function loadCatalog() {
    if (window.__fyxerCommandsPromise) {
      return Omnibar.parseCatalog(await window.__fyxerCommandsPromise);
    }
    const response = await fetch(commandsUrl());
    return Omnibar.parseCatalog(await response.json());
  }

  function readBoot() {
    if (window.__fyxerBoot) return window.__fyxerBoot;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const present = params.has("q") || hashParams.has("q");
    const q = present ? params.get("q") || hashParams.get("q") || "" : "";
    return {
      present,
      q,
      palette: params.get("palette") === "1",
      go: params.get("go") === "1" || hashParams.get("go") === "1",
      shouldRedirect: false
    };
  }

  async function main() {
    const catalog = await loadCatalog();
    if (isPopup()) {
      startPalette(catalog, "", false);
      return;
    }

    const boot = readBoot();
    if (boot.palette) {
      const prefill = boot.q && boot.q !== "palette" ? boot.q : "";
      startPalette(catalog, prefill, boot.go);
      return;
    }

    const input = boot.present ? boot.q : "list";
    const result = Omnibar.dispatch(catalog, input);
    await applyDispatch(catalog, result, { replace: true });
  }

  function fail(error) {
    document.documentElement.classList.remove("dispatching");
    document.body.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      main().catch(fail);
    });
  } else {
    main().catch(fail);
  }
})();
