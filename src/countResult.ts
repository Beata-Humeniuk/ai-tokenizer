interface TokenBreakdown {
  pieces: string[];
  ids: number[];
}

export type CountResult =
  | { ok: true; tokens: number; breakdown?: TokenBreakdown; note?: string }
  | { ok: false; error: string; keyProblem?: boolean };
