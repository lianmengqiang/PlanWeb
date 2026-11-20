/**
 * 简易登录会话（本地存储，按姓名区分每个人的数据）
 */
(function () {
  const SESSION_KEY = "ai-weekly-report-session-v1";

  /**
   * @returns {{ name: string, team: string, loginAt: number } | null}
   */
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.name) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  /**
   * @param {{ name: string, team?: string }} input
   * @returns {{ name: string, team: string, loginAt: number }}
   */
  function login(input) {
    const name = String(input.name || "").trim();
    if (!name) {
      throw new Error("请输入姓名");
    }
    const session = {
      name: name,
      team: String(input.team || "").trim(),
      loginAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * 生成可用于存储的用户键
   * @param {string} name
   * @returns {string}
   */
  function userKey(name) {
    return encodeURIComponent(String(name || "").trim().toLowerCase());
  }

  window.Auth = {
    getSession: getSession,
    login: login,
    logout: logout,
    userKey: userKey,
  };
})();
