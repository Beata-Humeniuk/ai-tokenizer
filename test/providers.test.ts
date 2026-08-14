import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  CUSTOM_MODEL_OPTION,
  MODEL_NOTES,
  PROVIDERS,
  isProviderId,
} from "../src/providers";

test("every provider has an id, a label and at least one model", () => {
  for (const provider of PROVIDERS) {
    assert.ok(provider.id.length > 0);
    assert.ok(provider.label.length > 0);
    assert.ok(provider.models.length > 0);
  }
});

test("provider ids and model ids are unique", () => {
  const ids = PROVIDERS.map((provider) => provider.id);
  assert.equal(new Set(ids).size, ids.length);

  const models = PROVIDERS.flatMap((provider) => provider.models);
  assert.equal(new Set(models).size, models.length);
});

test("only GPT is counted locally", () => {
  const local = PROVIDERS.filter((provider) => provider.countedLocally).map((p) => p.id);
  assert.deepEqual(local, ["gpt"]);
});

test("model notes point at models that are actually offered", () => {
  const models = new Set(PROVIDERS.flatMap((provider) => provider.models));
  for (const model of Object.keys(MODEL_NOTES)) {
    assert.ok(models.has(model), `${model} has a note but is not in any provider list`);
  }
});

test("the custom model option cannot collide with a real model id", () => {
  const models = PROVIDERS.flatMap((provider) => provider.models);
  assert.equal(models.includes(CUSTOM_MODEL_OPTION), false);
});

test("isProviderId accepts known ids and rejects anything else", () => {
  assert.equal(isProviderId("claude"), true);
  assert.equal(isProviderId("gpt"), true);
  assert.equal(isProviderId("gemini"), true);
  assert.equal(isProviderId("openai"), false);
  assert.equal(isProviderId(undefined), false);
});

