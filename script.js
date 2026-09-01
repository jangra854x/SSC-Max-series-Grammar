/* =========================================================
   SSC SELECTION BATCH 11.0 — Telegram Mini App
   script.js — v2 (robust build)
   =========================================================
   Loader kabhi bhi stuck nahi rahega:
   - Supabase connect ho ya na ho, max 4 second baad
     app apne aap decide kar lega ki kaunsa screen dikhana hai.
   - Har async step try/catch me hai.
   - Koi bhi error aaye toh silently local data pe fallback
     ho jata hai, poora app crash nahi hota.
   ========================================================= */

const SUPABASE_URL = "https://gmbnmefjzvpwrvkolwdw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYm5tZWZqenZwd3J2a29sd2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MzQ1MzksImV4cCI6MjEwMzIxMDUzOX0.lmlrmrB6e7s9NnOS_B24VaQ0IGTeBqa-cHrfzVz5mes";

const ADMIN_ID = "7990149560";
const HARD_LOAD_TIMEOUT_MS = 18000; // loader will never wait longer than this

/* ---------------------------------------------------------
   DEFAULT DATA
--------------------------------------------------------- */
function getDefaultData() {
  return {
    settings: {
      contactUsername: "pratibha0x"
    },
    // leads: array of { id, name, age, mobile, examTarget, submittedAt }
    leads: [],
    subjects: [
      { id: "english", name: "English", icon: "eng", emoji: "fa-book-open", topics: [] },
      { id: "reasoning", name: "Reasoning", icon: "reason", emoji: "fa-brain", topics: [] },
      { id: "maths", name: "Maths", icon: "maths", emoji: "fa-square-root-variable", topics: [] }
    ],
    mocks: { locked: true, items: [] }
  };
}

/* ---------------------------------------------------------
   GLOBAL STATE
--------------------------------------------------------- */
let APP_DATA = null;
let CURRENT_USER_ID = null;
let IS_ADMIN = false;
let sbClient = null;
let cloudConnected = false;
let loadResolved = false;

let navState = { subjectId: null, topicId: null };

/* ---------------------------------------------------------
   INIT — entry point
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  boot().catch(err => {
    console.error("Boot failed completely:", err);
    forceFallbackAndShow();
  });
});

async function boot() {
  setLoaderText("Connecting...");
  setupTelegram();

  // Hard safety net: no matter what happens, after HARD_LOAD_TIMEOUT_MS
  // we WILL move past the loader.
  const timeoutGuard = setTimeout(() => {
    if (!loadResolved) {
      console.warn("Load timeout hit — forcing fallback.");
      forceFallbackAndShow();
    }
  }, HARD_LOAD_TIMEOUT_MS);

  try {
    setLoaderText("Loading batch data...");
    await loadData();
  } catch (e) {
    console.warn("loadData threw, using default data", e);
    if (!APP_DATA) APP_DATA = getDefaultData();
  }

  finishBoot();
  clearTimeout(timeoutGuard);
}

function forceFallbackAndShow() {
  if (loadResolved) return;
  if (!APP_DATA) {
    const local = safeLocalGet();
    APP_DATA = local || getDefaultData();
  }
  finishBoot();
}

function finishBoot() {
  if (loadResolved) return;
  loadResolved = true;

  try { bindEvents(); } catch (e) { console.error("bindEvents error", e); }
  try { renderAdminVisibility(); } catch (e) { console.error(e); }
  try { updateLockedStats(); } catch (e) { console.error(e); }
  try { updatePricingUI(); } catch (e) { console.error(e); }
  try { trackUserVisit(); } catch (e) { console.error(e); }

  try {
    if (IS_ADMIN || isUserAllowed(CURRENT_USER_ID)) {
      showScreen("homeScreen");
      renderHomeCards();
      // Progress may take a moment to arrive from the cloud — render again
      // once it does, so the rings update to reflect any other device.
      loadProgressFromCloud().then(() => renderHomeStatsRings());
    } else {
      // New user — fill the lead form first, then straight into the app.
      showScreen("lockedScreen");
    }
  } catch (e) {
    console.error("Final render error", e);
    showErrorScreen("There was a problem displaying the app.");
  }
}

/* ---------------------------------------------------------
   TELEGRAM WEBAPP SETUP
--------------------------------------------------------- */
function setupTelegram() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();

      // Request true fullscreen (Telegram Bot API 8.0+). Falls back
      // silently on older clients where this method doesn't exist.
      try {
        if (typeof tg.requestFullscreen === "function") {
          tg.requestFullscreen();
        } else {
          tg.expand();
        }
      } catch (e) {
        try { tg.expand(); } catch (e2) {}
      }

      // Disable vertical swipe-to-close so scrolling never fights
      // Telegram's own gesture handling.
      try { tg.disableVerticalSwipes(); } catch (e) {}
      try { tg.enableClosingConfirmation && tg.enableClosingConfirmation(); } catch (e) {}

      const user = tg.initDataUnsafe?.user;
      if (user && user.id) {
        CURRENT_USER_ID = String(user.id);
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
        const greetEl = document.getElementById("userGreeting");
        if (greetEl && name) greetEl.textContent = "Welcome, " + name;
      }
      try { tg.setHeaderColor("#07070c"); } catch (e) {}
      try { tg.setBackgroundColor("#07070c"); } catch (e) {}
      try { tg.setBottomBarColor && tg.setBottomBarColor("#07070c"); } catch (e) {}

      // Apply Telegram's safe-area + content-safe-area insets as CSS
      // variables so our fixed topbars never sit under the notch/status
      // bar or Telegram's own floating header controls.
      applyTelegramInsets(tg);
      tg.onEvent("safeAreaChanged", () => applyTelegramInsets(tg));
      tg.onEvent("contentSafeAreaChanged", () => applyTelegramInsets(tg));
      tg.onEvent("fullscreenChanged", () => applyTelegramInsets(tg));
    }
  } catch (e) {
    console.warn("Telegram WebApp init failed", e);
  }

  if (!CURRENT_USER_ID) {
    // Fallback for testing in normal browser (outside Telegram)
    CURRENT_USER_ID = "TEST_USER";
  }

  IS_ADMIN = CURRENT_USER_ID === ADMIN_ID;

  const idEl = document.getElementById("lockedUserId");
  if (idEl) idEl.textContent = CURRENT_USER_ID;
}

