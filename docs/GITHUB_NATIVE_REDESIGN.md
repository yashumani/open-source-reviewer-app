# ForkWise — GitHub-Native Redesign

> Status: Complete and deployed  
> Pull request: `#12`  
> Production commit: `c3dcb6dea4480764688d8209ded7218d299708e9`  
> Live reviewer: <https://yashumani.github.io/open-source-reviewer-app/>

## Design thesis

**Review a repository the way a maintainer navigates one.**

The redesign replaced the generic gradient/glass SaaS presentation with repository-native information architecture:

- global bar and repository context;
- repository tabs;
- README-style product overview;
- adoption-check composer;
- Actions-style analysis progress;
- checks-style recommendation summary;
- issue-like findings;
- review ledger for README claims;
- file and metadata evidence;
- About-style supporting details;
- Actions-style runner operations.

ForkWise remains distinct through its branch/check mark, warm review accent, purple evidence treatment, and Adopt/Pilot/Fork/Avoid decision vocabulary.

## Visual system

- GitHub-style neutral canvases and restrained borders.
- Repository blue for navigation and links.
- Amber for active review and Pilot.
- Green for supported checks and Adopt.
- Purple for evidence and Fork.
- Red for blockers and Avoid.
- System UI typography with monospace identifiers.
- Compact 6–10 px radii and denser technical rows.
- No ambient marketing gradients or backdrop-filter glass panels.

## Responsive behavior

The reviewer is validated at 1440, 768, 390, and 320 pixels. The operator console is validated at 1440 and 390 pixels. Repository tabs and dimension tracks scroll inside their own containers; long names, paths, and SHAs wrap without page-level overflow.

## Accessibility and safety

- Semantic landmarks and heading order preserved.
- Visible keyboard focus and reduced-motion support.
- Status text remains alongside color.
- Repository-controlled content continues to use text nodes rather than `innerHTML`.
- Static-only analysis and dormant hosted-runner gating remain unchanged.

## Evidence

See [`GITHUB_NATIVE_REDESIGN_EVIDENCE.md`](GITHUB_NATIVE_REDESIGN_EVIDENCE.md) for workflow IDs, viewport results, screenshot artifact, merge, and Pages deployment evidence.
