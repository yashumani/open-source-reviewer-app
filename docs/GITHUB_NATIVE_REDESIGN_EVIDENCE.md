# ForkWise — GitHub-Native Redesign Evidence

> Candidate version: `0.8.0`  
> Pull request: `#12`  
> Validated branch commit: `f131c13efe78fed33c8e02341c4e43e617d3b19e`  
> Status: branch implementation and responsive visual gate passed; merge and live Pages validation remain

## Design outcome

The reviewer now uses repository-native navigation and information patterns instead of the previous generic gradient/glass SaaS presentation.

| Product information | GitHub-oriented presentation |
| --- | --- |
| Application context | Global bar plus repository context bar |
| Main navigation | Repository tabs |
| Product explanation | README-style file panel |
| Review intake | Adoption-check / issue-composer surface |
| Analysis progress | Workflow-run stages |
| Final recommendation | Checks-style summary |
| Findings | Issue rows with severity and blocking labels |
| README claims | Review ledger |
| Evidence | File and metadata rows with commit links |
| Operational inventory | Repository environment metadata |
| Pilot tasks | Merge-readiness checklist |
| Runner operations | Actions-style control plane |

ForkWise remains visually distinct through its branch/check mark, warm review accent, purple evidence treatment, and contextual decision language.

## Files changed

- `index.html`
- `styles.css`
- `operator.html`
- `operator.css`
- `assets/mark.svg`
- `manifest.webmanifest`
- `package.json`
- `scripts/validate-static.mjs`
- `scripts/ui_redesign_validation.py`
- `.github/workflows/visual-redesign.yml`
- `docs/GITHUB_NATIVE_REDESIGN.md`

## Functional preservation

The redesign retains the existing application contract:

- all reviewer and operator element IDs used by JavaScript and tests;
- public GitHub URL input and contextual intake;
- embedded sample review;
- Adopt / Pilot / Fork / Avoid / Insufficient evidence decisions;
- Fit / Trust / Run / Own / Exit dimensions;
- README Reality Check;
- findings search and filters;
- operational inventory;
- file-level evidence;
- pilot checklist;
- JSON and Markdown exports;
- runner health and statistics;
- operator API smoke-test controls;
- browser-analysis mode while the hosted execution lifecycle remains blocked.

## Static design contract

`npm run check:static` now verifies:

- repository chrome and tabs exist on the reviewer;
- README-style overview exists;
- repository chrome and Actions tabs exist on the operator console;
- semantic repository tokens exist in both design systems;
- required responsive breakpoints remain;
- visible focus and reduced-motion support remain;
- glass backdrop filters are absent;
- ambient radial-gradient marketing backgrounds are absent;
- all existing functional IDs and safety checks remain.

## Automated browser evidence

Workflow: **Visual Redesign**  
Run: `33430305189`  
Artifact: `9772329835 — github-native-redesign-evidence`  
Artifact digest: `sha256:8c0ffc73523ae1d550f6ab56798d829980f7860cfc6e2d5a0133abd660c58d18`

### Reviewer viewports

| Viewport | Overflow | Decision | Dimensions | Findings | Evidence | Claims | Console errors |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1440 × 1000 | 0 px | Pilot | 5 | 18 | 21 | 6 | 0 |
| 768 × 1024 | 0 px | Pilot | 5 | 18 | 21 | 6 | 0 |
| 390 × 844 | 0 px | Pilot | 5 | 18 | 21 | 6 | 0 |
| 320 × 720 | 0 px | Pilot | 5 | 18 | 21 | 6 | 0 |

### Operator viewports

| Viewport | Overflow | Health state | Execution | Endpoint rows | Console errors |
| --- | ---: | --- | --- | ---: | ---: |
| 1440 × 1000 | 0 px | Operational | static-only | 5 | 0 |
| 390 × 844 | 0 px | Operational | static-only | 5 | 0 |

The operator test uses deterministic mocked health and aggregate statistics so visual validation does not mutate production jobs or depend on the known queued-job lifecycle blocker.

Machine-readable results are stored in [`validation/github-native-redesign.json`](validation/github-native-redesign.json).

## Manual screenshot review

The branch artifact contains:

- reviewer landing — desktop;
- reviewer landing — mobile;
- reviewer report — desktop;
- reviewer report — tablet;
- reviewer report — mobile;
- reviewer report — small mobile;
- operator console — desktop;
- operator console — mobile.

Manual review confirmed:

- clear repository hierarchy before the intake form;
- a balanced README/composer layout on desktop;
- a readable stacked intake on mobile;
- decision, provenance, and first blockers visible before detailed evidence;
- horizontal navigation isolated to tab/dimension containers rather than the page;
- issue rows, file evidence, and metadata remain scannable;
- the operator console reads as an Actions control surface;
- no unintended floating glass panels or generic AI glow effects.

## Remaining release gates

1. Record the final pull-request Quality and Visual Redesign runs.
2. Merge pull request #12.
3. Verify Quality, Visual Redesign, and Pages on the merge commit.
4. Inspect the deployed reviewer and operator on desktop and mobile.
5. Record the live commit and workflow IDs.

The redesign does not change the hosted-runner release status: the public reviewer remains in browser-analysis mode until the separate Lovable lifecycle deployment is completed and proven.