/* ---------------------------------------------------------
   TELEGRAM SAFE AREA INSETS
   Telegram gives us safeAreaInset (device notch/home-indicator) and
   contentSafeAreaInset (space taken by Telegram's own header/controls
   when the app is fullscreen). We combine both into CSS variables so
   every sticky topbar in the app automatically pads itself correctly,
   instead of hiding behind the status bar or Telegram's own UI.
--------------------------------------------------------- */
function applyTelegramInsets(tg) {
  try {
    const safe = tg.safeAreaInset || {};
    const content = tg.contentSafeAreaInset || {};

    const top = (safe.top || 0) + (content.top || 0);
    const bottom = (safe.bottom || 0) + (content.bottom || 0);
    const left = (safe.left || 0) + (content.left || 0);
    const right = (safe.right || 0) + (content.right || 0);

    const root = document.documentElement;
    root.style.setProperty("--tg-safe-top", top + "px");
    root.style.setProperty("--tg-safe-bottom", bottom + "px");
    root.style.setProperty("--tg-safe-left", left + "px");
    root.style.setProperty("--tg-safe-right", right + "px");
  } catch (e) {
    console.warn("Could not apply Telegram insets", e);
  }
}

/* ---------------------------------------------------------
   LOCAL STORAGE HELPERS (always-available fallback)
--------------------------------------------------------- */
function safeLocalGet() {
  try {
    const raw = localStorage.getItem("ssc_batch_data_v2");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
function safeLocalSet(data) {
  try {
    localStorage.setItem("ssc_batch_data_v2", JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage save failed", e);
  }
}

/* ---------------------------------------------------------
   DATA LOAD (Supabase primary, localStorage fallback)
--------------------------------------------------------- */
let cloudLoadSucceeded = false;

async function loadData() {
  // Show something instantly from local cache if present
  const local = safeLocalGet();
  if (local) APP_DATA = local;
  if (!APP_DATA) APP_DATA = getDefaultData();

  if (!SUPABASE_URL || SUPABASE_URL.includes("YOUR_SUPABASE")) {
    setCloudStatus(false);
    return;
  }

  setLoaderText("Syncing with cloud...");

  try {
    // supabase-js is loaded via <script> tag in index.html (blocking, before script.js)
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.warn("Supabase SDK not available on window.");
      setCloudStatus(false);
      return;
    }

    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Generous timeout — the content JSON can be large (194+ videos), so a
    // short timeout was falsely triggering "no data" and risked overwriting
    // real cloud data with an empty local fallback on the next save.
    const result = await withTimeout(
      sbClient.from("app_data").select("value").eq("id", "main").single(),
      15000
    );

    const { data, error } = result;

    if (error) {
      if (error.code === "PGRST116") {
        // no row yet -> create it (only safe because this specifically
        // means "row genuinely doesn't exist", confirmed by Supabase itself)
        await withTimeout(
          sbClient.from("app_data").upsert({ id: "main", value: APP_DATA }),
          15000
        );
        cloudLoadSucceeded = true;
        setCloudStatus(true);
      } else {
        console.warn("Supabase select error", error);
        setCloudStatus(false);
      }
      return;
    }

    if (data && data.value) {
      APP_DATA = normalizeData(data.value);
      safeLocalSet(APP_DATA);
      cloudLoadSucceeded = true;
      setCloudStatus(true);
    }
  } catch (e) {
    console.warn("Supabase load failed/timed out, using local/default data", e);
    setCloudStatus(false);
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Supabase request timed out")), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

function normalizeData(data) {
  // Ensures older/partial data shapes don't break the app
  const base = getDefaultData();
  if (!data || typeof data !== "object") return base;

  data.settings = Object.assign({}, base.settings, data.settings || {});

  data.leads = Array.isArray(data.leads) ? data.leads : [];
  data.leads = data.leads.map(l => {
    if (l && typeof l === "object" && l.id) return l;
    return null;
  }).filter(Boolean);

  // Backward-compat: old paid-access users (allowedUsers) automatically
  // get their lead-form requirement waived since the app is now free —
  // we migrate them into "leads" with placeholder info so they don't
  // hit the form again, but flag them as legacy so admin can see clearly.
  if (Array.isArray(data.allowedUsers) && data.allowedUsers.length) {
    data.allowedUsers.forEach(u => {
      const id = typeof u === "string" ? u : (u && u.id);
      if (id && !data.leads.find(l => l.id === String(id))) {
        data.leads.push({
          id: String(id), name: "Legacy User", age: "", mobile: "",
          examTarget: "", submittedAt: Date.now(), legacy: true
        });
      }
    });
    delete data.allowedUsers;
  }

  data.subjects = Array.isArray(data.subjects) && data.subjects.length ? data.subjects : base.subjects;

  data.subjects.forEach(s => {
    if (!Array.isArray(s.topics)) s.topics = [];
    s.topics.forEach((t, tIdx) => {
      if (!Array.isArray(t.videos)) t.videos = [];
      if (!Array.isArray(t.subTopics)) t.subTopics = [];
      if (typeof t.order !== "number") t.order = tIdx;
      t.videos.forEach((v, vIdx) => {
        if (typeof v.pdfUrl !== "string") v.pdfUrl = "";
        if (typeof v.subTopicId !== "string") v.subTopicId = "";
        if (typeof v.order !== "number") v.order = vIdx;
        if (typeof v.createdAt !== "number") v.createdAt = Date.now();
      });
    });
  });

  if (!data.mocks || typeof data.mocks !== "object") data.mocks = { locked: true, items: [] };
  if (typeof data.mocks.locked !== "boolean") data.mocks.locked = true;
  if (!Array.isArray(data.mocks.items)) data.mocks.items = [];

  return data;
}

async function saveData() {
  safeLocalSet(APP_DATA);

  if (sbClient) {
    if (!cloudLoadSucceeded) {
      // Safety guard: never push to Supabase until we've successfully
      // pulled the real cloud data at least once this session. Without
      // this, a slow/failed initial load could silently overwrite real
      // cloud content with empty/default local data.
      console.warn("Skipping cloud save: initial cloud load hasn't succeeded yet.");
      showToast("⚠️ Cloud not synced yet — please wait a moment and try again");
      return;
    }
    try {
      await withTimeout(
        sbClient.from("app_data").upsert({ id: "main", value: APP_DATA }),
        15000
      );
      setCloudStatus(true);
      backupDataSnapshot();
    } catch (e) {
      console.warn("Supabase save failed", e);
      setCloudStatus(false);
      showToast("⚠️ Cloud sync failed, data saved locally");
    }
  }
}

// Keeps a rolling history of the last 20 saves in a separate table, so
// content can be manually recovered from Supabase's Table Editor if
// anything is ever accidentally overwritten again.
function backupDataSnapshot() {
  if (!sbClient) return;
  (async () => {
    try {
      await sbClient.from("app_data_backups").insert({ value: APP_DATA });
      const { data: rows } = await sbClient
        .from("app_data_backups")
        .select("id")
        .order("created_at", { ascending: false });
      if (rows && rows.length > 20) {
        const idsToDelete = rows.slice(20).map(r => r.id);
        await sbClient.from("app_data_backups").delete().in("id", idsToDelete);
      }
    } catch (e) {
      console.warn("backup snapshot failed (non-critical)", e);
    }
  })();
}

function setCloudStatus(connected) {
  cloudConnected = connected;
  const el = document.getElementById("cloudStatus");
  if (!el) return;
  if (connected) {
    el.textContent = "Connected";
    el.className = "status-pill status-connected";
  } else {
    el.textContent = "Offline (local mode)";
    el.className = "status-pill status-offline";
  }
}

/* ---------------------------------------------------------
   ACCESS CONTROL — App is FREE for everyone.
   The only gate is: has the user submitted the one-time lead
   form (name/age/mobile/exam target)? Once submitted, all
   subjects are unlocked. Only "TB Mocks" stays locked (static).
--------------------------------------------------------- */
function getUserLeadEntry(userId) {
  if (!userId || !APP_DATA || !Array.isArray(APP_DATA.leads)) return null;
  return APP_DATA.leads.find(u => u.id === String(userId)) || null;
}

// Has this user completed the lead form? (used to decide locked-screen vs app)
function isUserAllowed(userId) {
  if (IS_ADMIN) return true;
  return !!getUserLeadEntry(userId);
}

function isPremiumUser(userId) {
  const lead = getUserLeadEntry(userId);
  return !!(lead && lead.premium);
}

// App is free — every submitted user gets every subject.
function hasSubjectAccess(userId, subjectId) {
  return true;
}

/* ---------------------------------------------------------
   ANALYTICS: TRACK USER VISIT
--------------------------------------------------------- */
function trackUserVisit() {
  if (!sbClient || !CURRENT_USER_ID) return;

  let name = "Unknown";
  let username = "";
  try {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser) {
      name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "Unknown";
      username = tgUser.username || "";
    }
  } catch (e) {}

  (async () => {
    try {
      const { data: existing } = await withTimeout(
        sbClient.from("app_users").select("user_id").eq("user_id", String(CURRENT_USER_ID)).maybeSingle(),
        3000
      );

      if (existing) {
        await withTimeout(
          sbClient.from("app_users").update({
            first_name: name, username, last_seen_at: new Date().toISOString()
          }).eq("user_id", String(CURRENT_USER_ID)),
          3000
        );
      } else {
        await withTimeout(
          sbClient.from("app_users").insert({
            user_id: String(CURRENT_USER_ID), first_name: name, username,
            first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString()
          }),
          3000
        );
      }
    } catch (e) {
      console.warn("trackUserVisit failed", e);
    }
  })();
}

function renderAdminVisibility() {
  const btn = document.getElementById("adminBtnHome");
  if (btn) btn.classList.toggle("hidden", !IS_ADMIN);
  const idEl = document.getElementById("adminMyId");
  if (idEl) idEl.textContent = ADMIN_ID;
}

/* ---------------------------------------------------------
   LOADER TEXT
--------------------------------------------------------- */
function setLoaderText(txt) {
  const el = document.getElementById("loaderText");
  if (el) el.textContent = txt;
}

function showErrorScreen(msg) {
  const el = document.getElementById("errorMsg");
  if (el) el.textContent = msg;
  showScreen("errorScreen");
}

/* ---------------------------------------------------------
   SCREEN NAVIGATION
--------------------------------------------------------- */
// Maps internal screen ids -> the "card" bucket used for time-tracking/stats
const SCREEN_TO_CARD_KEY = {
  homeScreen: null, // landing itself isn't tracked as a card
  topicScreen: "sw_batch",
  videoListScreen: "sw_batch",
  playerScreen: "sw_batch",
  pdfScreen: "sw_batch",
  adminScreen: null
};

let activeCardKey = null;
let activeCardStartedAt = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
  window.scrollTo(0, 0);

  handleCardTimeTransition(id);
}

function handleCardTimeTransition(newScreenId) {
  const newCardKey = SCREEN_TO_CARD_KEY.hasOwnProperty(newScreenId) ? SCREEN_TO_CARD_KEY[newScreenId] : null;

  if (activeCardKey && activeCardKey !== newCardKey) {
    flushCardSession(activeCardKey, activeCardStartedAt);
  }

  if (newCardKey && newCardKey !== activeCardKey) {
    activeCardKey = newCardKey;
    activeCardStartedAt = Date.now();
  } else if (!newCardKey) {
    activeCardKey = null;
    activeCardStartedAt = null;
  }
}

function flushCardSession(cardKey, startedAt) {
  if (!cardKey || !startedAt || !CURRENT_USER_ID) return;
  const seconds = Math.round((Date.now() - startedAt) / 1000);
  if (seconds < 2) return; // ignore accidental instant taps

  if (sbClient) {
    try {
      sbClient.from("app_sessions").insert({
        user_id: String(CURRENT_USER_ID),
        card_key: cardKey,
        seconds,
        started_at: new Date(startedAt).toISOString(),
        ended_at: new Date().toISOString()
      }).then(() => {}).catch(e => console.warn("session log failed", e));
    } catch (e) {
      console.warn("session log failed", e);
    }
  }
}

// Flush any in-progress session when the user leaves/closes the mini app
window.addEventListener("beforeunload", () => {
  if (activeCardKey && activeCardStartedAt) {
    flushCardSession(activeCardKey, activeCardStartedAt);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && activeCardKey && activeCardStartedAt) {
    flushCardSession(activeCardKey, activeCardStartedAt);
    activeCardStartedAt = Date.now(); // resume counting if they come back
  }
});

/* ---------------------------------------------------------
   EVENT BINDINGS
--------------------------------------------------------- */
function bindEvents() {
  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.addEventListener("click", () => window.location.reload());

  const adminBtnHome = document.getElementById("adminBtnHome");
  if (adminBtnHome) adminBtnHome.addEventListener("click", () => {
    showScreen("adminScreen");
    renderAdminPanel();
  });

  safeBind("openTbMocksCard", "click", () => {
    showToast("🔒 TB Mocks is coming soon — not available yet.");
  });

  // Lead form (one-time, compulsory)
  safeBind("leadFormSubmitBtn", "click", handleLeadFormSubmit);

  // Edit video modal
  safeBind("editVideoCloseBtn", "click", closeEditVideoModal);
  safeBind("editVideoSaveBtn", "click", handleEditVideoSave);

  // Admin: leads / stats search
  safeBind("adminLeadSearch", "input", renderLeadsList);
  safeBind("adminStatsSearch", "input", () => renderAdminStats());

  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.back;
      if (!target) return;
      showScreen(target);
      if (target === "homeScreen") renderHomeCards();
    });
  });

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const content = document.getElementById(tab.dataset.tab);
      if (content) content.classList.add("active");
      if (tab.dataset.tab === "tabStats") renderAdminStats();
      if (tab.dataset.tab === "tabUsers") renderLeadsList();
    });
  });

  safeBind("adminSubjectSelect", "change", populateAdminTopics);
  safeBind("adminTopicSelect", "change", populateAdminSubTopics);
  safeBind("adminAddTopicBtn", "click", handleAddTopic);
  safeBind("adminAddSubTopicBtn", "click", handleAddSubTopic);
  safeBind("adminAddVideoBtn", "click", handleAddVideo);
  safeBind("adminSaveSettingsBtn", "click", handleSaveSettings);
}

