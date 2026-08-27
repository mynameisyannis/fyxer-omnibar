#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Omnibar = require("../omnibar");

const catalogPath = path.join(__dirname, "..", "commands.json");
const data = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const catalog = Omnibar.parseCatalog(data);
const errors = [];
const aliases = new Map();
const ids = new Set();
const ACTIONS = new Set(["list", "help", "palette"]);

if (!catalog.fallback) errors.push("catalog is missing fallback");
if (!catalog.commands.some((command) => command.id === catalog.fallback)) {
  errors.push(`fallback "${catalog.fallback}" does not match a command id`);
}

const fallback = catalog.commands.find((command) => command.id === catalog.fallback);
if (fallback && !fallback.urls.some((url) => url.includes("{query}"))) {
  errors.push(`fallback command ${fallback.id} must have a {query} url`);
}

const user360 = catalog.commands.find((command) => command.id === "user-360");
if (!user360) {
  errors.push("missing user-360 command");
} else {
  if (!user360.needsQuery) errors.push("user-360 must require a query");
  if (user360.home) errors.push("user-360 must not have a home url");
  if (user360.urls.length !== 2) {
    errors.push(`user-360 should open 2 tabs, found ${user360.urls.length}`);
  }
  const blob = user360.urls.join("\n");
  for (const host of ["stripe.com", "hubspot.com"]) {
    if (!blob.includes(host)) errors.push(`user-360 is missing ${host}`);
  }
  for (const host of ["intercom.com", "retool.com", "metabaseapp.com", "plain.com", "posthog.com"]) {
    if (blob.includes(host)) {
      errors.push(`user-360 should not open ${host} (no confirmed email-search URL, or dropped tool)`);
    }
  }
  if (user360.urls.some((url) => !url.includes("{query}"))) {
    errors.push("user-360 urls must include {query}");
  }
}

for (const command of catalog.commands) {
  if (ids.has(command.id)) errors.push(`Duplicate command id: ${command.id}`);
  ids.add(command.id);

  if (!command.title.trim()) errors.push(`${command.id} is missing a title`);
  if (!command.category.trim()) errors.push(`${command.id} is missing a category`);
  if (!command.aliases.length) errors.push(`${command.id} has no aliases`);
  if (command.action && !ACTIONS.has(command.action)) {
    errors.push(`${command.id} has unknown action ${command.action}`);
  }
  if (!command.action && !command.urls.length) {
    errors.push(`${command.id} is missing a url`);
  }

  for (const alias of command.aliases) {
    if (alias !== "?" && !/^[a-z0-9-]+$/i.test(alias)) {
      errors.push(`Alias "${alias}" on ${command.id} should be letters, numbers, or dashes`);
    }
    const owner = aliases.get(alias.toLowerCase());
    if (owner && owner !== command.id) {
      errors.push(`Alias "${alias}" is used by both ${owner} and ${command.id}`);
    }
    aliases.set(alias.toLowerCase(), command.id);
  }

  const urls = [...command.urls, command.home].filter(Boolean);
  for (const url of urls) {
    if (!/^https:\/\//.test(url)) errors.push(`${command.id} url is not https: ${url}`);
    if ((url.match(/{/g) || []).length !== (url.match(/}/g) || []).length) {
      errors.push(`${command.id} has unbalanced { } in ${url}`);
    }
    if (/\{query|query\}/.test(url) && !url.includes("{query}")) {
      errors.push(`${command.id} has a broken query placeholder: ${url}`);
    }
  }
}

for (const name of ["list", "help"]) {
  if (![...aliases.keys()].includes(name)) {
    errors.push(`catalog should include a "${name}" alias`);
  }
}

const catalogBlob = JSON.stringify(data);
for (const dropped of ["intercom.com", "retool.com", "metabaseapp.com", "humaans.io"]) {
  if (catalogBlob.includes(dropped)) {
    errors.push(`catalog still contains dropped host ${dropped}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `error: ${error}`).join("\n"));
  process.exit(1);
}

console.log(`ok - ${catalog.commands.length} commands, ${aliases.size} aliases`);
