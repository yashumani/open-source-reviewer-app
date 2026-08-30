# Security Model

## Assets to protect

- User-entered adoption context.
- Browser session integrity.
- GitHub API quota and availability.
- Suspected credentials encountered in repository text.
- Trustworthiness of report provenance and evidence.
- Exported report contents.

## Primary threats

### Arbitrary repository execution

A repository can contain malicious install hooks, tests, Dockerfiles, Makefiles, shell scripts, or workflow definitions. The preview never executes them.

### Repository prompt injection

README/source text can contain instructions intended to control an AI or tool. Repository content is data only. v0.3 does not send repository content to an LLM.

### HTML/script injection

Repository names, descriptions, paths, excerpts, and findings are rendered with DOM text nodes. `innerHTML` assignment is prohibited by the static validation script.

### Credential exposure

The analyzer recognizes common GitHub, OpenAI, AWS, Slack, JWT, and generic key/token/password patterns. Values are redacted before evidence construction and exports are redacted again. Detection is heuristic and cannot guarantee that every secret format is found.

### Unbounded repository content

Selected text is limited to 24 high-value artifacts by default and each selected file must be no larger than 240 KB. Binary extensions are excluded. The recursive tree itself may still be large; the backend phase adds hard archive, file-count, decompression, CPU, and memory limits.

### Misleading certainty

The UI exposes evidence coverage, decision confidence, unsupported claims, unresolved questions, and static-analysis limitations. A truncated tree caps evidence coverage.

## Current controls

- Public `github.com` host allowlist.
- Exact commit pinning.
- Read-only GitHub API operations.
- Bounded text selection.
- No repository code execution.
- No `innerHTML` rendering.
- Suspected-secret redaction.
- Schema validation and unique evidence IDs.
- Evidence references for every material finding/claim.
- No fabricated test-coverage percentage.
- Explicit static-analysis limitation language.
- Unit/regression tests for contextual decisions and redaction.

## Known residual risk

- Static regular expressions can create false positives and false negatives.
- A repository may hide behavior in uninspected files, generated code, binaries, dependencies, or runtime downloads.
- A public URL can change branch contents after a report, although the report's commit-pinned evidence remains stable.
- GitHub metadata does not expose every governance or security control anonymously.
- Browser exports can be copied or shared by the user.

## Future worker requirements

Any backend worker must use safe archive extraction, path traversal protection, symlink policy, archive-bomb limits, disabled outbound network by default, read-only inputs, non-root execution, ephemeral storage, CPU/memory/time limits, and an explicit allowlist before optional runtime execution is ever introduced.
