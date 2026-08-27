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
const HARD_LOAD_TIMEOUT_MS = 4000; // loader will never wait longer than this

/* ---------------------------------------------------------
   DEFAULT DATA
--------------------------------------------------------- */
function getDefaultData() {
  return {
    settings: {
      price: 499, oldPrice: 1999, contactUsername: "pratibha0x",
      priceEnglish: 299, priceReasoning: 199, priceMaths: 299, priceFullBatch: 699
    },
    allowedUsers: [],
    subjects: [
      { id: "english", name: "English", icon: "eng", emoji: "fa-book-open", topics: [] },
      { id: "reasoning", name: "Reasoning", icon: "reason", emoji: "fa-brain", topics: [] },
      { id: "maths", name: "Maths", icon: "maths", emoji: "fa-square-root-variable", topics: [] }
    ]
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

  try {
    if (IS_ADMIN || isUserAllowed(CURRENT_USER_ID)) {
      showScreen("homeScreen");
      renderSubjects();
      updateOverallProgress();
    } else {
      showScreen("lockedScreen");
    }
  } catch (e) {
    console.error("Final render error", e);
    showErrorScreen("App display karne me dikkat aayi.");
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

    const result = await withTimeout(
      sbClient.from("app_data").select("value").eq("id", "main").single(),
      3000
    );

    const { data, error } = result;

    if (error) {
      if (error.code === "PGRST116") {
        // no row yet -> create it
        await withTimeout(
          sbClient.from("app_data").upsert({ id: "main", value: APP_DATA }),
          3000
        );
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
  data.allowedUsers = Array.isArray(data.allowedUsers) ? data.allowedUsers : [];
  data.subjects = Array.isArray(data.subjects) && data.subjects.length ? data.subjects : base.subjects;

  data.subjects.forEach(s => {
    if (!Array.isArray(s.topics)) s.topics = [];
    s.topics.forEach(t => {
      if (!Array.isArray(t.videos)) t.videos = [];
      t.videos.forEach(v => { if (typeof v.pdfUrl !== "string") v.pdfUrl = ""; });
    });
  });

  return data;
}

async function saveData() {
  safeLocalSet(APP_DATA);

  if (sbClient) {
    try {
      await withTimeout(
        sbClient.from("app_data").upsert({ id: "main", value: APP_DATA }),
        4000
      );
      setCloudStatus(true);
    } catch (e) {
      console.warn("Supabase save failed", e);
      setCloudStatus(false);
      showToast("⚠️ Cloud sync fail hua, data local me save hai");
    }
  }
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
   ACCESS CONTROL
--------------------------------------------------------- */
function isUserAllowed(userId) {
  if (!userId || !APP_DATA || !Array.isArray(APP_DATA.allowedUsers)) return false;
  return APP_DATA.allowedUsers.includes(String(userId));
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
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------
   EVENT BINDINGS
--------------------------------------------------------- */
function bindEvents() {
  const buyBtn = document.getElementById("buyBtn");
  if (buyBtn) buyBtn.addEventListener("click", handleBuyClick);

  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.addEventListener("click", () => window.location.reload());

  const adminBtnHome = document.getElementById("adminBtnHome");
  if (adminBtnHome) adminBtnHome.addEventListener("click", () => {
    showScreen("adminScreen");
    renderAdminPanel();
  });

  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.back;
      if (target) showScreen(target);
    });
  });

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const content = document.getElementById(tab.dataset.tab);
      if (content) content.classList.add("active");
    });
  });

  safeBind("adminSubjectSelect", "change", populateAdminTopics);
  safeBind("adminAddTopicBtn", "click", handleAddTopic);
  safeBind("adminAddVideoBtn", "click", handleAddVideo);
  safeBind("adminAddUserBtn", "click", handleAddUser);
  safeBind("adminSaveSettingsBtn", "click", handleSaveSettings);

  const player = document.getElementById("videoPlayer");
  if (player) {
    const overlay = document.getElementById("videoLoadingOverlay");
    player.addEventListener("waiting", () => overlay && overlay.classList.add("show"));
    player.addEventListener("playing", () => overlay && overlay.classList.remove("show"));
    player.addEventListener("canplay", () => overlay && overlay.classList.remove("show"));
    player.addEventListener("error", () => {
      if (overlay) overlay.classList.remove("show");
      showVideoFallback();
    });
  }

  safeBind("openInBrowserBtn", "click", () => {
    if (!currentVideoUrl) return;
    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(currentVideoUrl);
      } else {
        window.open(currentVideoUrl, "_blank");
      }
    } catch (e) {
      window.open(currentVideoUrl, "_blank");
    }
  });

  // Player screen 3-dot menu
  safeBind("playerMenuBtn", "click", (e) => {
    e.stopPropagation();
    const dd = document.getElementById("playerMenuDropdown");
    if (dd) dd.classList.toggle("show");
  });
  safeBind("rotateScreenBtn", "click", () => {
    toggleScreenRotation();
    closePlayerMenu();
  });

  // PDF screen 3-dot menu
  safeBind("pdfMenuBtn", "click", (e) => {
    e.stopPropagation();
    const dd = document.getElementById("pdfMenuDropdown");
    if (dd) dd.classList.toggle("show");
  });
  safeBind("pdfRotateBtn", "click", () => {
    toggleScreenRotation();
    closePdfMenu();
  });
  safeBind("pdfOpenBrowserBtn", "click", () => {
    if (!currentPdfUrl) return;
    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(currentPdfUrl);
      } else {
        window.open(currentPdfUrl, "_blank");
      }
    } catch (e) {
      window.open(currentPdfUrl, "_blank");
    }
    closePdfMenu();
  });

  document.addEventListener("click", () => {
    closePlayerMenu();
    closePdfMenu();
  });
}