function safeBind(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

/* ---------------------------------------------------------
   LEAD FORM (one-time, compulsory — replaces old paywall)
--------------------------------------------------------- */
async function handleLeadFormSubmit() {
  const errEl = document.getElementById("leadFormError");
  const showErr = (msg) => {
    if (errEl) { errEl.textContent = msg; errEl.classList.remove("hidden"); }
  };
  if (errEl) errEl.classList.add("hidden");

  const firstName = document.getElementById("leadFirstName").value.trim();
  const lastName = document.getElementById("leadLastName").value.trim();
  const age = document.getElementById("leadAge").value.trim();
  const state = document.getElementById("leadState").value;
  const examTarget = document.getElementById("leadExamTarget").value;

  if (!firstName || firstName.length < 2) { showErr("⚠️ Please enter a valid first name"); return; }
  const ageNum = parseInt(age);
  if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 60) { showErr("⚠️ Please enter a valid age"); return; }
  if (!state) { showErr("⚠️ Please select your state"); return; }
  if (!examTarget) { showErr("⚠️ Please select an exam target"); return; }

  const btn = document.getElementById("leadFormSubmitBtn");
  if (btn) { btn.disabled = true; btn.style.opacity = "0.6"; }

  const fullName = lastName ? (firstName + " " + lastName) : firstName;
  const leadEntry = {
    id: String(CURRENT_USER_ID), name: fullName, firstName, lastName,
    age: ageNum, state, examTarget,
    submittedAt: Date.now()
  };

  if (!Array.isArray(APP_DATA.leads)) APP_DATA.leads = [];
  APP_DATA.leads = APP_DATA.leads.filter(l => l.id !== leadEntry.id);
  APP_DATA.leads.push(leadEntry);

  try {
    await saveData();
  } catch (e) {
    console.warn("lead save failed", e);
  }

  // Also save into the dedicated "app_leads" table (readable columns)
  // so it's easy to browse in Supabase Table Editor, separate from the
  // big JSON blob.
  if (sbClient) {
    try {
      await withTimeout(
        sbClient.from("app_leads").upsert({
          user_id: leadEntry.id,
          name: leadEntry.name,
          first_name: leadEntry.firstName,
          last_name: leadEntry.lastName,
          age: leadEntry.age,
          state: leadEntry.state,
          exam_target: leadEntry.examTarget,
          is_legacy: false,
          submitted_at: new Date(leadEntry.submittedAt).toISOString()
        }, { onConflict: "user_id" }),
        4000
      );
    } catch (e) {
      console.warn("app_leads table save failed", e);
    }
  }

  if (btn) { btn.disabled = false; btn.style.opacity = "1"; }

  showScreen("homeScreen");
  renderHomeCards();
}

