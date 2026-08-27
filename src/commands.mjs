import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the commands.json data file at the repository root. */
export const COMMANDS_PATH = join(here, "..", "commands.json");

/**
 * Load and parse the commands map from commands.json.
 * @param {string} [path] override path (used by tests)
 * @returns {Promise<Record<string, string>>}
 */
export async function loadCommands(path = COMMANDS_PATH) {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("commands.json must contain a JSON object of shortcut -> URL");
  }
  return parsed;
}
