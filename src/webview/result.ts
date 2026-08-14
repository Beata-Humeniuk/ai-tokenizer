import { dom, labelledSpan } from "./dom";
import { numberFormat, post } from "./messages";
import { hideBreakdown, showBreakdown, showBreakdownNote } from "./breakdown";

const NO_BREAKDOWN_NOTE =
  "This provider's API returns the number of tokens only, so there is no per-token breakdown to colour. GPT models show one.";

export function clearError(): void {
  dom.error.textContent = "";
  dom.error.style.display = "none";
}

export function showError(message: string, keyProblemFor?: string): void {
  dom.error.textContent = message;
  dom.error.style.display = "block";
  dom.result.classList.remove("loading");

  if (!keyProblemFor) {
    return;
  }

  const actions = document.createElement("span");
  actions.className = "error-actions";
  actions.append(
    actionLink("Paste a key", () => post({ type: "setKey", provider: keyProblemFor })),
    actionLink("Get a key", () => post({ type: "openKeyPage", provider: keyProblemFor }))
  );
  dom.error.appendChild(actions);
}

export function showCounting(): void {
  clearError();
  dom.result.textContent = "Counting...";
  dom.result.classList.add("loading");
  hideBreakdown();
}

export function showNothingSent(): void {
  dom.result.classList.remove("loading");
  dom.result.textContent = "Nothing was sent.";
  hideBreakdown();
}

export function clearResult(): void {
  dom.result.textContent = "";
  dom.result.classList.remove("loading");
  hideBreakdown();
}

export function showResult(message: any): void {
  clearError();
  dom.result.classList.remove("loading");
  dom.result.textContent = "";

  const tokens = Number(message.tokens);
  dom.result.append(
    labelledSpan("tokens", numberFormat.format(tokens)),
    document.createTextNode(tokens === 1 ? " token" : " tokens"),
    labelledSpan("model", `${message.provider} / ${message.model}`)
  );

  if (message.note) {
    dom.result.appendChild(labelledSpan("tok-note", message.note));
  }

  if (Array.isArray(message.pieces)) {
    showBreakdown(message.pieces, Array.isArray(message.ids) ? message.ids : []);
    return;
  }

  showBreakdownNote(NO_BREAKDOWN_NOTE);
}

function actionLink(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "link";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}
