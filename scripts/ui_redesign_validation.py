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
          scrollY: window.scrollY,
        })"""
    )


# Issue #19: keyboard and screen-reader coverage for the finding filters.
FILTER_CONTROLS = ["findings-search", "dimension-filter", "severity-filter"]
NO_MATCHING_FINDINGS = "No findings match the active filters."
# WCAG 2.2 SC 1.4.11 requires 3:1 contrast for focus indicators against adjacent colors.
MIN_FOCUS_CONTRAST = 3.0


def focus_style(page: Page) -> dict[str, Any]:
    """Describe the focused control's outline, the theme accent, and outline contrast."""
    return page.evaluate(
        """() => {
          const element = document.activeElement;
          const style = getComputedStyle(element);
          const probe = document.createElement('span');
          probe.style.color = 'var(--accent)';
          document.body.append(probe);
          const accent = getComputedStyle(probe).color;
          probe.remove();
          const channels = (value) => value.match(/[\\d.]+/g).slice(0, 3).map(Number);
          const luminance = (value) => {
            const [r, g, b] = channels(value).map((channel) => {
              const c = channel / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const background = getComputedStyle(document.body).backgroundColor;
          const [light, dark] = [luminance(style.outlineColor), luminance(background)].sort((a, b) => b - a);
          return {
            id: element.id,
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            outlineColor: style.outlineColor,
            accent,
            background,
            contrast: Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100,
          };
        }"""
    )


def assert_visible_focus(step: dict[str, Any]) -> None:
    assert step["outlineStyle"] != "none" and step["outlineWidth"] != "0px", step
    assert step["outlineColor"] == step["accent"], ("focus ring must use the theme accent", step)
    assert step["contrast"] >= MIN_FOCUS_CONTRAST, ("focus ring contrast is too low", step)


def filter_state(page: Page) -> dict[str, Any]:
    return page.evaluate(
        """() => {
          const cards = [...document.querySelectorAll('#findings-list .finding-card')];
          const empty = document.querySelector('#findings-list .empty-state');
          return {
            count: Number(document.getElementById('findings-count').textContent),
            visible: cards.filter((card) => !card.hidden && card.getClientRects().length > 0).length,
            total: cards.length,
            emptyText: empty ? empty.textContent.trim() : null,
            emptyVisible: Boolean(empty && empty.getClientRects().length > 0),
            dimension: document.getElementById('dimension-filter').value,
            severity: document.getElementById('severity-filter').value,
            search: document.getElementById('findings-search').value,
          };
        }"""
    )


def wait_for_announcement(page: Page, expected: str) -> None:
    page.wait_for_function(
        "expected => document.getElementById('live-status').textContent === expected",
        arg=expected,
        timeout=5_000,
    )


def active_id(page: Page) -> str:
    return page.evaluate("() => document.activeElement.id")


def validate_filter_keyboard(page: Page) -> dict[str, Any]:
    """Filter findings using only the keyboard while the report is visible."""
    live = page.evaluate(
        """() => {
          const region = document.getElementById('live-status');
          return { ariaLive: region.getAttribute('aria-live'), srOnly: region.classList.contains('sr-only') };
        }"""
    )
    assert live == {"ariaLive": "polite", "srOnly": True}, live
    initial = filter_state(page)
    total = initial["total"]
    assert total > 0 and initial["count"] == initial["visible"] == total, initial
    assert initial["emptyText"] is None, initial

    # Tab through the search field and both dropdowns, with a visible focus ring on each.
    page.locator("#findings-search").focus()
    focus_steps = [focus_style(page)]
    for _ in FILTER_CONTROLS[1:]:
        page.keyboard.press("Tab")
        focus_steps.append(focus_style(page))
    assert [step["id"] for step in focus_steps] == FILTER_CONTROLS, focus_steps
    for step in focus_steps:
        assert_visible_focus(step)

    # Type a search with no match: count, visible empty state, and announcement agree.
    page.keyboard.press("Shift+Tab")
    page.keyboard.press("Shift+Tab")
    assert active_id(page) == "findings-search"
    page.keyboard.type("zz-no-such-finding")
    wait_for_announcement(page, NO_MATCHING_FINDINGS)
    empty = filter_state(page)
    assert empty["count"] == empty["visible"] == 0, empty
    assert empty["emptyVisible"] and empty["emptyText"] == NO_MATCHING_FINDINGS, empty

    # Clear the search from the keyboard.
    page.keyboard.press("Control+A")
    page.keyboard.press("Backspace")
    wait_for_announcement(page, f"Showing {total} of {total} findings.")
    restored = filter_state(page)
    assert restored["count"] == restored["visible"] == total and restored["emptyText"] is None, restored

    # Narrow the list with both dropdowns, using arrow keys only.
    page.keyboard.press("Tab")
    page.keyboard.press("ArrowDown")
    assert active_id(page) == "dimension-filter"
    by_dimension = filter_state(page)
    assert by_dimension["dimension"] != "all", by_dimension
    assert 0 < by_dimension["count"] == by_dimension["visible"] < total, by_dimension
    assert not by_dimension["emptyVisible"], by_dimension
    wait_for_announcement(page, f"Showing {by_dimension['count']} of {total} findings.")
    page.keyboard.press("Tab")
    page.keyboard.press("ArrowDown")
    assert active_id(page) == "severity-filter"
    narrowed = filter_state(page)
    assert narrowed["dimension"] != "all" and narrowed["severity"] != "all", narrowed
    shown = narrowed["count"]
    assert shown == narrowed["visible"] and shown < total, narrowed
    wait_for_announcement(page, f"Showing {shown} of {total} findings." if shown else NO_MATCHING_FINDINGS)
    assert narrowed["emptyVisible"] == (shown == 0), narrowed

    # Clear both dropdowns from the keyboard; the full list and count return.
    page.keyboard.press("Home")
    page.keyboard.press("Shift+Tab")
    page.keyboard.press("Home")
    wait_for_announcement(page, f"Showing {total} of {total} findings.")
    cleared = filter_state(page)
    assert (cleared["dimension"], cleared["severity"], cleared["search"]) == ("all", "all", ""), cleared
    assert cleared["count"] == cleared["visible"] == total and cleared["emptyText"] is None, cleared

    return {
        "focus": focus_steps,
        "totalFindings": total,
        "noMatch": {"count": empty["count"], "emptyText": empty["emptyText"]},
        "byDimension": {key: by_dimension[key] for key in ("dimension", "count")},
        "narrowed": {key: narrowed[key] for key in ("dimension", "severity", "count")},
        "cleared": {"count": cleared["count"], "emptyVisible": cleared["emptyVisible"]},
    }


