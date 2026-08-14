export type ProviderId = "claude" | "gpt" | "gemini";

export interface Provider {
  id: ProviderId;
  label: string;
  countedLocally: boolean;
  models: string[];
}

export const PROVIDERS: Provider[] = [
  {
    id: "claude",
    label: "Claude",
    countedLocally: false,
    models: [
      "claude-fable-5",
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-haiku-4-5",
      "claude-opus-4-8",
    ],
  },
  {
    id: "gpt",
    label: "GPT",
    countedLocally: true,
    models: [
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-4o",
      "gpt-4.1",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    countedLocally: false,
    models: [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.1-pro-preview",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ],
  },
];

export const CUSTOM_MODEL_OPTION = "__custom__";

export const MODEL_NOTES: Record<string, string> = {
  "gemini-3.1-pro-preview": "preview",
};

export const REMOTE_PROVIDER_NAMES: Record<Exclude<ProviderId, "gpt">, string> = {
  claude: "Anthropic",
  gemini: "Google",
};

export const KEY_PAGES: Record<Exclude<ProviderId, "gpt">, string> = {
  claude: "https://console.anthropic.com/settings/keys",
  gemini: "https://aistudio.google.com/apikey",
};

export function isProviderId(value: unknown): value is ProviderId {
  return PROVIDERS.some((provider) => provider.id === value);
}

