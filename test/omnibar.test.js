#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Omnibar = require("../omnibar");

const catalog = Omnibar.parseCatalog(
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "commands.json"), "utf8"))
);

assert.equal(catalog.keyword, "fx");
assert.ok(catalog.commands.length >= 10);

const byId = Object.fromEntries(catalog.commands.map((command) => [command.id, command]));
assert.ok(byId["user-360"]);
assert.equal(byId["user-360"].urls.length, 5);
assert.equal(byId["retool-user"].urls[0].includes("{query}"), true);
assert.doesNotMatch(byId["retool-user"].urls[0], /email=query\}/);

const stripe = Omnibar.searchCommands(catalog.commands, "st jane@fyxer.com")[0];
assert.equal(stripe.command.id, "stripe");
assert.equal(stripe.query, "jane@fyxer.com");
assert.equal(
  Omnibar.buildUrls(stripe.command, stripe.query)[0],
  "https://dashboard.stripe.com/search?query=jane%40fyxer.com"
);

const userFromEmail = Omnibar.searchCommands(catalog.commands, "jane@fyxer.com")[0];
assert.equal(userFromEmail.command.id, "user-360");
assert.equal(userFromEmail.query, "jane@fyxer.com");

const intercomInbox = Omnibar.searchCommands(catalog.commands, "ic")[0];
assert.equal(intercomInbox.command.id, "intercom-inbox");
assert.equal(intercomInbox.query, "");

const hubspot = Omnibar.searchCommands(catalog.commands, "hubspot acme")[0];
assert.equal(hubspot.command.id, "hubspot");
assert.equal(hubspot.query, "acme");

const empty = Omnibar.searchCommands(catalog.commands, "");
assert.equal(empty.length, catalog.commands.length);
assert.equal(empty[0].command.id, "user-360");

const v1 = Omnibar.parseCatalog({
  st: "https://dashboard.stripe.com/search?query={query}",
  ic: "https://app.intercom.com/a/inbox/wrbnh3r4"
});
assert.equal(v1.version, 1);
assert.equal(v1.commands.length, 2);
assert.equal(Omnibar.searchCommands(v1.commands, "st foo")[0].query, "foo");

assert.equal(Omnibar.looksLikeEmail("not-an-email"), false);
assert.equal(Omnibar.looksLikeEmail("user@fyxer.com"), true);
assert.deepEqual(Omnibar.splitInput("rte user@fyxer.com"), {
  token: "rte",
  rest: "user@fyxer.com",
  raw: "rte user@fyxer.com"
});

console.log(`ok - ${catalog.commands.length} commands`);
