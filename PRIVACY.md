# ForkWise Community Preview Privacy Notice

_Last updated: 2026-08-31_

This notice describes the public GitHub Pages community preview. It is not a substitute for a jurisdiction-specific privacy policy for a future commercial or generally available hosted service.

## Current reviewer data flow

The public reviewer runs bounded static analysis in your browser. When you submit a public GitHub repository URL, the browser sends requests directly to GitHub's public REST API to retrieve public repository metadata and selected text files. ForkWise does not ask for private-repository credentials and does not intentionally persist review content on a ForkWise server in this mode.

JSON and Markdown exports are generated locally in the browser and downloaded to your device.

GitHub Pages and GitHub's public API may process standard network, security, and service logs under GitHub's own terms and privacy notices.

## Operator console

The operator console reads aggregate health and service-status data from the published runner endpoint. Starting a manual smoke test sends the public repository URL and evaluation context to that runner. The hosted analysis lifecycle is not enabled for normal reviewer traffic during this community preview and is not represented as production-ready.

## Do not submit

Do not submit:

- private repository URLs or content;
- credentials, tokens, keys, or secrets;
- regulated, confidential, or personal data;
- proprietary source excerpts;
- sensitive vulnerability details in public issues.

## Community contributions

GitHub issues, pull requests, discussions, and comments are public unless GitHub explicitly marks the channel private. GitHub account information and submitted content are processed by GitHub according to its policies.

## Retention

The browser reviewer does not intentionally create server-side ForkWise report history. GitHub retains repository activity, issue content, pull requests, workflow logs, and Pages/API service logs according to GitHub's policies. Future hosted analysis will publish a separate, implementation-matched retention notice before activation.

## Your choices

You may stop a browser review, clear local browser state, delete locally exported files, and edit or delete GitHub contributions where GitHub permits. For a project-specific privacy question, open a public issue that contains no sensitive information and request a private contact channel.

## Changes

Material changes will be recorded in the repository and changelog before they take effect.
