const STORAGE_KEY = "hideAnswerMode";
let currentMode = "none";
let bootUrl = ""; 
let urlPoller = null;

const MODE_LABELS = {
  none: "Default",
  all: "Hide All",
  correct: "Hide Correct",
  incorrect: "Hide Incorrect",
};

function onDetailsPage() {
  return location.href.includes("/details") || location.pathname.includes("details");
}

function normalizeParagraph(p) {
  if (!p || p.dataset.hmaNormalized === "1") return;

  let answer = "";
  let correctnessText = "";

  const existingAnswerSpan = p.querySelector(".answer-choice");
  if (existingAnswerSpan) {
    answer = existingAnswerSpan.textContent.trim();
    const txt = p.textContent.replace(existingAnswerSpan.textContent, "").trim();
    const m = txt.match(/(Correct|Incorrect)/i);
    correctnessText = m ? m[0] : txt.trim();
  } else {
    const raw = p.textContent.trim();

    if (raw.includes(";")) {
      const [ans, rest] = raw.split(";", 2);
      answer = (ans || "").trim();
      const m = (rest || "").match(/(Correct|Incorrect)/i);
      correctnessText = m ? m[0] : (rest || "").trim();
    } else {
      const m = raw.match(/^(.*?)(?:\s+)?(Correct|Incorrect)$/i);
      if (m) {
        answer = (m[1] || "").trim();
        correctnessText = m[2];
      } else {
        answer = raw;
        correctnessText = "";
      }
    }
  }

  while (p.firstChild) p.removeChild(p.firstChild);

  const spanAnswer = document.createElement("span");
  spanAnswer.className = "answer-choice";
  spanAnswer.textContent = answer;

  const spanSep = document.createElement("span");
  spanSep.className = "hma-sep";
  spanSep.textContent = "; ";

  const spanCorrectness = document.createElement("span");
  spanCorrectness.className = "hma-correctness";
  spanCorrectness.textContent = correctnessText;

  p.appendChild(spanAnswer);
  p.appendChild(spanSep);
  p.appendChild(spanCorrectness);

  p.dataset.answer = answer;
  p.dataset.correctness = correctnessText;
  p.dataset.hmaNormalized = "1";
}

function normalizeAll() {
  document
    .querySelectorAll('td[id^="your-answer-question-"] p')
    .forEach(normalizeParagraph);
}

function normalizeCorrectAnswerCells() {
  const rows = document.querySelectorAll('td[id^="your-answer-question-"]');
  rows.forEach((yourAnswerTd) => {
    const tr = yourAnswerTd.closest("tr");
    if (!tr) return;

    const tds = Array.from(tr.querySelectorAll("td"));
    const possibleCorrectCells = tds.filter((td) => td !== yourAnswerTd);

    let correctTd = null;
    for (const td of possibleCorrectCells) {
      const div = td.querySelector("div");
      if (!div) continue;
      const txt = div.textContent.trim();
      if (/^[A-E]$/.test(txt)) {
        correctTd = td;
        break;
      }
    }

    if (!correctTd) return;

    correctTd.dataset.correctAnswer = correctTd
      .querySelector("div")
      .textContent.trim();
    correctTd.dataset.hmaNormalized = "1";
  });
}

function applyMode(mode) {
  currentMode = mode;

  document
    .querySelectorAll('td[id^="your-answer-question-"] p')
    .forEach((p) => {
      if (p.dataset.hmaNormalized !== "1") normalizeParagraph(p);

      const c = (p.dataset.correctness || "").trim().toLowerCase();
      const isCorrect = c === "correct";
      const isIncorrect = c === "incorrect";

      const hide =
        mode === "all" ||
        (mode === "correct" && isCorrect) ||
        (mode === "incorrect" && isIncorrect);

      const ans = p.querySelector(".answer-choice");
      const sep = p.querySelector(".hma-sep");

      if (ans) ans.style.display = hide ? "none" : "";
      if (sep) sep.style.display = hide ? "none" : "";
    });

  document
    .querySelectorAll('td[id^="your-answer-question-"]')
    .forEach((yourAnswerTd) => {
      const tr = yourAnswerTd.closest("tr");
      if (!tr) return;

      const correctTd = Array.from(tr.querySelectorAll("td")).find(
        (td) => td.dataset.hmaNormalized === "1" && td.dataset.correctAnswer
      );
      if (!correctTd) return;

      const p = yourAnswerTd.querySelector("p");
      if (!p || !p.dataset.correctness) return;

      const correctness = p.dataset.correctness.toLowerCase();
      const isCorrect = correctness === "correct";
      const isIncorrect = correctness === "incorrect";

      const hide =
        mode === "all" ||
        (mode === "correct" && isCorrect) ||
        (mode === "incorrect" && isIncorrect);

      const div = correctTd.querySelector("div");
      if (div) {
        div.style.display = hide ? "none" : "";
      }
    });
}

