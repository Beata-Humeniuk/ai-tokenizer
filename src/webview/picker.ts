import { CUSTOM_MODEL_OPTION } from "../providers";
import { addOption, dom } from "./dom";
import { post } from "./messages";

interface Provider {
  id: string;
  label: string;
  countedLocally: boolean;
  models: string[];
}

const COMPANIES: Record<string, string> = { claude: "Anthropic", gemini: "Google" };

let providers: Provider[] = [];
let modelNotes: Record<string, string> = {};
let storedKeys: Record<string, boolean> = {};

export function showProviders(nextProviders: Provider[], notes: Record<string, string>): void {
  providers = nextProviders;
  modelNotes = notes;
  dom.provider.innerHTML = "";

  for (const provider of providers) {
    addOption(dom.provider, provider.id, provider.label);
  }

  showModels();
  showKeyStatus();
}

export function showStoredKeys(keys: Record<string, boolean>): void {
  storedKeys = keys;
  showKeyStatus();
}

export function chosenProvider(): string {
  return dom.provider.value;
}

export function chosenModel(): string {
  return dom.model.value === CUSTOM_MODEL_OPTION
    ? dom.customModel.value.trim()
    : dom.model.value;
}

export function wirePicker(): void {
  dom.provider.addEventListener("change", () => {
    showModels();
    showKeyStatus();
  });
  dom.model.addEventListener("change", showCustomModelInput);
  dom.getKey.addEventListener("click", () =>
    post({ type: "openKeyPage", provider: chosenProvider() })
  );
  dom.setKey.addEventListener("click", () => post({ type: "setKey", provider: chosenProvider() }));
}

function selected(): Provider | undefined {
  return providers.find((provider) => provider.id === dom.provider.value);
}

function showModels(): void {
  const provider = selected();
  dom.model.innerHTML = "";

  for (const model of provider?.models ?? []) {
    const note = modelNotes[model];
    addOption(dom.model, model, note ? `${model} (${note})` : model);
  }

  addOption(dom.model, CUSTOM_MODEL_OPTION, "Other model ID...");
  showCustomModelInput();
}

function showCustomModelInput(): void {
  const custom = dom.model.value === CUSTOM_MODEL_OPTION;
  dom.customModel.hidden = !custom;

  if (custom) {
    dom.customModel.focus();
  }
}

function showKeyStatus(): void {
  const provider = selected();

  if (!provider) {
    dom.keyStatus.hidden = true;
    return;
  }

  dom.keyStatus.hidden = false;
  const company = COMPANIES[provider.id] ?? provider.label;
  const needsKey = !provider.countedLocally && !storedKeys[provider.id];

  dom.keyStatusText.textContent = provider.countedLocally
    ? "Counted on this machine. Nothing leaves your computer."
    : storedKeys[provider.id]
      ? `A key is stored. Counting sends the loaded text to ${company}.`
      : `No key is stored yet. Create one at ${company}, then paste it here.`;

  dom.getKey.hidden = !needsKey;
  dom.setKey.hidden = !needsKey;
}
