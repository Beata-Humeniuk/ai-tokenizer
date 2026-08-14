import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ApiKeyStore } from "../src/secrets";

class MemorySecrets {
  readonly values = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  onDidChange = undefined as never;
}

function newStore() {
  const secrets = new MemorySecrets();
  return { secrets, keys: new ApiKeyStore(secrets as never) };
}

test("a stored key can be read back", async () => {
  const { keys } = newStore();
  await keys.store("claude", "first-key");

  assert.equal(await keys.read("claude"), "first-key");
  assert.deepEqual(await keys.storedKeys(), { claude: true, gemini: false });
});

test("storing again replaces the previous key and leaves no copy behind", async () => {
  const { secrets, keys } = newStore();
  await keys.store("claude", "first-key");
  await keys.store("claude", "second-key");

  assert.equal(await keys.read("claude"), "second-key");
  assert.equal([...secrets.values.values()].includes("first-key"), false);
  assert.equal(secrets.values.size, 1);
});

test("keys are kept apart per provider", async () => {
  const { keys } = newStore();
  await keys.store("claude", "claude-key");
  await keys.store("gemini", "gemini-key");

  assert.equal(await keys.read("claude"), "claude-key");
  assert.equal(await keys.read("gemini"), "gemini-key");
});

test("clearing removes every stored key", async () => {
  const { secrets, keys } = newStore();
  await keys.store("claude", "claude-key");
  await keys.store("gemini", "gemini-key");

  await keys.clearAll();

  assert.equal(await keys.read("claude"), "");
  assert.equal(await keys.read("gemini"), "");
  assert.deepEqual(await keys.storedKeys(), { claude: false, gemini: false });
  assert.equal(secrets.values.size, 0);
});
