#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Omnibar = require("../omnibar");

const catalog = Omnibar.parseCatalog(
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "commands.json"), "utf8"))
);

assert.equal(catalog.keyword, "fx");
assert.equal(catalog.searchEngineKeyword, "b");
assert.equal(catalog.fallback, "_default");
assert.ok(catalog.commands.length >= 10);

const byId = Object.fromEntries(catalog.commands.map((command) => [command.id, command]));
assert.ok(byId["user-360"]);
assert.equal(byId["user-360"].urls.length, 5);
assert.equal(byId["retool-user"].urls[0].includes("{query}"), true);
assert.doesNotMatch(byId["retool-user"].urls[0], /email=query\}/);
assert.ok(byId.stripe.home.startsWith("https://dashboard.stripe.com"));
assert.ok(byId._default.urls[0].includes("{query}"));
assert.ok(byId.list.action === "list");
assert.ok(byId.help.action === "help");
assert.ok(byId["help-center"].aliases.includes("hc"));
assert.ok(!byId["help-center"].aliases.includes("help"));
assert.ok(byId["intercom-user"].aliases.includes("who"));
assert.ok(byId.gmail);
assert.ok(byId.calendar);

const stripe = Omnibar.searchCommands(catalog.commands, "st jane@fyxer.com")[0];
assert.equal(stripe.command.id, "stripe");
assert.equal(stripe.query, "jane@fyxer.com");
assert.equal(
  Omnibar.buildUrls(stripe.command, stripe.query)[0],
  "https://dashboard.stripe.com/search?query=jane%40fyxer.com"
);

const stripeHome = Omnibar.buildUrls(byId.stripe, "");
assert.equal(stripeHome[0], "https://dashboard.stripe.com/");

const userFromEmail = Omnibar.searchCommands(catalog.commands, "jane@fyxer.com")[0];
assert.equal(userFromEmail.command.id, "user-360");
assert.equal(userFromEmail.query, "jane@fyxer.com");

const intercomInbox = Omnibar.searchCommands(catalog.commands, "ic")[0];
assert.equal(intercomInbox.command.id, "intercom-inbox");
assert.equal(intercomInbox.query, "");

const hubspot = Omnibar.searchCommands(catalog.commands, "hubspot acme")[0];
assert.equal(hubspot.command.id, "hubspot");
assert.equal(hubspot.query, "acme");

const stMatches = Omnibar.searchCommands(catalog.commands, "st").map((item) => item.command.id);
assert.equal(stMatches[0], "stripe");
assert.ok(!stMatches.includes("customers"));
assert.ok(!stMatches.includes("customer-success"));

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

assert.equal(Omnibar.dispatch(catalog, "st jane@fyxer.com").type, "redirect");
assert.equal(Omnibar.dispatch(catalog, "st jane@fyxer.com").command.id, "stripe");
assert.equal(
  Omnibar.dispatch(catalog, "st jane@fyxer.com").urls[0],
  "https://dashboard.stripe.com/search?query=jane%40fyxer.com"
);
assert.equal(Omnibar.dispatch(catalog, "st").urls[0], "https://dashboard.stripe.com/");
assert.equal(Omnibar.dispatch(catalog, "hs").urls[0], "https://app-eu1.hubspot.com/");
assert.equal(
  Omnibar.dispatch(catalog, "hs acme").urls[0],
  "https://app-eu1.hubspot.com/search/144759091/search?query=acme"
);

assert.equal(Omnibar.dispatch(catalog, "").type, "list");
assert.equal(Omnibar.dispatch(catalog, "list").type, "list");
assert.equal(Omnibar.dispatch(catalog, "help").type, "list");
assert.equal(Omnibar.dispatch(catalog, "?").type, "list");
assert.equal(Omnibar.dispatch(catalog, "help st").type, "help");
assert.equal(Omnibar.dispatch(catalog, "help st").command.id, "stripe");
assert.equal(Omnibar.dispatch(catalog, "help stripe").command.id, "stripe");
assert.equal(Omnibar.dispatch(catalog, "? ic").type, "help");
assert.equal(Omnibar.dispatch(catalog, "? ic").command.id, "intercom-inbox");
assert.equal(Omnibar.dispatch(catalog, "list u").command.id, "user-360");

