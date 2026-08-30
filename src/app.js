import { analyzeRepository } from "./analyzer.js";
import { createJsonExport, createMarkdownExport, downloadText, safeFileName } from "./export.js";
import { fetchRepositorySnapshot, parseGitHubUrl } from "./github.js";
import { createSampleSnapshot, sampleContext } from "./sample.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const byId = (id) => document.getElementById(id);

const elements = {
  intake: byId("intake-view"),
  form: byId("review-form"),
  repoUrl: byId("repo-url"),
  useCase: byId("use-case"),
  deploymentTarget: byId("deployment-target"),
  sensitivity: byId("sensitivity"),
  teamSize: byId("team-size"),
  externalServices: byId("external-services"),
  analyzeButton: byId("analyze-button"),
  sampleButton: byId("sample-review"),
  urlError: byId("url-error"),
  progress: byId("analysis-progress"),
  progressTitle: byId("progress-title"),
  progressDetail: byId("progress-detail"),
  progressBar: byId("progress-bar"),
  progressSteps: byId("progress-steps"),
  report: byId("report"),
  liveStatus: byId("live-status"),
};

const STAGES = [
  { id: "validate", label: "Validate request" },
  { id: "metadata", label: "Read metadata" },
  { id: "commit", label: "Pin commit" },
  { id: "inventory", label: "Inventory files" },
  { id: "content", label: "Read evidence" },
  { id: "analysis", label: "Apply rules" },
  { id: "report", label: "Build report" },
];

let currentAssessment = null;
let currentAbortController = null;

function createElement(tag, { className = "", text = "", attrs = {}, children = [] } = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== "") element.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "dataset") Object.assign(element.dataset, value);
    else if (name === "hidden") element.hidden = Boolean(value);
    else element.setAttribute(name, String(value));
  }
  for (const child of children) if (child) element.append(child);
  return element;
}

function clear(element) {
  element.replaceChildren();
}

function announce(message) {
  elements.liveStatus.textContent = "";
  requestAnimationFrame(() => { elements.liveStatus.textContent = message; });
}

function selectedIntent() {
  return $("input[name='intent']:checked", elements.form)?.value ?? "self-host";
}

function contextFromForm() {
  return {
    intent: selectedIntent(),
    useCase: elements.useCase.value,
    deploymentTarget: elements.deploymentTarget.value,
    sensitivity: elements.sensitivity.value,
    teamSize: elements.teamSize.value,
    externalServices: elements.externalServices.value,
  };
}

function setFormContext(context) {
  const radio = $(`input[name='intent'][value='${context.intent}']`, elements.form);
  if (radio) radio.checked = true;
  elements.useCase.value = context.useCase ?? "";
  elements.deploymentTarget.value = context.deploymentTarget ?? "flexible";
  elements.sensitivity.value = context.sensitivity ?? "internal";
  elements.teamSize.value = context.teamSize ?? "small";
  elements.externalServices.value = context.externalServices ?? "disclosed";
}

function showUrlError(message) {
  elements.urlError.textContent = message;
  elements.urlError.hidden = !message;
  elements.repoUrl.setAttribute("aria-invalid", message ? "true" : "false");
}

function setBusy(isBusy) {
  elements.analyzeButton.disabled = isBusy;
  elements.sampleButton.disabled = isBusy;
  const label = $("span", elements.analyzeButton);
  if (label) label.textContent = isBusy ? "Reviewing repository…" : "Review repository";
}

function renderProgressSteps(activeId) {
  clear(elements.progressSteps);
  const activeIndex = STAGES.findIndex((stage) => stage.id === activeId);
  STAGES.forEach((stage, index) => {
    const state = index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending";
    elements.progressSteps.append(createElement("li", {
      className: state,
      text: stage.label,
      attrs: { "aria-current": state === "active" ? "step" : null },
    }));
  });
  const progress = activeIndex < 0 ? 0 : Math.round(((activeIndex + 1) / STAGES.length) * 100);
  elements.progressBar.style.width = `${progress}%`;
}

