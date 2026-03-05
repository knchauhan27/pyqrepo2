/**
 * ============================================================
 * RepoMed — subject.js  (v3)
 * Dynamic PYQ Subject Page Logic
 *
 * Changes in v3:
 *   • Year, Topic, Subtopic → multi-select chip groups (like Type)
 *   • "Last 5 Years" / "Last 10 Years" quick-select buttons
 *   • PDF export via jsPDF (cover page + watermark + footer)
 *   • CSV export retained
 *
 * Architecture:
 *   State   → Single source of truth for all filters/sort/search
 *   Data    → Loaded once, never mutated
 *   Derived → Filtered+sorted array computed from State
 *   Render  → Pure DOM update from Derived
 * ============================================================
 */

"use strict";

/* ============================================================
   MODULE: App State
   All sets are multi-select; empty set = "All" (no filter).
   ============================================================ */
const State = (() => {
  let _state = {
    subject: "",
    allQuestions: [],
    searchQuery: "",
    filters: {
      years: new Set(), // ← now multi-select Set
      topics: new Set(), // ← now multi-select Set
      subtopics: new Set(), // ← now multi-select Set
      marks: "", // single select (dropdown)
      types: new Set(), // multi-select (unchanged)
    },
    sort: { by: "year", order: "desc" },
  };

  return {
    get: (key) => (key ? _state[key] : { ..._state }),
    set: (key, value) => {
      _state[key] = value;
    },

    // Generic toggle for any Set-based filter
    toggleSetFilter: (filterKey, value) => {
      const s = _state.filters[filterKey];
      s.has(value) ? s.delete(value) : s.add(value);
    },

    // Replace a Set filter entirely (used for last-5/last-10)
    setSetFilter: (filterKey, valuesArray) => {
      _state.filters[filterKey] = new Set(valuesArray);
    },

    setFilter: (key, value) => {
      _state.filters[key] = value;
    },
    getFilter: (key) => _state.filters[key],

    resetFilters: () => {
      _state.filters = {
        years: new Set(),
        topics: new Set(),
        subtopics: new Set(),
        marks: "",
        types: new Set(),
      };
      _state.searchQuery = "";
    },

    setSort: (key, value) => {
      _state.sort[key] = value;
    },
    getSort: () => ({ ..._state.sort }),
  };
})();

/* ============================================================
   MODULE: Data Loader
   ============================================================ */
const DataLoader = (() => {
  const SUBJECT_FILE_MAP = {
    Anatomy: "anat.json",
    Biochemistry: "biochem.json",
    ENT: "ent.json",
    FM: "fmt.json",
    Medicine: "med.json",
    Micro: "micro.json",
    Obstetrics: "obs.json",
    Gynaecology: "gynae.json",
    Ophthal: "ophthal.json",
    Patho: "patho.json",
    Pediatrics: "pediatrics.json",
    Pharmac: "pharmac.json",
    Physiology: "physio.json",
    "PSM/CM": "psm.json",
    Surgery: "surgery.json",
  };

  async function loadData(subject) {
    const filename = SUBJECT_FILE_MAP[subject];
    if (!filename)
      throw new Error(`No data file mapped for subject: "${subject}"`);
    const response = await fetch(`./data/${filename}`);
    if (!response.ok)
      throw new Error(
        `Failed to load ./data/${filename} — HTTP ${response.status}`,
      );
    return response.json();
  }

  return { loadData };
})();

/* ============================================================
   MODULE: Filter Engine
   All pure functions — no side effects.
   ============================================================ */
