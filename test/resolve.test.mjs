import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, expand } from "../src/resolve.mjs";
import { validateCommands } from "../src/validate.mjs";

const commands = {
  st: "https://dashboard.stripe.com/search?query={query}",
  rt: "https://fyxer.retool.com/",
  hs: "https://app-eu1.hubspot.com/search/144759091/search?query={query}",
};

test("expands a query into a templated URL and URL-encodes it", () => {
  const r = resolve(commands, "st acme inc");
  assert.equal(r.matched, true);
  assert.equal(r.keyword, "st");
  assert.equal(r.query, "acme inc");
  assert.equal(r.url, "https://dashboard.stripe.com/search?query=acme%20inc");
});

test("returns a direct link for a shortcut without a placeholder", () => {
  const r = resolve(commands, "rt");
  assert.equal(r.matched, true);
  assert.equal(r.url, "https://fyxer.retool.com/");
});

test("ignores extra query text for non-templated shortcuts", () => {
  const r = resolve(commands, "rt ignored words");
  assert.equal(r.url, "https://fyxer.retool.com/");
});

test("falls back to web search for unknown shortcuts", () => {
  const r = resolve(commands, "unknownkw hello world");
  assert.equal(r.matched, false);
  assert.equal(r.url, "https://www.google.com/search?q=unknownkw%20hello%20world");
});

test("uses a custom fallback when provided", () => {
  const r = resolve(commands, "zzz find me", {
    fallback: "https://duckduckgo.com/?q={query}",
  });
  assert.equal(r.url, "https://duckduckgo.com/?q=zzz%20find%20me");
});

test("returns null url for empty input", () => {
  const r = resolve(commands, "   ");
  assert.equal(r.url, null);
  assert.equal(r.matched, false);
});

test("expand encodes special characters", () => {
  assert.equal(
    expand("https://x/?q={query}", "a&b=c"),
    "https://x/?q=a%26b%3Dc"
  );
});

test("validateCommands accepts a healthy map", () => {
  const { errors } = validateCommands(commands);
  assert.deepEqual(errors, []);
});

test("validateCommands rejects non-string and non-URL values", () => {
  const { errors } = validateCommands({ a: 5, b: "not a url" });
  assert.equal(errors.length, 2);
});

test("validateCommands warns on a malformed placeholder", () => {
  const { warnings, errors } = validateCommands({
    bad: "https://x/?email=query}",
  });
  assert.equal(errors.length, 0);
  assert.ok(warnings.some((w) => w.includes("malformed")));
});
