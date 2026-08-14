import * as vscode from "vscode";

let lastActiveDocument: vscode.TextDocument | undefined;

export function trackActiveDocument(): vscode.Disposable {
  lastActiveDocument = vscode.window.activeTextEditor?.document;

  return vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      lastActiveDocument = editor.document;
    }
  });
}

export function activeDocument(): vscode.TextDocument | undefined {
  const document = vscode.window.activeTextEditor?.document ?? lastActiveDocument;
  return document && !document.isClosed ? document : undefined;
}
