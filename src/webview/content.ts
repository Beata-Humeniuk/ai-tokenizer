import { dom } from "./dom";
import { numberFormat, post } from "./messages";
import { clearError, clearResult, showError } from "./result";

export function setContent(text: string, fileName?: string): void {
  dom.content.value = text;
  dom.fileName.textContent = fileName ? `Loaded: ${fileName}` : "";
  showLocalStats();
  clearError();
  clearResult();
}

export function contentText(): string {
  return dom.content.value;
}

export function wireContent(): void {
  dom.content.addEventListener("input", showLocalStats);
  dom.pickFile.addEventListener("click", () => post({ type: "pickFile" }));
  dom.clear.addEventListener("click", () => {
    setContent("");
    dom.content.focus();
  });

  window.addEventListener("drop", (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      readDroppedFile(file);
    }
  });

  showLocalStats();
}

function showLocalStats(): void {
  const text = dom.content.value;
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  dom.charCount.textContent = `${numberFormat.format(text.length)} characters`;
  dom.wordCount.textContent = `${numberFormat.format(words)} words`;
}

function readDroppedFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => setContent(String(reader.result || ""), file.name);
  reader.onerror = () => showError("That dropped file could not be read.");
  reader.readAsText(file);
}
