import * as vscode from "vscode";

const JUST_OPENED_MS = 3000;
const SETTLE_MS = 1500;

export class EditorTakeover {
  private readonly openedAt = new Map<string, number>();

  private settlingUntil = 0;

  constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly load: (document: vscode.TextDocument) => void
  ) {}

  watch(): vscode.Disposable[] {
    return [
      vscode.workspace.onDidOpenTextDocument((document) => {
        this.openedAt.set(document.uri.toString(), Date.now());
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && Date.now() >= this.settlingUntil) {
          void this.take(editor);
        }
      }),
    ];
  }

  private async take(editor: vscode.TextEditor): Promise<void> {
    this.load(editor.document);

    if (this.wasJustOpened(editor.document)) {
      this.settlingUntil = Date.now() + SETTLE_MS;

      if (await this.closeTabOf(editor.document)) {
        this.settlingUntil = Date.now() + SETTLE_MS;
        this.panel.reveal(this.panel.viewColumn, true);
        return;
      }
    }

    this.keepVisibleNextTo(editor);
  }

  private wasJustOpened(document: vscode.TextDocument): boolean {
    const openedAt = this.openedAt.get(document.uri.toString());
    return openedAt !== undefined && Date.now() - openedAt < JUST_OPENED_MS;
  }

  private async closeTabOf(document: vscode.TextDocument): Promise<boolean> {
    if (document.isDirty || document.isUntitled) {
      return false;
    }

    const tab = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .find(
        (candidate) =>
          candidate.input instanceof vscode.TabInputText &&
          candidate.input.uri.toString() === document.uri.toString()
      );

    if (!tab || tab.isPreview) {
      return false;
    }

    return vscode.window.tabGroups.close(tab, true);
  }

  private keepVisibleNextTo(editor: vscode.TextEditor): void {
    const column = this.panel.viewColumn;

    if (this.panel.visible && column !== editor.viewColumn) {
      return;
    }

    const alreadyFarRight = column !== undefined && column >= vscode.ViewColumn.Three;
    this.panel.reveal(alreadyFarRight ? column : vscode.ViewColumn.Beside, true);
  }
}