function closePlayerMenu() {
  const dd = document.getElementById("playerMenuDropdown");
  if (dd) dd.classList.remove("show");
}
function closePdfMenu() {
  const dd = document.getElementById("pdfMenuDropdown");
  if (dd) dd.classList.remove("show");
}

let currentVideoUrl = null;

function showVideoFallback() {
  showToast("⚠️ Ye video is app ke andar directly play nahi ho payi");
  const fallback = document.getElementById("videoFallback");
  if (fallback) fallback.classList.add("show");
}

function hideVideoFallback() {
  const fallback = document.getElementById("videoFallback");
  if (fallback) fallback.classList.remove("show");
}

function safeBind(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

/* ---------------------------------------------------------
   BUY BUTTON
--------------------------------------------------------- */
function handleBuyClick() {
  const username = (APP_DATA.settings.contactUsername || "pratibha0x").replace("@", "");
  const url = `https://t.me/${username}`;
  try {
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  } catch (e) {
    window.open(url, "_blank");
  }
}

/* ---------------------------------------------------------
   PRICING / STATS UI
--------------------------------------------------------- */
function updatePricingUI() {
  const s = APP_DATA.settings;
  const priceEnglish = s.priceEnglish || 299;
  const priceReasoning = s.priceReasoning || 199;
  const priceMaths = s.priceMaths || 299;
  const priceFullBatch = s.priceFullBatch || 699;

  setText("priceEnglish", "₹" + priceEnglish);
  setText("priceReasoning", "₹" + priceReasoning);
  setText("priceMaths", "₹" + priceMaths);
  setText("priceFullBatch", "₹" + priceFullBatch);
  setText("buyBtnText", "Buy Now — Contact for Access");
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

function updateOverallProgress() {
  // Simple "content explored" style indicator based on total videos available
  let videoCount = 0;
  APP_DATA.subjects.forEach(s => s.topics.forEach(t => videoCount += t.videos.length));
  const pct = videoCount > 0 ? 100 : 0; // placeholder visual; real progress needs user tracking
  const fill = document.getElementById("overallProgressFill");
  if (fill) fill.style.width = (videoCount > 0 ? 8 : 0) + "%";
  setText("overallProgressPct", videoCount > 0 ? "8%" : "0%");
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ---------------------------------------------------------
   RENDER: SUBJECTS
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
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i>Abhi is subject me koi topic add nahi hua.<br>Jaldi hi content aayega</div>`;
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
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-video-slash"></i>Is topic me abhi koi video upload nahi hui.<br>Jaldi hi aayegi</div>`;
    return;
  }

  topic.videos.forEach(video => {
    list.appendChild(buildVideoCard(video, topic));
  });
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
  card.addEventListener("click", () => playVideo(video, topic));
  return card;
}

/* ---------------------------------------------------------
   PDF VIEWER
--------------------------------------------------------- */
let currentPdfUrl = null;

function openPdfViewer(video) {
  if (!video || !video.pdfUrl) return;
  currentPdfUrl = video.pdfUrl;
  setText("pdfScreenTitle", video.title + " — Class PDF");

  const frame = document.getElementById("pdfFrame");
  if (frame) {
    // Google Docs viewer renders the PDF inline without allowing a native
    // download button, keeping it inside the mini app.
    frame.src = "https://docs.google.com/gview?embedded=1&url=" + encodeURIComponent(video.pdfUrl);
  }
  showScreen("pdfScreen");
}

function toggleScreenRotation() {
  try {
    const el = document.documentElement;
    if (screen.orientation && screen.orientation.lock) {
      const isPortrait = !screen.orientation.type || screen.orientation.type.startsWith("portrait");
      screen.orientation.lock(isPortrait ? "landscape" : "portrait").catch(() => {
        showToast("⚠️ Rotation ye device/browser support nahi kar raha, phone ko manually ghumayein");
      });
    } else {
      showToast("⚠️ Rotation ye device/browser support nahi kar raha, phone ko manually ghumayein");
    }
  } catch (e) {
    showToast("⚠️ Rotation ye device/browser support nahi kar raha, phone ko manually ghumayein");
  }
}

/* ---------------------------------------------------------
   PLAYER
--------------------------------------------------------- */
function playVideo(video, topic) {
  setText("playerVideoTitle", video.title);
  setText("playerVideoTitle2", video.title);
  setText("playerVideoDesc", video.desc || "No description available.");

  currentVideoUrl = video.url;
  hideVideoFallback();
  closePlayerMenu();

  const pdfBtn = document.getElementById("openPdfBtn");
  if (pdfBtn) {
    if (video.pdfUrl) {
      pdfBtn.classList.remove("hidden");
      pdfBtn.onclick = () => openPdfViewer(video);
    } else {
      pdfBtn.classList.add("hidden");
      pdfBtn.onclick = null;
    }
  }

  const player = document.getElementById("videoPlayer");
  if (player) {
    player.src = video.url;
    player.load();
    player.play().catch(() => {
      // Autoplay blocked or immediate failure — not necessarily an error,
      // the 'error' event listener will catch real playback failures.
    });
  }

  const upNext = document.getElementById("upNextList");
  if (upNext) {
    upNext.innerHTML = "";
    const others = topic.videos.filter(v => v.id !== video.id);
    if (others.length === 0) {
      upNext.innerHTML = `<div class="empty-state" style="padding:30px 20px;">Aur koi video nahi hai is topic me</div>`;
    } else {
      others.forEach(v => upNext.appendChild(buildVideoCard(v, topic)));
    }
  }

  showScreen("playerScreen");
}

/* ---------------------------------------------------------
   ADMIN PANEL
--------------------------------------------------------- */
function renderAdminPanel() {
  populateAdminSubjects();
  populateAdminTopics();
  renderAdminStructure();
  renderAllowedUsers();

  const priceEnglishEl = document.getElementById("adminPriceEnglish");
  const priceReasoningEl = document.getElementById("adminPriceReasoning");
  const priceMathsEl = document.getElementById("adminPriceMaths");
  const priceFullBatchEl = document.getElementById("adminPriceFullBatch");
  const contactEl = document.getElementById("adminContact");
  if (priceEnglishEl) priceEnglishEl.value = APP_DATA.settings.priceEnglish || 299;
  if (priceReasoningEl) priceReasoningEl.value = APP_DATA.settings.priceReasoning || 199;
  if (priceMathsEl) priceMathsEl.value = APP_DATA.settings.priceMaths || 299;
  if (priceFullBatchEl) priceFullBatchEl.value = APP_DATA.settings.priceFullBatch || 699;
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
    opt.textContent = "-- Pehle topic banayein --";
    select.appendChild(opt);
    return;
  }

  subject.topics.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });
}