assert.equal(Omnibar.dispatch(catalog, "u").type, "needs-query");
assert.equal(Omnibar.dispatch(catalog, "u").command.id, "user-360");
assert.equal(Omnibar.dispatch(catalog, "u jane@acme.com").urls.length, 5);
assert.equal(Omnibar.dispatch(catalog, "jane@acme.com").command.id, "user-360");
assert.equal(Omnibar.dispatch(catalog, "stats").type, "needs-query");

const unknown = Omnibar.dispatch(catalog, "zzzz not-a-command");
assert.equal(unknown.type, "fallback");
assert.equal(unknown.command.id, "_default");
assert.equal(
  unknown.urls[0],
  "https://www.google.com/search?q=zzzz%20not-a-command"
);

assert.equal(Omnibar.dispatch(catalog, "g cats").command.id, "_default");
assert.equal(
  Omnibar.dispatch(catalog, "g cats").urls[0],
  "https://www.google.com/search?q=cats"
);
assert.equal(Omnibar.dispatch(catalog, "g").urls[0], "https://www.google.com/");
assert.equal(
  Omnibar.dispatch(catalog, "gm from:jane").urls[0],
  "https://mail.google.com/mail/u/0/#search/from%3Ajane"
);
assert.equal(Omnibar.dispatch(catalog, "gm").urls[0], "https://mail.google.com/mail/u/0/");
assert.ok(Omnibar.dispatch(catalog, "cal standup").urls[0].includes("search?q=standup"));
assert.equal(Omnibar.dispatch(catalog, "who jane@x.com").command.id, "intercom-user");
assert.equal(Omnibar.dispatch(catalog, "hc").command.id, "help-center");
assert.equal(Omnibar.dispatch(catalog, "palette").type, "palette");

assert.equal(Omnibar.encodeQuery("a b"), "a%20b");
assert.equal(
  Omnibar.buildUrls(byId.stripe, "a b")[0],
  "https://dashboard.stripe.com/search?query=a%20b"
);

assert.equal(Omnibar.levenshtein("stripe", "stripe"), 0);
assert.equal(Omnibar.levenshtein("strip", "stripe"), 1);
const typo = Omnibar.dispatch(catalog, "strip");
assert.equal(typo.command.id, "stripe");
assert.equal(typo.didYouMean.alias, "stripe");

const short = Omnibar.dispatch(catalog, "st");
assert.equal(short.command.id, "stripe");
assert.equal(short.didYouMean, null);

assert.ok(!Omnibar.dispatch(catalog, "st").suggestions || !Omnibar.dispatch(catalog, "st").didYouMean);
assert.equal(Omnibar.dispatch(catalog, "ic").command.id, "intercom-inbox");

assert.equal(Omnibar.searchEngineUrl("https://example.com/fyxer-omnibar"), "https://example.com/fyxer-omnibar/?q=%s");
assert.equal(Omnibar.classifyQuery("help st").kind, "help");
assert.equal(Omnibar.classifyQuery("list").kind, "list");
assert.equal(Omnibar.classifyQuery("ls").kind, "list");
assert.equal(Omnibar.classifyQuery("cmds").kind, "list");
assert.equal(Omnibar.classifyQuery("commands").kind, "list");
assert.equal(Omnibar.classifyQuery("?").kind, "list");
assert.equal(Omnibar.classifyQuery("list st").kind, "help");
assert.equal(Omnibar.classifyQuery("commands st").kind, "help");
assert.equal(Omnibar.shouldFastRedirect("st jane"), true);
assert.equal(Omnibar.shouldFastRedirect("u jane@acme.com"), true);
assert.equal(Omnibar.shouldFastRedirect("asdfasdf"), true);
assert.equal(Omnibar.shouldFastRedirect("list"), false);
assert.equal(Omnibar.shouldFastRedirect("help st"), false);
assert.equal(Omnibar.shouldFastRedirect("commands foo"), false);
assert.equal(Omnibar.shouldFastRedirect("palette"), false);
assert.equal(Omnibar.shouldFastRedirect(""), false);

