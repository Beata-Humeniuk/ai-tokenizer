const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const dom = {
  pickFile: element<HTMLButtonElement>("pickFile"),
  clear: element<HTMLButtonElement>("clear"),
  fileName: element("fileName"),
  content: element<HTMLTextAreaElement>("content"),
  charCount: element("charCount"),
  wordCount: element("wordCount"),
  provider: element<HTMLSelectElement>("provider"),
  model: element<HTMLSelectElement>("model"),
  customModel: element<HTMLInputElement>("customModel"),
  count: element<HTMLButtonElement>("count"),
  keyStatus: element("keyStatus"),
  keyStatusText: element("keyStatusText"),
  getKey: element<HTMLButtonElement>("getKey"),
  setKey: element<HTMLButtonElement>("setKey"),
  result: element("result"),
  error: element("error"),
  tokenModeRow: element("tokenModeRow"),
  modeText: element<HTMLButtonElement>("modeText"),
  modeIds: element<HTMLButtonElement>("modeIds"),
  tokenView: element("tokenView"),
};

export function addOption(select: HTMLSelectElement, value: string, label: string): void {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

export function labelledSpan(className: string, text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}
