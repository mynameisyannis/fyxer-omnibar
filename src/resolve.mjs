/**
 * The placeholder token substituted with the user's query in a command URL.
 */
export const QUERY_TOKEN = "{query}";

/** Default fallback search used when a shortcut is not recognized. */
export const DEFAULT_FALLBACK = "https://www.google.com/search?q={query}";

/**
 * Resolve a raw omnibar input string into a destination URL.
 *
 * The first whitespace-delimited token is treated as the shortcut keyword; the
 * remainder is the query. If the shortcut is unknown, the entire input is sent
 * to the fallback search engine.
 *
 * @param {Record<string,string>} commands shortcut -> URL template map
 * @param {string} input raw text typed into the omnibar
 * @param {object} [options]
 * @param {string} [options.fallback] URL template used for unknown shortcuts
 * @returns {{ url: string, matched: boolean, keyword: string|null, query: string }}
 */
export function resolve(commands, input, options = {}) {
  const fallback = options.fallback ?? DEFAULT_FALLBACK;
  const trimmed = String(input ?? "").trim();

  if (trimmed === "") {
    return { url: null, matched: false, keyword: null, query: "" };
  }

  const spaceIdx = trimmed.search(/\s/);
  const keyword = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const query = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();

  const template = Object.prototype.hasOwnProperty.call(commands, keyword)
    ? commands[keyword]
    : null;

  if (template != null) {
    return {
      url: expand(template, query),
      matched: true,
      keyword,
      query,
    };
  }

  return {
    url: expand(fallback, trimmed),
    matched: false,
    keyword: null,
    query: trimmed,
  };
}

/**
 * Substitute the query token in a URL template, URL-encoding the query.
 * Templates without the token are returned unchanged (direct links).
 * @param {string} template
 * @param {string} query
 * @returns {string}
 */
export function expand(template, query) {
  if (!template.includes(QUERY_TOKEN)) {
    return template;
  }
  return template.split(QUERY_TOKEN).join(encodeURIComponent(query));
}
