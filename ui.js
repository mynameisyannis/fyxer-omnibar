(function () {
  const CATEGORY_CLASS = {
    Support: "category-support",
    Billing: "category-billing",
    CRM: "category-crm",
    Docs: "category-docs",
    Analytics: "category-analytics",
    Product: "category-product",
    People: "category-people",
    Internal: "category-internal"
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

  async function openUrls(urls, { newWindow } = {}) {
    if (!urls.length) return;

    if (isExtension()) {
      await chrome.tabs.create({ url: urls[0], active: true });
      await Promise.all(urls.slice(1).map((url) => chrome.tabs.create({ url, active: false })));
      window.close();
      return;
    }

    if (urls.length === 1 && !newWindow) {
      window.location.assign(urls[0]);
      return;
    }

    urls.slice(1).forEach((url) => window.open(url, "_blank", "noopener"));
    if (newWindow) {
      window.open(urls[0], "_blank", "noopener");
    } else {
      window.location.assign(urls[0]);
    }
  }

  function mount() {
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

  function render(state) {
    const { results, status, input } = state.els;
    const items = state.matches;
    status.textContent = `${state.catalog.commands.length} commands`;

    if (!items.length) {
      results.innerHTML = `
        <li class="empty">
          <strong>No matching commands</strong>
          Try <code>u</code>, <code>st</code>, <code>ic</code>, or paste an email.
        </li>
      `;
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

  async function run(state, { newWindow } = {}) {
    const selected = state.matches[state.index];
    if (!selected) return;
    if (selected.command.urls.length > 1 && !selected.query) {
      state.els.input.value = `${selected.command.aliases[0]} `;
      state.index = 0;
      state.matches = Omnibar.searchCommands(state.catalog.commands, state.els.input.value);
      render(state);
      return;
    }
    const urls = Omnibar.buildUrls(selected.command, selected.query);
    await openUrls(urls, { newWindow });
  }

  function prefillFromLocation(input) {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = params.get("q") || hashParams.get("q") || "";
    const go = params.get("go") === "1" || hashParams.get("go") === "1";
    if (query) input.value = query;
    return go;
  }

  async function main() {
    const els = mount();
    const response = await fetch(commandsUrl());
    const catalog = Omnibar.parseCatalog(await response.json());
    const keyword = document.querySelector(".keyword-pill");
    if (keyword) keyword.textContent = catalog.keyword || "fx";

    const state = {
      els,
      catalog,
      matches: Omnibar.searchCommands(catalog.commands, ""),
      index: 0
    };

    const refresh = () => {
      state.matches = Omnibar.searchCommands(catalog.commands, els.input.value);
      if (state.index >= state.matches.length) state.index = 0;
      render(state);
    };

    els.input.addEventListener("input", () => {
      state.index = 0;
      refresh();
    });

    els.input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.index = (state.index + 1) % Math.max(state.matches.length, 1);
        render(state);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        state.index =
          (state.index - 1 + Math.max(state.matches.length, 1)) %
          Math.max(state.matches.length, 1);
        render(state);
      } else if (event.key === "Enter") {
        event.preventDefault();
        run(state, { newWindow: event.metaKey || event.ctrlKey });
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
      render(state);
    });

    els.results.addEventListener("click", (event) => {
      const row = event.target.closest(".result");
      if (!row) return;
      state.index = Number(row.dataset.index);
      run(state, { newWindow: event.metaKey || event.ctrlKey });
    });

    const autoGo = prefillFromLocation(els.input);
    refresh();
    els.input.focus();

    if (autoGo) {
      await run(state);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      main().catch((error) => {
        document.body.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
      });
    });
  } else {
    main().catch((error) => {
      document.body.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    });
  }
})();
