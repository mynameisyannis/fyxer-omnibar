(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.Omnibar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const LIST_TOKENS = new Set(["list", "ls", "cmds", "commands"]);
  const HELP_TOKENS = new Set(["help"]);
  const PALETTE_TOKENS = new Set(["palette"]);
  const ACTIONS = new Set(["list", "help", "palette"]);
  const CATEGORY_ORDER = [
    "Support",
    "Product",
    "Eng",
    "Growth",
    "Infra",
    "Search",
    "Help"
  ];

  function looksLikeEmail(value) {
    return EMAIL_RE.test(String(value || "").trim());
  }

  function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function splitInput(input) {
    const raw = String(input || "").trim();
    if (!raw) return { token: "", rest: "", raw: "" };
    const space = raw.search(/\s/);
    if (space === -1) return { token: raw, rest: "", raw };
    return {
      token: raw.slice(0, space),
      rest: raw.slice(space + 1).trim(),
      raw
    };
  }

  function commandAcceptsQuery(command) {
    return command.needsQuery || Boolean(command.home) || command.urls.some((url) => url.includes("{query}"));
  }

  function normalizeCommand(raw, index) {
    const urls = asArray(raw.urls && raw.urls.length ? raw.urls : raw.url).filter(Boolean);
    const aliases = [
      ...new Set(asArray(raw.aliases).map((alias) => String(alias).trim()).filter(Boolean))
    ];
    const id = String(raw.id || aliases[0] || "");
    const action = String(raw.action || "").trim();
    const home = String(raw.home || raw.noQueryUrl || "").trim();

    if (!id) {
      throw new Error(`Command at index ${index} is missing an id or alias`);
    }
    if (!aliases.length) aliases.push(id);
    if (action && !ACTIONS.has(action)) {
      throw new Error(`Command "${id}" has unknown action "${action}"`);
    }
    if (!action && !urls.length) {
      throw new Error(`Command "${id}" is missing a url`);
    }

    const needsQuery =
      raw.needsQuery != null
        ? Boolean(raw.needsQuery)
        : !home && !action && urls.some((url) => url.includes("{query}"));

    return {
      id,
      aliases,
      title: String(raw.title || id),
      description: String(raw.description || ""),
      category: String(raw.category || "Shortcuts"),
      keywords: asArray(raw.keywords).map(String),
      urls,
      home,
      action,
      needsQuery,
      example: String(raw.example || "")
    };
  }

  function googleFallbackCommand() {
    return normalizeCommand(
      {
        id: "_default",
        aliases: ["g", "google"],
        title: "Google",
        description: "Search Google",
        category: "Search",
        url: "https://www.google.com/search?q={query}",
        home: "https://www.google.com/"
      },
      0
    );
  }

  function parseCatalog(data) {
    if (!data || typeof data !== "object") {
      throw new Error("commands.json must be an object");
    }

    if (Array.isArray(data.commands)) {
      return {
        version: data.version || 2,
        name: data.name || "Fyxer Omnibar",
        keyword: data.omniboxKeyword || "fx",
        searchEngineKeyword: data.searchEngineKeyword || "b",
        fallback: data.fallback || "_default",
        publicBaseUrl: data.publicBaseUrl || "https://mynameisyannis.github.io/fyxer-omnibar/",
        commands: data.commands.map(normalizeCommand)
      };
    }

    return {
      version: 1,
      name: "Fyxer Omnibar",
      keyword: "fx",
      searchEngineKeyword: "b",
      fallback: "_default",
      publicBaseUrl: "",
      commands: Object.entries(data).map(([alias, url], index) =>
        normalizeCommand({ id: alias, aliases: [alias], title: alias, url }, index)
      )
    };
  }

  function haystack(command) {
    return [
      command.id,
      command.title,
      command.description,
      command.category,
      ...command.aliases,
      ...command.keywords
    ]
      .join(" ")
      .toLowerCase();
  }

  function scoreCommand(command, input) {
    const { token, rest, raw } = splitInput(input);
    if (!raw) {
      return { score: 1, query: "", exactAlias: false };
    }

    const tokenLc = token.toLowerCase();
    const rawLc = raw.toLowerCase();
    let score = 0;
    let exactAlias = false;
    let query = rest;

    for (const alias of command.aliases) {
      const aliasLc = alias.toLowerCase();
      if (aliasLc === tokenLc) {
        score = Math.max(score, 100);
        exactAlias = true;
      } else if (aliasLc.startsWith(tokenLc)) {
        score = Math.max(score, 86);
      } else if (tokenLc.startsWith(aliasLc) && tokenLc.length - aliasLc.length <= 2) {
        score = Math.max(score, 70);
      } else if (tokenLc.length >= 3 && aliasLc.includes(tokenLc)) {
        score = Math.max(score, 58);
      }
    }

    const titleLc = command.title.toLowerCase();
    if (titleLc === rawLc) score = Math.max(score, 96);
    if (titleLc.startsWith(rawLc)) score = Math.max(score, 78);
    if (rawLc.length >= 3 && titleLc.includes(rawLc)) score = Math.max(score, 48);
    if (command.category.toLowerCase().startsWith(tokenLc)) score = Math.max(score, 32);
    if (rawLc.length >= 3 && haystack(command).includes(rawLc)) score = Math.max(score, 28);

    if (looksLikeEmail(raw) && commandAcceptsQuery(command)) {
      query = raw;
      score = Math.max(score, command.id === "user-360" ? 92 : 42);
    }

    return { score, query, exactAlias };
  }

  function searchCommands(commands, input, limit) {
    const ranked = commands
      .map((command) => {
        const match = scoreCommand(command, input);
        return { command, ...match };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const exact = ranked.find((item) => item.exactAlias && item.score >= 100);
    if (exact) {
      const exactCap = limit == null ? ranked.length : limit;
      return [exact, ...ranked.filter((item) => item !== exact)].slice(0, exactCap);
    }

    const cap = limit == null ? ranked.length : limit;
    return ranked.slice(0, cap);
  }

  function encodeQuery(query) {
    return encodeURIComponent(String(query || "").trim());
  }

  function buildUrls(command, query) {
    const q = String(query || "").trim();
    if (!command || command.action) return [];
    if (!q && command.home) {
      return asArray(command.home).filter(Boolean);
    }
    if (!q && command.needsQuery) {
      return [];
    }
    const encoded = encodeQuery(q);
    const templates = command.urls.length ? command.urls : asArray(command.home);
    return templates.map((template) => template.split("{query}").join(encoded));
  }

  function resolve(commands, input) {
    const results = searchCommands(commands, input, 8);
    return results[0] || null;
  }

  function levenshtein(a, b) {
    const s = String(a || "");
    const t = String(b || "");
    if (s === t) return 0;
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const rows = new Array(t.length + 1);
    for (let i = 0; i <= t.length; i++) rows[i] = i;
    for (let i = 1; i <= s.length; i++) {
      let prev = i - 1;
      rows[0] = i;
      for (let j = 1; j <= t.length; j++) {
        const cur = rows[j];
        const cost = s.charCodeAt(i - 1) === t.charCodeAt(j - 1) ? 0 : 1;
        rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, prev + cost);
        prev = cur;
      }
    }
    return rows[t.length];
  }

  function findCommand(commands, token) {
    const tokenLc = String(token || "").trim().toLowerCase();
    if (!tokenLc) return null;
    for (const command of commands) {
      if (command.id.toLowerCase() === tokenLc) return command;
      if (command.aliases.some((alias) => alias.toLowerCase() === tokenLc)) return command;
    }
    return null;
  }

  function maxTypoDistance(token) {
    const length = String(token || "").length;
    if (length <= 2) return 0;
    if (length <= 3) return 1;
    return 2;
  }

  function didYouMean(commands, token) {
    const tokenLc = String(token || "").trim().toLowerCase();
    if (!tokenLc) return [];
    const max = maxTypoDistance(tokenLc);
    if (max <= 0) return [];

    const ranked = [];
    for (const command of commands) {
      let best = Infinity;
      let bestAlias = command.aliases[0] || command.id;
      for (const name of [command.id, ...command.aliases]) {
        const aliasLc = String(name).toLowerCase();
        let distance = levenshtein(tokenLc, aliasLc);
        if (aliasLc.startsWith(tokenLc) && tokenLc.length >= 3) {
          distance = Math.min(distance, aliasLc.length - tokenLc.length);
        }
        if (distance < best) {
          best = distance;
          bestAlias = name;
        }
      }
      if (best <= max && best > 0) {
        ranked.push({ command, alias: bestAlias, distance: best });
      }
    }

    ranked.sort(
      (a, b) => a.distance - b.distance || a.alias.length - b.alias.length || a.alias.localeCompare(b.alias)
    );
    return ranked.slice(0, 3);
  }

  function getFallbackCommand(catalog) {
    const commands = catalog.commands || catalog;
    const id = catalog.fallback || "_default";
    return (
      (Array.isArray(commands) ? commands : []).find((command) => command.id === id) ||
      findCommand(Array.isArray(commands) ? commands : [], "g") ||
      googleFallbackCommand()
    );
  }

  function exampleFor(command) {
    if (command.example) return command.example;
    const alias = command.aliases[0] || command.id;
    if (command.action === "help") return "help st";
    if (command.action === "list") return "list";
    if (command.action === "palette") return "palette";
    if (command.needsQuery) return `${alias} jane@acme.com`;
    if (command.home && command.urls.some((url) => url.includes("{query}"))) {
      return `${alias} jane@acme.com`;
    }
    return alias;
  }

  function isListToken(token) {
    const tokenLc = String(token || "").toLowerCase();
    return LIST_TOKENS.has(tokenLc) || tokenLc === "?";
  }

  function isHelpToken(token) {
    return HELP_TOKENS.has(String(token || "").toLowerCase());
  }

  function classifyQuery(input) {
    const { token, rest, raw } = splitInput(input);
    if (!raw) return { kind: "list", token, rest, raw };
    if (PALETTE_TOKENS.has(token.toLowerCase())) return { kind: "palette", token, rest, raw };
    if (isHelpToken(token) && rest) return { kind: "help", token, rest, raw };
    if (isHelpToken(token) && !rest) return { kind: "list", token, rest, raw };
    if (token === "?" && rest) return { kind: "help", token, rest, raw };
    if (isListToken(token) && !rest) return { kind: "list", token, rest, raw };
    if (isListToken(token) && rest) return { kind: "help", token, rest, raw };
    return { kind: "command", token, rest, raw };
  }

  function shouldFastRedirect(input) {
    const classified = classifyQuery(input);
    return classified.kind === "command";
  }

  function helpResult(catalog, rest, raw) {
    const target = findCommand(catalog.commands, rest);
    const suggestions = target ? [] : didYouMean(catalog.commands, rest);
    return {
      type: "help",
      input: raw,
      query: rest,
      command: target || null,
      urls: [],
      suggestions
    };
  }

  function redirectResult(command, query, raw, extra) {
    return {
      type: command.action || "redirect",
      command,
      query,
      urls: buildUrls(command, query),
      input: raw,
      suggestions: extra && extra.suggestions ? extra.suggestions : [],
      didYouMean: extra && extra.didYouMean ? extra.didYouMean : null
    };
  }

  function dispatch(catalog, input) {
    const commands = catalog.commands || [];
    const classified = classifyQuery(input);
    const { token, rest, raw } = classified;

    if (classified.kind === "list") {
      return { type: "list", input: raw, query: rest, urls: [], suggestions: [] };
    }
    if (classified.kind === "help") {
      return helpResult(catalog, rest, raw);
    }
    if (classified.kind === "palette") {
      return { type: "palette", input: raw, query: rest, urls: [], suggestions: [] };
    }

    const command = findCommand(commands, token);
    if (command) {
      if (command.action === "list") {
        return rest
          ? helpResult(catalog, rest, raw)
          : { type: "list", input: raw, query: "", urls: [], suggestions: [] };
      }
      if (command.action === "help") return helpResult(catalog, rest, raw);
      if (command.action === "palette") {
        return { type: "palette", input: raw, query: rest, urls: [], suggestions: [] };
      }
      if (command.needsQuery && !rest) {
        return { type: "needs-query", command, query: "", urls: [], input: raw, suggestions: [] };
      }
      return redirectResult(command, rest, raw);
    }

    if (looksLikeEmail(raw)) {
      const user360 = commands.find((item) => item.id === "user-360");
      if (user360) return redirectResult(user360, raw, raw);
    }

    const suggestions = didYouMean(commands, token);
    const uniqueBest =
      suggestions.length &&
      suggestions[0].distance > 0 &&
      suggestions.filter((item) => item.distance === suggestions[0].distance).every(
        (item) => item.command.id === suggestions[0].command.id
      )
        ? suggestions[0]
        : null;

    if (uniqueBest) {
      const guessed = uniqueBest.command;
      if (guessed.action === "list") {
        if (rest) {
          const help = helpResult(catalog, rest, raw);
          help.didYouMean = uniqueBest;
          help.suggestions = suggestions;
          return help;
        }
        return { type: "list", input: raw, query: "", urls: [], suggestions, didYouMean: uniqueBest };
      }
      if (guessed.action === "help") {
        if (!rest) {
          return { type: "list", input: raw, query: "", urls: [], suggestions, didYouMean: uniqueBest };
        }
        const help = helpResult(catalog, rest, raw);
        help.didYouMean = uniqueBest;
        help.suggestions = suggestions;
        return help;
      }
      if (guessed.action === "palette") {
        return {
          type: "palette",
          input: raw,
          query: rest,
          urls: [],
          suggestions,
          didYouMean: uniqueBest
        };
      }
      if (guessed.needsQuery && !rest) {
        return {
          type: "needs-query",
          command: guessed,
          query: "",
          urls: [],
          input: raw,
          suggestions,
          didYouMean: uniqueBest
        };
      }
      return redirectResult(guessed, rest, raw, { suggestions, didYouMean: uniqueBest });
    }

    const fallback = getFallbackCommand(catalog);
    return {
      type: "fallback",
      command: fallback,
      query: raw,
      urls: buildUrls(fallback, raw),
      input: raw,
      suggestions
    };
  }

  function filterCommands(commands, text) {
    const raw = String(text || "").trim();
    if (!raw) return commands.slice();
    if (looksLikeEmail(raw)) {
      const boosted = searchCommands(commands, raw);
      return boosted.length ? boosted.map((item) => item.command) : commands.filter((command) => commandAcceptsQuery(command));
    }
    const needle = raw.toLowerCase();
    const { token } = splitInput(needle);
    return commands.filter((command) => {
      const hay = haystack(command);
      return (
        hay.includes(needle) ||
        hay.includes(token) ||
        command.aliases.some((alias) => alias.toLowerCase().includes(token))
      );
    });
  }

  function groupCommands(commands) {
    const groups = new Map();
    for (const command of commands) {
      const category = command.category || "Shortcuts";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(command);
    }
    const keys = [
      ...CATEGORY_ORDER.filter((category) => groups.has(category)),
      ...[...groups.keys()].filter((category) => !CATEGORY_ORDER.includes(category))
    ];
    return keys.map((category) => ({ category, commands: groups.get(category) }));
  }

  function searchEngineUrl(baseUrl) {
    const root = String(baseUrl || "").replace(/\/?$/, "/");
    return `${root}?q=%s`;
  }

  function listPageUrl(baseUrl, query) {
    const root = String(baseUrl || "").replace(/\/?$/, "/");
    const q = String(query || "list");
    return `${root}?q=${encodeURIComponent(q)}`;
  }

  function shouldStayOnLauncher(openedExtras) {
    if (!Array.isArray(openedExtras) || !openedExtras.length) return false;
    return openedExtras.some((opened) => !opened || opened.closed === true);
  }

  return {
    looksLikeEmail,
    splitInput,
    parseCatalog,
    searchCommands,
    buildUrls,
    resolve,
    encodeQuery,
    levenshtein,
    findCommand,
    didYouMean,
    getFallbackCommand,
    exampleFor,
    classifyQuery,
    shouldFastRedirect,
    dispatch,
    filterCommands,
    groupCommands,
    searchEngineUrl,
    listPageUrl,
    shouldStayOnLauncher,
    LIST_TOKENS,
    HELP_TOKENS
  };
});
