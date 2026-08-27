importScripts("omnibar.js");

let catalogPromise;

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(chrome.runtime.getURL("commands.json"))
      .then((response) => response.json())
      .then((data) => Omnibar.parseCatalog(data));
  }
  return catalogPromise;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function suggestionFor(match) {
  const command = match.command;
  const querySuffix = match.query ? ` <dim>— ${escapeXml(match.query)}</dim>` : "";
  return {
    content: match.query ? `${command.aliases[0]} ${match.query}` : command.aliases[0],
    description: `<match>${escapeXml(command.aliases[0])}</match> ${escapeXml(command.title)} <dim>${escapeXml(command.description)}</dim>${querySuffix}`
  };
}

function listUrl(query) {
  return `${chrome.runtime.getURL("index.html")}?q=${encodeURIComponent(query || "list")}`;
}

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: "Fyxer command, or paste an email for User 360. Unknown text searches Google."
  });
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  loadCatalog()
    .then((catalog) => {
      const trimmed = String(text || "").trim();
      if (!trimmed) {
        chrome.omnibox.setDefaultSuggestion({
          description: "Command list · type a command, or paste an email for User 360"
        });
        suggest(
          catalog.commands.slice(0, 5).map((command) => ({
            content: command.aliases[0],
            description: `<match>${escapeXml(command.aliases[0])}</match> ${escapeXml(command.title)} <dim>${escapeXml(command.description)}</dim>`
          }))
        );
        return;
      }

      const matches = Omnibar.searchCommands(catalog.commands, trimmed, 6);
      if (!matches.length) {
        const suggestions = Omnibar.didYouMean(catalog.commands, Omnibar.splitInput(trimmed).token);
        const hint = suggestions.length
          ? `Did you mean <match>${escapeXml(suggestions[0].alias)}</match>? Enter uses that if unique, otherwise Google.`
          : `Search Google for <match>${escapeXml(trimmed)}</match>`;
        chrome.omnibox.setDefaultSuggestion({ description: hint });
        suggest(
          suggestions.slice(0, 3).map((item) => ({
            content: trimmed.includes(" ")
              ? `${item.alias} ${Omnibar.splitInput(trimmed).rest}`
              : item.alias,
            description: `<match>${escapeXml(item.alias)}</match> ${escapeXml(item.command.title)} <dim>did you mean</dim>`
          }))
        );
        return;
      }

      const [first, ...rest] = matches;
      chrome.omnibox.setDefaultSuggestion({
        description: suggestionFor(first).description
      });
      suggest(rest.map(suggestionFor));
    })
    .catch(() => {
      chrome.omnibox.setDefaultSuggestion({
        description: "Could not load Fyxer commands"
      });
      suggest([]);
    });
});

async function openUrl(url, disposition) {
  if (disposition === "newForegroundTab") {
    await chrome.tabs.create({ url, active: true });
  } else if (disposition === "newBackgroundTab") {
    await chrome.tabs.create({ url, active: false });
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id != null) {
      await chrome.tabs.update(tab.id, { url });
    } else {
      await chrome.tabs.create({ url, active: true });
    }
  }
}

async function openMatch(result, disposition) {
  if (result.type === "palette") {
    await openUrl(`${chrome.runtime.getURL("index.html")}?palette=1`, disposition);
    return;
  }
  if (result.type === "list" || result.type === "help" || result.type === "needs-query") {
    const query =
      result.type === "needs-query" ? result.command.aliases[0] : result.input || "list";
    await openUrl(listUrl(query), disposition);
    return;
  }

  const urls = result.urls || [];
  if (!urls.length) return;
  await openUrl(urls[0], disposition);
  await Promise.all(urls.slice(1).map((url) => chrome.tabs.create({ url, active: false })));
}

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  loadCatalog()
    .then((catalog) => openMatch(Omnibar.dispatch(catalog, text), disposition))
    .catch(() => {});
});