function updatePricingUI() {
  // App is free — nothing to render. Kept as a no-op so any older
  // call sites don't break.
}

function updateLockedStats() {
  let topicCount = 0, videoCount = 0;
  APP_DATA.subjects.forEach(s => {
    topicCount += s.topics.length;
    s.topics.forEach(t => videoCount += t.videos.length);
  });
  setText("statTopics", topicCount);
  setText("statVideos", videoCount);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ---------------------------------------------------------
   RENDER: HOME LANDING CARDS
--------------------------------------------------------- */
function renderHomeCards() {
  renderHomeStatsRings();
  renderSubjects();
}

/* ---------------------------------------------------------
   RENDER: HOME STATISTICS (big circular % rings)
   Progress = how many of this subject's videos the user has
   opened at least once, out of the subject's total video count.
   Each video is worth an equal share (100 / total videos).

   Stored in Supabase (app_user_progress table) keyed by the
   user's Telegram ID, so progress survives switching devices —
   localStorage is only used as an instant-load local cache.
--------------------------------------------------------- */
const WATCHED_VIDEOS_KEY = "sw_batch_watched_videos_v1";
let watchedVideoIdsCache = null;
let progressLoadedFromCloud = false;

function getWatchedVideoIds() {
  if (watchedVideoIdsCache) return watchedVideoIdsCache;
  try {
    const raw = localStorage.getItem(WATCHED_VIDEOS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    watchedVideoIdsCache = new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    watchedVideoIdsCache = new Set();
  }
  return watchedVideoIdsCache;
}

function saveWatchedVideoIdsLocal(set) {
  try {
    localStorage.setItem(WATCHED_VIDEOS_KEY, JSON.stringify([...set]));
  } catch (e) {
    console.warn("could not save watched-video progress locally", e);
  }
}

// Pulls this user's watched-video list from Supabase (source of truth)
// and merges it with anything already cached locally, so nothing is
// lost either way. Called once during boot.
async function loadProgressFromCloud() {
  if (!sbClient || !CURRENT_USER_ID) return;
  try {
    const { data, error } = await withTimeout(
      sbClient.from("app_user_progress").select("watched_video_ids").eq("user_id", String(CURRENT_USER_ID)).maybeSingle(),
      10000
    );
    if (error) throw error;

    const cloudIds = (data && Array.isArray(data.watched_video_ids)) ? data.watched_video_ids : [];
    const local = getWatchedVideoIds();
    cloudIds.forEach(id => local.add(id));
    watchedVideoIdsCache = local;
    saveWatchedVideoIdsLocal(local);
    progressLoadedFromCloud = true;
  } catch (e) {
    console.warn("loadProgressFromCloud failed, using local cache only", e);
  }
}

function saveWatchedVideoIds(set) {
  saveWatchedVideoIdsLocal(set);

  if (!sbClient || !CURRENT_USER_ID) return;
  (async () => {
    try {
      await sbClient.from("app_user_progress").upsert({
        user_id: String(CURRENT_USER_ID),
        watched_video_ids: [...set]
      }, { onConflict: "user_id" });
    } catch (e) {
      console.warn("cloud progress save failed (kept locally)", e);
    }
  })();
}

// Called the moment a user opens a video/PDF (see openWatchFlow). Credits
// that single video's share of the subject's progress exactly once —
// re-opening the same video later does not increase progress again.
function creditVideoProgress(video) {
  if (!video || !video.id) return;
  const watched = getWatchedVideoIds();
  if (watched.has(video.id)) return; // already credited, never double-count
  watched.add(video.id);
  saveWatchedVideoIds(watched);
  renderHomeStatsRings();
}

function computeSubjectProgressPct(subject) {
  const allVideoIds = [];
  subject.topics.forEach(t => t.videos.forEach(v => allVideoIds.push(v.id)));
  if (allVideoIds.length === 0) return 0;

  const watched = getWatchedVideoIds();
  const watchedCount = allVideoIds.filter(id => watched.has(id)).length;
  return Math.round((watchedCount / allVideoIds.length) * 100);
}

function renderHomeStatsRings() {
  const row = document.getElementById("homeStatsRingRow");
  if (!row) return;
  row.innerHTML = "";

  APP_DATA.subjects.forEach(subject => {
    const pct = computeSubjectProgressPct(subject);
    const card = document.createElement("div");
    card.className = "stats-ring-card";
    card.innerHTML = buildStatsRing(pct, subject.name);
    row.appendChild(card);
  });
}

function buildStatsRing(pct, label) {
  const r = 34, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return `
    <div class="stats-ring-wrap">
      <svg viewBox="0 0 76 76">
        <circle class="stats-ring-bg" cx="38" cy="38" r="${r}"></circle>
        <circle class="stats-ring-fill" cx="38" cy="38" r="${r}"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <div class="stats-ring-pct">${pct}%</div>
    </div>
    <div class="stats-ring-label">${escapeHtml(label)}</div>
  `;
}

/* ---------------------------------------------------------
   RENDER: SUBJECTS (inside SW Batch) — kept simple, as before
--------------------------------------------------------- */
function renderSubjects() {
  const list = document.getElementById("subjectList");
  if (!list) return;
  list.innerHTML = "";

  APP_DATA.subjects.forEach(subject => {
    const topicCount = subject.topics.length;
    const videoCount = subject.topics.reduce((sum, t) => sum + t.videos.length, 0);

    const card = document.createElement("div");
    card.className = "subject-card";
    card.innerHTML = `
      <div class="subject-icon ${subject.icon}"><i class="fa-solid ${subject.emoji || 'fa-book'}"></i></div>
      <div class="subject-info">
        <div class="subject-name">${escapeHtml(subject.name)}</div>
        <div class="subject-meta">${topicCount} topics • ${videoCount} videos</div>
      </div>
      <div class="subject-arrow"><i class="fa-solid fa-chevron-right"></i></div>
    `;
    card.addEventListener("click", () => openSubject(subject.id));
    list.appendChild(card);
  });
}

function openSubject(subjectId) {
  navState.subjectId = subjectId;
  const subject = getSubject(subjectId);
  if (!subject) return;
  setText("topicSubjectTitle", subject.name);
  renderTopics(subject);
  showScreen("topicScreen");
}

/* ---------------------------------------------------------
   RENDER: TOPICS
--------------------------------------------------------- */
function renderTopics(subject) {
  const list = document.getElementById("topicList");
  if (!list) return;
  list.innerHTML = "";

  if (subject.topics.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i>No topics added to this subject yet.<br>New content coming soon</div>`;
    return;
  }

  subject.topics.forEach(topic => {
    const card = document.createElement("div");
    card.className = "topic-card";
    card.innerHTML = `
      <div class="topic-icon"><i class="fa-solid fa-folder"></i></div>
      <div class="topic-info">
        <div class="topic-name">${escapeHtml(topic.name)}</div>
        <div class="topic-sub">Video lectures</div>
      </div>
      <div class="topic-count">${topic.videos.length}</div>
    `;
    card.addEventListener("click", () => openTopic(topic.id));
    list.appendChild(card);
  });
}

function openTopic(topicId) {
  navState.topicId = topicId;
  const subject = getSubject(navState.subjectId);
  if (!subject) return;
  const topic = subject.topics.find(t => t.id === topicId);
  if (!topic) return;

  setText("videoListTopicTitle", topic.name);
  setText("videoListCount", `${topic.videos.length} videos`);
  renderVideos(topic);
  showScreen("videoListScreen");
}

/* ---------------------------------------------------------
   RENDER: VIDEOS
--------------------------------------------------------- */
function renderVideos(topic) {
  const list = document.getElementById("videoList");
  if (!list) return;
  list.innerHTML = "";

  if (topic.videos.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-video-slash"></i>No videos uploaded to this topic yet.<br>Coming soon</div>`;
    return;
  }

  // User-facing list stays in original upload order (oldest -> newest),
  // exactly like before. Only the admin's "Manage Structure" view shows
  // the newest video first, to make new uploads easy to double-check.
  topic.videos.forEach(video => {
    list.appendChild(buildVideoCard(video, topic));
  });
}

// Used ONLY by admin "Manage Structure" so newly-added videos are easy
// to spot at the top without scrolling through the whole topic.
function getSortedVideos(topic) {
  return [...topic.videos].sort((a, b) => (b.order || 0) - (a.order || 0));
}

function buildVideoCard(video, topic) {
  const card = document.createElement("div");
  card.className = "video-card";
  card.innerHTML = `
    <div class="video-thumb"><i class="fa-solid fa-play"></i></div>
    <div class="video-info">
      <div class="video-title">${escapeHtml(video.title)}</div>
      <div class="video-desc">${escapeHtml(video.desc || "")}</div>
      ${video.pdfUrl ? `<div class="video-pdf-tag"><i class="fa-solid fa-file-pdf"></i> PDF available</div>` : ``}
    </div>
    <div class="video-play-badge"><i class="fa-solid fa-chevron-right"></i></div>
  `;
  card.addEventListener("click", () => openWatchFlow(video, topic, "video"));
  return card;
}

/* ---------------------------------------------------------
   AD-GATED CONTENT OPENING
   Videos always play in the phone's browser (in-app playback
   isn't reliable inside Telegram's WebView), so every video/PDF
   open goes through watch.html first, which shows 2 mandatory
   ads before redirecting to the real content URL. Progress for
   that video is credited the moment this flow starts.
--------------------------------------------------------- */
/* ---------------------------------------------------------
   AD-GATED CONTENT OPENING
   Before opening any video/PDF, show one in-app Rewarded
   Interstitial ad (same ad-gate screen/logic as app-open).
   Once the ad is done, redirect straight to the real content
   URL in the browser — no intermediate watch.html page.
   Progress for that video is credited the moment this starts.
--------------------------------------------------------- */
function openWatchFlow(video, topic, type) {
  const url = type === "pdf" ? video.pdfUrl : video.url;
  if (!url) return;

  creditVideoProgress(video);

  const openContent = () => {
    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, "_blank");
      }
    } catch (e) {
      window.open(url, "_blank");
    }
  };

  openContent();
}

