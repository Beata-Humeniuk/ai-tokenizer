import * as assert from "node:assert/strict";
import { test } from "node:test";
import { countGptTokens, encodingForModel } from "../src/gptCounter";

test("known models use the encoding gpt-tokenizer maps them to", () => {
  assert.deepEqual(encodingForModel("gpt-4o"), { encoding: "o200k_base", knownModel: true });
  assert.deepEqual(encodingForModel("gpt-4"), { encoding: "cl100k_base", knownModel: true });
  assert.deepEqual(encodingForModel("gpt-3.5-turbo"), { encoding: "cl100k_base", knownModel: true });
});

test("models gpt-tokenizer does not know fall back to o200k_base and are flagged", () => {
  for (const model of ["gpt-5.6-sol", "gpt-5.6-luna", "something-invented"]) {
    assert.deepEqual(encodingForModel(model), { encoding: "o200k_base", knownModel: false });
  }
});

test("counting a known model returns tokens without an approximation note", async () => {
  const result = await countGptTokens("The quick brown fox jumps over the lazy dog.", "gpt-4o");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.tokens > 0);
    assert.equal(result.note, undefined);
    assert.equal(result.breakdown?.ids.length, result.tokens);
    assert.equal(result.breakdown?.pieces.length, result.tokens);
  }
});

test("counting an unknown model says the number is an estimate", async () => {
  const result = await countGptTokens("hello", "gpt-5.6-sol");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.match(String(result.note), /estimate/);
    assert.match(String(result.note), /gpt-5\.6-sol/);
  }
});

test("empty and whitespace-only input count without failing", async () => {
  const empty = await countGptTokens("", "gpt-4o");
  assert.equal(empty.ok, true);
  if (empty.ok) {
    assert.equal(empty.tokens, 0);
  }

  const spaces = await countGptTokens("   \n\t ", "gpt-4o");
  assert.equal(spaces.ok, true);
  if (spaces.ok) {
    assert.ok(spaces.tokens > 0);
  }
});

test("non-Latin text and emoji are counted and rendered as pieces", async () => {
  const result = await countGptTokens("Zażółć gęślą jaźń — 日本語のテキスト 🚀", "gpt-4o");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.tokens > 0);
    assert.equal(result.breakdown?.pieces.length, result.tokens);
    assert.equal(
      result.breakdown?.pieces.every((piece) => typeof piece === "string"),
      true
    );
  }
});

test("the same text counts differently under the two encodings", async () => {
  const text = "Counting the very same sentence under two different encodings.";
  const modern = await countGptTokens(text, "gpt-4o");
  const legacy = await countGptTokens(text, "gpt-4");

  assert.equal(modern.ok && legacy.ok, true);
  if (modern.ok && legacy.ok) {
    assert.ok(modern.tokens > 0);
    assert.ok(legacy.tokens > 0);
  }
});

test("a large input is counted without blowing up", async () => {
  const result = await countGptTokens("The quick brown fox. ".repeat(20000), "gpt-4o");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.tokens > 50000);
  }
});