function handleAddTopic() {
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const subject = getSubject(subjectSelect.value);
  if (!subject) return;

  const name = prompt("Naye topic ka naam likhein (e.g. Tenses, Percentage, Syllogism):");
  if (!name || !name.trim()) return;

  subject.topics.push({ id: "topic_" + Date.now(), name: name.trim(), videos: [] });

  saveData();
  populateAdminTopics();
  renderAdminStructure();
  showToast("✅ Topic add ho gaya: " + name);
}

async function handleAddVideo() {
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const topicSelect = document.getElementById("adminTopicSelect");
  const titleEl = document.getElementById("adminVideoTitle");
  const descEl = document.getElementById("adminVideoDesc");
  const urlEl = document.getElementById("adminVideoUrl");
  const pdfUrlEl = document.getElementById("adminVideoPdfUrl");

  const subjectId = subjectSelect.value;
  const topicId = topicSelect.value;
  const title = titleEl.value.trim();
  const desc = descEl.value.trim();
  const url = urlEl.value.trim();
  const pdfUrl = pdfUrlEl ? pdfUrlEl.value.trim() : "";

  if (!topicId) { showToast("⚠️ Pehle topic select ya create karein"); return; }
  if (!title || !url) { showToast("⚠️ Video title aur URL zaroori hai"); return; }

  const subject = getSubject(subjectId);
  const topic = subject.topics.find(t => t.id === topicId);
  if (!topic) return;

  topic.videos.push({ id: "video_" + Date.now(), title, desc, url, pdfUrl: pdfUrl || "" });

  await saveData();

  titleEl.value = "";
  descEl.value = "";
  urlEl.value = "";
  if (pdfUrlEl) pdfUrlEl.value = "";

  renderAdminStructure();
  updateLockedStats();
  showToast("✅ Video add ho gayi: " + title);
}