function createDropdown(initialValue) {
  const existing = document.getElementById("hma-container");
  if (existing) return existing;

  const container = document.createElement("div");
  container.id = "hma-container";

  container.style.position = "fixed";
  container.style.top = "10px";
  container.style.right = "10px";
  container.style.zIndex = 2147483647;
  container.style.fontFamily = "Segoe UI, Tahoma, Geneva, Verdana, sans-serif";
  container.style.userSelect = "none";

  const labelSpan = document.createElement("span");
  labelSpan.textContent = MODE_LABELS[initialValue] || "Default";

  const button = document.createElement("button");
  button.type = "button";
  button.style.padding = "6px 12px";
  button.style.fontSize = "13px";
  button.style.cursor = "pointer";
  button.style.border = "1px solid #ccc";
  button.style.borderRadius = "6px";
  button.style.background = "#d8e8f9ff";
  button.style.minWidth = "130px";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "space-between";
  button.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
  button.style.userSelect = "none";

  const arrow = document.createElement("span");
  arrow.innerHTML = "&#x25BC;";
  arrow.style.marginLeft = "8px";
  arrow.style.fontSize = "10px";
  arrow.style.color = "#666";

  button.appendChild(labelSpan);
  button.appendChild(arrow);
  container.appendChild(button);

  const dropdown = document.createElement("div");
  dropdown.style.position = "absolute";
  dropdown.style.top = "calc(100% + 6px)";
  dropdown.style.right = "0";
  dropdown.style.background = "#d8e8f9ff";
  dropdown.style.border = "1px solid #8cb5c9ff";
  dropdown.style.borderRadius = "6px";
  dropdown.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
  dropdown.style.minWidth = "130px";
  dropdown.style.display = "none";
  dropdown.style.flexDirection = "column";
  dropdown.style.zIndex = 2147483647;

  Object.entries(MODE_LABELS).forEach(([mode, label]) => {
    const item = document.createElement("div");
    item.textContent = label;
    item.dataset.mode = mode;
    item.style.padding = "8px 12px";
    item.style.cursor = "pointer";
    item.style.fontSize = "13px";

    item.addEventListener("mouseenter", () => {
      item.style.backgroundColor = "#c7d1f2ff";
    });
    item.addEventListener("mouseleave", () => {
      item.style.backgroundColor = "transparent";
    });

    item.addEventListener("click", () => {
      if (currentMode === mode) {
        dropdown.style.display = "none";
        return;
      }
      applyMode(mode);
      currentMode = mode;
      labelSpan.textContent = label;
      updateDropdownColors(dropdown, mode);
      dropdown.style.display = "none";
      browser.storage.local.set({ [STORAGE_KEY]: mode });
    });

    dropdown.appendChild(item);
  });

  updateDropdownColors(dropdown, initialValue);
  container.appendChild(dropdown);

  button.addEventListener("click", () => {
    dropdown.style.display =
      dropdown.style.display === "flex" ? "none" : "flex";
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  if (document.body) document.body.appendChild(container);
  return container;
}

function updateDropdownColors(dropdown, activeMode) {
  const activeBgColor = "#c7d1f2ff";
  dropdown.querySelectorAll("div").forEach((item) => {
    if (item.dataset.mode === activeMode) {
      item.style.backgroundColor = activeBgColor;
      item.style.color = "#2a4bb8";
      item.style.fontWeight = "600";
      item.style.textDecoration = "underline";
    } else {
      item.style.backgroundColor = "transparent";
      item.style.color = "#000";
      item.style.fontWeight = "normal";
      item.style.textDecoration = "none";
    }
  });
}

function installUI(initialMode) {
  if (!document.body) return;
  createDropdown(initialMode);
  currentMode = initialMode;
}

function runDetailsLogic(initialMode) {
  normalizeAll();
  normalizeCorrectAnswerCells();
  applyMode(initialMode);

  if (window.__hmaObserver) window.__hmaObserver.disconnect();
  window.__hmaObserver = new MutationObserver(() => {
    normalizeAll();
    normalizeCorrectAnswerCells();
    applyMode(currentMode);
  });
  window.__hmaObserver.observe(document.body, { childList: true, subtree: true });
}

function init() {
  if (bootUrl === location.href) return;
  bootUrl = location.href;

  browser.storage.local.get(STORAGE_KEY).then((result) => {
    const saved = result[STORAGE_KEY];
    const initialMode = ["none", "all", "correct", "incorrect"].includes(saved)
      ? saved
      : "none";

    installUI(initialMode);

    if (onDetailsPage()) {
      runDetailsLogic(initialMode);
    } else {
      if (window.__hmaObserver) {
        window.__hmaObserver.disconnect();
        window.__hmaObserver = null;
      }
    }
  }).catch((e) => {
    installUI("none");
    if (onDetailsPage()) runDetailsLogic("none");
  });
}

(function start() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  if (urlPoller) clearInterval(urlPoller);
  urlPoller = setInterval(() => {
    if (location.href !== bootUrl) {
      init();
    }
  }, 500);
})();
