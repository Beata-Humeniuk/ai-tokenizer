import * as vscode from "vscode";
import { TokenCounterPanel } from "./panel";
import { ApiKeyStore, type KeyedProviderId } from "./secrets";
import { forgetSendingConsent } from "./consent";
import { trackActiveDocument } from "./activeDocument";

export function activate(context: vscode.ExtensionContext): void {
  const keys = new ApiKeyStore(context.secrets);

  context.subscriptions.push(
    vscode.commands.registerCommand("aiTokenizer.open", (resource?: vscode.Uri) => {
      TokenCounterPanel.show(context, keys, resource);
    }),

    trackActiveDocument(),

    vscode.commands.registerCommand("aiTokenizer.setApiKey", async (provider?: KeyedProviderId) => {
      const chosen = provider ?? (await pickProvider());
      if (!chosen) {
        return;
      }

      const name = chosen === "claude" ? "Claude" : "Gemini";
      const key = await vscode.window.showInputBox({
        password: true,
        ignoreFocusOut: true,
        title: `${name} API key`,
        prompt: `Paste the ${name} API key. It goes straight into the editor's secret storage.`,
        placeHolder: chosen === "claude" ? "sk-ant-..." : "AIza...",
      });

      if (!key?.trim()) {
        return;
      }

      await keys.store(chosen, key.trim());
      await TokenCounterPanel.refreshStoredKeys();
      void vscode.window.showInformationMessage(`AI Tokenizer: the ${name} key is stored.`);
    }),

    vscode.commands.registerCommand("aiTokenizer.clearApiKeys", async () => {
      await keys.clearAll();
      await forgetSendingConsent(context);
      await TokenCounterPanel.refreshStoredKeys();
      void vscode.window.showInformationMessage("AI Tokenizer: stored API keys removed.");
    })
  );
}

export function deactivate(): void {}

async function pickProvider(): Promise<KeyedProviderId | undefined> {
  const picked = await vscode.window.showQuickPick(
    [
      { label: "Claude", description: "Anthropic API key", id: "claude" as const },
      { label: "Gemini", description: "Google AI Studio API key", id: "gemini" as const },
    ],
    { title: "Which key do you want to set?" }
  );

  return picked?.id;
}

