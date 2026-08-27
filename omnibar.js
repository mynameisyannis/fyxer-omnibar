(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.Omnibar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return command.needsQuery;
  }

  function normalizeCommand(raw, index) {
    const urls = asArray(raw.urls && raw.urls.length ? raw.urls : raw.url).filter(Boolean);
    const aliases = [
      ...new Set(asArray(raw.aliases).map((alias) => String(alias).trim()).filter(Boolean))
    ];
    const id = String(raw.id || aliases[0] || "");

    if (!id) {
      throw new Error(`Command at index ${index} is missing an id or alias`);
    }
    if (!aliases.length) aliases.push(id);
    if (!urls.length) {
      throw new Error(`Command "${id}" is missing a url`);
    }

    const needsQuery =
      raw.needsQuery != null
        ? Boolean(raw.needsQuery)
        : urls.some((url) => url.includes("{query}"));

    return {
      id,
      aliases,
      title: String(raw.title || id),
      description: String(raw.description || ""),
      category: String(raw.category || "Shortcuts"),
      keywords: asArray(raw.keywords).map(String),
      urls,
      needsQuery
    };
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
        commands: data.commands.map(normalizeCommand)
      };
    }

    return {
      version: 1,
      name: "Fyxer Omnibar",
      keyword: "fx",
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
      } else if (aliasLc.includes(tokenLc)) {
        score = Math.max(score, 58);
      }
    }

    const titleLc = command.title.toLowerCase();
    if (titleLc === rawLc) score = Math.max(score, 96);
    if (titleLc.startsWith(rawLc)) score = Math.max(score, 78);
    if (titleLc.includes(rawLc)) score = Math.max(score, 48);
    if (command.category.toLowerCase().startsWith(tokenLc)) score = Math.max(score, 32);
    if (haystack(command).includes(rawLc)) score = Math.max(score, 28);

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
    const encoded = encodeQuery(query);
    return command.urls.map((template) => template.split("{query}").join(encoded));
  }

  function resolve(commands, input) {
    const results = searchCommands(commands, input, 8);
    return results[0] || null;
  }

  return {
    looksLikeEmail,
    splitInput,
    parseCatalog,
    searchCommands,
    buildUrls,
    resolve,
    encodeQuery
  };
});
