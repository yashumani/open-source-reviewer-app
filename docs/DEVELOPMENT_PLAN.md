# Open Source Reviewer — Development Plan and Execution Log

> **Status:** Community crowdsourcing-readiness implementation is on `feat/community-crowdsourcing-readiness`  
> **Working method:** feature branch → pull request → GitHub Actions → merge → Pages deploy  
> **Current checkpoint:** Steps 51–54 implemented; validation, starter issues, and administrator settings remain  
> **Last updated:** 2026-08-31

The master execution board is maintained in [`MASTER_DEVELOPMENT_PLAN.md`](MASTER_DEVELOPMENT_PLAN.md).

## Current objective

Release ForkWise as a clearly labeled **Community Preview** for public product testing and scoped open-source contributions while keeping hosted analysis and production/general-availability claims behind their existing release gates.

## Development cycle — Community crowdsourcing readiness

### Implemented on the feature branch

1. **License and attribution**
   - Apache License 2.0.
   - NOTICE.
   - Package license metadata.
   - License decision ADR.
2. **Community governance**
   - Contributor Covenant-based Code of Conduct.
   - Governance and maintainer guides.
   - Support policy.
   - DCO commit sign-off process.
3. **Preview policies**
   - Privacy Notice describing browser-side GitHub API access.
   - Community Preview Terms.
   - Acceptable Use Policy.
   - Actionable private security-reporting URL and safe fallback.
4. **Contribution intake**
   - CODEOWNERS.
   - Pull-request template.
   - Issue forms for bugs, features, analyzer rules, false positives, false negatives, and documentation.
   - Blank issues disabled with security/support contact links.
5. **Validation**
   - `scripts/validate-community.mjs`.
   - Community-readiness regression tests.
   - `npm run check:community` integrated into `npm run validate`.
6. **Release documentation**
   - Community Preview guide.
   - Repository settings manifest.
   - Version `0.9.0` README and changelog.
   - Corrected GitHub-native redesign status and production evidence.
   - Separate community, hosted beta, and production checklists.

### Validation gate

Before merge:

- [ ] Quality workflow passes with the new community validator and tests.
- [ ] Existing Visual Redesign workflow remains green.
- [ ] Runner, database, and container contracts remain green.
- [ ] Package version and Apache-2.0 metadata are consistent.
- [ ] All issue forms render through GitHub.
- [ ] No security or hosted-runtime boundary changes are introduced.

### Post-merge actions

- [ ] Verify all `main` workflows.
- [ ] Verify Pages deployment.
- [ ] Close issue #8 after confirming GitHub recognizes the license.
- [ ] Update issue #9 with the published preview policies while keeping hosted legal approval open.
- [ ] Create 10–15 scoped contributor issues.
- [ ] Apply existing GitHub labels to the starter backlog.
- [ ] Record the community-preview release commit and workflow IDs.

## Administrator-only repository settings

The connected automation can read but cannot modify branch protection, About metadata, topics, Discussions, or private vulnerability reporting. The exact desired settings are in [`REPOSITORY_SETTINGS.md`](REPOSITORY_SETTINGS.md) and issue #11.

Required administrator actions:

1. Set repository description, website, and topics.
2. Enable private vulnerability reporting.
3. Protect `main` with required pull-request checks.
4. Block force pushes and branch deletion.
5. Prefer squash merge and delete merged branches.
6. Optionally enable Discussions after moderation ownership is confirmed.

These settings do not block public product testing, but `main` protection and private vulnerability reporting should be completed before a broad contribution campaign.

## Hosted development remains separate

The next hosted product cycle remains issue #3:

1. apply the prepared database migration;
2. remove fire-and-forget execution;
3. claim and await bounded analysis with a lease token;
4. pass the full hosted lifecycle;
5. activate the reviewer only through issue #4.

No community-readiness change enables hosted mode or weakens the static-only boundary.

## Decision log additions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-31 | Use Apache License 2.0 | Commercially permissive developer-tool license with an explicit patent grant. |
| 2026-08-31 | Use DCO sign-off rather than a CLA during preview | Lower contributor friction while preserving contribution provenance. |
| 2026-08-31 | Separate community preview from hosted beta and GA | Public feedback can begin without overstating the blocked hosted lifecycle. |
| 2026-08-31 | Use structured issue forms | Improve reproductions, evidence quality, and contributor routing. |
| 2026-08-31 | Keep administrator settings as an explicit manifest | Source automation cannot safely or currently change those repository controls. |
