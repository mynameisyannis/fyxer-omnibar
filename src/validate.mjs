import { loadCommands, COMMANDS_PATH } from "./commands.mjs";
import { QUERY_TOKEN } from "./resolve.mjs";

/**
 * Validate a commands map, returning structured errors and warnings.
 * Errors are fatal (invalid data); warnings are suspicious but non-fatal.
 * @param {Record<string, unknown>} commands
 * @returns {{ errors: string[], warnings: string[], count: number }}
 */
export function validateCommands(commands) {
  const errors = [];
  const warnings = [];
  const entries = Object.entries(commands);

  for (const [key, value] of entries) {
    if (typeof value !== "string") {
      errors.push(`"${key}": value must be a string, got ${typeof value}`);
      continue;
    }
    const trimmedKey = key.trim();
    if (trimmedKey === "") {
      errors.push(`empty shortcut key found`);
    }
    if (key !== trimmedKey) {
      warnings.push(`"${key}": shortcut has surrounding whitespace`);
    }

    let url;
    try {
      url = new URL(value.replace(QUERY_TOKEN, "PLACEHOLDER"));
    } catch {
      errors.push(`"${key}": value is not a valid URL -> ${value}`);
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      warnings.push(`"${key}": non-http(s) URL -> ${value}`);
    }

    // Detect a malformed placeholder such as "query}" or "{query" (missing brace).
    const hasWellFormed = value.includes(QUERY_TOKEN);
    const looksLikePlaceholder = /\{?query\}?/.test(value) && /query/.test(value);
    if (!hasWellFormed && looksLikePlaceholder && /query\}|=\{?query/.test(value)) {
      warnings.push(
        `"${key}": looks like it intended a ${QUERY_TOKEN} placeholder but it is malformed -> ${value}`
      );
    }
  }

  return { errors, warnings, count: entries.length };
}

async function main() {
  let commands;
  try {
    commands = await loadCommands();
  } catch (err) {
    console.error(`FAIL: could not load ${COMMANDS_PATH}`);
    console.error(`      ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const { errors, warnings, count } = validateCommands(commands);

  for (const w of warnings) console.warn(`WARN: ${w}`);
  for (const e of errors) console.error(`ERROR: ${e}`);

  if (errors.length > 0) {
    console.error(`\nFAIL: ${errors.length} error(s) in ${count} command(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `OK: ${count} command(s) valid` +
      (warnings.length ? ` (${warnings.length} warning(s))` : "")
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
