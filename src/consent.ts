import * as vscode from "vscode";
import { REMOTE_PROVIDER_NAMES } from "./providers";
import { KEYED_PROVIDERS, type KeyedProviderId } from "./secrets";

const CONSENT_STATE_PREFIX = "aiTokenizer.sendConsent.";

export async function confirmSendingContent(
  context: vscode.ExtensionContext,
  provider: KeyedProviderId
): Promise<boolean> {
  const stateKey = `${CONSENT_STATE_PREFIX}${provider}`;

  if (context.globalState.get<boolean>(stateKey) === true) {
    return true;
  }

  const company = REMOTE_PROVIDER_NAMES[provider];
  const choice = await vscode.window.showWarningMessage(
    `Send this text to ${company}?`,
    {
      modal: true,
      detail:
        `Counting tokens for these models uses the ${company} API, so the text currently loaded in the panel ` +
        `is sent to ${company} over the network. GPT models are counted on this machine and send nothing.\n\n` +
        `This is asked once per provider.`,
    },
    "Send"
  );

  if (choice !== "Send") {
    return false;
  }

  await context.globalState.update(stateKey, true);
  return true;
}

export async function forgetSendingConsent(context: vscode.ExtensionContext): Promise<void> {
  for (const provider of KEYED_PROVIDERS) {
    await context.globalState.update(`${CONSENT_STATE_PREFIX}${provider}`, undefined);
  }
}
