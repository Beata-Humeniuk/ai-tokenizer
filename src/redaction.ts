const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]+/g,
  /sk-[A-Za-z0-9]{16,}/g,
  /AIza[A-Za-z0-9_-]{10,}/g,
  /([?&](?:key|api_key|apikey|access_token)=)[^&\s]+/gi,
];

const REDACTED = "[redacted]";

export function redactSecrets(text: string): string {
  return SECRET_PATTERNS.reduce(
    (redacted, pattern) =>
      redacted.replace(pattern, (_match, prefix?: string) =>
        prefix ? `${prefix}${REDACTED}` : REDACTED
      ),
    text
  );
}

export function shorten(text: string, limit = 200): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > limit ? `${collapsed.slice(0, limit)}...` : collapsed;
}
