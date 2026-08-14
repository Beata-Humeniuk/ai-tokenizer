import * as assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(__dirname, "..", "..");

function source(...segments: string[]): string {
  return readFileSync(join(projectRoot, ...segments), "utf8");
}

const panelModules = readdirSync(join(projectRoot, "src", "webview"))
  .filter((name) => name.endsWith(".ts"))
  .map((name) => source("src", "webview", name));

const panelScript = [source("src", "webview.ts"), ...panelModules].join("\n");
const template = source("media", "webview.html");

test("the panel script only ever assigns an empty string to innerHTML", () => {
  const assignments = [...panelScript.matchAll(/\.innerHTML\s*=\s*([^;]+);/g)].map((match) =>
    match[1].trim()
  );

  assert.ok(assignments.length > 0);
  for (const assigned of assignments) {
    assert.ok(
      assigned === '""' || assigned === "''",
      `innerHTML is assigned ${assigned}; loaded content must go through textContent`
    );
  }
});

test("the panel script uses no other HTML-injecting API", () => {
  for (const forbidden of [
    "insertAdjacentHTML",
    "outerHTML",
    "document.write",
    "eval(",
    "new Function",
  ]) {
    assert.equal(
      panelScript.includes(forbidden),
      false,
      `${forbidden} would let loaded content become markup or code`
    );
  }
});

test("loaded file content reaches the page as text", () => {
  assert.match(panelScript, /dom\.content\.value = text/);
  assert.match(panelScript, /span\.textContent = text/);
  assert.match(panelScript, /dom\.error\.textContent = message/);
  assert.match(panelScript, /dom\.tokenView\.textContent = /);
});

test("the inlined assets cannot close the tag they are inlined into", () => {
  for (const [name, text] of [
    ["the panel script", panelScript],
    ["media/styles.css", source("media", "styles.css")],
  ] as const) {
    assert.equal(/<\/script|<\/style/i.test(text), false, `${name} would break out of its tag`);
  }
});

test("the template placeholders are all extension-owned resources", () => {
  const placeholders = new Set([...template.matchAll(/{{(\w+)}}/g)].map((match) => match[1]));
  assert.deepEqual([...placeholders].sort(), ["logo", "logoLight", "nonce", "script", "styles"]);
});

test("the template keeps the webview sealed off", () => {
  const csp = /content="([^"]*default-src[^"]*)"/.exec(template)?.[1] ?? "";

  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /script-src 'nonce-{{nonce}}'/);
  assert.equal(csp.includes("unsafe-inline"), false);
  assert.equal(csp.includes("unsafe-eval"), false);
  assert.equal(csp.includes("http"), false);
});
