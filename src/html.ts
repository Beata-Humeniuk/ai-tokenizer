import * as vscode from "vscode";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

export function renderPanelHtml(extensionUri: vscode.Uri): string {
  const mediaPath = (fileName: string) =>
    vscode.Uri.joinPath(extensionUri, "media", fileName).fsPath;

  const dataUri = (fileName: string) =>
    `data:image/png;base64,${readFileSync(mediaPath(fileName)).toString("base64")}`;

  const values: Record<string, string> = {
    nonce: randomBytes(24).toString("base64"),
    styles: readFileSync(mediaPath("styles.css"), "utf8"),
    script: readFileSync(mediaPath("webview.js"), "utf8"),
    logo: dataUri("logo.png"),
    logoLight: dataUri("logo-light.png"),
  };

  const template = readFileSync(mediaPath("webview.html"), "utf8");

  return template.replace(/{{(\w+)}}/g, (placeholder, key: string) => values[key] ?? placeholder);
}
