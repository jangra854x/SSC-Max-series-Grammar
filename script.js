/* =========================================================
   SSC SELECTION BATCH 11.0 — Telegram Mini App
   =========================================================
   SETUP REQUIRED (IMPORTANT):
   1) Neeche SUPABASE_URL aur SUPABASE_ANON_KEY apni details se fill karo.
   2) Supabase me ek table banao "app_data" with columns:
        - id (text, primary key)
        - value (jsonb)
      Isme hum poora structure (subjects/topics/videos/allowedUsers/settings)
      ek hi row me "value" jsonb ke andar store karenge, id = 'main'
   3) Row Level Security allow karo (ya "anon" role ko read/write access do)
      taaki mini app bina backend server ke seedha Supabase se baat kar sake.
   ========================================================= */

const SUPABASE_URL = "https://gmbnmefjzvpwrvkolwdw.supabase.co";        // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYm5tZWZqenZwd3J2a29sd2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MzQ1MzksImV4cCI6MjEwMzIxMDUzOX0.lmlrmrB6e7s9NnOS_B24VaQ0IGTeBqa-cHrfzVz5mes";

const ADMIN_ID = "7990149560"; // Fixed admin Telegram ID

/* ---------------------------------------------------------
   DEFAULT DATA STRUCTURE (used first time / if Supabase empty)
--------------------------------------------------------- */
const DEFAULT_DATA = {
  settings: {
    price: 499,
    contactUsername: "" // admin ka telegram username (without @) for buy redirect
  },
  allowedUsers: [], // array of telegram user id strings who have access
  subjects: [
    {
      id: "english",
      name: "English",
      icon: "eng",
      emoji: "📘",
      topics: []
    },
    {
      id: "reasoning",
      name: "Reasoning",
      icon: "reason",
      emoji: "🧠",
      topics: []
    },
    {
      id: "maths",
      name: "Maths",
      icon: "maths",
      emoji: "📐",
      topics: []
    }
  ]
};

/* ---------------------------------------------------------
   GLOBAL STATE
--------------------------------------------------------- */
let APP_DATA = null;
let CURRENT_USER_ID = null;
let CURRENT_USER_NAME = "";
let IS_ADMIN = false;
let sbClient = null;

let navState = {
  subjectId: null,
  topicId: null
};

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupTelegram();
  setupSupabase();
  bindEvents();

  await loadData();

  renderAdminVisibility();

  if (IS_ADMIN) {
    // Admin always gets full access
    showScreen("homeScreen");
    renderSubjects();
  } else if (isUserAllowed(CURRENT_USER_ID)) {
    showScreen("homeScreen");
    renderSubjects();
  } else {
    showScreen("lockedScreen");
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
      tg.expand();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        CURRENT_USER_ID = String(user.id);
        CURRENT_USER_NAME = [user.first_name, user.last_name].filter(Boolean).join(" ");
      }
      try { tg.setHeaderColor("#0a0a0f"); } catch(e){}
      try { tg.setBackgroundColor("#0a0a0f"); } catch(e){}
    }
  } catch (e) {
    console.warn("Telegram WebApp not available", e);
  }

  // Fallback for testing outside Telegram (browser preview)
  if (!CURRENT_USER_ID) {
    CURRENT_USER_ID = "TEST_USER";
  }

  IS_ADMIN = CURRENT_USER_ID === ADMIN_ID;
}

/* ---------------------------------------------------------
   SUPABASE SETUP (via CDN, loaded dynamically)
--------------------------------------------------------- */
function setupSupabase() {
  if (SUPABASE_URL.includes("YOUR_SUPABASE_URL_HERE")) {
    console.warn("Supabase not configured yet. Using localStorage fallback.");
    return;
  }
  // Load supabase-js from CDN
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  script.onload = () => {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  };
  document.head.appendChild(script);
}

