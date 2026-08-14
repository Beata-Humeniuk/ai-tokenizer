import { dom, labelledSpan } from "./dom";

const COLOURS = 5;

let pieces: string[] = [];
let ids: number[] = [];
let mode: "text" | "ids" = "text";

export function showBreakdown(nextPieces: string[], nextIds: number[]): void {
  pieces = nextPieces;
  ids = nextIds;
  mode = "text";
  render();
  dom.tokenModeRow.hidden = false;
  dom.tokenView.hidden = false;
}

export function showBreakdownNote(text: string): void {
  dom.tokenModeRow.hidden = true;
  dom.tokenView.hidden = false;
  dom.tokenView.innerHTML = "";
  dom.tokenView.classList.remove("ids");
  dom.tokenView.appendChild(labelledSpan("tok-note", text));
}

export function hideBreakdown(): void {
  dom.tokenModeRow.hidden = true;
  dom.tokenView.hidden = true;
}

export function wireBreakdownModes(): void {
  dom.modeText.addEventListener("click", () => setMode("text"));
  dom.modeIds.addEventListener("click", () => setMode("ids"));
}

function setMode(next: "text" | "ids"): void {
  mode = next;
  render();
}

function render(): void {
  dom.tokenView.innerHTML = "";
  dom.modeText.setAttribute("aria-pressed", String(mode === "text"));
  dom.modeIds.setAttribute("aria-pressed", String(mode === "ids"));

  if (mode === "ids") {
    dom.tokenView.classList.add("ids");
    dom.tokenView.textContent = `[${ids.join(", ")}]`;
    return;
  }

  dom.tokenView.classList.remove("ids");
  const fragment = document.createDocumentFragment();

  pieces.forEach((piece, index) => {
    fragment.appendChild(labelledSpan(`tok tok-${index % COLOURS}`, piece));
  });

  dom.tokenView.appendChild(fragment);
}
