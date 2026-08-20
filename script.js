// ==========================================================================
// TEAM CLOCK — front-end logic
// ==========================================================================

// 1. Google Apps Script Web App URL
// REQUIRED: Replace this with your deployed Apps Script Web App URL
// (Extensions > Apps Script > Deploy > New deployment > Web app > copy URL).
const API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";

const TOKEN_KEY = "teamclock_token";
const USER_KEY = "teamclock_user";

const ROLES = [
  "Team Lead",
  "SEO Manager",
  "SEO Executive",
  "Social Media Manager",
  "Social Media Executive",
  "Software Developer"
];

const ROLE_COLOR_VAR = {
  "Team Lead": "--role-teamlead",
  "SEO Manager": "--role-seomgr",
  "SEO Executive": "--role-seoexec",
  "Social Media Manager": "--role-smmgr",
  "Social Media Executive": "--role-smexec",
  "Software Developer": "--role-dev"
};

const BREAK_TYPES = [
  { type: "Casual Break", icon: "☕" },
  { type: "Lunch Break", icon: "🍽️" },
  { type: "Tea-time Break", icon: "🍵" },
  { type: "Breakfast Break", icon: "🥐" }
];

function isConfiguredUrl() {
  return API_URL && API_URL.indexOf("YOUR_GOOGLE_APPS_SCRIPT") === -1;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function roleColorVar(role) {
  return "var(" + (ROLE_COLOR_VAR[role] || "--brand") + ")";
}
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0] && parts[0][0]) || "") + ((parts[1] && parts[1][0]) || "");
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type) {
  const toast = document.getElementById("toastMsg");
  const text = document.getElementById("toastText");
  if (!toast || !text) return;
  text.textContent = message;
  toast.className = "toast-msg show toast-" + (type || "success");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

// ==========================================================================
// API CALL (GET with query params — avoids Apps Script POST/CORS quirk)
// ==========================================================================
async function apiCall(action, params) {
  params = params || {};
  const token = getToken();
  const body = Object.assign({ action: action }, params, token ? { token: token } : {});

  if (!isConfiguredUrl()) {
    return { success: false, error: "API_URL is not configured in script.js yet." };
  }

  try {
    const qs = new URLSearchParams();
    Object.keys(body).forEach((key) => {
      const value = body[key];
      if (value === undefined || value === null) return;
      qs.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    });

    const response = await fetch(`${API_URL}?${qs.toString()}`, { method: "GET" });
    if (!response.ok) {
      return { success: false, error: "Server returned " + response.status };
    }
    return await response.json();
  } catch (err) {
    return { success: false, error: "Could not reach the server: " + err.message };
  }
}

// ==========================================================================
// SPLASH SCREEN (both pages briefly show it; skipped fast on repeat visits)
// ==========================================================================
function runSplash(onDone) {
  const splash = document.getElementById("splashScreen");
  if (!splash) {
    onDone();
    return;
  }
  const SPLASH_DURATION = 1900;
  setTimeout(() => {
    splash.classList.add("splash-hide");
    setTimeout(() => {
      splash.remove();
      onDone();
    }, 550);
  }, SPLASH_DURATION);
}

// ==========================================================================
// PAGE: INDEX (auth)
// ==========================================================================
function initAuthPage() {
  runSplash(() => {
    // If already logged in, skip straight to dashboard
    if (getToken()) {
      window.location.href = "dashboard.html";
      return;
    }
    const authWrap = document.getElementById("authWrap");
    if (authWrap) authWrap.classList.add("auth-reveal");
  });

  // Populate role dropdown
  const roleSelect = document.getElementById("signupRole");
  if (roleSelect) {
    ROLES.forEach((role) => {
      const opt = document.createElement("option");
      opt.value = role;
      opt.textContent = role;
      roleSelect.appendChild(opt);
    });
  }

  // Tab switching
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabSignupBtn = document.getElementById("tabSignupBtn");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authSwitchLine = document.getElementById("authSwitchLine");
  const switchToSignupBtn = document.getElementById("switchToSignupBtn");

  function showLogin() {
    tabLoginBtn.classList.add("active");
    tabSignupBtn.classList.remove("active");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
    authSwitchLine.innerHTML = `New here? <button type="button" id="switchToSignupBtn2">Create an account</button>`;
    document.getElementById("switchToSignupBtn2").addEventListener("click", showSignup);
  }
  function showSignup() {
    tabSignupBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
    authSwitchLine.innerHTML = `Already have an account? <button type="button" id="switchToLoginBtn2">Sign in</button>`;
    document.getElementById("switchToLoginBtn2").addEventListener("click", showLogin);
  }

  if (tabLoginBtn) tabLoginBtn.addEventListener("click", showLogin);
  if (tabSignupBtn) tabSignupBtn.addEventListener("click", showSignup);
  if (switchToSignupBtn) switchToSignupBtn.addEventListener("click", showSignup);

  // Password visibility toggles
  document.querySelectorAll(".password-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.getAttribute("data-target"));
      if (!target) return;
      target.type = target.type === "password" ? "text" : "password";
    });
  });

  // Login submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value;
      const errorEl = document.getElementById("loginError");
      const submitBtn = document.getElementById("loginSubmitBtn");
      errorEl.textContent = "";

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-dot"></span> Signing in...`;
      try {
        const res = await apiCall("login", { username, password });
        if (res && res.success) {
          saveSession(res.token, res.user);
          showToast("Welcome back, " + res.user.fullName.split(" ")[0] + "!", "success");
          setTimeout(() => (window.location.href = "dashboard.html"), 400);
        } else {
          errorEl.textContent = (res && res.error) || "Login failed. Please try again.";
        }
      } catch (err) {
        errorEl.textContent = "Something went wrong. Please try again.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
      }
    });
  }

  // Signup submit
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = document.getElementById("signupFullName").value.trim();
      const username = document.getElementById("signupUsername").value.trim();
      const role = document.getElementById("signupRole").value;
      const password = document.getElementById("signupPassword").value;
      const errorEl = document.getElementById("signupError");
      const submitBtn = document.getElementById("signupSubmitBtn");
      errorEl.textContent = "";

      if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-dot"></span> Creating account...`;
      try {
        const res = await apiCall("signup", { fullName, username, role, password });
        if (res && res.success) {
          showToast("Account created! Signing you in...", "success");
          const loginRes = await apiCall("login", { username, password });
          if (loginRes && loginRes.success) {
            saveSession(loginRes.token, loginRes.user);
            setTimeout(() => (window.location.href = "dashboard.html"), 400);
          } else {
            showLogin();
          }
        } else {
          errorEl.textContent = (res && res.error) || "Could not create account.";
        }
      } catch (err) {
        errorEl.textContent = "Something went wrong. Please try again.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
    });
  }
}

