/**
 * 周报文案提炼与模板拼接（纯函数，不依赖 DOM）
 */

/**
 * 将学习内容拆成要点列表
 * @param {string} raw
 * @returns {string[]}
 */
function extractPoints(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  // 先按换行拆分
  let parts = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-\*\d.、]+/, "").trim())
    .filter(Boolean);

  // 单行但含多分句时，按中文/英文分句符号拆开
  if (parts.length === 1 && /[；;。！？!?]/.test(parts[0])) {
    const sentences = parts[0]
      .split(/[；;。！？!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 1) {
      parts = sentences;
    }
  }

  // 最多保留 5 条，避免周报过长
  return parts.slice(0, 5);
}

/**
 * 将要点提炼为叙述句
 * @param {string[]} points
 * @returns {string}
 */
function refineBody(points) {
  if (!points.length) {
    return "本周已围绕既定主题推进学习，具体细节待补充。";
  }

  if (points.length === 1) {
    const p = points[0];
    // 去掉末尾已有标点，统一收束
    const cleaned = p.replace(/[。！？.!?；;]+$/, "");
    return `主要完成：${cleaned}。`;
  }

  // 多条要点：前几条用顿号/逗号串联，末条收尾
  const normalized = points.map((p) => p.replace(/[。！？.!?；;]+$/, ""));
  if (normalized.length === 2) {
    return `主要完成：${normalized[0]}；同时推进了${normalized[1]}。`;
  }

  const head = normalized.slice(0, -1).join("；");
  const last = normalized[normalized.length - 1];
  return `主要完成：${head}；并收尾跟进了${last}。`;
}

/**
 * 按完成度选择收尾语气
 * @param {number} progress
 * @returns {string}
 */
function progressClosing(progress) {
  const p = Number(progress);
  if (p >= 90) {
    return "本周目标基本达成，可进入复盘与巩固。";
  }
  if (p >= 60) {
    return "主体推进已完成，仍有少量收尾工作。";
  }
  if (p >= 30) {
    return "已启动并有阶段性产出，进度待加速。";
  }
  return "目前处于起步摸索阶段，下周需聚焦关键突破。";
}

/**
 * 生成周报全文
 * @param {{ project: string, period: string, content: string, progress: number }} input
 * @returns {string}
 */
function buildWeeklyReport(input) {
  const project = String(input.project || "").trim();
  const period = String(input.period || "").trim();
  const progress = Math.max(0, Math.min(100, Math.round(Number(input.progress) || 0)));
  const points = extractPoints(input.content);
  const body = refineBody(points);
  const closing = progressClosing(progress);

  return (
    `【AI 学习周报】本周围绕「${project}」开展学习（周期：${period}）。` +
    `${body}` +
    `整体完成度约 ${progress}%，${closing}`
  );
}

/**
 * 根据完成度与内容充实度给出建议分数（0–100）
 * @param {{ progress: number, content: string }} input
 * @returns {number}
 */
function suggestLeaderScore(input) {
  const progress = Math.max(0, Math.min(100, Number(input.progress) || 0));
  const points = extractPoints(input.content);
  // 内容充实度微调：0～3 条约 -4～+4，再截断到 0–100
  const depthBonus = Math.max(-4, Math.min(4, (points.length - 2) * 2));
  return Math.max(0, Math.min(100, Math.round(progress + depthBonus)));
}

/**
 * 生成本地模板批阅评价
 * @param {{ project: string, progress: number, content: string, score: number }} input
 * @returns {string}
 */
function buildLeaderReview(input) {
  const project = String(input.project || "").trim() || "本周学习";
  const progress = Math.max(0, Math.min(100, Math.round(Number(input.progress) || 0)));
  const score = Math.max(0, Math.min(100, Math.round(Number(input.score) || 0)));
  const points = extractPoints(input.content);
  const highlight = points.length
    ? points[0].replace(/[。！？.!?；;]+$/, "")
    : "既定学习目标";

  let gradeLine = "";
  let advice = "";
  if (score >= 90) {
    gradeLine = "整体表现优秀，目标闭环清晰。";
    advice = "建议下周做一次复盘沉淀，并把可复用经验同步给团队。";
  } else if (score >= 75) {
    gradeLine = "推进扎实，主体任务完成较好。";
    advice = "建议把剩余缺口列成清单，优先闭环高价值事项。";
  } else if (score >= 60) {
    gradeLine = "已形成阶段性产出，但仍有提升空间。";
    advice = "建议压缩并行事项，集中精力突破关键卡点。";
  } else if (score >= 40) {
    gradeLine = "学习已启动，但完成度与产出厚度不足。";
    advice = "建议明确下周可验收里程碑，并提高每日投入密度。";
  } else {
    gradeLine = "本周进展偏慢，需尽快调整节奏。";
    advice = "建议与导师对齐优先级，先完成最小可验证成果。";
  }

  return (
    `【领导者审阅】关于「${project}」：自评完成度 ${progress}%，审阅得分 ${score} 分。` +
    `关注点「${highlight}」——${gradeLine}${advice}`
  );
}

/**
 * 将周报与审阅合并为可复制全文
 * @param {string} report
 * @param {{ score: number, comment: string }} review
 * @returns {string}
 */
function buildFullExport(report, review) {
  const score = Math.round(Number(review.score));
  const comment = String(review.comment || "").trim();
  const parts = [String(report || "").trim()];
  if (!Number.isNaN(score) && review.score !== "" && review.score != null) {
    parts.push(`审阅得分：${score} 分`);
  }
  if (comment) {
    parts.push(comment);
  }
  return parts.filter(Boolean).join("\n\n");
}

// 挂到全局，供 app.js 使用
window.buildWeeklyReport = buildWeeklyReport;
window.suggestLeaderScore = suggestLeaderScore;
window.buildLeaderReview = buildLeaderReview;
window.buildFullExport = buildFullExport;
