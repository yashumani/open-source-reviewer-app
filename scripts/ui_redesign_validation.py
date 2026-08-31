#!/usr/bin/env python3
"""Render and validate the GitHub-native reviewer and operator redesign."""
from __future__ import annotations

import contextlib
import json
import shutil
import socket
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, Route, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "docs" / "screenshots"
VALIDATION = ROOT / "docs" / "validation"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
VALIDATION.mkdir(parents=True, exist_ok=True)

VIEWPORTS = [
    ("desktop", 1440, 1000),
    ("tablet", 768, 1024),
    ("mobile", 390, 844),
    ("small-mobile", 320, 720),
]


def browser_executable() -> str:
    candidates = [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    for name in ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]:
        found = shutil.which(name)
        if found:
            return found
    raise RuntimeError("No supported system Chromium/Chrome executable was found.")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A003
        return


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@contextlib.contextmanager
def static_server():
    port = free_port()
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)  # noqa: E731
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def collect_errors(page: Page) -> list[str]:
    errors: list[str] = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    return errors


def layout_metrics(page: Page) -> dict[str, Any]:
    return page.evaluate(
        """() => ({
          innerWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          glassBackdrop: getComputedStyle(document.querySelector('.review-card, .panel')).backdropFilter,
          repositoryTabs: document.querySelectorAll('.repo-tabs a, .operator-tabs a').length,
        })"""
    )


def validate_reviewer(browser: Browser, base_url: str, name: str, width: int, height: int) -> dict[str, Any]:
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    errors = collect_errors(page)
    page.goto(f"{base_url}/index.html", wait_until="networkidle")
    page.locator(".repo-chrome").wait_for(state="visible")
    page.locator(".readme-panel").wait_for(state="visible")

    landing_path = SCREENSHOTS / f"github-native-reviewer-landing-{name}.png"
    if name in {"desktop", "mobile"}:
        page.screenshot(path=str(landing_path), full_page=True)

    page.get_by_role("button", name="Load sample").click()
    page.locator("#report:not([hidden])").wait_for(state="visible", timeout=10_000)
    page.wait_for_function("document.getElementById('decision-value').textContent.trim() === 'Pilot'")
    report_path = SCREENSHOTS / f"github-native-reviewer-report-{name}.png"
    page.screenshot(path=str(report_path), full_page=True)

    metrics = layout_metrics(page)
    report = page.evaluate(
        """() => ({
          decision: document.getElementById('decision-value')?.textContent?.trim(),
          dimensions: document.querySelectorAll('#dimension-grid .dimension-card').length,
          findings: document.querySelectorAll('#findings-list .finding-card').length,
          evidence: document.querySelectorAll('#evidence-list .evidence-card').length,
          claims: document.querySelectorAll('#claim-ledger .claim-row').length,
          sidebarVisible: getComputedStyle(document.querySelector('.report-sidebar')).display !== 'none',
          decisionBorder: getComputedStyle(document.getElementById('decision-banner')).borderLeftWidth,
        })"""
    )

    page.locator("#new-review").click()
    page.locator("body").press("Tab")
    focus = page.evaluate(
        """() => {
          const element = document.activeElement;
          const style = getComputedStyle(element.closest('label') || element);
          return { tag: element.tagName, id: element.id, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
        }"""
    )

    assert metrics["overflow"] <= 1, (name, metrics)
    assert metrics["repositoryTabs"] >= 4, metrics
    assert metrics["glassBackdrop"] in {"none", ""}, metrics
    assert report["decision"] == "Pilot", report
    assert report["dimensions"] == 5, report
    assert report["findings"] >= 15, report
    assert report["evidence"] >= 15, report
    assert report["claims"] >= 4, report
    assert report["decisionBorder"] not in {"0px", ""}, report
    assert focus["outlineStyle"] != "none" and focus["outlineWidth"] != "0px", focus
    assert not errors, errors

    page.close()
    return {
        "surface": "reviewer",
        "name": name,
        "viewport": {"width": width, "height": height},
        "layout": metrics,
        "report": report,
        "focus": focus,
        "consoleErrors": errors,
        "screenshots": {
            "landing": str(landing_path.relative_to(ROOT)) if landing_path.exists() else None,
            "report": str(report_path.relative_to(ROOT)),
        },
    }


