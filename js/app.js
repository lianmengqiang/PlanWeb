/**
 * 登录门禁、表单、审阅、历史与项目选择交互
 */
(function () {
  const HOT_TOOLS = [
    "Cursor",
    "ChatGPT",
    "Claude",
    "Gemini",
    "GitHub Copilot",
    "LangChain",
    "RAG 应用",
    "Agent 工作流",
  ];

  const loginGate = document.getElementById("login-gate");
  const loginForm = document.getElementById("login-form");
  const loginNameEl = document.getElementById("login-name");
  const loginTeamEl = document.getElementById("login-team");
  const loginErrorEl = document.getElementById("login-error");
  const appShell = document.getElementById("app-shell");
  const userNameLabel = document.getElementById("user-name-label");
  const userTeamLabel = document.getElementById("user-team-label");
  const logoutBtn = document.getElementById("btn-logout");

  const form = document.getElementById("report-form");
  const projectSelectEl = document.getElementById("project-select");
  const projectEl = document.getElementById("project");
  const projectChipsEl = document.getElementById("project-chips");
  const periodEl = document.getElementById("period");
  const contentEl = document.getElementById("content");
  const progressEl = document.getElementById("progress");
  const errorEl = document.getElementById("form-error");
  const outputEl = document.getElementById("report-output");
  const copyBtn = document.getElementById("btn-copy");

  const scoreEl = document.getElementById("leader-score");
  const commentEl = document.getElementById("leader-comment");
  const autoScoreBtn = document.getElementById("btn-auto-score");
  const autoCommentBtn = document.getElementById("btn-auto-comment");
  const reviewErrorEl = document.getElementById("review-error");

  const historyListEl = document.getElementById("history-list");
  const clearHistoryBtn = document.getElementById("btn-clear-history");

  let currentReport = "";
  let lastSubmit = null;
  let currentHistoryId = null;
  let reviewSaveTimer = null;

  /**
   * @param {string} message
   */
  function showLoginError(message) {
    if (!message) {
      loginErrorEl.hidden = true;
      loginErrorEl.textContent = "";
      return;
    }
    loginErrorEl.hidden = false;
    loginErrorEl.textContent = message;
  }

  /**
   * @param {string} message
   */
  function showError(message) {
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  /**
   * @param {string} message
   */
  function showReviewError(message) {
    if (!message) {
      reviewErrorEl.hidden = true;
      reviewErrorEl.textContent = "";
      return;
    }
    reviewErrorEl.hidden = false;
    reviewErrorEl.textContent = message;
  }

  /**
   * @param {boolean} enabled
   */
  function setReviewEnabled(enabled) {
    scoreEl.disabled = !enabled;
    commentEl.disabled = !enabled;
    autoScoreBtn.disabled = !enabled;
    autoCommentBtn.disabled = !enabled;
  }

  /**
   * 同步下拉框与输入框、芯片高亮
   * @param {string} value
   */
  function syncProjectUI(value) {
    const text = String(value || "").trim();
    projectEl.value = text;

    const options = Array.from(projectSelectEl.options).map(function (opt) {
      return opt.value;
    });
    if (text && options.indexOf(text) >= 0) {
      projectSelectEl.value = text;
    } else if (text) {
      projectSelectEl.value = "__custom__";
    } else {
      projectSelectEl.value = "";
    }

    Array.from(projectChipsEl.querySelectorAll(".chip")).forEach(function (chip) {
      chip.classList.toggle("is-active", chip.dataset.value === text);
    });
  }

  /** 渲染热门工具芯片 */
  function renderProjectChips() {
    projectChipsEl.innerHTML = "";
    HOT_TOOLS.forEach(function (tool) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.value = tool;
      chip.textContent = tool;
      chip.addEventListener("click", function () {
        syncProjectUI(tool);
      });
      projectChipsEl.appendChild(chip);
    });
  }

  /**
   * @param {number} ts
   * @returns {string}
   */
  function formatTime(ts) {
    const d = new Date(ts);
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  /**
   * @param {string} text
   * @param {number} max
   * @returns {string}
   */
  function previewText(text, max) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return "暂无评价";
    return t.length > max ? t.slice(0, max) + "…" : t;
  }

  function persistReviewToHistory() {
    if (!currentHistoryId) return;
    const scoreRaw = scoreEl.value;
    const score =
      scoreRaw === "" || Number.isNaN(Number(scoreRaw)) ? null : Number(scoreRaw);
    window.ReportHistory.update(currentHistoryId, {
      score: score,
      comment: commentEl.value.trim(),
    });
    renderHistoryList();
  }

  function scheduleReviewSave() {
    window.clearTimeout(reviewSaveTimer);
    reviewSaveTimer = window.setTimeout(persistReviewToHistory, 400);
  }

  function resetWorkspace() {
    currentReport = "";
    lastSubmit = null;
    currentHistoryId = null;
    form.reset();
    progressEl.value = "80";
    syncProjectUI("");
    outputEl.textContent = "填写左侧信息后点击「生成周报」";
    outputEl.classList.add("is-empty");
    copyBtn.disabled = true;
    scoreEl.value = "";
    commentEl.value = "";
    setReviewEnabled(false);
    showError("");
    showReviewError("");
  }

  /**
   * @param {{ name: string, team: string }} session
   */
  function enterApp(session) {
    window.ReportHistory.setUser(session.name);
    userNameLabel.textContent = session.name;
    userTeamLabel.textContent = session.team || "未填写团队";
    loginGate.hidden = true;
    loginGate.classList.add("is-hidden");
    appShell.hidden = false;
    appShell.classList.remove("is-hidden");
    resetWorkspace();
    renderHistoryList();
  }

  function showLogin() {
    appShell.hidden = true;
    appShell.classList.add("is-hidden");
    loginGate.hidden = false;
    loginGate.classList.remove("is-hidden");
    showLoginError("");
  }

  function renderHistoryList() {
    const list = window.ReportHistory.load();
    historyListEl.innerHTML = "";

    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "暂无历史记录，生成周报后会自动保存在这里。";
      historyListEl.appendChild(empty);
      return;
    }

    list.forEach(function (item) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item" + (item.id === currentHistoryId ? " is-active" : "");
      btn.dataset.id = item.id;

      const main = document.createElement("div");
      main.className = "history-item-main";

      const title = document.createElement("p");
      title.className = "history-item-title";
      title.textContent = item.project || "未命名项目";

      const meta = document.createElement("p");
      meta.className = "history-item-meta";
      meta.textContent =
        (item.period || "未填周期") +
        " · 完成 " +
        (item.progress != null ? item.progress + "%" : "—") +
        " · " +
        formatTime(item.updatedAt || item.createdAt);

      const preview = document.createElement("p");
      preview.className = "history-item-preview";
      preview.textContent = item.comment
        ? previewText(item.comment, 90)
        : previewText(item.report, 90);

      main.appendChild(title);
      main.appendChild(meta);
      main.appendChild(preview);

      const side = document.createElement("div");
      side.className = "history-item-side";

      const scoreBadge = document.createElement("span");
      scoreBadge.className = "history-score" + (item.score == null ? " is-empty" : "");
      scoreBadge.textContent = item.score == null ? "未评分" : item.score + " 分";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "history-delete";
      del.dataset.id = item.id;
      del.textContent = "删除";

      side.appendChild(scoreBadge);
      side.appendChild(del);
      btn.appendChild(main);
      btn.appendChild(side);
      historyListEl.appendChild(btn);
    });
  }

  /**
   * @param {object} item
   */
  function restoreHistoryItem(item) {
    syncProjectUI(item.project || "");
    periodEl.value = item.period || "";
    contentEl.value = item.content || "";
    progressEl.value = item.progress != null ? String(item.progress) : "0";

    currentReport = item.report || "";
    lastSubmit = {
      project: item.project || "",
      period: item.period || "",
      content: item.content || "",
      progress: Number(item.progress) || 0,
    };
    currentHistoryId = item.id;

    outputEl.textContent = currentReport || "（该条历史无周报文案）";
    outputEl.classList.toggle("is-empty", !currentReport);
    outputEl.classList.remove("is-animating");
    void outputEl.offsetWidth;
    outputEl.classList.add("is-animating");

    scoreEl.value = item.score == null ? "" : String(item.score);
    commentEl.value = item.comment || "";

    copyBtn.disabled = !currentReport;
    setReviewEnabled(true);
    showError("");
    showReviewError("");
    renderHistoryList();
  }

  /**
   * @returns {{ project: string, period: string, content: string, progress: number } | null}
   */
  function readForm() {
    const project = projectEl.value.trim();
    const period = periodEl.value.trim();
    const content = contentEl.value.trim();
    const progressRaw = progressEl.value;

    if (!project) {
      showError("请选择或填写学习项目。");
      projectEl.focus();
      return null;
    }
    if (!period) {
      showError("请填写学习周期。");
      periodEl.focus();
      return null;
    }
    if (!content) {
      showError("请填写学习内容。");
      contentEl.focus();
      return null;
    }
    if (progressRaw === "" || Number.isNaN(Number(progressRaw))) {
      showError("请填写 0–100 的完成百分比。");
      progressEl.focus();
      return null;
    }

    const progress = Number(progressRaw);
    if (progress < 0 || progress > 100) {
      showError("完成情况需在 0 到 100 之间。");
      progressEl.focus();
      return null;
    }

    showError("");
    return { project, period, content, progress };
  }

  /**
   * @param {string} text
   * @param {{ project: string, period: string, content: string, progress: number }} data
   */
  function renderReport(text, data) {
    currentReport = text;
    lastSubmit = data;
    outputEl.textContent = text;
    outputEl.classList.remove("is-empty");
    outputEl.classList.remove("is-animating");
    void outputEl.offsetWidth;
    outputEl.classList.add("is-animating");
    copyBtn.disabled = false;
    copyBtn.textContent = "一键复制";
    copyBtn.classList.remove("is-success", "is-error");
    setReviewEnabled(true);
    showReviewError("");

    scoreEl.value = "";
    commentEl.value = "";
    const record = window.ReportHistory.add({
      project: data.project,
      period: data.period,
      content: data.content,
      progress: data.progress,
      report: text,
      score: null,
      comment: "",
    });
    currentHistoryId = record.id;
    renderHistoryList();
  }

  /**
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_) {}
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
    if (!ok) throw new Error("copy failed");
  }

  /**
   * @param {HTMLButtonElement} btn
   * @param {string} okText
   * @param {string} failText
   * @param {boolean} ok
   * @param {string} restoreText
   */
  function flashButton(btn, okText, failText, ok, restoreText) {
    btn.textContent = ok ? okText : failText;
    btn.classList.toggle("is-success", ok);
    btn.classList.toggle("is-error", !ok);
    window.setTimeout(function () {
      btn.textContent = restoreText;
      btn.classList.remove("is-success", "is-error");
    }, 1600);
  }

  // —— 登录 / 退出 ——
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      const session = window.Auth.login({
        name: loginNameEl.value,
        team: loginTeamEl.value,
      });
      showLoginError("");
      enterApp(session);
    } catch (err) {
      showLoginError(err.message || "登录失败");
      loginNameEl.focus();
    }
  });

  logoutBtn.addEventListener("click", function () {
    window.Auth.logout();
    showLogin();
  });

  // —— 学习项目：下拉 / 输入 / 芯片 ——
  renderProjectChips();

  projectSelectEl.addEventListener("change", function () {
    const value = projectSelectEl.value;
    if (!value) {
      syncProjectUI("");
      return;
    }
    if (value === "__custom__") {
      projectEl.focus();
      Array.from(projectChipsEl.querySelectorAll(".chip")).forEach(function (chip) {
        chip.classList.remove("is-active");
      });
      return;
    }
    syncProjectUI(value);
  });

  projectEl.addEventListener("input", function () {
    syncProjectUI(projectEl.value);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = readForm();
    if (!data) return;
    renderReport(window.buildWeeklyReport(data), data);
  });

  autoScoreBtn.addEventListener("click", function () {
    if (!lastSubmit) {
      showReviewError("请先生成周报，再进行打分。");
      return;
    }
    scoreEl.value = String(window.suggestLeaderScore(lastSubmit));
    showReviewError("");
    persistReviewToHistory();
    flashButton(autoScoreBtn, "已打分", "打分失败", true, "一键打分");
  });

  autoCommentBtn.addEventListener("click", function () {
    if (!lastSubmit) {
      showReviewError("请先生成周报，再生成评价。");
      return;
    }
    let score = Number(scoreEl.value);
    if (scoreEl.value === "" || Number.isNaN(score)) {
      score = window.suggestLeaderScore(lastSubmit);
      scoreEl.value = String(score);
    }
    if (score < 0 || score > 100) {
      showReviewError("审阅分数需在 0 到 100 之间。");
      scoreEl.focus();
      return;
    }
    commentEl.value = window.buildLeaderReview({
      project: lastSubmit.project,
      progress: lastSubmit.progress,
      content: lastSubmit.content,
      score: score,
    });
    showReviewError("");
    persistReviewToHistory();
    flashButton(autoCommentBtn, "已生成", "生成失败", true, "自动生成评价");
  });

  scoreEl.addEventListener("input", scheduleReviewSave);
  commentEl.addEventListener("input", scheduleReviewSave);

  copyBtn.addEventListener("click", async function () {
    if (!currentReport || copyBtn.disabled) return;
    try {
      await copyText(currentReport);
      flashButton(copyBtn, "已复制", "请手动复制", true, "一键复制");
    } catch (err) {
      flashButton(copyBtn, "已复制", "请手动复制", false, "一键复制");
      const range = document.createRange();
      range.selectNodeContents(outputEl);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });

  historyListEl.addEventListener("click", function (event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const deleteBtn = target.closest(".history-delete");
    if (deleteBtn) {
      event.stopPropagation();
      const id = deleteBtn.dataset.id;
      window.ReportHistory.remove(id);
      if (currentHistoryId === id) currentHistoryId = null;
      renderHistoryList();
      return;
    }

    const itemBtn = target.closest(".history-item");
    if (!itemBtn) return;
    const found = window.ReportHistory.load().find(function (item) {
      return item.id === itemBtn.dataset.id;
    });
    if (found) restoreHistoryItem(found);
  });

  clearHistoryBtn.addEventListener("click", function () {
    if (!window.ReportHistory.load().length) return;
    if (!window.confirm("确定清空当前用户的全部历史记录？此操作不可恢复。")) return;
    window.ReportHistory.clear();
    currentHistoryId = null;
    renderHistoryList();
  });

  // 启动：已登录则直进工作台，否则显示封面
  const existing = window.Auth.getSession();
  if (existing) {
    enterApp(existing);
  } else {
    showLogin();
  }
})();
