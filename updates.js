// ================================================================
//  PG MUN 2026 — updates.js
//  Shared module — include on EVERY page
//
//  Handles:
//  - Fetching config (registration status)
//  - Fetching updates/notifications
//  - Homepage registration banner
//  - Updates popup (dismissable stack)
//  - Rendering updates on /updates page
// ================================================================

const PGMUN = (() => {

  // ── CHANGE THIS after Apps Script deployment ──────────────────
  const API_URL = "YOUR_APPS_SCRIPT_EXEC_URL";
  // ─────────────────────────────────────────────────────────────

  const DISMISSED_KEY = "pgmun_dismissed_updates";

  // ── Fetch helpers ────────────────────────────────────────────

  async function fetchConfig() {
    try {
      const res  = await fetch(`${API_URL}?action=getConfig`);
      const data = await res.json();
      return data;
    } catch (e) {
      console.warn("PGMUN: config fetch failed", e);
      return null;
    }
  }

  async function fetchUpdates() {
    try {
      const res  = await fetch(`${API_URL}?action=getUpdates`);
      const data = await res.json();
      return data.updates || [];
    } catch (e) {
      console.warn("PGMUN: updates fetch failed", e);
      return [];
    }
  }

  // ── localStorage dismiss helpers ─────────────────────────────

  function getDismissed() {
    try {
      return JSON.parse(localStorage.getItem(DISMISSED_KEY)) || [];
    } catch { return []; }
  }

  function dismiss(id) {
    const list = getDismissed();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
    }
  }

  function dismissAll(updates) {
    const ids  = updates.map(u => u.id);
    const list = [...new Set([...getDismissed(), ...ids])];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
  }

  // ── Registration Banner ──────────────────────────────────────
  // Inject <div id="pgmun-reg-banner"></div> in your homepage HTML

  const BANNER_CONFIG = {
    priority_open        : { color: "#166534", bg: "#dcfce7", border: "#4ade80", icon: "🟢", text: "Priority Registration is Open!", cta: true  },
    priority_closing_soon: { color: "#92400e", bg: "#fef3c7", border: "#fbbf24", icon: "⚠️", text: "Priority closing soon — last chance!",    cta: true  },
    priority_closed      : { color: "#7f1d1d", bg: "#fee2e2", border: "#f87171", icon: "🔴", text: "Priority Registration closed.",            cta: false },
    round1_open          : { color: "#166534", bg: "#dcfce7", border: "#4ade80", icon: "🟢", text: "Round 1 Registration is Open!",           cta: true  },
    round1_closing_soon  : { color: "#92400e", bg: "#fef3c7", border: "#fbbf24", icon: "⚠️", text: "Round 1 closing soon — register now!",    cta: true  },
    round1_closed        : { color: "#7f1d1d", bg: "#fee2e2", border: "#f87171", icon: "🔴", text: "Round 1 closed.",                         cta: false },
    round2_open          : { color: "#166534", bg: "#dcfce7", border: "#4ade80", icon: "🟢", text: "Round 2 Registration is Open!",           cta: true  },
    round2_closing_soon  : { color: "#92400e", bg: "#fef3c7", border: "#fbbf24", icon: "⚠️", text: "Round 2 closing soon — register now!",    cta: true  },
    round2_closed        : { color: "#7f1d1d", bg: "#fee2e2", border: "#f87171", icon: "🔴", text: "Round 2 closed.",                         cta: false },
    all_closed           : { color: "#374151", bg: "#f3f4f6", border: "#9ca3af", icon: "⚫", text: "Registrations are now closed.",           cta: false },
  };

  async function initBanner() {
    const el = document.getElementById("pgmun-reg-banner");
    if (!el) return;

    const config = await fetchConfig();
    if (!config) return;

    const status = config.registration_status;
    const cfg    = BANNER_CONFIG[status];
    if (!cfg) return;

    let nextLine = "";
    if (!cfg.cta && config.next_round_label && config.next_round_date) {
      nextLine = `<span style="margin-left:12px;font-size:13px;opacity:0.85;">
        ${config.next_round_label} opens ${config.next_round_date}
      </span>`;
    }

    const ctaBtn = cfg.cta
      ? `<a href="/register" style="
            margin-left:16px;padding:7px 18px;
            background:#7B1818;color:#F5F0E8;
            border-radius:4px;text-decoration:none;
            font-size:12px;letter-spacing:2px;text-transform:uppercase;
            font-family:Georgia,serif;white-space:nowrap;">
            Register Now →
          </a>` : "";

    el.innerHTML = `
      <div style="
        background:${cfg.bg};
        border:1px solid ${cfg.border};
        border-radius:6px;
        padding:12px 20px;
        display:flex;
        align-items:center;
        flex-wrap:wrap;
        gap:8px;
        margin:16px 0;
        font-family:Georgia,serif;">
        <span style="font-size:16px;">${cfg.icon}</span>
        <span style="color:${cfg.color};font-size:13px;letter-spacing:1px;font-weight:bold;">
          ${cfg.text}
        </span>
        ${nextLine}
        ${ctaBtn}
      </div>`;
  }

  // ── Updates Popup ─────────────────────────────────────────────
  // Inject <div id="pgmun-popup-root"></div> just before </body>
  // on your homepage ONLY

  async function initPopup() {
    const root = document.getElementById("pgmun-popup-root");
    if (!root) return;

    const updates   = await fetchUpdates();
    const dismissed = getDismissed();
    const fresh     = updates.filter(u => !dismissed.includes(u.id));

    if (fresh.length === 0) return;

    const cards = fresh.map(u => buildPopupCard(u)).join("");

    root.innerHTML = `
      <div id="pgmun-popup" style="
        position:fixed;bottom:24px;right:24px;
        width:340px;max-height:460px;
        background:#1a0808;
        border:1px solid #7B1818;
        border-radius:10px;
        box-shadow:0 8px 32px rgba(0,0,0,0.6);
        z-index:9999;
        display:flex;flex-direction:column;
        font-family:Georgia,serif;
        overflow:hidden;">

        <!-- Popup header -->
        <div style="
          display:flex;align-items:center;justify-content:space-between;
          padding:12px 16px;
          background:#2a0a0a;
          border-bottom:1px solid #3d1a1a;
          flex-shrink:0;">
          <span style="color:#F5F0E8;font-size:11px;letter-spacing:3px;text-transform:uppercase;">
            🔔 Updates <span style="
              background:#7B1818;color:#F5F0E8;
              border-radius:10px;padding:1px 7px;
              font-size:10px;margin-left:4px;">${fresh.length}</span>
          </span>
          <button onclick="PGMUN.closePopup()"
            style="background:none;border:none;color:#8a6a6a;
                   font-size:18px;cursor:pointer;line-height:1;padding:0 4px;">×</button>
        </div>

        <!-- Scrollable cards -->
        <div id="pgmun-popup-cards" style="
          overflow-y:auto;flex:1;padding:12px;
          display:flex;flex-direction:column;gap:10px;">
          ${cards}
        </div>

        <!-- Footer -->
        <div style="
          padding:10px 16px;
          border-top:1px solid #3d1a1a;
          background:#2a0a0a;
          display:flex;justify-content:space-between;
          align-items:center;flex-shrink:0;">
          <button onclick="PGMUN.dismissAllPopup()"
            style="background:none;border:1px solid #7B1818;
                   color:#8B1A1A;padding:6px 14px;border-radius:4px;
                   font-size:10px;letter-spacing:2px;text-transform:uppercase;
                   cursor:pointer;font-family:Georgia,serif;">
            Dismiss All
          </button>
          <a href="/updates"
            style="color:#8B1A1A;font-size:11px;letter-spacing:1px;
                   text-decoration:none;">
            View all →
          </a>
        </div>
      </div>`;

    // Store fresh updates for dismissAll reference
    root._freshUpdates = fresh;
  }

  function buildPopupCard(update) {
    if (update.type === "chair_announcement") {
      return buildChairPopupCard(update);
    }
    const iconMap = { urgent: "❗", general: "ℹ️" };
    const icon    = iconMap[update.type] || "ℹ️";
    const urgentBorder = update.type === "urgent" ? "#7B1818" : "#3d1a1a";

    return `
      <div id="popup-card-${update.id}" style="
        background:#0d0202;
        border:1px solid ${urgentBorder};
        border-radius:6px;padding:12px 14px;
        position:relative;">
        <button onclick="PGMUN.dismissOne('${update.id}')"
          style="position:absolute;top:8px;right:8px;
                 background:none;border:none;color:#5a3a3a;
                 font-size:14px;cursor:pointer;line-height:1;">×</button>
        <div style="color:#F5F0E8;font-size:12px;font-weight:bold;
                    margin-bottom:4px;padding-right:20px;">
          ${icon} ${update.title}
        </div>
        <div style="color:#c4a8a8;font-size:11px;line-height:1.6;">
          ${update.message}
        </div>
        <div style="color:#5a3a3a;font-size:10px;margin-top:6px;letter-spacing:1px;">
          ${update.date}
        </div>
      </div>`;
  }

  function buildChairPopupCard(update) {
    const photo = update.photo_url
      ? `<img src="${update.photo_url}" style="
           width:44px;height:44px;border-radius:50%;
           object-fit:cover;border:2px solid #7B1818;
           flex-shrink:0;" alt="${update.title}">`
      : `<div style="width:44px;height:44px;border-radius:50%;
           background:#2a0a0a;border:2px solid #7B1818;
           flex-shrink:0;display:flex;align-items:center;
           justify-content:center;color:#7B1818;font-size:18px;">👤</div>`;

    return `
      <div id="popup-card-${update.id}" style="
        background:#0d0202;
        border:1px solid #7B1818;
        border-radius:6px;padding:12px 14px;
        position:relative;">
        <button onclick="PGMUN.dismissOne('${update.id}')"
          style="position:absolute;top:8px;right:8px;
                 background:none;border:none;color:#5a3a3a;
                 font-size:14px;cursor:pointer;line-height:1;">×</button>
        <div style="color:#7B1818;font-size:9px;letter-spacing:3px;
                    text-transform:uppercase;margin-bottom:8px;">
          🏛 ${update.committee}
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding-right:20px;">
          ${photo}
          <div>
            <div style="color:#F5F0E8;font-size:13px;font-weight:bold;">${update.title}</div>
            <div style="color:#8B1A1A;font-size:10px;letter-spacing:1px;
                        text-transform:uppercase;">${update.role}</div>
          </div>
        </div>
        ${update.message ? `<div style="color:#c4a8a8;font-size:11px;
          margin-top:8px;line-height:1.5;font-style:italic;">
          "${update.message}"</div>` : ""}
      </div>`;
  }

  // Popup interaction handlers (called from inline onclick)
  function closePopup() {
    const el = document.getElementById("pgmun-popup");
    if (el) el.style.display = "none";
  }

  function dismissOne(id) {
    dismiss(id);
    const card = document.getElementById(`popup-card-${id}`);
    if (card) card.remove();
    // Update badge count
    const cards      = document.getElementById("pgmun-popup-cards");
    const badge      = document.querySelector("#pgmun-popup span span");
    const remaining  = cards ? cards.querySelectorAll("[id^='popup-card-']").length : 0;
    if (badge) badge.textContent = remaining;
    if (remaining === 0) closePopup();
  }

  function dismissAllPopup() {
    const root = document.getElementById("pgmun-popup-root");
    if (root && root._freshUpdates) dismissAll(root._freshUpdates);
    closePopup();
  }

  // ── Updates Page renderer ────────────────────────────────────
  // Inject <div id="pgmun-updates-page"></div> on /updates page

  async function initUpdatesPage() {
    const root = document.getElementById("pgmun-updates-page");
    if (!root) return;

    root.innerHTML = `<p style="color:#8a6a6a;font-size:13px;letter-spacing:2px;">
      LOADING UPDATES...</p>`;

    const updates = await fetchUpdates();

    if (updates.length === 0) {
      root.innerHTML = `<p style="color:#5a3a3a;font-size:13px;letter-spacing:1px;
        text-align:center;padding:40px 0;">No updates yet. Check back soon.</p>`;
      return;
    }

    const filterTypes = ["all", "urgent", "chair_announcement", "general"];
    const filterLabels = {
      all: "All", urgent: "Urgent",
      chair_announcement: "Chair", general: "General"
    };

    const filterBtns = filterTypes.map(f => `
      <button onclick="PGMUN.filterUpdates('${f}')"
        id="pgmun-filter-${f}"
        class="pgmun-filter-btn"
        style="
          padding:7px 18px;border-radius:20px;
          font-family:Georgia,serif;font-size:10px;
          letter-spacing:2px;text-transform:uppercase;
          cursor:pointer;transition:all 0.2s;
          ${f === "all"
            ? "background:#7B1818;color:#F5F0E8;border:1px solid #7B1818;"
            : "background:transparent;color:#8B1A1A;border:1px solid #3d1a1a;"}
        ">
        ${filterLabels[f]}
      </button>`).join("");

    const cards = updates.map(u => buildFullCard(u)).join("");

    root.innerHTML = `
      <!-- Filter tabs -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;">
        ${filterBtns}
      </div>
      <!-- Cards grid -->
      <div id="pgmun-updates-grid" style="
        display:flex;flex-direction:column;gap:16px;">
        ${cards}
      </div>`;

    root._allUpdates = updates;
  }

  function filterUpdates(type) {
    const root  = document.getElementById("pgmun-updates-page");
    const grid  = document.getElementById("pgmun-updates-grid");
    if (!root || !grid) return;

    // Update button styles
    document.querySelectorAll(".pgmun-filter-btn").forEach(btn => {
      const isActive = btn.id === `pgmun-filter-${type}`;
      btn.style.background     = isActive ? "#7B1818" : "transparent";
      btn.style.color          = isActive ? "#F5F0E8" : "#8B1A1A";
      btn.style.borderColor    = isActive ? "#7B1818" : "#3d1a1a";
    });

    const filtered = type === "all"
      ? root._allUpdates
      : root._allUpdates.filter(u => u.type === type);

    grid.innerHTML = filtered.length
      ? filtered.map(u => buildFullCard(u)).join("")
      : `<p style="color:#5a3a3a;font-size:13px;letter-spacing:1px;
           text-align:center;padding:40px 0;">No updates in this category.</p>`;
  }

  function buildFullCard(update) {
    if (update.type === "chair_announcement") return buildChairFullCard(update);

    const typeColor  = update.type === "urgent" ? "#7B1818" : "#2a5a3a";
    const typeBg     = update.type === "urgent" ? "#1a0505" : "#041a0e";
    const typeBorder = update.type === "urgent" ? "#7B1818" : "#1a4a2a";
    const icon       = update.type === "urgent" ? "❗" : "ℹ️";
    const typeLabel  = update.type === "urgent" ? "URGENT" : "GENERAL";

    return `
      <div data-type="${update.type}" style="
        background:${typeBg};
        border:1px solid ${typeBorder};
        border-radius:8px;padding:20px 24px;">
        <div style="display:flex;align-items:center;
                    justify-content:space-between;margin-bottom:10px;">
          <span style="
            color:${typeColor};font-size:9px;letter-spacing:3px;
            text-transform:uppercase;font-weight:bold;">
            ${icon} ${typeLabel}
          </span>
          <span style="color:#4a2a2a;font-size:11px;letter-spacing:1px;">
            ${update.date}
          </span>
        </div>
        <h3 style="color:#F5F0E8;font-size:16px;margin:0 0 8px;
                   font-family:Georgia,serif;font-weight:normal;
                   letter-spacing:1px;">
          ${update.title}
        </h3>
        <p style="color:#c4a8a8;font-size:13px;line-height:1.8;margin:0;">
          ${update.message}
        </p>
      </div>`;
  }

  function buildChairFullCard(update) {
    const photo = update.photo_url
      ? `<img src="${update.photo_url}" style="
           width:80px;height:80px;border-radius:50%;
           object-fit:cover;border:2px solid #7B1818;" alt="${update.title}">`
      : `<div style="width:80px;height:80px;border-radius:50%;
           background:#1a0808;border:2px solid #7B1818;
           display:flex;align-items:center;justify-content:center;
           color:#7B1818;font-size:32px;">👤</div>`;

    return `
      <div data-type="chair_announcement" style="
        background:#0d0202;
        border:1px solid #7B1818;
        border-radius:8px;padding:24px;
        position:relative;overflow:hidden;">

        <!-- Subtle crimson ribbon top-right -->
        <div style="
          position:absolute;top:0;right:24px;
          width:3px;height:48px;background:#7B1818;
          border-radius:0 0 3px 3px;"></div>

        <div style="color:#7B1818;font-size:9px;letter-spacing:3px;
                    text-transform:uppercase;margin-bottom:16px;font-weight:bold;">
          🏛 ${update.committee} — Chair Announcement
        </div>

        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
          ${photo}
          <div>
            <h3 style="color:#F5F0E8;font-size:20px;margin:0 0 4px;
                       font-family:Georgia,serif;font-weight:normal;
                       letter-spacing:2px;">
              ${update.title}
            </h3>
            <div style="
              display:inline-block;
              background:#7B1818;color:#F5F0E8;
              font-size:9px;letter-spacing:2px;text-transform:uppercase;
              padding:3px 10px;border-radius:2px;">
              ${update.role}
            </div>
          </div>
        </div>

        ${update.message ? `
        <div style="
          margin-top:16px;padding-top:16px;
          border-top:1px solid #2a0a0a;">
          <p style="color:#c4a8a8;font-size:13px;line-height:1.8;
                    margin:0;font-style:italic;">
            "${update.message}"
          </p>
        </div>` : ""}

        <div style="color:#4a2a2a;font-size:10px;letter-spacing:1px;margin-top:12px;">
          ${update.date}
        </div>
      </div>`;
  }

  // ── Registration page popup ───────────────────────────────────
  // Inject <div id="pgmun-reg-popup"></div> on /register page only

  async function initRegPopup() {
    const el = document.getElementById("pgmun-reg-popup");
    if (!el) return;

    const config = await fetchConfig();
    if (!config) return;

    const status     = config.registration_status;
    const isOpen     = ["priority_open","priority_closing_soon",
                        "round1_open","round1_closing_soon",
                        "round2_open","round2_closing_soon"].includes(status);
    const isClosed   = status.endsWith("_closed") || status === "all_closed";
    const isUrgent   = status.endsWith("_closing_soon");

    if (!isClosed && !isOpen) return;

    let message = "";
    let nextInfo = "";

    if (status === "priority_open")          message = "Priority Round is now open — register now!";
    if (status === "priority_closing_soon")  message = "Priority Round is closing soon — last chance to register!";
    if (status === "priority_closed")        message = "Priority Registration is now closed.";
    if (status === "round1_open")            message = "Round 1 Registration is now open!";
    if (status === "round1_closing_soon")    message = "Round 1 is closing soon — register now!";
    if (status === "round1_closed")          message = "Round 1 Registration is now closed.";
    if (status === "round2_open")            message = "Round 2 Registration is now open!";
    if (status === "round2_closing_soon")    message = "Round 2 is closing soon — register now!";
    if (status === "round2_closed")          message = "Round 2 Registration is now closed.";
    if (status === "all_closed")             message = "Registrations are now closed.";

    if (isClosed && config.next_round_label && config.next_round_date
        && status !== "all_closed") {
      nextInfo = `${config.next_round_label} opens on <strong>${config.next_round_date}</strong>`;
    }
    if (status === "all_closed") {
      nextInfo = "Allotments will be communicated shortly.";
    }

    // INDISMISSABLE for closed states
    if (isClosed) {
      el.innerHTML = `
        <div style="
          background:#1a0505;
          border:1px solid #7B1818;
          border-left:4px solid #7B1818;
          border-radius:6px;
          padding:16px 20px;
          margin-bottom:24px;
          font-family:Georgia,serif;">
          <div style="color:#F5F0E8;font-size:13px;font-weight:bold;
                      letter-spacing:1px;margin-bottom:${nextInfo ? "6px" : "0"}">
            🔴 ${message}
          </div>
          ${nextInfo ? `<div style="color:#c4a8a8;font-size:12px;">${nextInfo}</div>` : ""}
        </div>`;
      return;
    }

    // DISMISSABLE for open states
    const savedDismiss = sessionStorage.getItem(`pgmun_reg_dismissed_${status}`);
    if (savedDismiss) return;

    const bgColor     = isUrgent ? "#2a0a0a" : "#0a1a0a";
    const borderColor = isUrgent ? "#7B1818" : "#1a4a2a";
    const iconColor   = isUrgent ? "#F5F0E8" : "#F5F0E8";
    const icon        = isUrgent ? "⚠️" : "🟢";

    el.innerHTML = `
      <div id="pgmun-reg-notif" style="
        background:${bgColor};
        border:1px solid ${borderColor};
        border-left:4px solid ${borderColor};
        border-radius:6px;
        padding:14px 40px 14px 18px;
        margin-bottom:24px;
        position:relative;
        font-family:Georgia,serif;">
        <button onclick="PGMUN.dismissRegPopup('${status}')"
          style="position:absolute;top:10px;right:12px;
                 background:none;border:none;color:#5a3a3a;
                 font-size:16px;cursor:pointer;">×</button>
        <div style="color:${iconColor};font-size:13px;font-weight:bold;
                    letter-spacing:1px;">
          ${icon} ${message}
        </div>
      </div>`;
  }

  function dismissRegPopup(status) {
    sessionStorage.setItem(`pgmun_reg_dismissed_${status}`, "1");
    const el = document.getElementById("pgmun-reg-notif");
    if (el) el.parentElement.remove();
  }

  // ── Also disable form submission if registration closed ──────

  async function guardRegistrationForm() {
    const config = await fetchConfig();
    if (!config) return;

    const OPEN = ["priority_open","priority_closing_soon",
                  "round1_open","round1_closing_soon",
                  "round2_open","round2_closing_soon"];

    if (!OPEN.includes(config.registration_status)) {
      // Disable the submit button
      const btn = document.getElementById("pgmun-submit-btn");
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = "0.4";
        btn.style.cursor  = "not-allowed";
        btn.textContent   = "REGISTRATION CLOSED";
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    initBanner,
    initPopup,
    initUpdatesPage,
    initRegPopup,
    guardRegistrationForm,
    filterUpdates,
    closePopup,
    dismissOne,
    dismissAllPopup,
    dismissRegPopup,
    fetchConfig,
    fetchUpdates
  };

})();


// ================================================================
//  AUTO INIT — detects which page and runs the right modules
// ================================================================

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  // Always init banner (homepage only checks for element existing)
  PGMUN.initBanner();

  // Homepage — popup
  if (path === "/" || path === "/index.html") {
    PGMUN.initPopup();
  }

  // Register page
  if (path.startsWith("/register")) {
    PGMUN.initRegPopup();
    PGMUN.guardRegistrationForm();
  }

  // Updates page
  if (path.startsWith("/updates")) {
    PGMUN.initUpdatesPage();
  }
});
