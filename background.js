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

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: "Fyxer command, or paste an email for User 360"
  });
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  loadCatalog().then((catalog) => {
    const matches = Omnibar.searchCommands(catalog.commands, text, 6);
    if (!matches.length) {
      chrome.omnibox.setDefaultSuggestion({
        description: "No matching Fyxer commands"
      });
      suggest([]);
      return;
    }

    const [first, ...rest] = matches;
    chrome.omnibox.setDefaultSuggestion({
      description: suggestionFor(first).description
    });
    suggest(rest.map(suggestionFor));
  });
});

async function openMatch(match, disposition) {
  if (match.command.urls.length > 1 && !match.query) return;
  const urls = Omnibar.buildUrls(match.command, match.query);
  const [first, ...rest] = urls;

  if (disposition === "newForegroundTab") {
    await chrome.tabs.create({ url: first, active: true });
  } else if (disposition === "newBackgroundTab") {
    await chrome.tabs.create({ url: first, active: false });
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id != null) {
      await chrome.tabs.update(tab.id, { url: first });
    } else {
      await chrome.tabs.create({ url: first, active: true });
    }
  }

  await Promise.all(rest.map((url) => chrome.tabs.create({ url, active: false })));
}

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  loadCatalog().then((catalog) => {
    const match = Omnibar.resolve(catalog.commands, text);
    if (!match) return;
    return openMatch(match, disposition);
  });
});
