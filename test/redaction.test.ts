import * as assert from "node:assert/strict";
import { test } from "node:test";
import { redactSecrets, shorten } from "../src/redaction";

test("an Anthropic key is removed from text", () => {
  const redacted = redactSecrets("invalid x-api-key: sk-ant-api03-ABCdef_123-456 supplied");
  assert.equal(redacted.includes("sk-ant-api03-ABCdef_123-456"), false);
  assert.equal(redacted.includes("[redacted]"), true);
});

test("a Google key is removed from text", () => {
  const redacted = redactSecrets("API key not valid: AIzaSyA-1234567890abcdefghij");
  assert.equal(redacted.includes("AIzaSyA-1234567890abcdefghij"), false);
});

test("a key carried in a query string is removed but the parameter name stays", () => {
  const redacted = redactSecrets("https://example.test/models:countTokens?key=AIzaSyA1234567890&alt=json");
  assert.equal(redacted.includes("AIzaSyA1234567890"), false);
  assert.equal(redacted.includes("?key=[redacted]"), true);
  assert.equal(redacted.includes("alt=json"), true);
});

test("text without a key is left alone", () => {
  const message = "The model gpt-4o is not available for this project.";
  assert.equal(redactSecrets(message), message);
});

test("shorten collapses whitespace and cuts long text", () => {
  assert.equal(shorten("  a\n\n  b  "), "a b");
  assert.equal(shorten("x".repeat(300)).length, 203);
});
