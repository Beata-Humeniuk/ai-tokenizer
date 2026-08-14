import { wireBreakdownModes } from "./webview/breakdown";
import { contentText, setContent, wireContent } from "./webview/content";
import { dom } from "./webview/dom";
import { post } from "./webview/messages";
import { chosenModel, chosenProvider, showProviders, showStoredKeys, wirePicker } from "./webview/picker";
import { showCounting, showError, showNothingSent, showResult } from "./webview/result";

wireContent();
wirePicker();
wireBreakdownModes();

dom.count.addEventListener("click", () => {
  const model = chosenModel();

  if (!model) {
    showError("Type the model ID you want to count for.");
    dom.customModel.focus();
    return;
  }

  showCounting();
  post({ type: "count", provider: chosenProvider(), model, text: contentText() });
});

window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.type) {
    case "init":
      showProviders(message.providers || [], message.modelNotes || {});
      showStoredKeys(message.storedKeys || {});
      return;

    case "storedKeys":
      showStoredKeys(message.storedKeys || {});
      return;

    case "fileLoaded":
      setContent(message.content, message.fileName);
      return;

    case "counting":
      showCounting();
      return;

    case "result":
      showResult(message);
      return;

    case "cancelled":
      showNothingSent();
      return;

    case "error":
      showError(message.message, message.keyProblem === true ? message.provider : undefined);
      return;
  }
});

post({ type: "ready" });
