import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANTHROPIC_COUNT_TOKENS_URL,
  countClaudeTokens,
  countGeminiTokens,
  type FetchLike,
} from "../src/remoteCounters";

const CLAUDE_KEY = "sk-ant-api03-TESTKEY_not_real_000";
const GEMINI_KEY = "AIzaSyTESTKEY_not_real_00000";

interface Call {
  url: string;
  init: RequestInit;
}

function stubFetch(
  response: { status?: number; body: string },
  calls: Call[] = []
): { fetchImpl: FetchLike; calls: Call[] } {
  const status = response.status ?? 200;
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => response.body,
    } as Response;
  };
  return { fetchImpl, calls };
}

test("a successful Claude response returns the token count", async () => {
  const { fetchImpl, calls } = stubFetch({ body: JSON.stringify({ input_tokens: 42 }) });
  const result = await countClaudeTokens({
    apiKey: CLAUDE_KEY,
    model: "claude-opus-5",
    text: "hello",
    fetchImpl,
  });

  assert.deepEqual(result, { ok: true, tokens: 42 });
  assert.equal(calls[0].url, ANTHROPIC_COUNT_TOKENS_URL);
  assert.equal((calls[0].init.headers as Record<string, string>)["x-api-key"], CLAUDE_KEY);
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    model: "claude-opus-5",
    messages: [{ role: "user", content: "hello" }],
  });
});

test("a successful Gemini response returns the token count", async () => {
  const { fetchImpl, calls } = stubFetch({ body: JSON.stringify({ totalTokens: 7 }) });
  const result = await countGeminiTokens({
    apiKey: GEMINI_KEY,
    model: "gemini-3.6-flash",
    text: "hello",
    fetchImpl,
  });

  assert.deepEqual(result, { ok: true, tokens: 7 });
  assert.equal((calls[0].init.headers as Record<string, string>)["x-goog-api-key"], GEMINI_KEY);
});

test("the Gemini key never travels in the URL", async () => {
  const { fetchImpl, calls } = stubFetch({ body: JSON.stringify({ totalTokens: 1 }) });
  await countGeminiTokens({
    apiKey: GEMINI_KEY,
    model: "gemini-3.6-flash",
    text: "hello",
    fetchImpl,
  });

  assert.equal(calls[0].url.includes(GEMINI_KEY), false);
  assert.equal(calls[0].url.includes("key="), false);
});

test("an unauthorized response points at the stored key without echoing it", async () => {
  const { fetchImpl } = stubFetch({
    status: 401,
    body: JSON.stringify({ error: { message: `invalid key ${CLAUDE_KEY}` } }),
  });
  const result = await countClaudeTokens({
    apiKey: CLAUDE_KEY,
    model: "claude-opus-5",
    text: "hello",
    fetchImpl,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /401/);
    assert.match(result.error, /stored API key/);
    assert.equal(result.error.includes(CLAUDE_KEY), false);
    assert.equal(result.keyProblem, true);
  }
});

test("only key failures are flagged as a key problem", async () => {
  const forbidden = await countGeminiTokens({
    apiKey: GEMINI_KEY,
    model: "gemini-3.6-flash",
    text: "hello",
    fetchImpl: stubFetch({ status: 403, body: "{}" }).fetchImpl,
  });
  assert.equal(forbidden.ok === false && forbidden.keyProblem, true);

  const rateLimited = await countGeminiTokens({
    apiKey: GEMINI_KEY,
    model: "gemini-3.6-flash",
    text: "hello",
    fetchImpl: stubFetch({ status: 429, body: "{}" }).fetchImpl,
  });
  assert.equal(rateLimited.ok === false && rateLimited.keyProblem, false);
});

test("rate limiting and provider outages get their own hint", async () => {
  const rateLimited = await countClaudeTokens({
    apiKey: CLAUDE_KEY,
    model: "claude-opus-5",
    text: "hello",
    fetchImpl: stubFetch({ status: 429, body: "{}" }).fetchImpl,
  });
  assert.equal(rateLimited.ok, false);
  if (!rateLimited.ok) {
    assert.match(rateLimited.error, /Rate limit/);
  }

  const serverError = await countGeminiTokens({
    apiKey: GEMINI_KEY,
    model: "gemini-3.6-flash",
    text: "hello",
    fetchImpl: stubFetch({ status: 503, body: "" }).fetchImpl,
  });
  assert.equal(serverError.ok, false);
  if (!serverError.ok) {
    assert.match(serverError.error, /try again later/);
  }
});

test("an unknown model is reported as a model problem", async () => {
  const result = await countGeminiTokens({
    apiKey: GEMINI_KEY,
    model: "gemini-does-not-exist",
    text: "hello",
    fetchImpl: stubFetch({ status: 404, body: "{}" }).fetchImpl,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /model name/);
  }
});

test("a response that is not JSON does not throw", async () => {
  const result = await countClaudeTokens({
    apiKey: CLAUDE_KEY,
    model: "claude-opus-5",
    text: "hello",
    fetchImpl: stubFetch({ status: 502, body: "<html>Bad Gateway</html>" }).fetchImpl,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /502/);
  }
});

test("a successful response without a token count is reported, not guessed", async () => {
  const result = await countClaudeTokens({
    apiKey: CLAUDE_KEY,
    model: "claude-opus-5",
    text: "hello",
    fetchImpl: stubFetch({ body: JSON.stringify({ unexpected: true }) }).fetchImpl,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /without a token count/);
  }
});

test("a network failure is reported with the key stripped out", async () => {
  const failing: FetchLike = async () => {
    throw new Error(`getaddrinfo ENOTFOUND while sending key=${GEMINI_KEY}`);
  };
  const result = await countGeminiTokens({
    apiKey: GEMINI_KEY,
    model: "gemini-3.6-flash",
    text: "hello",
    fetchImpl: failing,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /Could not reach the Gemini API/);
    assert.equal(result.error.includes(GEMINI_KEY), false);
  }
});
