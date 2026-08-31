# ForkWise Repository Settings Manifest

These GitHub settings cannot be enforced from source files alone. A repository administrator should apply and verify them.

## About panel

- Description: `Evidence-first adoption review for public GitHub repositories — claims, findings, operations, and commit-pinned proof.`
- Website: `https://yashumani.github.io/open-source-reviewer-app/`
- Topics:
  - `open-source`
  - `github`
  - `repository-analysis`
  - `static-analysis`
  - `software-supply-chain`
  - `developer-tools`
  - `security`
  - `code-quality`
  - `due-diligence`
  - `javascript`

## Features

- Issues: enabled.
- Discussions: recommended for broad ideas and community Q&A after moderation ownership is confirmed.
- Private vulnerability reporting: enable before a public contribution campaign.
- Preserve Issues for actionable, reproducible work.

## Merge settings

- Prefer squash merge for community contributions.
- Enable automatic head-branch deletion after merge.
- Allow contributors to update pull-request branches.
- Require DCO sign-off through contribution policy or an approved check if one is added.

## Main branch protection

Target `main` and:

- require a pull request before merging;
- require the branch to be up to date;
- require conversation resolution;
- block force pushes and deletion;
- apply protections to administrators with owner-only emergency bypass;
- require one approval when an independent reviewer is available;
- require these checks:
  - `Quality / validate`
  - `Visual Redesign / github-native-ui` for UI-affecting changes if GitHub supports conditional policy; otherwise require globally while the workflow remains lightweight
  - `Runner Contract and Hosted Health / Local request-bound lifecycle`
  - `Runner Contract and Hosted Health / Published runner health contract`
  - `Database Contract / postgres-contract`
  - `Container Contract / non-root-static-runner`

Do not require the opt-in hosted full-lifecycle check until issue #3 is complete.

## Verification

1. Confirm the repository About panel shows the description, website, and topics.
2. Confirm private vulnerability reporting opens successfully.
3. Open a documentation-only test pull request.
4. Confirm direct merge is blocked until required checks pass.
5. Confirm force push and branch deletion are denied.
6. Record settings evidence in issue #11 and `docs/DEVELOPMENT_PLAN.md`.
