# ForkWise — GitHub-Native Redesign Plan

> Status: implementation in progress  
> Branch: `feat/github-native-redesign`  
> Scope: public reviewer, report workspace, operator console, responsive behavior, and visual-validation evidence

## Why this redesign

The current interface is functional but reads like a generic dark SaaS landing page: oversized gradient typography, floating glass panels, broad glow effects, and rounded dashboard cards. That language does not reinforce the product's core job—reviewing GitHub repositories with file-level evidence.

The redesign will make the product feel like a purpose-built repository workspace rather than an AI landing page.

## Design thesis

**Review a repository the way a maintainer navigates one.**

ForkWise will use repository-native information architecture:

- repository context before marketing copy;
- compact navigation tabs rather than floating page sections;
- findings presented like actionable issues;
- evidence presented like files and commit references;
- recommendations presented like checks and merge-readiness states;
- operational details presented like repository metadata;
- a denser, calmer visual system optimized for scanning technical information.

The result should feel familiar to GitHub users without copying GitHub pixel-for-pixel. ForkWise keeps its own identity through its branch/check mark, warm review accent, purple evidence accent, and decision-specific state language.

## Visual identity

### Core palette

- **Canvas:** neutral GitHub-style light and dark surfaces.
- **Accent:** repository blue for navigation and links.
- **Review signal:** warm amber for active review and Pilot states.
- **Verified:** green for Adopt, passed checks, and confirmed claims.
- **Evidence:** purple for provenance and README Reality Check.
- **Risk:** red for Avoid, blockers, and critical findings.

Semantic meaning must never rely on color alone; labels, icons, and text remain present.

### Shape and density

- Replace 20–28 px SaaS radii with 6–10 px repository-style radii.
- Replace floating glass shadows with thin borders and restrained elevation.
- Use compact 4 px and 8 px spacing rhythms for technical rows.
- Use monospaced text for commit SHAs, paths, API routes, and branch-like controls.
- Preserve generous whitespace around major decisions, but increase information density inside reports.

### Typography

- System UI stack for fast, native rendering.
- Monospace stack for repository identifiers and evidence paths.
- Smaller, stronger hierarchy rather than very large hero typography.
- Keep reading lines bounded and use labels above values for scanability.

## Reviewer information architecture

### 1. Global repository chrome

The top of the application will have two levels:

1. A compact global bar containing the ForkWise identity, a repository-input shortcut, source/runbook links, and preview status.
2. A repository-context bar showing `forkwise / repository-review` with Review, Workflow, Security, and Actions tabs.

### 2. Intake page

The current hero becomes a repository overview:

- left side styled like a README panel explaining the decision model;
- right side styled like a GitHub issue/review composer;
- repository URL treated as the primary path field;
- intended-use choices treated like repository action options;
- constraints grouped as compact metadata fields;
- sample action presented as a secondary repository action.

### 3. Analysis progress

Progress will resemble a GitHub Actions workflow:

- explicit job rows;
- queued, running, completed, and failed states;
- compact status indicators;
- one primary progress bar;
- no decorative loading orb as the dominant element.

### 4. Report workspace

The report becomes a repository page:

- repository name, source action, branch/commit provenance, and export actions at the top;
- sticky tab navigation under the repository header;
- decision banner styled like a checks summary;
- decision metrics styled like check-run metadata;
- findings styled like issue rows with severity labels;
- README claim ledger styled like a review table;
- evidence styled like a file list with paths and source links;
- right sidebar styled like GitHub's About/metadata column.

### 5. Operator console

The operator console will resemble a GitHub Actions control surface:

- workflow-style page header and status badge;
- recent job states as check-run counters;
- safety boundary as a security policy panel;
- smoke-test form as a manual workflow dispatch form;
- endpoints as a compact route/file list;
- light and dark modes preserved.

## Responsive behavior

### Desktop — 1440 px

- full global and repository navigation;
- two-column intake and report layouts;
- report sidebar remains sticky;
- dense findings/evidence rows remain readable.

### Tablet — 768 px

- repository tabs scroll horizontally;
- intake becomes one column;
- report sidebar moves below primary content or becomes a two-column metadata grid;
- actions wrap without changing priority.

### Mobile — 390 px

- global navigation collapses to essential actions;
- repository context stays visible;
- form choices become stacked rows;
- report metrics use two columns;
- long paths and repository names wrap safely;
- no horizontal page overflow.

### Small mobile — 320 px

- all action groups become one column;
- tabs and dimensions scroll within their own containers;
- touch targets remain at least 40 px tall;
- no truncation of decision state or critical warning text.

## Accessibility requirements

- Preserve semantic landmarks and heading order.
- Preserve all existing IDs used by the application and automated tests.
- Maintain visible `:focus-visible` states.
- Maintain reduced-motion behavior.
- Keep status text in addition to status color.
- Keep long technical strings keyboard-selectable and screen-reader readable.
- Continue rendering repository content through text nodes rather than `innerHTML`.

## Implementation sequence

1. Add this approved redesign plan.
2. Replace the reviewer visual token system.
3. Add repository-style global and contextual navigation.
4. Redesign the intake/README-composer layout.
5. Redesign analysis progress as an Actions-like workflow.
6. Redesign the report header and decision checks summary.
7. Redesign findings, claims, operations, evidence, checklist, and sidebar surfaces.
8. Redesign the operator console as an Actions control plane.
9. Update the ForkWise mark for the branch/check identity.
10. Update static validation for new repository chrome.
11. Extend browser validation to capture reviewer and operator desktop/mobile states.
12. Run syntax, static, contract, unit, database, container, visual, and Pages gates.
13. Review generated screenshots before merge.
14. Merge only after all applicable checks pass.
15. Verify the deployed Pages experience on desktop and mobile.

## Acceptance criteria

- The site no longer reads as a generic gradient/glass AI landing page.
- A GitHub user can immediately recognize repository, issue, check, file, and workflow mental models.
- ForkWise remains visually distinct from GitHub itself.
- No application functionality is removed.
- Existing sample review, filters, exports, evidence links, and operator functions still work.
- Desktop, tablet, mobile, and small-mobile views have no horizontal page overflow.
- Automated browser validation produces reviewer and operator screenshot evidence.
- Quality, visual, database, container, runner, and Pages workflows pass before completion is recorded.
