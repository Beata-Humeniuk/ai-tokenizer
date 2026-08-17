# Changelog

All notable, user-visible changes to AI Tokenizer are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project uses [Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-08-17

### Changed

- `README.md` no longer repeats the security policy. "What is sent where" keeps
  the part that decides whether you want the extension at all — GPT is local,
  Claude and Gemini are not — and leaves the CSP directives and the list of
  places nothing is written to `SECURITY.md`. The build commands are gone from
  the readme.

## [1.0.0] - 2026-08-14

First public release: a panel that counts the tokens in a file or in pasted
text for Claude, GPT and Gemini models. GPT is counted on this machine, Claude
and Gemini through their providers' APIs, with a confirmation before anything
is sent. API keys are entered through a masked prompt and kept in the editor's
encrypted secret storage.
