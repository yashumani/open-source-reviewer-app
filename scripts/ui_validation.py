#!/usr/bin/env python3
"""Render the static application in system Chromium without network access."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "validation"
SCREENSHOTS = ROOT / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

MODULE_ORDER = ["schema", "inventory", "github", "analyzer", "sample", "export", "app"]
DEPENDENCIES = {
    "schema": {},
    "inventory": {"./schema.js": "schema"},
    "github": {"./inventory.js": "inventory"},
    "analyzer": {"./schema.js": "schema", "./inventory.js": "inventory"},
    "sample": {},
    "export": {"./schema.js": "schema"},
    "app": {
        "./analyzer.js": "analyzer",
        "./export.js": "export",
        "./github.js": "github",
        "./sample.js": "sample",
    },
}


def inline_document() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    svg = (ROOT / "assets" / "mark.svg").read_text(encoding="utf-8")
    svg_data = "data:image/svg+xml," + re.sub(r"\s+", " ", svg).replace("#", "%23").replace('"', "%22")
    html = re.sub(r"\s*<link[^>]+(?:stylesheet|manifest)[^>]*>", "", html, flags=re.I)
    html = re.sub(r"\s*<script[^>]+src=[\"']src/app\.js[\"'][^>]*></script>", "", html, flags=re.I)
    html = html.replace('src="assets/mark.svg"', f'src="{svg_data}"')
    html = html.replace("</head>", f"<style>{css}</style></head>")
    return html


def module_sources() -> dict[str, str]:
    return {name: (ROOT / "src" / f"{name}.js").read_text(encoding="utf-8") for name in MODULE_ORDER}


def load_modules(page) -> None:
    page.evaluate(
        """
        async ({ order, dependencies, sources }) => {
          const urls = {};
          for (const name of order) {
            let source = sources[name];
            for (const [specifier, dependency] of Object.entries(dependencies[name] || {})) {
              source = source.split(specifier).join(urls[dependency]);
            }
            urls[name] = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
          }
          await import(urls.app);
          window.__forkwiseModuleUrls = urls;
        }
        """,
        {"order": MODULE_ORDER, "dependencies": DEPENDENCIES, "sources": module_sources()},
    )


def metrics(page) -> dict[str, Any]:
    return page.evaluate(
        """() => ({
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
          decision: document.getElementById('decision-value')?.textContent?.trim() || null,
          dimensions: document.querySelectorAll('#dimension-grid .dimension-card').length,
          findings: document.querySelectorAll('#findings-list .finding-card').length,
          evidence: document.querySelectorAll('#evidence-list .evidence-card').length,
          claims: document.querySelectorAll('#claim-ledger .claim-row').length,
          visibleReport: !document.getElementById('report').hidden,
        })"""
    )


def validate_viewport(browser, name: str, width: int, height: int) -> dict[str, Any]:
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    console_errors: list[str] = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: console_errors.append(str(error)))
    page.set_content(inline_document(), wait_until="domcontentloaded")
    load_modules(page)
    page.wait_for_timeout(100)

    landing_path = SCREENSHOTS / f"landing-{name}.png"
    if name in {"desktop", "mobile"}:
        page.screenshot(path=str(landing_path), full_page=True)

    page.get_by_role("button", name="Load sample").click()
    page.locator("#report:not([hidden])").wait_for(state="visible", timeout=10000)
    page.wait_for_function("document.getElementById('decision-value').textContent.trim() === 'Pilot'")
    report_metrics = metrics(page)
    report_path = SCREENSHOTS / f"report-{name}.png"
    page.screenshot(path=str(report_path), full_page=True)

    # Filter behavior.
    total_findings = report_metrics["findings"]
    page.locator("#severity-filter").select_option("medium")
    page.wait_for_timeout(30)
    filtered_count = int(page.locator("#findings-count").inner_text())
    assert 0 < filtered_count < total_findings, (name, filtered_count, total_findings)
    page.locator("#findings-search").fill("definitely-no-such-finding")
    assert page.locator("#findings-count").inner_text() == "0"
    assert page.locator("#findings-list .empty-state").is_visible()
    page.locator("#findings-search").fill("")
    page.locator("#severity-filter").select_option("all")

    # Download behavior. Record the browser-generated filename without writing outside the test sandbox.
    page.evaluate(
        """() => {
          window.__lastDownload = null;
          const original = HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click = function () {
            if (this.download) {
              window.__lastDownload = { fileName: this.download, href: this.href };
              return;
            }
            return original.call(this);
          };
        }"""
    )
    page.get_by_role("button", name="Export JSON").click()
    page.wait_for_function("window.__lastDownload && window.__lastDownload.fileName.endsWith('.json')")
    download_record = page.evaluate("window.__lastDownload")

    # Keyboard focus visibility.
    page.locator("#new-review").click()
    page.wait_for_timeout(60)
    page.locator("body").press("Tab")
    focus = page.evaluate(
        """() => {
          const element = document.activeElement;
          const proxy = element.closest('label') || element;
          const direct = getComputedStyle(element);
          const proxyStyle = getComputedStyle(proxy);
          return {
            tag: element.tagName,
            id: element.id,
            outlineStyle: direct.outlineStyle,
            outlineWidth: direct.outlineWidth,
            proxyTag: proxy.tagName,
            proxyOutlineStyle: proxyStyle.outlineStyle,
            proxyOutlineWidth: proxyStyle.outlineWidth,
          };
        }"""
    )
    direct_visible = focus["outlineStyle"] != "none" and focus["outlineWidth"] != "0px"
    proxy_visible = focus["proxyOutlineStyle"] != "none" and focus["proxyOutlineWidth"] != "0px"
    assert direct_visible or proxy_visible, focus

    # Invalid-host recovery.
    page.locator("#repo-url").fill("https://gitlab.com/acme/repository")
    page.get_by_role("button", name="Review repository").click()
    assert page.locator("#url-error").is_visible()
    assert "github.com" in page.locator("#url-error").inner_text().lower()

    assert report_metrics["overflow"] <= 1, report_metrics
    assert report_metrics["decision"] == "Pilot"
    assert report_metrics["dimensions"] == 5
    assert report_metrics["findings"] >= 15
    assert report_metrics["evidence"] >= 15
    assert report_metrics["claims"] >= 4
    assert not console_errors, console_errors

    page.close()
    return {
        "name": name,
        "viewport": {"width": width, "height": height},
        "report": report_metrics,
        "filteredMediumFindings": filtered_count,
        "downloadFileName": download_record["fileName"],
        "focus": focus,
        "consoleErrors": console_errors,
        "screenshots": {
            "landing": str(landing_path.relative_to(ROOT)) if landing_path.exists() else None,
            "report": str(report_path.relative_to(ROOT)),
        },
    }


def main() -> None:
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        for name, width, height in [
            ("desktop", 1440, 1000),
            ("tablet", 768, 1024),
            ("mobile", 390, 844),
            ("small-mobile", 320, 720),
        ]:
            results.append(validate_viewport(browser, name, width, height))
        browser.close()

    output = {
        "validatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "browser": "system Chromium",
        "result": "passed",
        "viewports": results,
        "checks": [
            "Landing and sample report render",
            "No horizontal overflow",
            "No browser console/page errors",
            "Pilot decision and five dimensions",
            "README claim ledger, findings, and evidence",
            "Finding severity and search filters",
            "JSON download",
            "Invalid GitLab host recovery",
            "Visible keyboard focus",
        ],
    }
    (OUT / "ui-validation.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
