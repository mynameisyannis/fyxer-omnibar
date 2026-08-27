#!/usr/bin/env node
import { loadCommands } from "./commands.mjs";
import { resolve } from "./resolve.mjs";

async function main() {
  const input = process.argv.slice(2).join(" ");
  if (!input.trim()) {
    console.error("usage: omnibar <shortcut> [query...]");
    process.exitCode = 2;
    return;
  }
  const commands = await loadCommands();
  const result = resolve(commands, input);
  console.log(result.url);
  if (!result.matched) {
    console.error(`(no shortcut matched; used fallback search)`);
  }
}

main();
