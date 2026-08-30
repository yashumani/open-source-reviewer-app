# Contributing

## Development rules

1. Preserve the static-analysis/no-execution security boundary.
2. Keep repository facts separate from contextual interpretation.
3. Add deterministic tests for every new rule or decision boundary.
4. Use text nodes/`textContent` for repository-controlled data; do not add `innerHTML` rendering.
5. Keep evidence references valid and commit-pinned.
6. Do not infer coverage percentages or runtime behavior without explicit evidence.
7. Validate desktop, tablet, mobile, and small-mobile layouts for UI changes.
8. Update the master plan and validation report when a step's evidence changes.

## Validation

```bash
npm run validate
python scripts/ui_validation.py   # when Playwright + Chromium are available
```

The CI workflow runs the dependency-free `npm run validate` gate.