const FilterEngine = (() => {
  function uniqueSorted(arr, field, numeric = false) {
    const vals = [
      ...new Set(
        arr
          .map((q) => q[field])
          .filter((v) => v !== undefined && v !== null && v !== ""),
      ),
    ];
    return numeric
      ? vals.sort((a, b) => a - b)
      : vals.sort((a, b) => String(a).localeCompare(String(b)));
  }

  /**
   * getFilteredSet — applies ALL active filters + search.
   * For multi-select Sets: empty Set = match all; non-empty = must be in Set.
   */
  function getFilteredSet(questions, filters, searchQuery) {
    const { years, topics, subtopics, marks, types } = filters;
    const query = searchQuery.trim().toLowerCase();

    return questions.filter((q) => {
      if (years.size > 0 && !years.has(q.year)) return false;
      if (topics.size > 0 && !topics.has(q.topic)) return false;
      if (subtopics.size > 0 && !subtopics.has(q.subtopic)) return false;
      if (marks && String(q.marks) !== marks) return false;
      if (types.size > 0 && !types.has(q.type)) return false;
      if (query && !q.question.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  /**
   * getCascadePool — returns questions relevant for computing
   * downstream filter options, applying only UPPER-level filters.
   *
   * level: 'topics' | 'subtopics' | 'marks'
   */
  function getCascadePool(questions, filters, level) {
    const { years, topics, subtopics, types } = filters;
    const query = State.get("searchQuery").trim().toLowerCase();

    return questions.filter((q) => {
      if (types.size > 0 && !types.has(q.type)) return false;
      if (query && !q.question.toLowerCase().includes(query)) return false;

      if (level === "topics") {
        if (years.size > 0 && !years.has(q.year)) return false;
      }
      if (level === "subtopics") {
        if (years.size > 0 && !years.has(q.year)) return false;
        if (topics.size > 0 && !topics.has(q.topic)) return false;
      }
      if (level === "marks") {
        if (years.size > 0 && !years.has(q.year)) return false;
        if (topics.size > 0 && !topics.has(q.topic)) return false;
        if (subtopics.size > 0 && !subtopics.has(q.subtopic)) return false;
      }
      return true;
    });
  }

  function sortResults(arr, by, order) {
    const dir = order === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const av = a[by],
        bv = b[by];
      if (typeof av === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  /**
   * getLastNYears — returns the N most-recent years found in dataset (desc).
   */
  function getLastNYears(questions, n) {
    const all = uniqueSorted(questions, "year", true);
    return all.slice(-n); // last N from ascending list = most recent N
  }

  return {
    uniqueSorted,
    getFilteredSet,
    getCascadePool,
    sortResults,
    getLastNYears,
  };
})();

/* ============================================================
   MODULE: DOM Helpers
   ============================================================ */
const DOM = (() => {
  const _cache = {};

  function get(id) {
    if (!_cache[id]) _cache[id] = document.getElementById(id);
    return _cache[id];
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text, query) {
    if (!query || !query.trim()) return escHtml(text);
    const re = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    return escHtml(text).replace(re, '<mark class="q-highlight">$1</mark>');
  }

  function typeClass(type) {
    const map = { LAQ: "laq", SAQ: "saq", VSQ: "vsq", CASE: "case" };
    return map[type?.toUpperCase()] || "default";
  }

  /**
   * buildChipGroup — renders a chip group inside a container element.
   * @param {HTMLElement} container
   * @param {Array}       values       — all available values
   * @param {Set}         activeSet    — currently selected values
   * @param {Function}    labelFn      — optional value → display label
   */
  function buildChipGroup(container, values, activeSet, labelFn) {
    container.innerHTML = "";
    values.forEach((v) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "type-chip" + (activeSet.has(v) ? " active" : "");
      btn.textContent = labelFn ? labelFn(v) : v;
      btn.dataset.value = String(v);
      btn.setAttribute("aria-pressed", activeSet.has(v) ? "true" : "false");
      container.appendChild(btn);
    });
  }

  // Rebuild marks <select> (single-select, unchanged)
  function rebuildSelect(selectEl, values, allLabel, isNumeric = false) {
    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">${allLabel}</option>`;
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = isNumeric ? String(v) : v;
      opt.textContent = isNumeric ? `${v}m` : v;
      selectEl.appendChild(opt);
    });
    if (current && [...selectEl.options].some((o) => o.value === current)) {
      selectEl.value = current;
    }
  }

  return { get, escHtml, highlight, typeClass, buildChipGroup, rebuildSelect };
})();

/* ============================================================
   MODULE: Renderer
   ============================================================ */
const Renderer = (() => {
  function renderCards(questions, searchQuery) {
    const list = DOM.get("questions-list");
    const empty = DOM.get("empty-state");
    const meta = DOM.get("results-meta");

    if (questions.length === 0) {
      list.innerHTML = "";
      empty.hidden = false;
      meta.innerHTML = "";
      return;
    }

    empty.hidden = true;

    const frag = document.createDocumentFragment();
    questions.forEach((q) => {
      const article = document.createElement("article");
      article.className = "q-card";
      article.setAttribute("role", "listitem");
      article.innerHTML = buildCardHTML(q, searchQuery);
      frag.appendChild(article);
    });

    list.innerHTML = "";
    list.appendChild(frag);

    const total = State.get("allQuestions").length;
    meta.innerHTML = `Showing <strong>${questions.length}</strong> of <strong>${total}</strong> questions`;
  }

  function buildCardHTML(q, searchQuery) {
    const typeKey = DOM.typeClass(q.type);
    const examLabel = q.exam ? DOM.escHtml(q.exam) : "";
    const partLabel = q.part ? `Part ${q.part}` : "";
    const titleStr = `${DOM.escHtml(q.subject)} (${q.year}) — ${q.marks}m ${DOM.escHtml(q.type)}${partLabel ? " · " + partLabel : ""}`;

    return `
      <div class="q-card-header">
        <span class="q-card-title">${titleStr}</span>
        <div class="q-card-meta-pills">
          <span class="pill-marks">${q.marks}m</span>
          <span class="pill-type pill-type--${typeKey}">${DOM.escHtml(q.type)}</span>
        </div>
      </div>
      <p class="q-card-question">${DOM.highlight(q.question, searchQuery.toLowerCase())}</p>
      <div class="q-card-footer">
        <span class="tag">
          ${DOM.escHtml(q.topic)}
          <span class="tag-arrow">→</span>
          ${DOM.escHtml(q.subtopic)}
        </span>
        ${examLabel ? `<span class="tag tag-exam">${examLabel}</span>` : ""}
        <span class="tag tag-college">${DOM.escHtml(q.college)}</span>
      </div>
    `;
  }

  /** Rebuild all filter chip groups + marks select (cascade-aware) */
  function renderFilterDropdowns() {
    const all = State.get("allQuestions");
    const filters = State.get("filters");

    // --- YEARS (multi-chip, full dataset, desc) ---
    const years = FilterEngine.uniqueSorted(all, "year", true).reverse();
    DOM.buildChipGroup(DOM.get("filter-year"), years, filters.years, (v) =>
      String(v),
    );

    // --- TOPICS (multi-chip, cascade after years) ---
    const topicPool = FilterEngine.getCascadePool(all, filters, "topics");
    const topics = FilterEngine.uniqueSorted(topicPool, "topic");
    DOM.buildChipGroup(DOM.get("filter-topic"), topics, filters.topics);

    // --- SUBTOPICS (multi-chip, cascade after years+topics) ---
    const subtopicPool = FilterEngine.getCascadePool(all, filters, "subtopics");
    const subtopics = FilterEngine.uniqueSorted(subtopicPool, "subtopic");
    DOM.buildChipGroup(
      DOM.get("filter-subtopic"),
      subtopics,
      filters.subtopics,
    );

    // Dim subtopic group if no topic selected
    const subWrap = DOM.get("filter-subtopic");
    subWrap.style.opacity = filters.topics.size === 0 ? "0.45" : "1";
    subWrap.style.pointerEvents = filters.topics.size === 0 ? "none" : "";

    // --- MARKS (single <select>, cascade after years+topics+subtopics) ---
    const marksPool = FilterEngine.getCascadePool(all, filters, "marks");
    const marks = FilterEngine.uniqueSorted(marksPool, "marks", true);
    DOM.rebuildSelect(DOM.get("filter-marks"), marks, "All Marks", true);
    DOM.get("filter-marks").value = filters.marks;
  }

  /** Render type chips (static after load) */
  function renderTypeChips(allTypes) {
    DOM.buildChipGroup(
      DOM.get("filter-type"),
      allTypes,
      State.getFilter("types"),
    );
  }

  /** Active filter badge count on the Filters button */
  function renderFilterBadge() {
    const f = State.get("filters");
    const s = State.get("searchQuery");
    let count =
      f.years.size +
      f.topics.size +
      f.subtopics.size +
      f.types.size +
      (f.marks ? 1 : 0) +
      (s.trim() ? 1 : 0);

    const badge = DOM.get("filter-badge");
    if (count > 0) {
      badge.textContent = count;
      badge.classList.add("visible");
    } else {
      badge.classList.remove("visible");
      badge.textContent = "";
    }
  }

  return {
    renderCards,
    renderFilterDropdowns,
    renderTypeChips,
    renderFilterBadge,
  };
})();

/* ============================================================
   MODULE: PDF Export  (requires jsPDF loaded globally)
   ============================================================ */
const PDFExport = (() => {
  function cleanText(text) {
    return String(text)
      .replace(/\*\*/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n+/g, " ")
      .trim();
  }

  function addCoverPage(doc, subject, filters) {
    let y = 38;

    // ── Title block ──
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("RepoMed PYQ Repository", 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Developed & Maintained by @brainspirebaroda", 105, y, {
      align: "center",
    });
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text("Best wishes for your examinations.", 105, y, { align: "center" });
    y += 6;
    doc.text("May consistent revision bring confidence and success.", 105, y, {
      align: "center",
    });
    y += 16;

    // ── Subject badge ──
    doc.setFillColor(91, 76, 245);
    doc.roundedRect(70, y, 70, 12, 3, 3, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(subject, 105, y + 8.5, { align: "center" });
    y += 22;

    // ── Divider ──
    doc.setDrawColor(220);
    doc.line(20, y, 190, y);
    y += 10;

    // ── Applied Filters table ──
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Applied Filters", 20, y);
    y += 9;

    const rows = [
      ["Years", filters.years || "All"],
      ["Topics", filters.topics || "All"],
      ["Subtopics", filters.subtopics || "All"],
      ["Marks", filters.marks || "All"],
      ["Types", filters.types || "All"],
    ];

    doc.setFont("helvetica", "normal");
    rows.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80);
      doc.text(`${label}:`, 24, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30);
      const wrapped = doc.splitTextToSize(value, 140);
      doc.text(wrapped, 60, y);
      y += wrapped.length * 6 + 2;
    });

    y += 6;
    doc.setDrawColor(220);
    doc.line(20, y, 190, y);

    // ── Bottom note ──
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text(
      "Generated for academic use only. Not for commercial redistribution.",
      105,
      268,
      { align: "center" },
    );
    doc.text("brainspirebaroda@gmail.com  |  www.repomed.in", 105, 274, {
      align: "center",
    });
  }

  function addFooters(doc) {
    const pageCount = doc.getNumberOfPages();
    const date = new Date().toLocaleString();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `brainspirebaroda@gmail.com  |  www.repomed.in  |  Downloaded: ${date}`,
        10,
        291,
      );
      doc.text(`Page ${i} of ${pageCount}`, 195, 291, { align: "right" });
      // thin line above footer
      doc.setDrawColor(220);
      doc.line(10, 287, 200, 287);
    }
  }

  function addWatermark(doc) {
    const pageCount = doc.getNumberOfPages();
    const gState = new doc.GState({ opacity: 0.07 });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.saveGraphicsState();
      doc.setGState(gState);
      doc.setFontSize(80);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("BRAINSPIRE", pw / 2 + 30, ph / 2 + 60, {
        angle: 45,
        align: "center",
      });
      doc.restoreGraphicsState();
    }
  }

  function groupByTopic(arr) {
    const map = {};
    arr.forEach((q) => {
      if (!map[q.topic]) map[q.topic] = [];
      map[q.topic].push(q);
    });
    return map;
  }

  function generate(filteredQuestions, subject, filterSummary) {
    if (!window.jspdf) {
      alert(
        "jsPDF library not loaded. Add the jsPDF <script> tag to subject.html.",
      );
      return;
    }
    if (filteredQuestions.length === 0) {
      alert("No questions to export. Adjust your filters first.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // ── PAGE 1: Cover ──
    addCoverPage(doc, subject, filterSummary);

    // ── PAGE 2+: Content ──
    doc.addPage();
    let y = 14;

    const grouped = groupByTopic(filteredQuestions);

    Object.keys(grouped)
      .sort()
      .forEach((topic) => {
        // Topic heading
        if (y > 265) {
          doc.addPage();
          y = 14;
        }

        doc.setFillColor(237, 233, 254); // accent-light
        doc.roundedRect(10, y - 4, 190, 9, 2, 2, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(91, 76, 245);
        doc.text(cleanText(topic), 14, y + 2.5);
        y += 10;

        let qNo = 1;
        grouped[topic].forEach((q) => {
          doc.setFontSize(9.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 30, 30);

          const meta = `(${q.exam}, ${q.year}, ${q.marks}m, P${q.part || "—"}, ${cleanText(q.subtopic)})`;
          const line = `${qNo}. ${cleanText(q.question)}`;
          const wrapped = doc.splitTextToSize(line, 178);

          // Page break check
          if (y + wrapped.length * 5 + 6 > 283) {
            doc.addPage();
            y = 14;
          }

          // Question text
          doc.text(wrapped, 14, y);
          y += wrapped.length * 5;

          // Meta pill line
          doc.setFontSize(8);
          doc.setTextColor(130);
          doc.text(meta, 16, y);
          y += 6.5;

          qNo++;
        });

        y += 4; // gap between topics
      });

    // ── Watermark + Footers (applied to all pages) ──
    addWatermark(doc);
    addFooters(doc);

    const filename = `${subject}_PYQs_RepoMed.pdf`;
    doc.save(filename);
  }

  return { generate };
})();

/* ============================================================
   MODULE: CSV Export
   ============================================================ */
function exportCSV(filteredRows, subject) {
  if (filteredRows.length === 0) {
    alert("No questions to export.");
    return;
  }
  const headers = [
    "id",
    "college",
    "subject",
    "part",
    "year",
    "exam",
    "marks",
    "type",
    "topic",
    "subtopic",
    "question",
  ];
  const lines = [
    headers.join(","),
    ...filteredRows.map((q) =>
      headers
        .map((h) => `"${String(q[h] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject}_PYQs.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   MODULE: Event Handlers
   ============================================================ */
const Events = (() => {
  let _allTypes = [];

  function wireAll() {
    // ── Filter panel toggle ──
    DOM.get("btn-toggle-filters").addEventListener("click", () => {
      const panel = DOM.get("filter-panel");
      const btn = DOM.get("btn-toggle-filters");
      const isOpen = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
      panel.setAttribute("aria-hidden", String(!isOpen));
    });

    // ── YEAR chips (event delegation) ──
    DOM.get("filter-year").addEventListener("click", (e) => {
      const chip = e.target.closest(".type-chip");
      if (!chip) return;
      const val = Number(chip.dataset.value);
      State.toggleSetFilter("years", val);
      // Cascade: reset topics + subtopics when year selection changes
      State.setSetFilter("topics", []);
      State.setSetFilter("subtopics", []);
      applyAndRender();
    });

    // ── TOPIC chips ──
    DOM.get("filter-topic").addEventListener("click", (e) => {
      const chip = e.target.closest(".type-chip");
      if (!chip) return;
      State.toggleSetFilter("topics", chip.dataset.value);
      // Cascade: reset subtopics when topic changes
      State.setSetFilter("subtopics", []);
      applyAndRender();
    });

    // ── SUBTOPIC chips ──
    DOM.get("filter-subtopic").addEventListener("click", (e) => {
      const chip = e.target.closest(".type-chip");
      if (!chip) return;
      State.toggleSetFilter("subtopics", chip.dataset.value);
      applyAndRender();
    });

    // ── MARKS select ──
    DOM.get("filter-marks").addEventListener("change", (e) => {
      State.setFilter("marks", e.target.value);
      applyAndRender();
    });

    // ── TYPE chips ──
    DOM.get("filter-type").addEventListener("click", (e) => {
      const chip = e.target.closest(".type-chip");
      if (!chip) return;
      State.toggleSetFilter("types", chip.dataset.value);
      Renderer.renderTypeChips(_allTypes);
      applyAndRender();
    });

    // ── Last 5 / Last 10 years ──
    DOM.get("btn-last5").addEventListener("click", () => {
      const top5 = FilterEngine.getLastNYears(State.get("allQuestions"), 5);
      State.setSetFilter("years", top5);
      State.setSetFilter("topics", []);
      State.setSetFilter("subtopics", []);
      applyAndRender();
    });

    DOM.get("btn-last10").addEventListener("click", () => {
      const top10 = FilterEngine.getLastNYears(State.get("allQuestions"), 10);
      State.setSetFilter("years", top10);
      State.setSetFilter("topics", []);
      State.setSetFilter("subtopics", []);
      applyAndRender();
    });

    // ── Sort ──
    DOM.get("sort-by").addEventListener("change", (e) => {
      State.setSort("by", e.target.value);
      applyAndRender();
    });
    DOM.get("sort-order").addEventListener("change", (e) => {
      State.setSort("order", e.target.value);
      applyAndRender();
    });

    // ── Search (debounced) ──
    DOM.get("search-input").addEventListener(
      "input",
      debounce((e) => {
        State.set("searchQuery", e.target.value);
        DOM.get("search-clear").hidden = !e.target.value;
        applyAndRender();
      }, 200),
    );

    DOM.get("search-clear").addEventListener("click", () => {
      DOM.get("search-input").value = "";
      State.set("searchQuery", "");
      DOM.get("search-clear").hidden = true;
      applyAndRender();
    });

    // ── Reset ──
    const doReset = () => {
      State.resetFilters();
      DOM.get("search-input").value = "";
      DOM.get("search-clear").hidden = true;
      DOM.get("sort-by").value = "year";
      DOM.get("sort-order").value = "desc";
      State.setSort("by", "year");
      State.setSort("order", "desc");
      Renderer.renderTypeChips(_allTypes);
      applyAndRender();
    };
    DOM.get("btn-reset-filters").addEventListener("click", doReset);
    DOM.get("btn-reset-empty").addEventListener("click", doReset);

    // ── Export button → shows modal with PDF / CSV choice ──
    DOM.get("btn-export").addEventListener("click", () => {
      DOM.get("export-modal").classList.add("open");
    });
    DOM.get("modal-close").addEventListener("click", () => {
      DOM.get("export-modal").classList.remove("open");
    });
    DOM.get("export-modal").addEventListener("click", (e) => {
      if (e.target === DOM.get("export-modal"))
        DOM.get("export-modal").classList.remove("open");
    });

    DOM.get("btn-export-pdf").addEventListener("click", () => {
      DOM.get("export-modal").classList.remove("open");
      triggerPDFExport();
    });
    DOM.get("btn-export-csv").addEventListener("click", () => {
      DOM.get("export-modal").classList.remove("open");
      triggerCSVExport();
    });
  }

  function setAllTypes(types) {
    _allTypes = types;
  }

  return { wireAll, setAllTypes };
})();

/* ============================================================
   UTILITY
   ============================================================ */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function getFilteredAndSorted() {
  const all = State.get("allQuestions");
  const filters = State.get("filters");
  const query = State.get("searchQuery");
  const sort = State.getSort();
  return FilterEngine.sortResults(
    FilterEngine.getFilteredSet(all, filters, query),
    sort.by,
    sort.order,
  );
}

function buildFilterSummary() {
  const f = State.get("filters");
  return {
    years: f.years.size ? [...f.years].sort((a, b) => b - a).join(", ") : "All",
    topics: f.topics.size ? [...f.topics].sort().join(", ") : "All",
    subtopics: f.subtopics.size ? [...f.subtopics].sort().join(", ") : "All",
    marks: f.marks ? `${f.marks}m` : "All",
    types: f.types.size ? [...f.types].sort().join(", ") : "All",
  };
}

function triggerPDFExport() {
  PDFExport.generate(
    getFilteredAndSorted(),
    State.get("subject"),
    buildFilterSummary(),
  );
}

function triggerCSVExport() {
  exportCSV(getFilteredAndSorted(), State.get("subject"));
}

/* ============================================================
   CORE: applyAndRender
   ============================================================ */
function applyAndRender() {
  const sorted = getFilteredAndSorted();
  Renderer.renderCards(sorted, State.get("searchQuery"));
  Renderer.renderFilterDropdowns();
  Renderer.renderFilterBadge();
}

/* ============================================================
   BOOT
   ============================================================ */
async function init() {
  const params = new URLSearchParams(window.location.search);
  const subject = params.get("name") || "Anatomy";
  State.set("subject", subject);

  document.title = `${subject} – RepoMed PYQs`;
  DOM.get("subject-title").textContent = subject;

  DOM.get("loading-state").hidden = false;
  DOM.get("questions-list").innerHTML = "";
  DOM.get("empty-state").hidden = true;

  try {
    const subjectData = await DataLoader.loadData(subject);
    State.set("allQuestions", subjectData);

    const allTypes = [...new Set(subjectData.map((q) => q.type))].sort();
    Events.setAllTypes(allTypes);
    Renderer.renderTypeChips(allTypes);

    Events.wireAll();

    DOM.get("loading-state").hidden = true;
    applyAndRender();
  } catch (err) {
    DOM.get("loading-state").hidden = true;
    DOM.get("questions-list").innerHTML =
      `<p style="color:#ef4444;padding:32px 0;text-align:center">
        Failed to load questions. Please refresh the page.
       </p>`;
    console.error("[RepoMed] Data load error:", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
