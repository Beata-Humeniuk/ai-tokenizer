declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const editor = acquireVsCodeApi();

export function post(message: unknown): void {
  editor.postMessage(message);
}

export const numberFormat = new Intl.NumberFormat("en-US");
