# Deployment Checkpoint

GitHub Pages was enabled for the repository on 2026-08-30. This file intentionally triggers a clean Pages workflow run after the earlier rerun produced duplicate `github-pages` artifacts within the same workflow run.

The deployment acceptance gate is:

- Quality workflow succeeds.
- Pages build succeeds.
- Exactly one `github-pages` artifact is uploaded for this run.
- Pages deploy job succeeds.
- Live site responds successfully.
- Desktop and mobile smoke checks pass.
