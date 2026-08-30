# Architecture

## Current release architecture

ForkWise v0.3 is a zero-build, dependency-free browser application designed for GitHub Pages.

```text
User context
    │
    ▼
GitHub URL parser ───── rejects unsupported hosts/forms
    │
    ▼
Read-only GitHub client
    ├── repository metadata
    ├── default-branch commit
    ├── recursive tree
    ├── bounded high-value blobs
    ├── README pinned to commit
    └── latest release (optional)
    │
    ▼
Artifact inventory + deterministic analyzers
    ├── Fit
    ├── Trust
    ├── Run
    ├── Own
    ├── Exit
    └── README claim ledger
    │
    ▼
Normalized assessment schema
    ├── decision + confidence
    ├── findings
    ├── evidence
    ├── operational inventory
    ├── unresolved questions
    └── pilot checklist
    │
    ├───────────────┬─────────────────┐
    ▼               ▼                 ▼
Responsive UI    JSON export      Markdown export
```

## Module boundaries

### `src/github.js`

Owns public GitHub URL normalization, API error translation, default-branch commit pinning, recursive tree retrieval, selected blob retrieval, and optional README/release retrieval. It does not interpret adoption quality.

### `src/inventory.js`

Classifies paths into stable artifact families and ranks which text files are worth reading. The selector is bounded by count and file size.

### `src/schema.js`

Defines report versions, decision/dimension enums, context normalization, evidence/finding constructors, report validation, and credential redaction.

### `src/analyzer.js`

Consumes a repository snapshot plus user context. It emits deterministic findings, evidence, claims, operational inventory, five dimension summaries, and a contextual recommendation. It never performs network calls or DOM rendering.

### `src/app.js`

Orchestrates progress, input/error states, analysis, safe DOM rendering, filters, clipboard behavior, and exports. Repository text is assigned through `textContent`/text nodes.

### `src/export.js`

Validates and re-redacts the complete report before serializing JSON or Markdown.

## Reproducibility

A report records:

- repository owner/name;
- default branch;
- exact commit SHA and commit URL;
- analyzer version;
- report schema version;
- generation time;
- normalized user context;
- evidence IDs and URLs.

## Browser constraints

The preview deliberately trades depth for safety and immediate deployability:

- GitHub's anonymous API rate limit can interrupt analysis.
- A recursive tree may be truncated for very large repositories.
- Only a bounded set of high-priority text blobs is read.
- Cross-origin browser rules and unauthenticated requests limit available provider data.

The production transition preserves the report schema while moving acquisition and parsing to isolated backend workers. See [`BACKEND_TRANSITION.md`](BACKEND_TRANSITION.md).
