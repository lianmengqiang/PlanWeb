/**
 * 周报历史记录（按登录用户隔离，localStorage）
 */
(function () {
  const MAX_ITEMS = 30;

  /** @type {string} */
  let currentUserKey = "";

  /**
   * 绑定当前用户（登录后调用）
   * @param {string} name
   */
  function setUser(name) {
    currentUserKey = window.Auth.userKey(name);
  }

  /**
   * @returns {string}
   */
  function storageKey() {
    if (!currentUserKey) {
      throw new Error("未登录，无法访问历史");
    }
    return "ai-weekly-report-history-v2:" + currentUserKey;
  }

  /**
   * 读取全部历史（新到旧）
   * @returns {Array<object>}
   */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * 写入历史列表
   * @param {Array<object>} list
   */
  function saveHistory(list) {
    localStorage.setItem(storageKey(), JSON.stringify(list.slice(0, MAX_ITEMS)));
  }

  /**
   * 新增一条历史
   * @param {object} item
   * @returns {object}
   */
  function addHistoryItem(item) {
    const list = loadHistory();
    const record = {
      id: "h_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...item,
    };
    list.unshift(record);
    saveHistory(list);
    return record;
  }

  /**
   * 更新指定历史
   * @param {string} id
   * @param {object} patch
   * @returns {object | null}
   */
  function updateHistoryItem(id, patch) {
    const list = loadHistory();
    const index = list.findIndex(function (item) {
      return item.id === id;
    });
    if (index < 0) return null;
    list[index] = Object.assign({}, list[index], patch, { updatedAt: Date.now() });
    saveHistory(list);
    return list[index];
  }

  /**
   * @param {string} id
   */
  function removeHistoryItem(id) {
    saveHistory(
      loadHistory().filter(function (item) {
        return item.id !== id;
      })
    );
  }

  function clearHistory() {
    localStorage.removeItem(storageKey());
  }

  window.ReportHistory = {
    setUser: setUser,
    load: loadHistory,
    add: addHistoryItem,
    update: updateHistoryItem,
    remove: removeHistoryItem,
    clear: clearHistory,
  };
})();