/* ---------------------------------------------------------
   DATA LOAD / SAVE
   Priority: Supabase (if configured) -> localStorage fallback
--------------------------------------------------------- */
async function loadData() {
  // Try localStorage first for instant UI, then sync with Supabase if available
  const local = localStorage.getItem("ssc_batch_data");
  if (local) {
    try { APP_DATA = JSON.parse(local); } catch(e) { APP_DATA = null; }
  }
  if (!APP_DATA) APP_DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));

  if (SUPABASE_URL.includes("YOUR_SUPABASE_URL_HERE")) {
    return; // no supabase, localStorage only
  }

  // wait a tick for supabase script to load
  await waitForSupabaseClient();

  if (sbClient) {
    try {
      const { data, error } = await sbClient
        .from("app_data")
        .select("value")
        .eq("id", "main")
        .single();

      if (!error && data && data.value) {
        APP_DATA = data.value;
        localStorage.setItem("ssc_batch_data", JSON.stringify(APP_DATA));
      } else {
        // No row yet — create it with current data
        await saveData();
      }
    } catch (e) {
      console.warn("Supabase load failed, using local data", e);
    }
  }
}

function waitForSupabaseClient(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (sbClient || Date.now() - start > timeoutMs) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

async function saveData() {
  localStorage.setItem("ssc_batch_data", JSON.stringify(APP_DATA));

  if (sbClient) {
    try {
      await sbClient
        .from("app_data")
        .upsert({ id: "main", value: APP_DATA });
    } catch (e) {
      console.warn("Supabase save failed", e);
      showToast("⚠️ Cloud sync failed, saved locally only");
    }
  }
}

/* ---------------------------------------------------------
   ACCESS CONTROL HELPERS
--------------------------------------------------------- */
function isUserAllowed(userId) {
  if (!userId) return false;
  return APP_DATA.allowedUsers.includes(String(userId));
}

function renderAdminVisibility() {
  const btn = document.getElementById("adminBtnHome");
  if (IS_ADMIN) {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
  }
  const idEl = document.getElementById("adminMyId");
  if (idEl) idEl.textContent = ADMIN_ID;
}

/* ---------------------------------------------------------
   SCREEN NAVIGATION
--------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------
   EVENT BINDINGS
--------------------------------------------------------- */
function bindEvents() {
  document.getElementById("buyBtn").addEventListener("click", handleBuyClick);

  document.getElementById("adminBtnHome").addEventListener("click", () => {
    showScreen("adminScreen");
    renderAdminPanel();
  });

  document.getElementById("backFromTopic").addEventListener("click", () => {
    showScreen("homeScreen");
  });

  document.getElementById("backFromVideoList").addEventListener("click", () => {
    showScreen("topicScreen");
  });

  document.getElementById("backFromPlayer").addEventListener("click", () => {
    const video = document.getElementById("videoPlayer");
    video.pause();
    video.src = "";
    showScreen("videoListScreen");
  });

  document.getElementById("backFromAdmin").addEventListener("click", () => {
    showScreen("homeScreen");
  });

  // Admin tabs
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  document.getElementById("adminSubjectSelect").addEventListener("change", populateAdminTopics);
  document.getElementById("adminAddTopicBtn").addEventListener("click", handleAddTopic);
  document.getElementById("adminAddVideoBtn").addEventListener("click", handleAddVideo);
  document.getElementById("adminAddUserBtn").addEventListener("click", handleAddUser);
  document.getElementById("adminSaveSettingsBtn").addEventListener("click", handleSaveSettings);
}

/* ---------------------------------------------------------
   BUY BUTTON — redirect to admin contact
--------------------------------------------------------- */
function handleBuyClick() {
  const username = APP_DATA.settings.contactUsername;
  const price = APP_DATA.settings.price || 499;

  if (username) {
    const msg = encodeURIComponent(`Hi! Main Selection Batch 11.0 (₹${price}) purchase karna chahta hoon. Please payment details bhejein.`);
    const url = `https://t.me/${username}?text=${msg}`;
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  } else {
    showToast("Payment link jaldi add hoga. Kripya thodi der baad try karein.");
  }
}

/* ---------------------------------------------------------
   RENDER: SUBJECTS (HOME)
--------------------------------------------------------- */
function renderSubjects() {
  const list = document.getElementById("subjectList");
  list.innerHTML = "";

  APP_DATA.subjects.forEach(subject => {
    const topicCount = subject.topics.length;
    const videoCount = subject.topics.reduce((sum, t) => sum + t.videos.length, 0);

    const card = document.createElement("div");
    card.className = "subject-card";
    card.innerHTML = `
      <div class="subject-icon ${subject.icon}">${subject.emoji}</div>
      <div class="subject-info">
        <div class="subject-name">${escapeHtml(subject.name)}</div>
        <div class="subject-meta">${topicCount} topics • ${videoCount} videos</div>
      </div>
      <div class="subject-arrow">›</div>
    `;
    card.addEventListener("click", () => openSubject(subject.id));
    list.appendChild(card);
  });
}

function openSubject(subjectId) {
  navState.subjectId = subjectId;
  const subject = getSubject(subjectId);
  document.getElementById("topicSubjectTitle").textContent = subject.name;
  renderTopics(subject);
  showScreen("topicScreen");
}

/* ---------------------------------------------------------
   RENDER: TOPICS
--------------------------------------------------------- */
function renderTopics(subject) {
  const list = document.getElementById("topicList");
  list.innerHTML = "";

  if (subject.topics.length === 0) {
    list.innerHTML = `<div class="empty-state">Abhi is subject me koi topic add nahi hua.<br>Jaldi hi content aayega 🚀</div>`;
    return;
  }

  subject.topics.forEach(topic => {
    const card = document.createElement("div");
    card.className = "topic-card";
    card.innerHTML = `
      <div class="topic-name">${escapeHtml(topic.name)}</div>
      <div class="topic-count">${topic.videos.length} videos</div>
    `;
    card.addEventListener("click", () => openTopic(topic.id));
    list.appendChild(card);
  });
}

function openTopic(topicId) {
  navState.topicId = topicId;
  const subject = getSubject(navState.subjectId);
  const topic = subject.topics.find(t => t.id === topicId);

  document.getElementById("videoListTopicTitle").textContent = topic.name;
  document.getElementById("videoListCount").textContent = `${topic.videos.length} videos`;
  renderVideos(topic);
  showScreen("videoListScreen");
}

/* ---------------------------------------------------------
   RENDER: VIDEOS
--------------------------------------------------------- */
function renderVideos(topic) {
  const list = document.getElementById("videoList");
  list.innerHTML = "";

  if (topic.videos.length === 0) {
    list.innerHTML = `<div class="empty-state">Is topic me abhi koi video upload nahi hui.<br>Jaldi hi aayegi 🎬</div>`;
    return;
  }

  topic.videos.forEach(video => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <div class="video-thumb">▶</div>
      <div class="video-info">
        <div class="video-title">${escapeHtml(video.title)}</div>
        <div class="video-desc">${escapeHtml(video.desc || "")}</div>
      </div>
    `;
    card.addEventListener("click", () => playVideo(video));
    list.appendChild(card);
  });
}

/* ---------------------------------------------------------
   PLAYER
--------------------------------------------------------- */
function playVideo(video) {
  document.getElementById("playerVideoTitle").textContent = video.title;
  document.getElementById("playerVideoTitle2").textContent = video.title;
  document.getElementById("playerVideoDesc").textContent = video.desc || "";

  const player = document.getElementById("videoPlayer");
  player.src = video.url;

  showScreen("playerScreen");
  player.play().catch(() => {});
}

/* ---------------------------------------------------------
   ADMIN PANEL
--------------------------------------------------------- */
function renderAdminPanel() {
  populateAdminSubjects();
  populateAdminTopics();
  renderAdminStructure();
  renderAllowedUsers();

  document.getElementById("adminPrice").value = APP_DATA.settings.price || 499;
  document.getElementById("adminContact").value = APP_DATA.settings.contactUsername || "";
}

function populateAdminSubjects() {
  const select = document.getElementById("adminSubjectSelect");
  select.innerHTML = "";
  APP_DATA.subjects.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

function populateAdminTopics() {
  const subjectId = document.getElementById("adminSubjectSelect").value;
  const subject = getSubject(subjectId);
  const select = document.getElementById("adminTopicSelect");
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
  const subjectId = document.getElementById("adminSubjectSelect").value;
  const subject = getSubject(subjectId);
  if (!subject) return;

  const name = prompt("Naye topic ka naam likhein (e.g. Tenses, Percentage, Syllogism):");
  if (!name || !name.trim()) return;

  const topic = {
    id: "topic_" + Date.now(),
    name: name.trim(),
    videos: []
  };
  subject.topics.push(topic);

  saveData();
  populateAdminTopics();
  renderAdminStructure();
  showToast("✅ Topic add ho gaya: " + name);
}

async function handleAddVideo() {
  const subjectId = document.getElementById("adminSubjectSelect").value;
  const topicId = document.getElementById("adminTopicSelect").value;
  const title = document.getElementById("adminVideoTitle").value.trim();
  const desc = document.getElementById("adminVideoDesc").value.trim();
  const url = document.getElementById("adminVideoUrl").value.trim();

  if (!topicId) {
    showToast("⚠️ Pehle topic select ya create karein");
    return;
  }
  if (!title || !url) {
    showToast("⚠️ Video title aur URL zaroori hai");
    return;
  }

  const subject = getSubject(subjectId);
  const topic = subject.topics.find(t => t.id === topicId);
  if (!topic) return;

  topic.videos.push({
    id: "video_" + Date.now(),
    title,
    desc,
    url
  });

  await saveData();

  document.getElementById("adminVideoTitle").value = "";
  document.getElementById("adminVideoDesc").value = "";
  document.getElementById("adminVideoUrl").value = "";

  renderAdminStructure();
  showToast("✅ Video add ho gayi: " + title);
}

function renderAdminStructure() {
  const container = document.getElementById("adminStructureList");
  container.innerHTML = "";

  APP_DATA.subjects.forEach(subject => {
    const block = document.createElement("div");
    block.className = "admin-struct-item";

    let html = `<div class="admin-struct-subject">${escapeHtml(subject.name)}</div>`;

    if (subject.topics.length === 0) {
      html += `<div class="admin-struct-topic"><span>Koi topic nahi</span></div>`;
    } else {
      subject.topics.forEach(topic => {
        html += `<div class="admin-struct-topic">
          <span>📁 ${escapeHtml(topic.name)} (${topic.videos.length})</span>
          <button class="mini-del-btn" data-subject="${subject.id}" data-topic="${topic.id}" data-action="del-topic">Delete</button>
        </div>`;
        topic.videos.forEach(video => {
          html += `<div class="admin-struct-video">
            <span>🎬 ${escapeHtml(video.title)}</span>
            <button class="mini-del-btn" data-subject="${subject.id}" data-topic="${topic.id}" data-video="${video.id}" data-action="del-video">Delete</button>
          </div>`;
        });
      });
    }

    block.innerHTML = html;
    container.appendChild(block);
  });

  // Bind delete buttons
  container.querySelectorAll(".mini-del-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      const subjectId = e.target.dataset.subject;
      const topicId = e.target.dataset.topic;

      if (action === "del-topic") {
        if (!confirm("Ye topic aur uski saari videos delete ho jayengi. Confirm?")) return;
        const subject = getSubject(subjectId);
        subject.topics = subject.topics.filter(t => t.id !== topicId);
      } else if (action === "del-video") {
        const videoId = e.target.dataset.video;
        if (!confirm("Ye video delete karein?")) return;
        const subject = getSubject(subjectId);
        const topic = subject.topics.find(t => t.id === topicId);
        topic.videos = topic.videos.filter(v => v.id !== videoId);
      }

      saveData();
      renderAdminStructure();
      populateAdminTopics();
    });
  });
}

/* ---------------------------------------------------------
   ADMIN: USER ACCESS CONTROL
--------------------------------------------------------- */
function handleAddUser() {
  const input = document.getElementById("adminNewUserId");
  const id = input.value.trim();

  if (!id) {
    showToast("⚠️ User ID likhein");
    return;
  }
  if (APP_DATA.allowedUsers.includes(id)) {
    showToast("Ye ID pehle se allowed hai");
    return;
  }

  APP_DATA.allowedUsers.push(id);
  saveData();
  input.value = "";
  renderAllowedUsers();
  showToast("✅ User access diya gaya: " + id);
}

function renderAllowedUsers() {
  const container = document.getElementById("allowedUsersList");
  container.innerHTML = "";

  if (APP_DATA.allowedUsers.length === 0) {
    container.innerHTML = `<div class="empty-state">Abhi koi user allowed nahi hai</div>`;
    return;
  }

  APP_DATA.allowedUsers.forEach(id => {
    const row = document.createElement("div");
    row.className = "allowed-user-row";
    row.innerHTML = `
      <span>${escapeHtml(id)}</span>
      <button class="mini-del-btn" data-id="${id}">Remove</button>
    `;
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
  const price = parseInt(document.getElementById("adminPrice").value) || 499;
  const contact = document.getElementById("adminContact").value.trim().replace("@", "");

  APP_DATA.settings.price = price;
  APP_DATA.settings.contactUsername = contact;

  saveData();

  // update locked screen price live
  document.querySelector(".price-new").textContent = "₹" + price;
  document.getElementById("buyBtn").textContent = "Buy Now - ₹" + price;

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
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}