function renderAdminStructure() {
  const container = document.getElementById("adminStructureList");
  if (!container) return;
  container.innerHTML = "";

  APP_DATA.subjects.forEach(subject => {
    const block = document.createElement("div");
    block.className = "admin-struct-item";

    let html = `<div class="admin-struct-subject"><i class="fa-solid ${subject.emoji || 'fa-book'}"></i> ${escapeHtml(subject.name)}</div>`;

    if (subject.topics.length === 0) {
      html += `<div class="admin-struct-topic"><span>Koi topic nahi</span></div>`;
    } else {
      subject.topics.forEach(topic => {
        html += `<div class="admin-struct-topic">
          <span><i class="fa-solid fa-folder"></i> ${escapeHtml(topic.name)} (${topic.videos.length})</span>
          <button class="mini-del-btn" data-subject="${subject.id}" data-topic="${topic.id}" data-action="del-topic">Delete</button>
        </div>`;
        topic.videos.forEach(video => {
          html += `<div class="admin-struct-video">
            <span><i class="fa-solid fa-video"></i> ${escapeHtml(video.title)}</span>
            <button class="mini-del-btn" data-subject="${subject.id}" data-topic="${topic.id}" data-video="${video.id}" data-action="del-video">Delete</button>
          </div>`;
        });
      });
    }

    block.innerHTML = html;
    container.appendChild(block);
  });

  container.querySelectorAll(".mini-del-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const t = e.currentTarget;
      const action = t.dataset.action;
      const subjectId = t.dataset.subject;
      const topicId = t.dataset.topic;

      if (action === "del-topic") {
        if (!confirm("Ye topic aur uski saari videos delete ho jayengi. Confirm?")) return;
        const subject = getSubject(subjectId);
        subject.topics = subject.topics.filter(tp => tp.id !== topicId);
      } else if (action === "del-video") {
        const videoId = t.dataset.video;
        if (!confirm("Ye video delete karein?")) return;
        const subject = getSubject(subjectId);
        const topic = subject.topics.find(tp => tp.id === topicId);
        topic.videos = topic.videos.filter(v => v.id !== videoId);
      }

      saveData();
      renderAdminStructure();
      populateAdminTopics();
      updateLockedStats();
    });
  });
}

/* ---------------------------------------------------------
   ADMIN: USER ACCESS CONTROL
--------------------------------------------------------- */
function handleAddUser() {
  const input = document.getElementById("adminNewUserId");
  const id = input.value.trim();

  if (!id) { showToast("⚠️ User ID likhein"); return; }
  if (APP_DATA.allowedUsers.includes(id)) { showToast("Ye ID pehle se allowed hai"); return; }

  APP_DATA.allowedUsers.push(id);
  saveData();
  input.value = "";
  renderAllowedUsers();
  showToast("✅ User access diya gaya: " + id);
}

function renderAllowedUsers() {
  const container = document.getElementById("allowedUsersList");
  if (!container) return;
  container.innerHTML = "";

  if (APP_DATA.allowedUsers.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:30px 10px;">Abhi koi user allowed nahi hai</div>`;
    return;
  }

  APP_DATA.allowedUsers.forEach(id => {
    const row = document.createElement("div");
    row.className = "allowed-user-row";
    row.innerHTML = `<span>${escapeHtml(id)}</span><button class="mini-del-btn">Remove</button>`;
    row.querySelector("button").addEventListener("click", () => {
      APP_DATA.allowedUsers = APP_DATA.allowedUsers.filter(u => u !== id);
      saveData();
      renderAllowedUsers();
      showToast("User access hata diya gaya");
    });
    container.appendChild(row);
  });
}

/* ---------------------------------------------------------
   ADMIN: SETTINGS
--------------------------------------------------------- */
function handleSaveSettings() {
  const priceEnglish = parseInt(document.getElementById("adminPriceEnglish").value) || 299;
  const priceReasoning = parseInt(document.getElementById("adminPriceReasoning").value) || 199;
  const priceMaths = parseInt(document.getElementById("adminPriceMaths").value) || 299;
  const priceFullBatch = parseInt(document.getElementById("adminPriceFullBatch").value) || 699;
  const contact = document.getElementById("adminContact").value.trim().replace("@", "");

  APP_DATA.settings.priceEnglish = priceEnglish;
  APP_DATA.settings.priceReasoning = priceReasoning;
  APP_DATA.settings.priceMaths = priceMaths;
  APP_DATA.settings.priceFullBatch = priceFullBatch;
  APP_DATA.settings.contactUsername = contact || "pratibha0x";

  saveData();
  updatePricingUI();
  showToast("✅ Settings save ho gayi");
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