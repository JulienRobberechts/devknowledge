# ADR-006 — Document Parser Port in infra-ports

**Date**: 2026-06-27
**Status**: Accepted

## Context

`IDocumentParserPort` defines a `parse(buffer, fileName) → { text, metadata }` interface used by the application layer to extract text from uploaded files. Its concrete implementations (`MarkdownParser`, `PdfParser`, `TextParser`, `MultiFileParser`) rely on third-party parsing libraries (`marked`, `pdf-parse`) and perform local filesystem I/O (e.g. temp file writes in `PdfParser`).

The question arose when reviewing test levels: if the interface is pure (takes a `Buffer`, returns plain data, no external system involved), it has the profile of an application service port (`app-ports`) rather than an infrastructure port (`infra-ports`).

## Options Considered

- **`infra-ports`** (current) — the port lives alongside other driven-adapter interfaces (DB repos, file storage, AI clients). Reflects the fact that implementations depend on third-party libraries and local I/O. Consistent with the rule that `app` must not import from `infra` directly.
- **`app-ports`** — the port moves to the application layer, since the interface itself is pure and implies no external system. Implementations would still live in `infra/` and implement an app-layer interface.

## Decision

Keep `IDocumentParserPort` in `infra-ports`. The deciding criterion is the nature of the *implementations*, not just the interface signature: all concrete parsers depend on third-party libraries and/or local I/O, which is infrastructure-adjacent. Moving the port to `app-ports` would be architecturally defensible but would introduce an asymmetry where a port used exclusively by infra implementations lives in the app layer.

## Consequences

- The interface remains grouped with other outbound ports, which is consistent with the existing codebase conventions.
- Tests for parser implementations are classified as `u-infra` (pure, in-memory buffer input) rather than `1-infra`, because the interface itself requires no container or external service. This is an accepted exception: `u-infra` is appropriate when the adapter's core value is a local transformation, even if it lives in `infra-ports`.
- If a future parser implementation requires a real external service (e.g. a remote OCR API), a `1-infra` test suite should be added for that implementation alongside the existing `u-infra` tests.
