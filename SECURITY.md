# ForkWise Security Policy

## Supported scope

ForkWise is currently a community preview. The public reviewer performs bounded static reads of public GitHub repositories and does not execute repository-controlled code.

## Report a vulnerability privately

Use GitHub private vulnerability reporting:

<https://github.com/yashumani/open-source-reviewer-app/security/advisories/new>

Include affected commit or version, impact, reproduction steps, and a minimal proof of concept. Do not include real credentials, private repository content, personal data, or regulated data.

If the private-reporting form is unavailable, open a public issue titled `Private security contact requested` with no vulnerability details. A maintainer will establish a private channel.

Do not open a public issue containing exploit steps, secret values, private repository material, or sensitive logs.

## Response targets

These are best-effort community-preview targets, not a service-level agreement:

- acknowledgment: within 3 business days;
- initial assessment: within 7 business days;
- remediation plan or status update: as soon as impact and scope are understood.

## Disclosure

Please allow reasonable time for validation and remediation before public disclosure. The project will credit reporters who want attribution, unless legal or safety considerations prevent it.

## Security boundary

ForkWise must not run repository-controlled package managers, lifecycle hooks, tests, builds, shell scripts, Makefiles, Dockerfiles, workflows, HTML, JavaScript, binaries, or application code. See [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) for the threat model and known limitations.