/* ---------------------------------------------------------
   ADMIN PANEL
--------------------------------------------------------- */
function renderAdminPanel() {
  populateAdminSubjects();
  populateAdminTopics();
  renderAdminStructure();
  renderLeadsList();
  renderAdminStats();

  const contactEl = document.getElementById("adminContact");
  if (contactEl) contactEl.value = APP_DATA.settings.contactUsername || "pratibha0x";

  setCloudStatus(cloudConnected);
}

function populateAdminSubjects() {
  const select = document.getElementById("adminSubjectSelect");
  if (!select) return;
  select.innerHTML = "";
  APP_DATA.subjects.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

function populateAdminTopics() {
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const select = document.getElementById("adminTopicSelect");
  if (!subjectSelect || !select) return;

  const subject = getSubject(subjectSelect.value);
  select.innerHTML = "";

  if (!subject || subject.topics.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Create a topic first --";
    select.appendChild(opt);
    populateAdminSubTopics();
    return;
  }

  subject.topics.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });
  populateAdminSubTopics();
}

function populateAdminSubTopics() {
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const topicSelect = document.getElementById("adminTopicSelect");
  const select = document.getElementById("adminSubTopicSelect");
  if (!select) return;

  select.innerHTML = '<option value="">None (directly in topic)</option>';

  const subject = getSubject(subjectSelect.value);
  const topic = subject ? subject.topics.find(t => t.id === topicSelect.value) : null;
  if (!topic || !Array.isArray(topic.subTopics)) return;

  topic.subTopics.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = st.name;
    select.appendChild(opt);
  });
}