// ==========================================================================
// PAGE: DASHBOARD
// ==========================================================================
function initDashboardPage() {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) {
    window.location.href = "index.html";
    return;
  }

  runSplash(() => {});

  // Top bar
  document.getElementById("topUserName").textContent = user.fullName;
  document.getElementById("topUserRole").textContent = user.role;
  const avatarEl = document.getElementById("topUserAvatar");
  avatarEl.textContent = initials(user.fullName).toUpperCase();
  avatarEl.style.background = roleColorVar(user.role);

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try { await apiCall("logout"); } catch (e) {}
    clearSession();
    window.location.href = "index.html";
  });

  // ---- Live clock (ticks locally, syncs with server once on load) ----
  let serverOffsetMs = 0;
  const clockTimeEl = document.getElementById("liveClockTime");
  const clockDateEl = document.getElementById("liveClockDate");

  function tickClock() {
    const now = new Date(Date.now() + serverOffsetMs);
    clockTimeEl.textContent = now.toLocaleTimeString("en-US", { hour12: false });
    clockDateEl.textContent = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ---- Break buttons ----
  const breakButtonsGrid = document.getElementById("breakButtonsGrid");
  breakButtonsGrid.innerHTML = BREAK_TYPES.map(
    (b) => `<button class="break-btn" data-break="${escapeHtml(b.type)}" disabled><span style="font-size:18px;">${b.icon}</span>${escapeHtml(b.type)}</button>`
  ).join("");

  let currentStatus = null; // 'clockedOut' | 'working' | 'onBreak'

  const clockBtn = document.getElementById("clockBtn");
  const clockBtnLabel = document.getElementById("clockBtnLabel");
  const statusPillWrap = document.getElementById("statusPillWrap");
  const activeBreakBannerWrap = document.getElementById("activeBreakBannerWrap");

  function renderStatusUI(status, activeBreak) {
    currentStatus = status;

    // Status pill
    if (status === "working") {
      statusPillWrap.innerHTML = `<span class="punch-status-pill status-working"><span class="dot"></span> Clocked In</span>`;
    } else if (status === "onBreak") {
      statusPillWrap.innerHTML = `<span class="punch-status-pill status-onbreak"><span class="dot"></span> On ${escapeHtml(activeBreak.breakType)}</span>`;
    } else {
      statusPillWrap.innerHTML = `<span class="punch-status-pill status-offline"><span class="dot"></span> Clocked Out</span>`;
    }

    // Main clock button
    clockBtn.disabled = false;
    if (status === "clockedOut") {
      clockBtn.className = "punch-btn-main btn-clockin";
      clockBtnLabel.textContent = "Clock In";
    } else {
      clockBtn.className = "punch-btn-main btn-clockout";
      clockBtnLabel.textContent = "Clock Out";
      if (status === "onBreak") clockBtn.disabled = true; // must end break first
    }

    // Break buttons
    document.querySelectorAll(".break-btn").forEach((btn) => {
      const isThisActive = activeBreak && btn.getAttribute("data-break") === activeBreak.breakType;
      btn.classList.toggle("active-break", !!isThisActive);
      btn.disabled = status !== "working" && !isThisActive;
      if (status === "onBreak" && !isThisActive) btn.disabled = true;
    });

    // Active break banner
    if (activeBreak) {
      activeBreakBannerWrap.innerHTML = `
        <div class="active-break-banner">
          <span>On ${escapeHtml(activeBreak.breakType)} since ${escapeHtml(activeBreak.startTime)}</span>
          <button class="btn-end-break" id="endBreakBtn">End Break</button>
        </div>`;
      document.getElementById("endBreakBtn").addEventListener("click", handleEndBreak);
    } else {
      activeBreakBannerWrap.innerHTML = "";
    }
  }

  async function loadMyStatus() {
    const res = await apiCall("getMyStatus");
    if (res && res.success) {
      serverOffsetMs = new Date(res.serverDate + "T" + res.serverTime).getTime() - Date.now();
      if (res.activeBreak) {
        renderStatusUI("onBreak", res.activeBreak);
      } else if (res.activeSession) {
        renderStatusUI("working", null);
      } else {
        renderStatusUI("clockedOut", null);
      }
    } else {
      clockBtnLabel.textContent = "Retry";
      clockBtn.disabled = false;
      showToast((res && res.error) || "Could not load your status", "error");
    }
  }
  loadMyStatus();

  function stampFlash(el) {
    el.classList.add("stamping");
    setTimeout(() => el.classList.remove("stamping"), 450);
  }

  clockBtn.addEventListener("click", async () => {
    clockBtn.disabled = true;
    const action = currentStatus === "clockedOut" ? "clockIn" : "clockOut";
    const res = await apiCall(action);
    if (res && res.success) {
      stampFlash(clockBtn);
      showToast(res.message || "Done", "success");
      loadMyStatus();
      loadHistory();
      loadTeamStatus();
    } else {
      showToast((res && res.error) || "Action failed", "error");
      clockBtn.disabled = false;
    }
  });

  breakButtonsGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".break-btn");
    if (!btn || btn.disabled) return;
    const breakType = btn.getAttribute("data-break");
    btn.disabled = true;
    const res = await apiCall("startBreak", { breakType });
    if (res && res.success) {
      stampFlash(btn);
      showToast(res.message || "Break started", "success");
      loadMyStatus();
      loadHistory();
      loadTeamStatus();
    } else {
      showToast((res && res.error) || "Could not start break", "error");
      loadMyStatus();
    }
  });

  async function handleEndBreak() {
    const btn = document.getElementById("endBreakBtn");
    if (btn) btn.disabled = true;
    const res = await apiCall("endBreak");
    if (res && res.success) {
      showToast(res.message || "Break ended", "success");
      loadMyStatus();
      loadHistory();
      loadTeamStatus();
    } else {
      showToast((res && res.error) || "Could not end break", "error");
      loadMyStatus();
    }
  }

  // ---- Team status board ----
  const teamListWrap = document.getElementById("teamListWrap");
  async function loadTeamStatus() {
    const res = await apiCall("getTeamStatus");
    if (res && res.success) {
      const team = res.team || [];
      if (team.length === 0) {
        teamListWrap.innerHTML = `<div class="empty-note">No teammates yet.</div>`;
        return;
      }
      teamListWrap.innerHTML = team.map((m) => {
        let statusHtml;
        if (m.currentStatus === "Working") {
          statusHtml = `<span class="team-row-status" style="background:rgba(34,211,165,0.12);color:var(--success);">Working</span>`;
        } else if (m.currentStatus === "On Break") {
          statusHtml = `<span class="team-row-status" style="background:rgba(255,176,32,0.12);color:var(--warning);">${escapeHtml(m.breakType)}</span>`;
        } else {
          statusHtml = `<span class="team-row-status" style="background:rgba(92,98,128,0.15);color:var(--text-muted);">Offline</span>`;
        }
        return `
          <div class="team-row">
            <div class="team-row-avatar" style="background:${roleColorVar(m.role)};">${escapeHtml(initials(m.fullName).toUpperCase())}</div>
            <div class="team-row-info">
              <div class="team-row-name">${escapeHtml(m.fullName)}</div>
              <div class="team-row-role">${escapeHtml(m.role)}</div>
            </div>
            ${statusHtml}
          </div>`;
      }).join("");
    } else {
      teamListWrap.innerHTML = `<div class="empty-note">Could not load team status.</div>`;
    }
  }
  loadTeamStatus();
  setInterval(loadTeamStatus, 20000);

  // ---- History tabs ----
  const histTabAttendance = document.getElementById("histTabAttendance");
  const histTabBreaks = document.getElementById("histTabBreaks");
  const historyAttendanceWrap = document.getElementById("historyAttendanceWrap");
  const historyBreaksWrap = document.getElementById("historyBreaksWrap");

  histTabAttendance.addEventListener("click", () => {
    histTabAttendance.classList.add("active");
    histTabBreaks.classList.remove("active");
    historyAttendanceWrap.style.display = "block";
    historyBreaksWrap.style.display = "none";
  });
  histTabBreaks.addEventListener("click", () => {
    histTabBreaks.classList.add("active");
    histTabAttendance.classList.remove("active");
    historyBreaksWrap.style.display = "block";
    historyAttendanceWrap.style.display = "none";
  });

  async function loadHistory() {
    const res = await apiCall("getMyHistory", { limit: 25 });
    if (!res || !res.success) return;

    const attTbody = document.getElementById("attendanceHistoryTbody");
    const records = res.attendance || [];
    if (records.length === 0) {
      attTbody.innerHTML = `<tr><td colspan="4" class="empty-note">No clock-in records yet.</td></tr>`;
    } else {
      attTbody.innerHTML = records.map((r) => `
        <tr>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.loginTime)}</td>
          <td>${r.logoutTime ? escapeHtml(r.logoutTime) : '<span style="color:var(--text-faint)">-</span>'}</td>
          <td>${r.status === "Logged In" ? '<span style="color:var(--success);font-weight:700;">Active</span>' : '<span style="color:var(--text-muted);">Completed</span>'}</td>
        </tr>`).join("");
    }

    const brkTbody = document.getElementById("breaksHistoryTbody");
    const breaks = res.breaks || [];
    if (breaks.length === 0) {
      brkTbody.innerHTML = `<tr><td colspan="5" class="empty-note">No breaks logged yet.</td></tr>`;
    } else {
      brkTbody.innerHTML = breaks.map((b) => `
        <tr>
          <td>${escapeHtml(b.breakType)}</td>
          <td>${escapeHtml(b.date)}</td>
          <td>${escapeHtml(b.startTime)}</td>
          <td>${b.endTime ? escapeHtml(b.endTime) : '<span style="color:var(--text-faint)">-</span>'}</td>
          <td>${b.duration ? escapeHtml(b.duration) : '<span style="color:var(--warning);font-weight:700;">Ongoing</span>'}</td>
        </tr>`).join("");
    }
  }
  loadHistory();
}

// ==========================================================================
// BOOTSTRAP
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("loginForm")) {
    initAuthPage();
  } else if (document.getElementById("clockBtn")) {
    initDashboardPage();
  }
});