function updateProgress(stage, title, detail = "") {
  elements.progressTitle.textContent = title;
  elements.progressDetail.textContent = detail;
  renderProgressSteps(stage);
  announce(`${title}. ${detail}`);
}

function showProgress() {
  elements.report.hidden = true;
  elements.progress.hidden = false;
  elements.progress.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showReport() {
  elements.progress.hidden = true;
  elements.intake.hidden = true;
  elements.report.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showIntake() {
  currentAbortController?.abort();
  elements.report.hidden = true;
  elements.progress.hidden = true;
  elements.intake.hidden = false;
  setBusy(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => elements.repoUrl.focus(), 150);
}

function evidenceLookup(assessment) {
  return new Map(assessment.evidence.map((item) => [item.id, item]));
}

function renderReasonCards(assessment) {
  const container = byId("decision-reasons");
  clear(container);
  for (const reason of assessment.decisionReasons) {
    container.append(createElement("article", {
      className: "reason-card",
      attrs: { dataset: { type: reason.type, severity: reason.severity } },
      children: [
        createElement("h3", { text: reason.title }),
        createElement("p", { text: `${reason.type} · ${reason.severity}` }),
      ],
    }));
  }
}

function renderDimensions(assessment) {
  const container = byId("dimension-grid");
  clear(container);
  for (const dimension of assessment.dimensions) {
    const meter = createElement("span");
    meter.style.width = `${dimension.score}%`;
    container.append(createElement("article", {
      className: "dimension-card",
      children: [
        createElement("div", {
          className: "dimension-top",
          children: [createElement("h3", { text: dimension.name }), createElement("span", { className: "dimension-score", text: `${dimension.score}/100` })],
        }),
        createElement("strong", { text: dimension.status }),
        createElement("p", { text: dimension.summary }),
        createElement("div", { className: "dimension-meter", children: [meter] }),
      ],
    }));
  }
}

function renderClaims(assessment) {
  const container = byId("claim-ledger");
  clear(container);
  for (const claim of assessment.claims) {
    const heading = createElement("div", {
      children: [
        createElement("h3", { text: claim.title }),
        createElement("span", { className: "claim-detected", text: claim.claimed ? "Claim detected in README" : "Claim not detected" }),
      ],
    });
    const state = createElement("span", { className: "claim-state", text: claim.state, attrs: { dataset: { state: claim.state } } });
    container.append(createElement("article", {
      className: "claim-row",
      children: [heading, state, createElement("p", { text: claim.explanation })],
    }));
  }
}

function findingCard(finding, lookup) {
  const metaChildren = [
    createElement("span", { text: finding.dimension }),
    createElement("span", { text: finding.type }),
    createElement("span", { text: finding.severity }),
    createElement("span", { text: `${finding.confidence} confidence` }),
  ];
  if (finding.blocking) metaChildren.push(createElement("span", { className: "blocking-label", text: "Blocking" }));

  const summary = createElement("summary", {
    children: [
      createElement("span", { className: "severity-dot", attrs: { "aria-hidden": "true" } }),
      createElement("div", {
        className: "finding-title",
        children: [createElement("h3", { text: finding.title }), createElement("div", { className: "finding-meta", children: metaChildren })],
      }),
      createElement("svg", {
        className: "finding-chevron",
        attrs: { viewBox: "0 0 24 24", "aria-hidden": "true" },
        children: [createElement("path", { attrs: { d: "m6 9 6 6 6-6", fill: "none" } })],
      }),
    ],
  });

  const bodyChildren = [createElement("p", { text: finding.summary })];
  if (finding.impact) bodyChildren.push(createElement("p", { children: [createElement("strong", { text: "Impact: " }), document.createTextNode(finding.impact)] }));
  if (finding.recommendation) bodyChildren.push(createElement("p", { children: [createElement("strong", { text: "Recommendation: " }), document.createTextNode(finding.recommendation)] }));
  const evidenceContainer = createElement("div", { className: "finding-evidence" });
  for (const evidenceId of finding.evidenceIds) {
    const evidence = lookup.get(evidenceId);
    if (!evidence) continue;
    const node = evidence.url
      ? createElement("a", { text: `${evidence.id} · ${evidence.path ?? evidence.label}`, attrs: { href: evidence.url, target: "_blank", rel: "noreferrer" } })
      : createElement("span", { text: `${evidence.id} · ${evidence.path ?? evidence.label}` });
    evidenceContainer.append(node);
  }
  if (evidenceContainer.childElementCount) bodyChildren.push(evidenceContainer);

  return createElement("details", {
    className: "finding-card",
    attrs: { dataset: { severity: finding.severity, dimension: finding.dimension, type: finding.type, search: `${finding.title} ${finding.summary} ${finding.ruleId}`.toLowerCase() } },
    children: [summary, createElement("div", { className: "finding-body", children: bodyChildren })],
  });
}

function renderFindings(assessment) {
  const container = byId("findings-list");
  const lookup = evidenceLookup(assessment);
  clear(container);
  for (const finding of assessment.findings) container.append(findingCard(finding, lookup));
  filterFindings();
}

function filterFindings() {
  if (!currentAssessment) return;
  const search = byId("findings-search").value.trim().toLowerCase();
  const dimension = byId("dimension-filter").value;
  const severity = byId("severity-filter").value;
  let count = 0;
  for (const card of $$(".finding-card", byId("findings-list"))) {
    const visible = (!search || card.dataset.search.includes(search))
      && (dimension === "all" || card.dataset.dimension === dimension)
      && (severity === "all" || card.dataset.severity === severity);
    card.hidden = !visible;
    if (visible) count += 1;
  }
  byId("findings-count").textContent = String(count);
  let empty = $(".empty-state", byId("findings-list"));
  if (!count && !empty) {
    empty = createElement("div", { className: "empty-state", text: "No findings match the active filters." });
    byId("findings-list").append(empty);
  } else if (count && empty) {
    empty.remove();
  }
}

function renderOperations(assessment) {
  const groups = [
    ["Runtimes & frameworks", assessment.operations.runtimes],
    ["Data services", assessment.operations.databases],
    ["Deployment", assessment.operations.deployment],
    ["External indicators", assessment.operations.externalServices.map((item) => `${item.name} · ${item.kind}`)],
    ["Environment variables", assessment.operations.environmentVariables],
    ["Observed ports", assessment.operations.ports],
  ];
  const container = byId("operations-list");
  clear(container);
  for (const [title, values] of groups) {
    const list = createElement("ul");
    for (const value of values.length ? values : ["Not identified in inspected evidence"]) list.append(createElement("li", { text: value }));
    container.append(createElement("article", { className: "operation-card", children: [createElement("h3", { text: title }), list] }));
  }
  const technologyList = byId("technology-list");
  clear(technologyList);
  for (const technology of assessment.technologies) {
    technologyList.append(createElement("span", {
      className: "chip",
      children: [document.createTextNode(technology.name), createElement("small", { text: technology.category })],
    }));
  }
  if (!assessment.technologies.length) technologyList.append(createElement("span", { className: "chip", text: "No supported technology signal identified" }));
}

function renderEvidence(assessment) {
  const container = byId("evidence-list");
  clear(container);
  for (const item of assessment.evidence) {
    const body = [
      createElement("header", {
        children: [createElement("h3", { text: `${item.id} · ${item.label}` }), createElement("span", { className: "evidence-type", text: item.type })],
      }),
      createElement("p", { text: item.detail }),
    ];
    if (item.path) body.push(createElement("code", { text: item.path }));
    if (item.excerpt) body.push(createElement("blockquote", { text: item.excerpt }));
    if (item.url) body.push(createElement("a", { text: "Open source evidence ↗", attrs: { href: item.url, target: "_blank", rel: "noreferrer" } }));
    container.append(createElement("article", { className: "evidence-card", children: body }));
  }
  byId("evidence-count").textContent = String(assessment.evidence.length);
}

function renderPilotChecklist(assessment) {
  const container = byId("pilot-checklist");
  clear(container);
  assessment.pilotChecklist.forEach((text, index) => {
    const id = `pilot-${index}`;
    const input = createElement("input", { attrs: { id, type: "checkbox" } });
    const label = createElement("label", { className: "check-item", attrs: { for: id }, children: [input, createElement("span", { text })] });
    container.append(label);
  });
}

function renderSidebar(assessment) {
  const facts = [
    ["Repository", assessment.repository.fullName],
    ["Commit", assessment.repository.commitSha.slice(0, 12)],
    ["Branch", assessment.repository.defaultBranch],
    ["License", assessment.repository.license],
    ["Language", assessment.repository.primaryLanguage],
    ["Files", assessment.inventory.totalFiles.toLocaleString()],
    ["Stars", assessment.repository.stars.toLocaleString()],
    ["Last push", assessment.repository.pushedAt ? new Date(assessment.repository.pushedAt).toLocaleDateString() : "Unknown"],
  ];
  const factsContainer = byId("repo-facts");
  clear(factsContainer);
  for (const [term, value] of facts) {
    factsContainer.append(createElement("div", { children: [createElement("dt", { text: term }), createElement("dd", { text: value })] }));
  }

  const blockers = assessment.findings.filter((finding) => finding.blocking);
  const blockerList = byId("blocker-list");
  clear(blockerList);
  for (const finding of blockers) blockerList.append(createElement("article", { children: [createElement("h3", { text: finding.title }), createElement("p", { text: finding.summary })] }));
  if (!blockers.length) blockerList.append(createElement("article", { children: [createElement("h3", { text: "No blocking rule fired" }), createElement("p", { text: "Pilot checks and unresolved questions may still remain." })] }));

  const questionList = byId("question-list");
  clear(questionList);
  for (const question of assessment.unresolvedQuestions) questionList.append(createElement("article", { children: [createElement("p", { text: question })] }));
  if (!assessment.unresolvedQuestions.length) questionList.append(createElement("article", { children: [createElement("p", { text: "No unresolved question was generated by the supported rules." })] }));

  const limitations = byId("limitations-list");
  clear(limitations);
  for (const limitation of assessment.limitations) limitations.append(createElement("li", { text: limitation }));
}

function renderReport(assessment) {
  currentAssessment = assessment;
  byId("report-name").textContent = assessment.repository.fullName;
  byId("report-description").textContent = assessment.repository.description;
  byId("source-link").href = assessment.repository.url;
  byId("report-provenance").textContent = `Analyzed ${assessment.repository.defaultBranch}@${assessment.repository.commitSha} · analyzer ${assessment.analyzerVersion} · generated ${new Date(assessment.generatedAt).toLocaleString()}`;

  const banner = byId("decision-banner");
  banner.dataset.decision = assessment.decision;
  byId("decision-value").textContent = assessment.decision;
  byId("commit-pill").textContent = assessment.repository.commitSha.slice(0, 12);
  byId("decision-summary").textContent = assessment.summary;
  byId("next-action-text").textContent = assessment.nextAction;
  byId("confidence-value").textContent = assessment.decisionConfidence;
  byId("coverage-value").textContent = `${assessment.evidenceCoverage}%`;
  byId("blocker-value").textContent = String(assessment.blockerCount);
  byId("burden-value").textContent = assessment.ownershipBurden;
  byId("effort-value").textContent = assessment.adoptionEffort;

  renderReasonCards(assessment);
  renderDimensions(assessment);
  renderClaims(assessment);
  renderFindings(assessment);
  renderOperations(assessment);
  renderEvidence(assessment);
  renderPilotChecklist(assessment);
  renderSidebar(assessment);
  showReport();
  announce(`${assessment.repository.fullName} review complete. Recommendation: ${assessment.decision}.`);
}

async function runReview({ sample = false } = {}) {
  showUrlError("");
  setBusy(true);
  currentAbortController?.abort();
  currentAbortController = new AbortController();
  showProgress();

  try {
    updateProgress("validate", "Validating the review context", "Checking repository identity and intended use.");
    const context = contextFromForm();
    let snapshot;

    if (sample) {
      const sampleStages = [
        ["metadata", "Reading public repository metadata", "Sample repository metadata loaded."],
        ["commit", "Pinning the review to a commit", "A reproducible sample commit is selected."],
        ["inventory", "Building the repository inventory", "Deployment, test, security, and documentation paths are classified."],
        ["content", "Reading bounded evidence", "High-value text artifacts are inspected without execution."],
      ];
      for (const [stage, title, detail] of sampleStages) {
        await new Promise((resolve) => setTimeout(resolve, 85));
        updateProgress(stage, title, detail);
      }
      snapshot = createSampleSnapshot();
    } else {
      const parsed = parseGitHubUrl(elements.repoUrl.value);
      snapshot = await fetchRepositorySnapshot(parsed, {
        signal: currentAbortController.signal,
        onStage(stage, title, detail) {
          updateProgress(stage, title, detail);
        },
      });
    }

    updateProgress("analysis", "Applying deterministic adoption rules", "Separating repository facts from contextual interpretation.");
    await new Promise((resolve) => setTimeout(resolve, 60));
    const assessment = analyzeRepository(snapshot, context);
    updateProgress("report", "Building the evidence-backed report", `${assessment.findings.length} findings and ${assessment.evidence.length} evidence records.`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    renderReport(assessment);
  } catch (error) {
    if (error?.name === "AbortError") return;
    elements.progress.hidden = true;
    elements.intake.hidden = false;
    const message = error instanceof Error ? error.message : "The review could not be completed.";
    showUrlError(message);
    elements.repoUrl.focus();
    announce(`Review failed. ${message}`);
  } finally {
    setBusy(false);
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    parseGitHubUrl(elements.repoUrl.value);
  } catch (error) {
    showUrlError(error.message);
    elements.repoUrl.focus();
    return;
  }
  runReview();
});

elements.repoUrl.addEventListener("input", () => {
  if (!elements.urlError.hidden) showUrlError("");
});

elements.sampleButton.addEventListener("click", () => {
  elements.repoUrl.value = "https://github.com/sample-org/atlas-board";
  setFormContext(sampleContext);
  runReview({ sample: true });
});

byId("new-review").addEventListener("click", showIntake);
byId("findings-search").addEventListener("input", filterFindings);
byId("dimension-filter").addEventListener("change", filterFindings);
byId("severity-filter").addEventListener("change", filterFindings);

byId("export-json").addEventListener("click", () => {
  if (!currentAssessment) return;
  const content = createJsonExport(currentAssessment);
  downloadText(content, safeFileName(`${currentAssessment.repository.fullName.replace("/", "-")}-${currentAssessment.repository.commitSha.slice(0, 8)}-review`, "json"), "application/json;charset=utf-8");
  announce("JSON report downloaded.");
});

byId("export-markdown").addEventListener("click", () => {
  if (!currentAssessment) return;
  const content = createMarkdownExport(currentAssessment);
  downloadText(content, safeFileName(`${currentAssessment.repository.fullName.replace("/", "-")}-${currentAssessment.repository.commitSha.slice(0, 8)}-review`, "md"), "text/markdown;charset=utf-8");
  announce("Markdown report downloaded.");
});

byId("copy-checklist").addEventListener("click", async () => {
  if (!currentAssessment) return;
  const text = currentAssessment.pilotChecklist.map((item) => `- [ ] ${item}`).join("\n");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  const button = byId("copy-checklist");
  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = original; }, 1500);
  announce("Pilot checklist copied.");
});

renderProgressSteps("validate");