function handleAddTopic() {
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const subject = getSubject(subjectSelect.value);
  if (!subject) return;

  const name = prompt("Enter new topic name (e.g. Tenses, Percentage, Syllogism):");
  if (!name || !name.trim()) return;

  subject.topics.push({ id: "topic_" + Date.now(), name: name.trim(), videos: [], subTopics: [] });

  saveData();
  populateAdminTopics();
  renderAdminStructure();
  showToast("✅ Topic added: " + name);
}

function handleAddSubTopic() {
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const topicSelect = document.getElementById("adminTopicSelect");
  const subject = getSubject(subjectSelect.value);
  const topic = subject ? subject.topics.find(t => t.id === topicSelect.value) : null;
  if (!topic) { showToast("⚠️ Please select or create a topic first"); return; }

  const name = prompt("Enter new sub-topic / folder name (e.g. Part 1, Practice Set A):");
  if (!name || !name.trim()) return;

  if (!Array.isArray(topic.subTopics)) topic.subTopics = [];
  topic.subTopics.push({ id: "subtopic_" + Date.now(), name: name.trim() });

  saveData();
  populateAdminSubTopics();
  renderAdminStructure();
  showToast("✅ Sub-topic added: " + name);
}

async function handleAddVideo() {
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const topicSelect = document.getElementById("adminTopicSelect");
  const subTopicSelect = document.getElementById("adminSubTopicSelect");
  const titleEl = document.getElementById("adminVideoTitle");
  const descEl = document.getElementById("adminVideoDesc");
  const urlEl = document.getElementById("adminVideoUrl");
  const pdfUrlEl = document.getElementById("adminVideoPdfUrl");

  const subjectId = subjectSelect.value;
  const topicId = topicSelect.value;
  const subTopicId = subTopicSelect ? subTopicSelect.value : "";
  const title = titleEl.value.trim();
  const desc = descEl.value.trim();
  const url = urlEl.value.trim();
  const pdfUrl = pdfUrlEl ? pdfUrlEl.value.trim() : "";

  if (!topicId) { showToast("⚠️ Please select or create a topic first"); return; }
  if (!title || !url) { showToast("⚠️ Video title and URL are required"); return; }

  const subject = getSubject(subjectId);
  const topic = subject.topics.find(t => t.id === topicId);
  if (!topic) return;

  const maxOrder = topic.videos.reduce((m, v) => Math.max(m, v.order || 0), 0);
  topic.videos.push({
    id: "video_" + Date.now(), title, desc, url, pdfUrl: pdfUrl || "",
    subTopicId: subTopicId || "",
    order: maxOrder + 1, createdAt: Date.now()
  });

  await saveData();

  titleEl.value = "";
  descEl.value = "";
  urlEl.value = "";
  if (pdfUrlEl) pdfUrlEl.value = "";

  renderAdminStructure();
  updateLockedStats();
  showToast("✅ Video add ho gayi: " + title);
}

// Track which subject/topic accordions are open so re-render doesn't collapse everything
let openStructSubjects = new Set();
let openStructTopics = new Set();

