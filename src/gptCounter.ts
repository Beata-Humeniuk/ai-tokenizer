import { modelToEncodingMap } from "gpt-tokenizer/mapping";
import type { CountResult } from "./countResult";

type EncodingName = "o200k_base" | "cl100k_base";

interface EncodingChoice {
  encoding: EncodingName;
  knownModel: boolean;
}

interface Encoding {
  encode(text: string): number[];
  decode(ids: number[]): string;
}

const DEFAULT_ENCODING: EncodingName = "o200k_base";
const UNDECODABLE_PIECE = "�";

const knownEncodings = modelToEncodingMap as Record<string, string | undefined>;

export function encodingForModel(model: string): EncodingChoice {
  const mapped = knownEncodings[model.trim()];

  return mapped === "o200k_base" || mapped === "cl100k_base"
    ? { encoding: mapped, knownModel: true }
    : { encoding: DEFAULT_ENCODING, knownModel: false };
}

function approximateCountNote(model: string): string {
  return (
    `gpt-tokenizer has no encoding entry for "${model}", so it was counted with ${DEFAULT_ENCODING}, ` +
    `the encoding used by recent GPT models. Treat the number as an estimate.`
  );
}

async function loadEncoding(name: EncodingName): Promise<Encoding> {
  return name === "o200k_base"
    ? await import("gpt-tokenizer/encoding/o200k_base")
    : await import("gpt-tokenizer/encoding/cl100k_base");
}

export async function countGptTokens(text: string, model: string): Promise<CountResult> {
  const choice = encodingForModel(model);

  try {
    const encoding = await loadEncoding(choice.encoding);
    const ids = encoding.encode(text);
    const pieces = ids.map((id) => {
      try {
        return encoding.decode([id]);
      } catch {
        return UNDECODABLE_PIECE;
      }
    });

    return {
      ok: true,
      tokens: ids.length,
      breakdown: { pieces, ids },
      note: choice.knownModel ? undefined : approximateCountNote(model),
    };
  } catch (error) {
    return { ok: false, error: `Local GPT tokenizer failed: ${describe(error)}` };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
