#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Omnibar = require("../omnibar");

const catalogPath = path.join(__dirname, "..", "commands.json");
const catalog = Omnibar.parseCatalog(JSON.parse(fs.readFileSync(catalogPath, "utf8")));
const errors = [];
const aliases = new Map();
const ids = new Set();

for (const command of catalog.commands) {
  if (ids.has(command.id)) errors.push(`Duplicate command id: ${command.id}`);
  ids.add(command.id);

  if (!command.title.trim()) errors.push(`${command.id} is missing a title`);
  if (!command.category.trim()) errors.push(`${command.id} is missing a category`);
  if (!command.aliases.length) errors.push(`${command.id} has no aliases`);

  for (const alias of command.aliases) {
    if (!/^[a-z0-9-]+$/i.test(alias)) {
      errors.push(`Alias "${alias}" on ${command.id} should be letters, numbers, or dashes`);
    }
    const owner = aliases.get(alias.toLowerCase());
    if (owner && owner !== command.id) {
      errors.push(`Alias "${alias}" is used by both ${owner} and ${command.id}`);
    }
    aliases.set(alias.toLowerCase(), command.id);
  }

  for (const url of command.urls) {
    if (!/^https:\/\//.test(url)) errors.push(`${command.id} url is not https: ${url}`);
    if ((url.match(/{/g) || []).length !== (url.match(/}/g) || []).length) {
      errors.push(`${command.id} has unbalanced { } in ${url}`);
    }
    if (/\{query|query\}/.test(url) && !url.includes("{query}")) {
      errors.push(`${command.id} has a broken query placeholder: ${url}`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `error: ${error}`).join("\n"));
  process.exit(1);
}

console.log(`ok - ${catalog.commands.length} commands, ${aliases.size} aliases`);