function renderAdminStructure() {
  const container = document.getElementById("adminStructureList");
  if (!container) return;
  container.innerHTML = "";

  APP_DATA.subjects.forEach(subject => {
    const topicCount = subject.topics.length;
    const videoCount = subject.topics.reduce((sum, t) => sum + t.videos.length, 0);
    const isOpen = openStructSubjects.has(subject.id);

    const subjBlock = document.createElement("div");
    subjBlock.className = "struct-subject" + (isOpen ? " open" : "");
    subjBlock.innerHTML = `
      <div class="struct-subject-head" data-subject="${subject.id}">
        <i class="fa-solid ${subject.emoji || 'fa-book'}"></i>
        ${escapeHtml(subject.name)}
        <span class="struct-topic-count">${topicCount} topics • ${videoCount} videos</span>
        <i class="fa-solid fa-chevron-right chev"></i>
      </div>
      <div class="struct-topics"></div>
    `;

    const topicsWrap = subjBlock.querySelector(".struct-topics");

    if (subject.topics.length === 0) {
      topicsWrap.innerHTML = `<div class="empty-state" style="padding:16px;">No topics</div>`;
    } else {
      const sortedTopics = [...subject.topics].sort((a, b) => (b.order || 0) - (a.order || 0));
      sortedTopics.forEach(topic => {
        const topicOpen = openStructTopics.has(topic.id);
        const topicEl = document.createElement("div");
        topicEl.className = "struct-topic" + (topicOpen ? " open" : "");
        topicEl.innerHTML = `
          <div class="struct-topic-head" data-topic="${topic.id}" data-subject="${subject.id}">
            <i class="fa-solid fa-folder"></i> ${escapeHtml(topic.name)}
            <span class="struct-topic-count">${topic.videos.length}</span>
            <button class="struct-icon-btn danger" data-action="del-topic" data-subject="${subject.id}" data-topic="${topic.id}" title="Delete topic"><i class="fa-solid fa-trash"></i></button>
            <i class="fa-solid fa-chevron-right chev"></i>
          </div>
          <div class="struct-videos"></div>
        `;

        const videosWrap = topicEl.querySelector(".struct-videos");
        const sortedVideos = getSortedVideos(topic);

        if (sortedVideos.length === 0) {
          videosWrap.innerHTML = `<div class="empty-state" style="padding:10px;">No videos</div>`;
        } else {
          sortedVideos.forEach((video, idx) => {
            const row = document.createElement("div");
            row.className = "struct-video-row";
            row.innerHTML = `
              <span class="struct-video-title"><i class="fa-solid fa-video"></i> ${escapeHtml(video.title)}${video.pdfUrl ? ' <i class="fa-solid fa-file-pdf" style="color:#ff8a8a;"></i>' : ''}</span>
              <div class="struct-video-actions">
                <button class="struct-icon-btn move" data-action="move-up" data-subject="${subject.id}" data-topic="${topic.id}" data-video="${video.id}" title="Upar"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="struct-icon-btn move" data-action="move-down" data-subject="${subject.id}" data-topic="${topic.id}" data-video="${video.id}" title="Neeche"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="struct-icon-btn edit" data-action="edit-video" data-subject="${subject.id}" data-topic="${topic.id}" data-video="${video.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="struct-icon-btn danger" data-action="del-video" data-subject="${subject.id}" data-topic="${topic.id}" data-video="${video.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
              </div>
            `;
            videosWrap.appendChild(row);
          });
        }

        topicsWrap.appendChild(topicEl);
      });
    }

    container.appendChild(subjBlock);
  });

  // Accordion toggles
  container.querySelectorAll(".struct-subject-head").forEach(head => {
    head.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const id = head.dataset.subject;
      if (openStructSubjects.has(id)) openStructSubjects.delete(id);
      else openStructSubjects.add(id);
      renderAdminStructure();
    });
  });
  container.querySelectorAll(".struct-topic-head").forEach(head => {
    head.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const id = head.dataset.topic;
      if (openStructTopics.has(id)) openStructTopics.delete(id);
      else openStructTopics.add(id);
      renderAdminStructure();
    });
  });

  // Action buttons
  container.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const t = e.currentTarget;
      const action = t.dataset.action;
      const subjectId = t.dataset.subject;
      const topicId = t.dataset.topic;
      const subject = getSubject(subjectId);
      const topic = subject ? subject.topics.find(tp => tp.id === topicId) : null;

      if (action === "del-topic") {
        if (!confirm("This topic and all its videos will be deleted. Confirm?")) return;
        subject.topics = subject.topics.filter(tp => tp.id !== topicId);
        saveData();
        renderAdminStructure();
        populateAdminTopics();
        updateLockedStats();
        return;
      }

      if (!topic) return;
      const videoId = t.dataset.video;
      const video = topic.videos.find(v => v.id === videoId);

      if (action === "del-video") {
        if (!confirm("Delete this video?")) return;
        topic.videos = topic.videos.filter(v => v.id !== videoId);
        saveData();
        renderAdminStructure();
        updateLockedStats();
      } else if (action === "edit-video") {
        openEditVideoModal(subjectId, topicId, videoId);
      } else if (action === "move-up" || action === "move-down") {
        reorderVideo(topic, videoId, action === "move-up" ? "up" : "down");
        saveData();
        renderAdminStructure();
      }
    });
  });
}

function reorderVideo(topic, videoId, direction) {
  // Videos are shown newest(highest order)-first, so "move up" (show earlier)
  // means increasing this video's order past its neighbour above it.
  const sorted = getSortedVideos(topic);
  const idx = sorted.findIndex(v => v.id === videoId);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return;

  const a = sorted[idx];
  const b = sorted[swapIdx];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;
}

/* ---------------------------------------------------------
   ADMIN: EDIT VIDEO MODAL
--------------------------------------------------------- */
let editingVideoRef = null; // { subjectId, topicId, videoId }

function openEditVideoModal(subjectId, topicId, videoId) {
  const subject = getSubject(subjectId);
  const topic = subject ? subject.topics.find(t => t.id === topicId) : null;
  const video = topic ? topic.videos.find(v => v.id === videoId) : null;
  if (!video) return;

  editingVideoRef = { subjectId, topicId, videoId };

  const titleEl = document.getElementById("editVideoTitle");
  const descEl = document.getElementById("editVideoDesc");
  const urlEl = document.getElementById("editVideoUrl");
  const pdfEl = document.getElementById("editVideoPdfUrl");
  if (titleEl) titleEl.value = video.title || "";
  if (descEl) descEl.value = video.desc || "";
  if (urlEl) urlEl.value = video.url || "";
  if (pdfEl) pdfEl.value = video.pdfUrl || "";

  const modal = document.getElementById("editVideoModal");
  if (modal) modal.classList.add("show");
}

function closeEditVideoModal() {
  editingVideoRef = null;
  const modal = document.getElementById("editVideoModal");
  if (modal) modal.classList.remove("show");
}

async function handleEditVideoSave() {
  if (!editingVideoRef) return;
  const { subjectId, topicId, videoId } = editingVideoRef;
  const subject = getSubject(subjectId);
  const topic = subject ? subject.topics.find(t => t.id === topicId) : null;
  const video = topic ? topic.videos.find(v => v.id === videoId) : null;
  if (!video) return;

  const title = document.getElementById("editVideoTitle").value.trim();
  const desc = document.getElementById("editVideoDesc").value.trim();
  const url = document.getElementById("editVideoUrl").value.trim();
  const pdfUrl = document.getElementById("editVideoPdfUrl").value.trim();

  if (!title || !url) { showToast("⚠️ Title and URL are required"); return; }

  video.title = title;
  video.desc = desc;
  video.url = url;
  video.pdfUrl = pdfUrl || "";

  await saveData();
  closeEditVideoModal();
  renderAdminStructure();
  showToast("✅ Video updated successfully");
}

