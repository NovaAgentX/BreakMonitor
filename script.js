// ==========================================================================
// TEAM CLOCK — front-end logic
// ==========================================================================

// 1. Google Apps Script Web App URL
// REQUIRED: Replace this with your deployed Apps Script Web App URL
// (Extensions > Apps Script > Deploy > New deployment > Web app > copy URL).
const API_URL = "https://script.google.com/macros/s/AKfycbxKgbIUDaNuGpStu2tVJ0xrwVK47G3TwSnWfDGe6Ht1hO6FPIqmHpDJE5bCVccrKkZk/exec";

const TOKEN_KEY = "teamclock_token";
const USER_KEY = "teamclock_user";

const ROLES = [
  "Team Lead",
  "SEO Manager",
  "SEO Executive",
  "Social Media Manager",
  "Social Media Executive",
  "Software Developer",
  "Digital Marketing Executive",
  "Digital Marketing Specialist"
];

const ROLE_COLOR_VAR = {
  "Team Lead": "--role-teamlead",
  "SEO Manager": "--role-seomgr",
  "SEO Executive": "--role-seoexec",
  "Social Media Manager": "--role-smmgr",
  "Social Media Executive": "--role-smexec",
  "Software Developer": "--role-dev",
  "Digital Marketing Executive": "--role-dmexec",
  "Digital Marketing Specialist": "--role-dmspec"
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

  const loginForm = document.getElementById("loginForm");
  const resetForm = document.getElementById("resetForm");
  const loginSwitchLine = document.getElementById("loginSwitchLine");
  const resetSwitchLine = document.getElementById("resetSwitchLine");
  const showResetLink = document.getElementById("showResetLink");
  const showLoginLink = document.getElementById("showLoginLink");

  // Toggle between the Sign In form and the Reset Password form.
  // Same flow for both Team Lead and employee accounts — the backend
  // looks the username up by row, it doesn't care which role it is.
  function showResetForm() {
    loginForm.classList.remove("active");
    resetForm.classList.add("active");
    loginSwitchLine.style.display = "none";
    resetSwitchLine.style.display = "";
  }
  function showLoginForm() {
    resetForm.classList.remove("active");
    loginForm.classList.add("active");
    resetSwitchLine.style.display = "none";
    loginSwitchLine.style.display = "";
  }
  if (showResetLink) showResetLink.addEventListener("click", showResetForm);
  if (showLoginLink) showLoginLink.addEventListener("click", showLoginForm);

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

  // Reset password submit (works for Team Lead and employee accounts alike)
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("resetUsername").value.trim();
      const newPassword = document.getElementById("resetNewPassword").value;
      const confirmPassword = document.getElementById("resetConfirmPassword").value;
      const errorEl = document.getElementById("resetError");
      const submitBtn = document.getElementById("resetSubmitBtn");
      errorEl.textContent = "";

      if (newPassword.length < 6) {
        errorEl.textContent = "New password must be at least 6 characters.";
        return;
      }
      if (newPassword !== confirmPassword) {
        errorEl.textContent = "New password and confirmation do not match.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-dot"></span> Resetting...`;
      try {
        const res = await apiCall("resetPassword", { username, newPassword });
        if (res && res.success) {
          showToast("Password reset. Please sign in.", "success");
          resetForm.reset();
          showLoginForm();
          document.getElementById("loginUsername").value = username;
        } else {
          errorEl.textContent = (res && res.error) || "Could not reset password. Please try again.";
        }
      } catch (err) {
        errorEl.textContent = "Something went wrong. Please try again.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Reset Password";
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

  document.getElementById("changePasswordBtn").addEventListener("click", async () => {
    const newPassword = window.prompt("Enter a new password (at least 6 characters):");
    if (newPassword === null) return;
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    const res = await apiCall("changePassword", { newPassword });
    if (res && res.success) {
      showToast("Password updated.", "success");
    } else {
      showToast((res && res.error) || "Could not update password.", "error");
    }
  });

  // ---- Privacy: only a Team Lead can see team-wide info. Everyone else
  // only ever sees their own login/logout and break data. ----
  const isTeamLead = user.role === "Team Lead";
  const teamLeadPanel = document.getElementById("teamLeadPanel");
  const teamStatusPanel = document.getElementById("teamStatusPanel");
  const teamHistoryPanel = document.getElementById("teamHistoryPanel");
  if (isTeamLead) {
    if (teamLeadPanel) teamLeadPanel.style.display = "";
    if (teamStatusPanel) teamStatusPanel.style.display = "";
    if (teamHistoryPanel) teamHistoryPanel.style.display = "";
  }

  // ---- Team Lead: Add Employee ----
  const newEmpRoleSelect = document.getElementById("newEmpRole");
  if (newEmpRoleSelect) {
    ROLES.filter((r) => r !== "Team Lead").forEach((role) => {
      const opt = document.createElement("option");
      opt.value = role;
      opt.textContent = role;
      newEmpRoleSelect.appendChild(opt);
    });
  }
  const addEmployeeForm = document.getElementById("addEmployeeForm");
  if (addEmployeeForm) {
    addEmployeeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = document.getElementById("newEmpFullName").value.trim();
      const username = document.getElementById("newEmpUsername").value.trim();
      const role = document.getElementById("newEmpRole").value;
      const password = document.getElementById("newEmpPassword").value;
      const errorEl = document.getElementById("addEmployeeError");
      const submitBtn = document.getElementById("addEmployeeSubmitBtn");
      errorEl.textContent = "";

      if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-dot"></span> Adding...`;
      try {
        const res = await apiCall("signup", { fullName, username, role, password });
        if (res && res.success) {
          showToast(fullName + " can now sign in.", "success");
          addEmployeeForm.reset();
          if (isTeamLead) loadTeamStatus();
        } else {
          errorEl.textContent = (res && res.error) || "Could not add employee.";
        }
      } catch (err) {
        errorEl.textContent = "Something went wrong. Please try again.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add Employee";
      }
    });
  }

  // ---- Team Lead: Team History (full login/logout + break history for
  // anyone on the team, including the Team Lead's own username) ----
  const teamHistorySelect = document.getElementById("teamHistorySelect");
  const teamHistoryContent = document.getElementById("teamHistoryContent");
  const teamHistoryEmptyNote = document.getElementById("teamHistoryEmptyNote");
  const teamHistTabAttendance = document.getElementById("teamHistTabAttendance");
  const teamHistTabBreaks = document.getElementById("teamHistTabBreaks");
  const teamHistoryAttendanceWrap = document.getElementById("teamHistoryAttendanceWrap");
  const teamHistoryBreaksWrap = document.getElementById("teamHistoryBreaksWrap");

  if (teamHistTabAttendance) {
    teamHistTabAttendance.addEventListener("click", () => {
      teamHistTabAttendance.classList.add("active");
      teamHistTabBreaks.classList.remove("active");
      teamHistoryAttendanceWrap.style.display = "block";
      teamHistoryBreaksWrap.style.display = "none";
    });
  }
  if (teamHistTabBreaks) {
    teamHistTabBreaks.addEventListener("click", () => {
      teamHistTabBreaks.classList.add("active");
      teamHistTabAttendance.classList.remove("active");
      teamHistoryBreaksWrap.style.display = "block";
      teamHistoryAttendanceWrap.style.display = "none";
    });
  }

  async function loadTeamMemberHistory(username) {
    teamHistoryContent.style.display = "none";
    teamHistoryEmptyNote.style.display = "";
    teamHistoryEmptyNote.textContent = "Loading history\u2026";
    const res = await apiCall("getTeamMemberHistory", { username, limit: 25 });
    if (!res || !res.success) {
      teamHistoryEmptyNote.textContent = (res && res.error) || "Could not load history.";
      return;
    }
    teamHistoryEmptyNote.style.display = "none";
    teamHistoryContent.style.display = "";

    const attTbody = document.getElementById("teamAttendanceHistoryTbody");
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

    const brkTbody = document.getElementById("teamBreaksHistoryTbody");
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

  if (teamHistorySelect) {
    teamHistorySelect.addEventListener("change", () => {
      const username = teamHistorySelect.value;
      if (!username) {
        teamHistoryContent.style.display = "none";
        teamHistoryEmptyNote.style.display = "";
        teamHistoryEmptyNote.textContent = "Pick a team member above to see their full history.";
        return;
      }
      loadTeamMemberHistory(username);
    });
  }


  let serverOffsetMs = 0;
  const clockTimeEl = document.getElementById("liveClockTime");
  const clockDateEl = document.getElementById("liveClockDate");

  // Built manually (not via toLocaleString) so the clock always renders in
  // plain Western digits, even on devices/browsers set to an Arabic locale
  // (which otherwise substitute Arabic-Indic numerals like ٠١٢٣).
  const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function tickClock() {
    const ms = Date.now() + serverOffsetMs;
    const now = new Date(Number.isFinite(ms) ? ms : Date.now());
    clockTimeEl.textContent = pad2(now.getHours()) + ":" + pad2(now.getMinutes()) + ":" + pad2(now.getSeconds());
    clockDateEl.textContent = WEEKDAY_NAMES[now.getDay()] + ", " + MONTH_NAMES[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
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
      statusPillWrap.innerHTML = `<span class="punch-status-pill status-working"><span class="dot"></span> Logged In</span>`;
    } else if (status === "onBreak") {
      statusPillWrap.innerHTML = `<span class="punch-status-pill status-onbreak"><span class="dot"></span> On ${escapeHtml(activeBreak.breakType)}</span>`;
    } else {
      statusPillWrap.innerHTML = `<span class="punch-status-pill status-offline"><span class="dot"></span> Logged Out</span>`;
    }

    // Main clock button
    clockBtn.disabled = false;
    if (status === "clockedOut") {
      clockBtn.className = "punch-btn-main btn-clockin";
      clockBtnLabel.textContent = "Login";
    } else {
      clockBtn.className = "punch-btn-main btn-clockout";
      clockBtnLabel.textContent = "Logout";
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
      // Prefer the raw epoch millis from the server (immune to date-string
      // parsing quirks); fall back to 0 (device time) if it's ever missing.
      serverOffsetMs = Number.isFinite(res.serverEpoch) ? res.serverEpoch - Date.now() : 0;
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

  // ---- Team status board (Team Lead only — everyone else only sees their own data) ----
  // Includes the Team Lead's own row alongside every employee's, so a Team
  // Lead always sees the whole team's live status and history, themself included.
  const teamListWrap = document.getElementById("teamListWrap");
  const teamStatsRow = document.getElementById("teamStatsRow");


  function renderTeamStats(team) {
    if (!teamStatsRow) return;
    let working = 0, onBreak = 0, offline = 0;
    team.forEach((m) => {
      if (m.currentStatus === "Working") working++;
      else if (m.currentStatus === "On Break") onBreak++;
      else offline++;
    });
    teamStatsRow.innerHTML = `
      <div class="team-stat-chip stat-working"><span class="num">${working}</span><span class="lbl">Working</span></div>
      <div class="team-stat-chip stat-onbreak"><span class="num">${onBreak}</span><span class="lbl">On Break</span></div>
      <div class="team-stat-chip stat-offline"><span class="num">${offline}</span><span class="lbl">Offline</span></div>`;
  }

  function populateTeamHistorySelect(team) {
    if (!teamHistorySelect) return;
    const currentValue = teamHistorySelect.value;
    teamHistorySelect.innerHTML = `<option value="">Select a team member&hellip;</option>` + team.map((m) => {
      const label = m.fullName + (m.role === "Team Lead" ? " (you)" : " — " + m.role);
      return `<option value="${escapeHtml(m.username)}">${escapeHtml(label)}</option>`;
    }).join("");
    if (currentValue) teamHistorySelect.value = currentValue;
  }

  async function loadTeamStatus() {
    if (!isTeamLead) return;
    const res = await apiCall("getTeamStatus");
    if (res && res.success) {
      const team = res.team || [];
      renderTeamStats(team);
      populateTeamHistorySelect(team);
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
  if (isTeamLead) {
    loadTeamStatus();
    setInterval(loadTeamStatus, 20000);
  }

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