assert.equal(Omnibar.dispatch(catalog, "ls").type, "list");
assert.equal(Omnibar.dispatch(catalog, "cmds").type, "list");
assert.equal(Omnibar.dispatch(catalog, "commands").type, "list");
assert.equal(Omnibar.dispatch(catalog, "list st").type, "help");
assert.equal(Omnibar.dispatch(catalog, "list st").command.id, "stripe");
assert.equal(Omnibar.dispatch(catalog, "help not-a-real-command-xyz").type, "help");
assert.equal(Omnibar.dispatch(catalog, "help not-a-real-command-xyz").command, null);

assert.equal(Omnibar.dispatch(catalog, "mb").urls[0], "https://fyxer-ai.metabaseapp.com/");
assert.ok(Omnibar.dispatch(catalog, "mb usage").urls[0].includes("search?q=usage"));
assert.ok(Omnibar.dispatch(catalog, "rte").urls[0].includes("manage-user"));
assert.ok(!Omnibar.dispatch(catalog, "rte").urls[0].includes("{query}"));
assert.ok(Omnibar.dispatch(catalog, "rte a@b.c").urls[0].includes("email=a%40b.c"));
assert.ok(Omnibar.dispatch(catalog, "who").urls[0].includes("intercom.com"));
assert.equal(Omnibar.dispatch(catalog, "who").command.id, "intercom-user");
assert.notEqual(Omnibar.dispatch(catalog, "who").command.id, "user-360");
assert.equal(Omnibar.dispatch(catalog, "who jane@x.com").command.id, "intercom-user");

const user360 = byId["user-360"];
assert.equal(user360.needsQuery, true);
assert.equal(user360.home, "");
assert.deepEqual(Omnibar.buildUrls(user360, ""), []);
assert.equal(Omnibar.dispatch(catalog, "u").type, "needs-query");
assert.equal(Omnibar.dispatch(catalog, "u").urls.length, 0);
assert.equal(Omnibar.dispatch(catalog, "user").type, "needs-query");
const u360 = Omnibar.dispatch(catalog, "u jane@acme.com");
assert.equal(u360.type, "redirect");
assert.equal(u360.urls.length, 5);
assert.ok(u360.urls.every((url) => url.includes("jane%40acme.com")));
assert.ok(u360.urls.some((url) => url.includes("intercom.com")));
assert.ok(u360.urls.some((url) => url.includes("retool.com") && url.includes("email=")));
assert.ok(u360.urls.some((url) => url.includes("stripe.com")));
assert.ok(u360.urls.some((url) => url.includes("hubspot.com")));
assert.ok(u360.urls.some((url) => url.includes("metabaseapp.com")));
assert.equal(
  u360.urls.find((url) => url.includes("retool.com")),
  byId["retool-user"].urls[0].split("{query}").join("jane%40acme.com")
);
assert.doesNotMatch(JSON.stringify(catalog.commands), /email=query\}/);

assert.equal(Omnibar.dispatch(catalog, "zz").type, "fallback");
assert.equal(Omnibar.dispatch(catalog, "s").type, "fallback");
assert.ok(Omnibar.dispatch(catalog, "s").urls[0].includes("google.com/search?q=s"));
assert.equal(Omnibar.encodeQuery("jane@acme.com"), "jane%40acme.com");
assert.equal(Omnibar.encodeQuery("a+b"), "a%2Bb");

const hel = Omnibar.dispatch(catalog, "hel");
assert.equal(hel.type, "list");
assert.equal(hel.didYouMean.command.id, "help");