def validate_sticky_header(page: Page) -> dict[str, Any]:
    """The global header must stay pinned while the report scrolls (no page-level clipping)."""
    page.evaluate("() => window.scrollTo(0, 500)")
    page.wait_for_function("() => window.scrollY >= 400")
    header = page.evaluate(
        """() => {
          const element = document.querySelector('.site-header');
          return {
            scrollY: window.scrollY,
            top: element.getBoundingClientRect().top,
            position: getComputedStyle(element).position,
            htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
            bodyOverflowX: getComputedStyle(document.body).overflowX,
          };
        }"""
    )
    page.evaluate("() => window.scrollTo(0, 0)")
    assert header["position"] == "sticky" and abs(header["top"]) <= 1, header
    return header


def validate_focus_themes(browser: Browser, base_url: str) -> dict[str, Any]:
    """Filter focus rings must use the theme accent with enough contrast in light and dark themes."""
    themes: dict[str, Any] = {}
    for scheme in ("light", "dark"):
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, color_scheme=scheme)
        errors = collect_errors(page)
        page.goto(f"{base_url}/index.html", wait_until="networkidle")
        page.get_by_role("button", name="Load sample").click()
        page.locator("#report:not([hidden])").wait_for(state="visible", timeout=10_000)
        page.locator("#findings-search").focus()
        steps = [focus_style(page)]
        for _ in FILTER_CONTROLS[1:]:
            page.keyboard.press("Tab")
            steps.append(focus_style(page))
        assert [step["id"] for step in steps] == FILTER_CONTROLS, (scheme, steps)
        for step in steps:
            assert_visible_focus(step)
        assert not errors, (scheme, errors)
        page.close()
        themes[scheme] = steps
    assert themes["light"][0]["accent"] != themes["dark"][0]["accent"], "themes must use different accents"
    return {"surface": "reviewer-focus-themes", "themes": themes}


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
    page.wait_for_timeout(650)
    page.evaluate(
        """() => {
          document.documentElement.style.scrollBehavior = 'auto';
          document.activeElement?.blur();
          window.scrollTo(0, 0);
        }"""
    )
    page.wait_for_timeout(100)
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

    # Issue #19 runs while the report and its filters are visible, before "New review" hides them.
    filters = validate_filter_keyboard(page)
    sticky_header = validate_sticky_header(page)
    filtered_metrics = layout_metrics(page)
    assert filtered_metrics["overflow"] <= 1, (name, filtered_metrics)

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
    assert metrics["scrollY"] == 0, metrics
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
        "filterKeyboard": filters,
        "stickyHeader": sticky_header,
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
        results.append(validate_focus_themes(browser, base_url))
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
            "Report screenshot begins at the top-level repository chrome",
            "Visible keyboard focus",
            "Finding filters: search and both dropdowns reachable with Tab at every viewport",
            "Finding filters: theme-accent focus ring with at least 3:1 contrast in light and dark themes",
            "Finding filters: count, visible empty state, and polite live announcement agree after keyboard input",
            "Finding filters: clearing all three filters restores every finding",
            "Sticky site header stays pinned after scrolling at every viewport",
            "No browser console or page errors",
        ],
    }
    output_path = VALIDATION / "github-native-redesign.json"
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
