# Security Policy

## Supported versions

Only the latest published version of AI Tokenizer receives security fixes.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository
(Security → Report a vulnerability). Do not disclose vulnerability details in a
public issue. If private reporting is unavailable, open a public issue asking
for a private channel, without including technical or sensitive details.

When reporting:

- Do **not** include a real API key, a real prompt, customer data or any other
  confidential text in an issue or a report.
- Reproduce the problem with synthetic content and, if a key is needed to show
  the behaviour, describe the step rather than pasting the key.
- You will never be asked to send a real key by email or through any other
  channel. If a key has already been exposed, revoke it at the provider first.

## Scope notes

AI Tokenizer counts GPT tokens locally and calls the Anthropic and Google APIs
to count Claude and Gemini tokens. Those two calls send the loaded text and the
matching key to the provider, which is the documented purpose of the feature and
is confirmed by the user once per provider — that behaviour on its own is not a
vulnerability.

In scope, and welcome:

- a key reaching `settings.json`, a log, an error message, the panel, a crash
  report or any file on disk instead of staying in the editor's secret storage;
- text being sent to a provider without the confirmation having been given, or
  after it was declined;
- any network request to a destination other than the Anthropic and Google
  endpoints the panel is counting against;
- content loaded into the panel being written to disk, to settings or to
  workspace state;
- content from a loaded file being able to run code in the panel or reach
  outside it;
- the panel closing an editor tab it should have left alone — one with unsaved
  changes, one opened for reading, or one that was already open before the
  panel took a file over.