const listTypo = Omnibar.dispatch(catalog, "listt");
assert.equal(listTypo.type, "list");
assert.equal(listTypo.didYouMean.command.id, "list");
const listTypoHelp = Omnibar.dispatch(catalog, "listt st");
assert.equal(listTypoHelp.type, "help");
assert.equal(listTypoHelp.command.id, "stripe");

const lst = Omnibar.dispatch(catalog, "lst");
assert.equal(lst.type, "fallback");
assert.ok(lst.suggestions.some((item) => item.command.id === "list"));
assert.ok(lst.suggestions.some((item) => item.command.id === "stripe"));

const tiny = Omnibar.parseCatalog({
  version: 2,
  fallback: "g",
  commands: [
    {
      id: "a",
      aliases: ["foo"],
      title: "Alpha",
      url: "https://a.example/q={query}",
      home: "https://a.example/"
    },
    {
      id: "b",
      aliases: ["foe"],
      title: "Beta",
      url: "https://b.example/q={query}",
      home: "https://b.example/"
    },
    {
      id: "g",
      aliases: ["g"],
      title: "Google",
      url: "https://www.google.com/search?q={query}"
    }
  ]
});
const ambiguous = Omnibar.dispatch(tiny, "fop");
assert.equal(ambiguous.type, "fallback");
assert.ok(ambiguous.suggestions.length >= 2);
const uniqueTypo = Omnibar.dispatch(tiny, "fooo");
assert.equal(uniqueTypo.command.id, "a");
assert.equal(uniqueTypo.didYouMean.alias, "foo");

assert.equal(Omnibar.shouldStayOnLauncher([{}, {}]), false);
assert.equal(Omnibar.shouldStayOnLauncher([{}, null]), true);
assert.equal(Omnibar.shouldStayOnLauncher([{ closed: true }]), true);
assert.equal(Omnibar.shouldStayOnLauncher([]), false);
assert.equal(Omnibar.shouldStayOnLauncher([true, false]), true);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /\?q=/);
assert.match(html, /dispatching/);
assert.match(html, /redirect\.js/);
assert.match(html, /html\.dispatching body \{ visibility: hidden/);
assert.ok(html.indexOf('classList.add("dispatching")') < html.indexOf("omnibar.js"));
assert.match(html, /class="page list-mode"/);
assert.match(html, /listTokens/);

const ui = fs.readFileSync(path.join(__dirname, "..", "ui.js"), "utf8");
assert.match(ui, /open-all-tabs/);
assert.match(ui, /shouldStayOnLauncher/);
assert.doesNotMatch(ui, /window\.open\(url, "_blank", "noopener"\);\s*\n\s*window\.location\.replace/);

const redirect = fs.readFileSync(path.join(__dirname, "..", "redirect.js"), "utf8");
assert.match(redirect, /urls\.length === 1/);

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.omnibox.keyword, "fx");
assert.equal(manifest.background.service_worker, "background.js");
assert.ok(manifest.action.default_popup);
assert.ok(manifest.icons["16"]);
assert.ok(manifest.icons["128"]);
for (const size of [16, 32, 48, 128]) {
  const icon = path.join(__dirname, "..", "icons", `icon${size}.png`);
  assert.ok(fs.existsSync(icon), `missing icon${size}.png`);
  assert.ok(fs.statSync(icon).size > 50, `icon${size}.png looks empty`);
}

const popup = fs.readFileSync(path.join(__dirname, "..", "popup.html"), "utf8");
assert.match(popup, /omnibar\.js/);
assert.match(popup, /ui\.js/);
assert.match(popup, /class="popup"/);

const background = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
assert.match(background, /importScripts\("omnibar\.js"\)/);
assert.match(background, /Omnibar\.dispatch/);
assert.match(background, /onInputEntered/);
assert.match(background, /Command list/);

console.log(`ok - ${catalog.commands.length} commands`);
