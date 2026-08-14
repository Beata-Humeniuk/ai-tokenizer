import * as vscode from "vscode";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { KEY_PAGES, MODEL_NOTES, PROVIDERS, isProviderId, type ProviderId } from "./providers";
import type { CountResult } from "./countResult";
import { countGptTokens } from "./gptCounter";
import { countClaudeTokens, countGeminiTokens } from "./remoteCounters";
import { confirmSendingContent } from "./consent";
import { ApiKeyStore, type KeyedProviderId } from "./secrets";
import { activeDocument } from "./activeDocument";
import { EditorTakeover } from "./editorTakeover";
import { renderPanelHtml } from "./html";

const VIEW_TYPE = "aiTokenizer.panel";
const PANEL_TITLE = "AI Tokenizer";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class TokenCounterPanel {
  private static instance: TokenCounterPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private readonly keys: ApiKeyStore
  ) {
    this.panel.webview.html = renderPanelHtml(this.context.extensionUri);

    const takeover = new EditorTakeover(this.panel, (document) => this.loadDocument(document));

    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((message) => void this.handleMessage(message)),
      ...takeover.watch(),
      this.panel.onDidDispose(() => this.dispose())
    );
  }

  static show(
    context: vscode.ExtensionContext,
    keys: ApiKeyStore,
    resource?: vscode.Uri
  ): TokenCounterPanel {
    if (TokenCounterPanel.instance) {
      TokenCounterPanel.instance.panel.reveal(undefined, true);
    } else {
      const panel = vscode.window.createWebviewPanel(
        VIEW_TYPE,
        PANEL_TITLE,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [],
        }
      );
      panel.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "panel-icon.png");
      TokenCounterPanel.instance = new TokenCounterPanel(panel, context, keys);
    }

    const instance = TokenCounterPanel.instance;
    if (resource) {
      void instance.loadFile(resource);
    } else {
      const document = activeDocument();
      if (document) {
        instance.loadDocument(document);
      }
    }
    return instance;
  }

  static async refreshStoredKeys(): Promise<void> {
    await TokenCounterPanel.instance?.postStoredKeys();
  }

  private dispose(): void {
    TokenCounterPanel.instance = undefined;
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private post(message: unknown): void {
    void this.panel.webview.postMessage(message);
  }

  private async postStoredKeys(): Promise<void> {
    this.post({ type: "storedKeys", storedKeys: await this.keys.storedKeys() });
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message?.type) {
      case "ready":
        this.post({
          type: "init",
          providers: PROVIDERS,
          modelNotes: MODEL_NOTES,
          storedKeys: await this.keys.storedKeys(),
        });
        return;

      case "pickFile":
        await this.pickFile();
        return;

      case "openKeyPage": {
        const page = KEY_PAGES[message.provider as KeyedProviderId];
        if (page) {
          await vscode.env.openExternal(vscode.Uri.parse(page));
        }
        return;
      }

      case "setKey":
        await vscode.commands.executeCommand("aiTokenizer.setApiKey", message.provider);
        return;

      case "count":
        await this.count(message.provider, message.model, message.text);
        return;
    }
  }

  private async pickFile(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Load",
      filters: { "Text and Markdown": ["md", "markdown", "txt"], "All files": ["*"] },
    });

    if (picked?.[0]) {
      await this.loadFile(picked[0]);
    }
  }

  loadDocument(document: vscode.TextDocument): void {
    const content = document.getText();
    const size = Buffer.byteLength(content, "utf8");

    if (size > MAX_FILE_BYTES) {
      this.post({ type: "error", message: tooLargeMessage(size) });
      return;
    }

    this.post({ type: "fileLoaded", fileName: basename(document.fileName), content });
  }

  private async loadFile(resource: vscode.Uri): Promise<void> {
    try {
      const { size } = await stat(resource.fsPath);
      if (size > MAX_FILE_BYTES) {
        this.post({ type: "error", message: tooLargeMessage(size) });
        return;
      }

      this.post({
        type: "fileLoaded",
        fileName: basename(resource.fsPath),
        content: await readFile(resource.fsPath, "utf8"),
      });
    } catch {
      this.post({ type: "error", message: "That file could not be read." });
    }
  }

  private async count(provider: unknown, model: unknown, text: unknown): Promise<void> {
    if (!isProviderId(provider) || typeof model !== "string" || typeof text !== "string") {
      this.post({ type: "error", message: "The panel sent an unexpected request." });
      return;
    }

    if (!model.trim()) {
      this.post({ type: "error", message: "Choose a model first." });
      return;
    }

    if (!text.trim()) {
      this.post({ type: "error", message: "There is nothing to count yet." });
      return;
    }

    this.post({ type: "counting" });

    const result =
      provider === "gpt"
        ? await countGptTokens(text, model)
        : await this.countRemotely(provider, model, text);

    if (!result) {
      this.post({ type: "cancelled" });
      return;
    }

    this.postResult(provider, model, result);
  }

  private async countRemotely(
    provider: KeyedProviderId,
    model: string,
    text: string
  ): Promise<CountResult | undefined> {
    const apiKey = await this.keys.read(provider);

    if (!apiKey) {
      return {
        ok: false,
        error: `No ${providerTitle(provider)} key is stored yet.`,
        keyProblem: true,
      };
    }

    if (!(await confirmSendingContent(this.context, provider))) {
      return undefined;
    }

    const options = { apiKey, model, text };
    return provider === "claude" ? countClaudeTokens(options) : countGeminiTokens(options);
  }

  private postResult(provider: ProviderId, model: string, result: CountResult): void {
    if (!result.ok) {
      this.post({
        type: "error",
        message: result.error,
        keyProblem: result.keyProblem === true,
        provider,
      });
      return;
    }

    const modelNote = MODEL_NOTES[model];
    const notes = [result.note, modelNote ? `${model}: ${modelNote}.` : undefined].filter(Boolean);

    this.post({
      type: "result",
      provider,
      model,
      tokens: result.tokens,
      pieces: result.breakdown?.pieces,
      ids: result.breakdown?.ids,
      note: notes.length ? notes.join(" ") : undefined,
    });
  }
}

function providerTitle(provider: KeyedProviderId): string {
  return provider === "claude" ? "Claude" : "Gemini";
}

function tooLargeMessage(bytes: number): string {
  return (
    `That file is ${formatMegabytes(bytes)} MB. Files above ${formatMegabytes(MAX_FILE_BYTES)} MB ` +
    `are not loaded, because counting them would freeze the panel.`
  );
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