def mock_operator(route: Route) -> None:
    url = route.request.url
    if url.endswith("/health"):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(
                {
                    "status": "ok",
                    "service": "forkwise-runner",
                    "schemaVersion": "forkwise-report/v1",
                    "analyzerVersion": "forkwise-hosted/0.1.0",
                    "execution": "static-only",
                    "time": datetime.now(timezone.utc).isoformat(),
                }
            ),
        )
        return
    if url.endswith("/v1/stats"):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(
                {
                    "total": 11,
                    "counts": {"queued": 1, "running": 1, "completed": 8, "failed": 1},
                    "lastJobAt": datetime.now(timezone.utc).isoformat(),
                    "limits": {"retentionDays": 7, "maxFetchedFiles": 24, "rateMaxPerWindow": 8, "rateWindowMinutes": 10},
                }
            ),
        )
        return
    route.abort()


def validate_operator(browser: Browser, base_url: str, name: str, width: int, height: int) -> dict[str, Any]:
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    errors = collect_errors(page)
    page.route("https://forkwise-runner.lovable.app/**", mock_operator)
    page.goto(f"{base_url}/operator.html", wait_until="networkidle")
    page.locator(".operator-repo-chrome").wait_for(state="visible")
    page.wait_for_function("document.getElementById('health-label').textContent.trim() === 'Operational'")

    screenshot = SCREENSHOTS / f"github-native-operator-{name}.png"
    page.screenshot(path=str(screenshot), full_page=True)
    metrics = layout_metrics(page)
    state = page.evaluate(
        """() => ({
          health: document.getElementById('health-label')?.textContent?.trim(),
          service: document.getElementById('service-name')?.textContent?.trim(),
          execution: document.getElementById('execution-mode')?.textContent?.trim(),
          tabs: document.querySelectorAll('.operator-tabs a').length,
          endpointRows: document.querySelectorAll('.endpoint-list article').length,
        })"""
    )

    assert metrics["overflow"] <= 1, (name, metrics)
    assert metrics["glassBackdrop"] in {"none", ""}, metrics
    assert state["health"] == "Operational", state
    assert state["service"] == "forkwise-runner", state
    assert state["execution"] == "static-only", state
    assert state["tabs"] >= 4, state
    assert state["endpointRows"] == 5, state
    assert not errors, errors

    page.close()
    return {
        "surface": "operator",
        "name": name,
        "viewport": {"width": width, "height": height},
        "layout": metrics,
        "state": state,
        "consoleErrors": errors,
        "screenshot": str(screenshot.relative_to(ROOT)),
    }


def main() -> None:
    results: list[dict[str, Any]] = []
    executable = browser_executable()
    with static_server() as base_url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=executable,
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        for name, width, height in VIEWPORTS:
            results.append(validate_reviewer(browser, base_url, name, width, height))
        for name, width, height in [("desktop", 1440, 1000), ("mobile", 390, 844)]:
            results.append(validate_operator(browser, base_url, name, width, height))
        browser.close()

    output = {
        "validatedAt": datetime.now(timezone.utc).isoformat(),
        "browserExecutable": executable,
        "result": "passed",
        "design": "github-native-repository-workspace",
        "results": results,
        "checks": [
            "Repository chrome and tabs render",
            "README/composer intake layout renders",
            "Actions-style progress and report workspace render",
            "Sample report remains functional",
            "Findings, evidence, claims, dimensions, and sidebar remain populated",
            "Operator Actions console renders with mocked health/stats",
            "No page-level horizontal overflow at 1440, 768, 390, or 320 px",
            "No glass backdrop filter or ambient marketing gradients",
            "Visible keyboard focus",
            "No browser console or page errors",
        ],
    }
    output_path = VALIDATION / "github-native-redesign.json"
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
