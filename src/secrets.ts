import type * as vscode from "vscode";
import type { ProviderId } from "./providers";

export type KeyedProviderId = Exclude<ProviderId, "gpt">;

export const KEYED_PROVIDERS: KeyedProviderId[] = ["claude", "gemini"];

const SECRET_NAMES: Record<KeyedProviderId, string> = {
  claude: "aiTokenizer.claudeApiKey",
  gemini: "aiTokenizer.geminiApiKey",
};

type StoredKeys = Record<KeyedProviderId, boolean>;

export class ApiKeyStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async store(provider: KeyedProviderId, key: string): Promise<void> {
    await this.secrets.store(SECRET_NAMES[provider], key);
  }

  async read(provider: KeyedProviderId): Promise<string> {
    return (await this.secrets.get(SECRET_NAMES[provider])) ?? "";
  }

  async clearAll(): Promise<void> {
    for (const provider of KEYED_PROVIDERS) {
      await this.secrets.delete(SECRET_NAMES[provider]);
    }
  }

  async storedKeys(): Promise<StoredKeys> {
    const entries = await Promise.all(
      KEYED_PROVIDERS.map(async (provider) => [provider, (await this.read(provider)) !== ""] as const)
    );
    return Object.fromEntries(entries) as StoredKeys;
  }
}

