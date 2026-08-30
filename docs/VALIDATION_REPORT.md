# Validation Report — v0.3 Release Candidate

> Validation date: 2026-08-30  
> Result: **Passed locally**  
> Deployment status: pending GitHub Actions result for the release commit

## Automated gate

Command:

```bash
npm run validate
```

Results:

- JavaScript syntax: **passed**, 16 files checked.
- Static HTML/CSS/security validation: **passed**.
- HTML IDs: **68 unique IDs**, no duplicates.
- Local assets: **5 checked**.
- Automated tests: **49 passed, 0 failed**.
- Production bundle: **created successfully in `dist/`**.

Test coverage includes:

- valid and invalid GitHub URL forms;
- exact commit/tree/content pinning;
- optional release handling, not-found, and rate-limit errors;
- artifact classification and bounded content selection;
- all five dimensions and contextual decision changes;
- Adopt/Pilot/Fork/Avoid/Insufficient-evidence boundaries;
- license, archive, deployment, security-policy, external-service, test/CI, portability, and maintenance rules;
- README claim states;
- tree-truncation coverage caps;
- secret detection/redaction, including exports;
- schema evidence-reference integrity;
- JSON and Markdown provenance.

## Browser validation

The application was loaded in headless system Chromium using fully local HTML, CSS, and ES modules. The embedded sample review exercises the same analyzer and renderer used for live public repositories.

| Viewport | Decision | Dimensions | Findings | Evidence | Claims | Horizontal overflow | Console/page errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440×1000 desktop | Pilot | 5 | 18 | 21 | 6 | 0 px | 0 |
| 768×1024 tablet | Pilot | 5 | 18 | 21 | 6 | 0 px | 0 |
| 390×844 mobile | Pilot | 5 | 18 | 21 | 6 | 0 px | 0 |
| 320×720 small mobile | Pilot | 5 | 18 | 21 | 6 | 0 px | 0 |

Additional browser checks passed at every viewport:

- landing and report rendering;
- severity and search filters;
- empty-filter state;
- JSON download filename generation;
- invalid GitLab-host recovery;
- visible keyboard focus;
- responsive report navigation and long-path containment.

Machine-readable evidence: [`validation/ui-validation.json`](validation/ui-validation.json).

## Visual evidence

The Chromium harness generated full-page captures for the landing and report states at every required viewport during local validation. The generated image files are intentionally git-ignored to keep the repository lightweight; their paths, viewport sizes, UI metrics, and test outcomes are recorded in [`validation/ui-validation.json`](validation/ui-validation.json). Re-running `python scripts/ui_validation.py` regenerates the captures under `docs/screenshots/`.

## Local HTTP smoke test

The production `dist/` bundle is served through `scripts/serve.mjs`. The final release cycle records the HTTP 200 result and deployed Pages URL after the repository commit.

## Known limitations

- The browser test uses the embedded sample, avoiding external-network variability.
- Live GitHub reviews remain subject to anonymous API limits and provider availability.
- Browser validation is not a substitute for screen-reader testing with assistive-technology users.
- Static analysis does not validate runtime behavior.