/* ---------------------------------------------------------
   ADMIN: LEADS TAB (user-submitted name/age/mobile/exam target)
--------------------------------------------------------- */
function renderLeadsList() {
  const container = document.getElementById("leadsList");
  if (!container) return;
  container.innerHTML = "";

  const searchEl = document.getElementById("adminLeadSearch");
  const query = (searchEl ? searchEl.value : "").trim().toLowerCase();

  let leads = [...(APP_DATA.leads || [])].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  if (query) {
    leads = leads.filter(l =>
      (l.name || "").toLowerCase().includes(query) ||
      (l.state || "").toLowerCase().includes(query) ||
      (l.id || "").includes(query)
    );
  }

  if (leads.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:30px 10px;">${query ? "No matches found" : "No leads yet"}</div>`;
    return;
  }

  leads.forEach(lead => {
    const card = document.createElement("div");
    card.className = "user-stats-card";
    card.innerHTML = `
      <div class="user-stats-top">
        <span class="user-stats-name">${escapeHtml(lead.name || "—")}${lead.legacy ? ' <small style="color:var(--text-faint);">(legacy)</small>' : ""}</span>
        <span class="user-stats-id">ID: ${escapeHtml(lead.id)}</span>
      </div>
      <div class="user-stats-first">Submitted: ${lead.submittedAt ? formatDateTime(new Date(lead.submittedAt).toISOString()) : "—"}</div>
      <div class="user-stats-times">
        <div class="user-stats-time-row"><span>Age</span><b>${escapeHtml(String(lead.age || "—"))}</b></div>
        <div class="user-stats-time-row"><span>State</span><b>${escapeHtml(lead.state || "—")}</b></div>
        <div class="user-stats-time-row"><span>Exam Target</span><b>${escapeHtml(lead.examTarget || "—")}</b></div>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ---------------------------------------------------------
   ADMIN: STATS TAB
--------------------------------------------------------- */
function renderTodayUsersList(todayUsers) {
  const container = document.getElementById("todayUsersList");
  if (!container) return;
  container.innerHTML = "";

  if (todayUsers.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px;">No users have visited today</div>`;
    return;
  }

  todayUsers.forEach(u => {
    const row = document.createElement("div");
    row.className = "user-stats-card";
    row.innerHTML = `
      <div class="user-stats-top">
        <span class="user-stats-name">${escapeHtml(u.first_name || "Unknown")}${u.username ? " (@" + escapeHtml(u.username) + ")" : ""}</span>
        <span class="user-stats-id">ID: ${escapeHtml(u.user_id)}</span>
      </div>
      <div class="user-stats-first">Last seen: ${formatDateTime(u.last_seen_at)}</div>
    `;
    container.appendChild(row);
  });
}

async function renderAdminStats() {
  const listEl = document.getElementById("userStatsList");
  if (!listEl) return;

  if (!sbClient) {
    listEl.innerHTML = `<div class="empty-state" style="padding:20px;">Cloud not connected, stats unavailable</div>`;
    return;
  }

  listEl.innerHTML = `<div class="empty-state" style="padding:20px;">Loading...</div>`;

  try {
    const { data: users, error: usersErr } = await withTimeout(
      sbClient.from("app_users").select("*").order("last_seen_at", { ascending: false }),
      6000
    );
    if (usersErr) throw usersErr;

    const allUsers = users || [];
    setText("statTotalUsers", allUsers.length);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = allUsers.filter(u => new Date(u.last_seen_at) >= todayStart).length;
    setText("statTodayUsers", todayCount);

    const { data: sessions, error: sessErr } = await withTimeout(
      sbClient.from("app_sessions").select("*"),
      6000
    );
    if (sessErr) throw sessErr;

    const allSessions = sessions || [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // "Aaj aaye" users list (Stats tab)
    const todayUsers = allUsers.filter(u => new Date(u.last_seen_at) >= todayStart);
    renderTodayUsersList(todayUsers);

    // Apply search filter (name / username / id)
    const searchEl = document.getElementById("adminStatsSearch");
    const query = (searchEl ? searchEl.value : "").trim().toLowerCase();
    let filteredUsers = allUsers;
    if (query) {
      filteredUsers = allUsers.filter(u =>
        (u.first_name || "").toLowerCase().includes(query) ||
        (u.username || "").toLowerCase().includes(query) ||
        (u.user_id || "").includes(query)
      );
    }

    listEl.innerHTML = "";
    if (filteredUsers.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:20px;">${query ? "No matches found" : "No user activity yet"}</div>`;
      return;
    }

    filteredUsers.forEach(u => {
      const userSessions = allSessions.filter(s => s.user_id === u.user_id);
      const overallSec = userSessions.reduce((sum, s) => sum + (s.seconds || 0), 0);
      const last7Sec = userSessions
        .filter(s => new Date(s.ended_at).getTime() >= sevenDaysAgo)
        .reduce((sum, s) => sum + (s.seconds || 0), 0);

      const card = document.createElement("div");
      card.className = "user-stats-card";
      card.innerHTML = `
        <div class="user-stats-top">
          <span class="user-stats-name">${escapeHtml(u.first_name || "Unknown")}${u.username ? " (@" + escapeHtml(u.username) + ")" : ""}</span>
          <span class="user-stats-id">ID: ${escapeHtml(u.user_id)}</span>
        </div>
        <div class="user-stats-first">Pehli baar aaya: ${formatDateTime(u.first_seen_at)}</div>
        <div class="user-stats-times">
          <div class="user-stats-time-row"><span>SW Batch — Last 7 days</span><b>${formatDuration(last7Sec)}</b></div>
          <div class="user-stats-time-row"><span>SW Batch — Overall</span><b>${formatDuration(overallSec)}</b></div>
        </div>
      `;
      listEl.appendChild(card);
    });
  } catch (e) {
    console.warn("renderAdminStats failed", e);
    listEl.innerHTML = `<div class="empty-state" style="padding:20px;">Failed to load stats</div>`;
  }
}

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds < 60) return (totalSeconds || 0) + "s";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "—";
  }
}

/* ---------------------------------------------------------
   ADMIN: SETTINGS
--------------------------------------------------------- */
function handleSaveSettings() {
  const contact = document.getElementById("adminContact").value.trim().replace("@", "");
  APP_DATA.settings.contactUsername = contact || "pratibha0x";

  saveData();
  showToast("✅ Settings saved successfully");
}

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */
function getSubject(id) {
  return APP_DATA.subjects.find(s => s.id === id);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}