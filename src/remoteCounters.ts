import type { CountResult } from "./countResult";
import { redactSecrets, shorten } from "./redaction";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export const ANTHROPIC_COUNT_TOKENS_URL = "https://api.anthropic.com/v1/messages/count_tokens";
const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface RemoteCountRequest {
  providerName: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  readTokens: (payload: any) => unknown;
  fetchImpl: FetchLike;
}

interface RemoteCountOptions {
  apiKey: string;
  model: string;
  text: string;
  fetchImpl?: FetchLike;
}

export async function countClaudeTokens(options: RemoteCountOptions): Promise<CountResult> {
  return countRemote({
    providerName: "Claude",
    url: ANTHROPIC_COUNT_TOKENS_URL,
    headers: {
      "x-api-key": options.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: { model: options.model, messages: [{ role: "user", content: options.text }] },
    readTokens: (payload) => payload?.input_tokens,
    fetchImpl: options.fetchImpl ?? fetch,
  });
}

export async function countGeminiTokens(options: RemoteCountOptions): Promise<CountResult> {
  return countRemote({
    providerName: "Gemini",
    url: `${GEMINI_MODELS_URL}/${encodeURIComponent(options.model)}:countTokens`,
    headers: { "x-goog-api-key": options.apiKey },
    body: { contents: [{ parts: [{ text: options.text }] }] },
    readTokens: (payload) => payload?.totalTokens,
    fetchImpl: options.fetchImpl ?? fetch,
  });
}

async function countRemote(request: RemoteCountRequest): Promise<CountResult> {
  let response: Response;
  try {
    response = await request.fetchImpl(request.url, {
      method: "POST",
      headers: { ...request.headers, "content-type": "application/json" },
      body: JSON.stringify(request.body),
    });
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach the ${request.providerName} API: ${safeMessage(error)}`,
    };
  }

  const rawBody = await response.text().catch(() => "");
  const payload = parseJson(rawBody);

  if (!response.ok) {
    return {
      ok: false,
      error: failureMessage(request.providerName, response.status, payload),
      keyProblem: response.status === 401 || response.status === 403,
    };
  }

  const tokens = request.readTokens(payload);
  if (typeof tokens !== "number" || !Number.isFinite(tokens)) {
    return {
      ok: false,
      error: `The ${request.providerName} API returned a response without a token count.`,
    };
  }

  return { ok: true, tokens };
}

function failureMessage(providerName: string, status: number, payload: any): string {
  const detail = typeof payload?.error?.message === "string" ? payload.error.message : "";
  const parts = [`The ${providerName} API returned ${status}.`];

  if (status === 401 || status === 403) {
    parts.push("Check the stored API key.");
  } else if (status === 404) {
    parts.push("Check the model name.");
  } else if (status === 429) {
    parts.push("Rate limit reached — try again in a moment.");
  } else if (status >= 500) {
    parts.push("The provider is having trouble — try again later.");
  }

  if (detail) {
    parts.push(safeText(detail));
  }

  return parts.join(" ");
}

function parseJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function safeMessage(error: unknown): string {
  return safeText(error instanceof Error ? error.message : String(error));
}

function safeText(text: string): string {
  return redactSecrets(shorten(text));
}
