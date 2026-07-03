/**
 * SSC MAX VOCAB — Client Engine v4
 * Schema: quiz_type, topic, question, option_a/b/c/d, correct_option, explanation_a/b/c/d
 * v4: Working Live Themes, Admin User Modal, View Rank Toggle, Streak Fix,
 *     Free Quiz Auto-Cleanup, Titles Removed
 *
 * REQUIRED SUPABASE SETUP (run once in SQL Editor):
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0;
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date date;
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false;
 * CREATE TABLE IF NOT EXISTS app_settings (id integer primary key, active_theme text default 'aurora');
 * INSERT INTO app_settings (id, active_theme) VALUES (1,'aurora') ON CONFLICT (id) DO NOTHING;
 */

const SUPABASE_URL = 'https://tbiktjhwdlwzrhwursxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaWt0amh3ZGx3enJod3Vyc3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzQ2MjYsImV4cCI6MjA5Nzg1MDYyNn0.aukjIOzRatuQCo_UgUir5WZX4uS2_CQ2t760VgRV-MA';
let supabaseClient = null;
try { if (window.supabase?.createClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch(e) { console.error('Supabase init:', e); }

const TOPICS = ['One Word Substitution','Idioms & Phrases','Synonyms','Spelling','Antonyms','Homophones'];
const LOCKED_TOPICS = ['Antonyms','Homophones'];

const ADMIN_THEMES = [
    { id:'aurora', name:'Aurora Nebula', desc:'Purple-cyan cosmic glow with drifting orbs', tag:'DEFAULT' },
    { id:'molten', name:'Molten Gold',   desc:'Fiery orange embers rising through the dark',tag:'INTENSE' },
    { id:'matrix', name:'Cyber Matrix',  desc:'Green digital rain, tech-noir energy',        tag:'TECH' },
    { id:'velvet', name:'Royal Velvet',  desc:'Pink-purple luxury with swirling light',      tag:'LUXURY' }
];

let appState = {
    isPremium:false, isAdmin:false, isBanned:false,
    currentUser:{ id:null, name:'SSC Aspirant', username:'', photo_url:'' },
    currentView:'dashboard', activeVaultTab:'weak', activeRankPeriod:'daily',
    searchQuery:'', weakWords:[], bookmarkedWords:[],
    streak:0, activeTheme:'aurora',
    quiz:{ active:false, type:'free', title:'', quizCategory:null, isPremiumLocked:false, questions:[], currentIndex:0, selectedOption:null, correctCount:0, wrongCount:0, timeSeconds:0, stopwatchInterval:null },
    cache:{ activePremiumDate:null, activeFreeDate:null, archives:null, topicSets:{}, leaderboard:null, resultRankLoaded:false }
};

class SSCMaxVocabEngine {
    constructor() { this.initDOMNodes(); this.bindNavigationEvents(); this.injectLiveThemeLayer(); this.initTelegramContext(); }

    initDOMNodes() {
        this.premiumTopicsList = document.getElementById('premium-topics-list');
        this.premiumArchivesEl = document.getElementById('premium-archives-container');
        this.vaultItemsEl      = document.getElementById('vault-items-container');
        this.leaderboardEl     = document.getElementById('leaderboard-master-container');
        this.quizFrame         = document.getElementById('question-card-frame');
        this.optionsContainer  = document.getElementById('question-options-container');
        this.btnNextQ          = document.getElementById('btn-next-q');
        this.btnBookmark       = document.getElementById('btn-bookmark-current');
        this.btnStartQuiz      = document.getElementById('btn-confirm-start-quiz');
        this.btnNextQ.addEventListener('click', () => this.advanceQuestion());
        this.btnStartQuiz.addEventListener('click', () => this.handleStartQuizClick());
    }

    // ── LIVE THEME LAYER ─────────────────────────────────────────
    injectLiveThemeLayer() {
        const layer = document.getElementById('live-theme-layer');
        if(!layer) return;
        // 3 floating orbs + several twinkling stars, CSS handles per-theme colors/animation
        let html = '<div class="theme-orb"></div><div class="theme-orb"></div><div class="theme-orb"></div>';
        for(let i=0;i<18;i++) {
            const top = Math.random()*100, left = Math.random()*100, size = 1+Math.random()*2;
            html += `<div class="theme-star" style="top:${top}%;left:${left}%;width:${size}px;height:${size}px;animation-delay:${(Math.random()*3).toFixed(1)}s;"></div>`;
        }
        layer.innerHTML = html;

        const saved = this.safeLocalGet('ssc_local_theme');
        if(saved) this.applyThemeLocally(saved, false);

        this.loadGlobalTheme();
    }

    safeLocalGet(key) { try { return localStorage.getItem(key); } catch(e) { return null; } }
    safeLocalSet(key,val) { try { localStorage.setItem(key,val); } catch(e){} }

    async loadGlobalTheme() {
        if(!supabaseClient) return;
        try {
            const { data } = await supabaseClient.from('app_settings').select('active_theme').eq('id',1).maybeSingle();
            if(data?.active_theme && !this.safeLocalGet('ssc_local_theme')) {
                this.applyThemeLocally(data.active_theme, false);
            }
            appState.activeTheme = data?.active_theme || 'aurora';
        } catch(e) { /* app_settings table may not exist yet — silently ignore */ }
    }

    applyThemeLocally(themeId, showToast=true) {
        document.body.setAttribute('data-theme', themeId);
        this.safeLocalSet('ssc_local_theme', themeId);
        if(showToast) this.triggerToast(`Theme applied: ${ADMIN_THEMES.find(t=>t.id===themeId)?.name||themeId}`);
    }

    resetToGlobalTheme() {
        try { localStorage.removeItem('ssc_local_theme'); } catch(e){}
        document.body.setAttribute('data-theme', appState.activeTheme);
        this.triggerToast('Reverted to global theme');
        this.renderAdminThemes();
    }

    async applyThemeToAllUsers(themeId) {
        if(!supabaseClient) return;
        if(!confirm(`Apply "${ADMIN_THEMES.find(t=>t.id===themeId)?.name}" theme to ALL users? This changes the app look for everyone.`)) return;
        try {
            const { error } = await supabaseClient.from('app_settings').upsert({ id:1, active_theme:themeId }, { onConflict:'id' });
            if(error) throw error;
            appState.activeTheme = themeId;
            this.triggerToast(`✅ Applied "${ADMIN_THEMES.find(t=>t.id===themeId)?.name}" to all users!`);
            this.renderAdminThemes();
        } catch(e) {
            alert('Could not apply globally. Make sure the "app_settings" table exists in Supabase (see setup instructions). Error: '+e.message);
        }
    }

    // ── TELEGRAM ───────────────────────────────────────────────
    initTelegramContext() {
        const tg = window.Telegram?.WebApp;
        let userId=null, name='SSC Aspirant', handle='Offline Mode', avatar='';
        if(tg) {
            tg.ready(); tg.expand();
            if(tg.disableVerticalSwipes) tg.disableVerticalSwipes();
            const u = tg.initDataUnsafe?.user;
            if(u) {
                userId=u.id; name=`${u.first_name} ${u.last_name||''}`.trim();
                handle=u.username?`@${u.username}`:`ID: ${u.id}`; avatar=u.photo_url||'';
                if(avatar) { const av=document.getElementById('tg-user-avatar'); if(av) av.src=avatar; }
            }
        }
        appState.currentUser = { id:userId, name, username:handle, photo_url:avatar };
        const n=document.getElementById('tg-user-name'), h=document.getElementById('tg-user-handle');
        if(n) n.innerText=name; if(h) h.innerText=handle;
        if(userId===7990149560||userId==='7990149560') { appState.isAdmin=true; this.buildAdminPanel(); }
        this.syncSupabaseUser();
    }

    // ── ADMIN PANEL ────────────────────────────────────────────
    buildAdminPanel() {
        const nav=document.querySelector('.bottom-nav-bar');
        if(nav) {
            nav.classList.add('admin-nav');
            const t=document.createElement('button');
            t.className='nav-tab'; t.setAttribute('data-target','admin');
            t.innerHTML=`<i class="fa-solid fa-shield-halved"></i><span>Admin</span>`;
            nav.appendChild(t); this.bindNavigationEvents();
        }
        const today=new Date().toISOString().split('T')[0];
        const av=document.createElement('div');
        av.id='view-admin'; av.className='app-view';
        av.innerHTML = `
        <div class="screen-header"><h2>Admin Panel</h2><p>Secure Command Interface</p></div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:16px;scrollbar-width:none;">
            <button class="adm-pill active" onclick="app.switchAdminTab('free',this)">Free Quiz</button>
            <button class="adm-pill" onclick="app.switchAdminTab('prem',this)">Premium Mix</button>
            <button class="adm-pill" onclick="app.switchAdminTab('topic',this)">Topics</button>
            <button class="adm-pill" onclick="app.switchAdminTab('users',this)">Users</button>
            <button class="adm-pill" onclick="app.switchAdminTab('stats',this)">Stats</button>
            <button class="adm-pill" onclick="app.switchAdminTab('themes',this)">Themes</button>
        </div>

        <div id="adm-sec-free" class="adm-sec">
            <div class="glass-card mb-3">
                <h4 style="color:var(--neon-cyan);margin-bottom:14px;">Deploy Free Quiz</h4>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">Future dates auto-activate. Same date = overwrite. Old dates auto-cleanup on publish.</p>
                <label class="adm-label">Quiz Date</label>
                <input type="date" id="adm-free-date" class="adm-input" value="${today}">
                <label class="adm-label">Questions (30 Qs)</label>
                <textarea id="adm-free-txt" class="adm-textarea" rows="8" placeholder="1. Question text&#10;A. Option&#10;B. Option&#10;C. Option&#10;D. Option&#10;Answer: A&#10;Explanation: Meaning here"></textarea>
                <div id="adm-free-count" style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;"></div>
                <button class="adm-btn-cyan w-100 mt-3" onclick="app.publishAdminFreeQuiz()">🚀 PUBLISH FREE QUIZ</button>
            </div>
            <div class="glass-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);">SCHEDULED QUIZZES</span>
                    <button class="adm-btn-cyan" style="padding:5px 12px;font-size:0.72rem;" onclick="app.loadScheduledQuizzes('free')">↻ Load</button>
                </div>
                <div id="adm-free-scheduled-list"><p style="font-size:0.8rem;color:var(--text-muted);text-align:center;">Click Load to view</p></div>
            </div>
        </div>

        <div id="adm-sec-prem" class="adm-sec" style="display:none;">
            <div class="glass-card mb-3">
                <h4 style="color:var(--gold-premium);margin-bottom:14px;">Deploy Premium Mix</h4>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">Future dates auto-activate. Previous dates become archives.</p>
                <label class="adm-label">Quiz Date</label>
                <input type="date" id="adm-prem-date" class="adm-input" value="${today}">
                <label class="adm-label">Questions (100 Qs)</label>
                <textarea id="adm-prem-txt" class="adm-textarea" rows="8" placeholder="1. Question text&#10;A. Option..."></textarea>
                <div id="adm-prem-count" style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;"></div>
                <button class="adm-btn-gold w-100 mt-3" onclick="app.publishAdminPremiumQuiz()">👑 PUBLISH PREMIUM MIX</button>
            </div>
            <div class="glass-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);">SCHEDULED QUIZZES</span>
                    <button class="adm-btn-gold" style="padding:5px 12px;font-size:0.72rem;" onclick="app.loadScheduledQuizzes('prem')">↻ Load</button>
                </div>
                <div id="adm-prem-scheduled-list"><p style="font-size:0.8rem;color:var(--text-muted);text-align:center;">Click Load to view</p></div>
            </div>
        </div>

        <div id="adm-sec-topic" class="adm-sec" style="display:none;">
            <div class="glass-card mb-3">
                <h4 style="color:var(--neon-cyan);margin-bottom:14px;">Deploy Topic Set</h4>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">Each upload = new Set (Set 1, Set 2...). 20 Qs per set.</p>
                <label class="adm-label">Topic</label>
                <select id="adm-topic-sel" class="adm-input">
                    ${TOPICS.map(t=>`<option value="${t}">${t}</option>`).join('')}
                </select>
                <label class="adm-label">Questions (20 Qs)</label>
                <textarea id="adm-topic-txt" class="adm-textarea" rows="8" placeholder="1. Question text&#10;A. Option..."></textarea>
                <div id="adm-topic-count" style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;"></div>
                <button class="adm-btn-cyan w-100 mt-3" onclick="app.publishAdminTopicDeck()">📚 PUBLISH TOPIC SET</button>
            </div>
        </div>

        <div id="adm-sec-users" class="adm-sec" style="display:none;">
            <div class="glass-card mb-3">
                <h4 style="color:var(--gold-premium);margin-bottom:14px;">Grant / Revoke Access</h4>
                <label class="adm-label">Telegram ID</label>
                <input type="number" id="adm-user-tgid" class="adm-input" placeholder="e.g. 123456789">
                <div style="display:flex;gap:10px;margin-top:12px;">
                    <button class="adm-btn-cyan" style="flex:1;" onclick="app.adminGrantPremium()">✅ Grant</button>
                    <button class="adm-btn-red" style="flex:1;" onclick="app.adminRevokePremium()">❌ Revoke</button>
                </div>
            </div>
            <div class="glass-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h4 style="color:var(--gold-premium);">Premium Members</h4>
                    <button class="adm-btn-cyan" style="padding:6px 12px;font-size:0.72rem;" onclick="app.loadPremiumUsersList()">↻ Refresh</button>
                </div>
                <div id="adm-premium-users-list"><div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
            </div>
        </div>

        <div id="adm-sec-stats" class="adm-sec" style="display:none;">
            <div class="glass-card mb-3">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h4 style="color:var(--neon-cyan);">App Statistics</h4>
                    <button class="adm-btn-cyan" style="padding:6px 12px;font-size:0.72rem;" onclick="app.loadAdminStats()">↻ Refresh</button>
                </div>
                <div id="adm-stats-container"><div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
            </div>
            <div class="glass-card">
                <h4 style="color:var(--danger-red);margin-bottom:10px;">Database Cleanup</h4>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">Free quiz keeps no archive — old dated questions auto-delete on every publish. Use this to force-clean manually anytime.</p>
                <button class="adm-btn-red w-100" onclick="app.cleanupPastFreeQuestions(true)"><i class="fa-solid fa-broom"></i> Clean Old Free Quiz Questions</button>
            </div>
        </div>

        <div id="adm-sec-themes" class="adm-sec" style="display:none;">
            <div class="admin-active-theme-banner">
                <div><div class="label">GLOBAL ACTIVE THEME</div><div class="value" id="adm-active-theme-label">Loading...</div></div>
                <i class="fa-solid fa-palette" style="color:var(--neon-cyan);font-size:1.3rem;"></i>
            </div>
            <div class="glass-card mb-3">
                <h4 style="color:var(--gold-premium);margin-bottom:6px;">App Themes</h4>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:16px;">
                    <b>Preview</b> = see it on your device only. <b>Apply to All</b> = changes the look for every user in the app.
                </p>
                <div id="adm-themes-container"></div>
                <button class="adm-btn-cyan w-100 mt-3" onclick="app.resetToGlobalTheme()"><i class="fa-solid fa-rotate-left"></i> Reset My Preview to Global Theme</button>
            </div>
        </div>`;
        document.getElementById('view-container').appendChild(av);

        ['adm-free-txt','adm-prem-txt','adm-topic-txt'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', e => {
                const n = this.parseAdminQuestions(e.target.value,'x','x').length;
                const countEl = document.getElementById(id.replace('-txt','-count'));
                if(countEl) countEl.innerText = `${n} question(s) detected`;
            });
        });
        this.renderAdminThemes();
        this.cleanupPastFreeQuestions(false);
    }

    renderAdminThemes() {
        const c = document.getElementById('adm-themes-container'); if(!c) return;
        const localTheme = this.safeLocalGet('ssc_local_theme');
        const activeLbl = document.getElementById('adm-active-theme-label');
        if(activeLbl) activeLbl.innerText = ADMIN_THEMES.find(t=>t.id===appState.activeTheme)?.name || 'Aurora Nebula';
        c.innerHTML = ADMIN_THEMES.map(t => {
            const isPreviewing = localTheme === t.id;
            const isGlobal = appState.activeTheme === t.id;
            return `
            <div class="theme-preview-card theme-preview-${t.id} ${isPreviewing?'theme-selected':''}">
                <span class="theme-apply-tag">${t.tag}${isGlobal?' <i class="fa-solid fa-check" style="margin-left:4px;"></i>':''}</span>
                <div class="theme-preview-name">${t.name} ${isGlobal?'<span class="theme-live-tag"><i class="fa-solid fa-circle"></i> LIVE</span>':''}</div>
                <div class="theme-preview-desc">${t.desc}</div>
                <div class="theme-card-actions">
                    <button class="theme-btn-preview ${isPreviewing?'is-active':''}" onclick="app.applyThemeLocally('${t.id}')">
                        <i class="fa-solid fa-eye"></i> ${isPreviewing?'Previewing':'Preview'}
                    </button>
                    <button class="theme-btn-apply-all" onclick="app.applyThemeToAllUsers('${t.id}')">
                        <i class="fa-solid fa-globe"></i> Apply to All
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    switchAdminTab(secId, btn) {
        document.querySelectorAll('.adm-sec').forEach(s => s.style.display='none');
        document.querySelectorAll('.adm-pill').forEach(b => b.classList.remove('active'));
        const s=document.getElementById(`adm-sec-${secId}`); if(s) s.style.display='block';
        if(btn) btn.classList.add('active');
        this.triggerHaptic('select');
        if(secId==='users') this.loadPremiumUsersList();
        if(secId==='stats') this.loadAdminStats();
        if(secId==='themes') this.renderAdminThemes();
    }

    // ── FREE QUIZ AUTO-CLEANUP ───────────────────────────────────
    async cleanupPastFreeQuestions(showAlert) {
        if(!supabaseClient) return;
        const today = new Date().toISOString().split('T')[0];
        try {
            const { error, count } = await supabaseClient.from('questions').delete({count:'exact'}).eq('quiz_type','free').lt('topic',today);
            if(error) throw error;
            if(showAlert) this.triggerToast(`Cleaned up old free quiz questions.`);
        } catch(e) { if(showAlert) alert('Cleanup error: '+e.message); }
    }

    async loadAdminStats() {
        const el = document.getElementById('adm-stats-container');
        if(!el||!supabaseClient) return;
        el.innerHTML = `<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        try {
            const { count: totalUsers }   = await supabaseClient.from('users').select('*',{count:'exact',head:true});
            const { count: premiumCount } = await supabaseClient.from('premium_users').select('*',{count:'exact',head:true});
            const today = new Date().toISOString().split('T')[0];
            const { count: todayAttempts } = await supabaseClient.from('leaderboard').select('*',{count:'exact',head:true}).eq('date',today);
            const { count: totalFreeQ }  = await supabaseClient.from('questions').select('*',{count:'exact',head:true}).eq('quiz_type','free');
            const { count: totalPremQ }  = await supabaseClient.from('questions').select('*',{count:'exact',head:true}).eq('quiz_type','daily_premium');
            const { count: totalTopicQ } = await supabaseClient.from('questions').select('*',{count:'exact',head:true}).eq('quiz_type','topic');
            el.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="res-card glass-card stat-clickable" onclick="app.openUsersModal()"><span class="res-val text-cyan">${totalUsers??0}</span><span class="res-lbl">Total Users</span></div>
                    <div class="res-card glass-card"><span class="res-val text-gold">${premiumCount??0}</span><span class="res-lbl">Premium Users</span></div>
                    <div class="res-card glass-card"><span class="res-val text-success">${todayAttempts??0}</span><span class="res-lbl">Premium Attempts Today</span></div>
                    <div class="res-card glass-card"><span class="res-val">${totalFreeQ??0}</span><span class="res-lbl">Free Questions in DB</span></div>
                    <div class="res-card glass-card"><span class="res-val">${totalPremQ??0}</span><span class="res-lbl">Premium Questions in DB</span></div>
                    <div class="res-card glass-card"><span class="res-val">${totalTopicQ??0}</span><span class="res-lbl">Topic Questions in DB</span></div>
                </div>`;
        } catch(e) { el.innerHTML = `<p style="color:var(--danger-red);text-align:center;">Error: ${e.message}</p>`; }
    }

    // ── ADMIN USER MODAL (grant/ban) ─────────────────────────────
    async openUsersModal() {
        if(!supabaseClient) return;
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        overlay.id = 'admin-users-modal';
        overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="admin-modal-sheet">
                <div class="admin-modal-header">
                    <h3>All Users</h3>
                    <button class="admin-modal-close" onclick="document.getElementById('admin-users-modal').remove()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="admin-users-modal-list"><div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
            </div>`;
        document.body.appendChild(overlay);

        try {
            const { data: users } = await supabaseClient.from('users').select('telegram_id,first_name,username,premium,banned').order('joined_at',{ascending:false}).limit(100);
            const list = document.getElementById('admin-users-modal-list');
            if(!users?.length) { list.innerHTML = `<p class="text-muted text-center p-3">No users found.</p>`; return; }
            list.innerHTML = users.map(u => {
                const nm = u.first_name || u.username || 'Unknown';
                const initial = nm.charAt(0).toUpperCase();
                return `<div class="admin-user-row">
                    <div class="admin-user-row-left">
                        <div class="admin-user-avatar-mini">${initial}</div>
                        <div>
                            <div class="admin-user-name-mini">${nm}${u.premium?'<span class="admin-user-premium-tag">PRO</span>':''}${u.banned?'<span class="admin-user-premium-tag" style="background:rgba(239,68,68,0.15);color:var(--danger-red);">BANNED</span>':''}</div>
                            <div class="admin-user-id-mini">ID: ${u.telegram_id}</div>
                        </div>
                    </div>
                    <div class="admin-user-row-actions">
                        <button class="icon-btn-mini icon-btn-grant" title="Toggle Premium" onclick="app.modalTogglePremium(${u.telegram_id}, ${!u.premium})"><i class="fa-solid fa-crown"></i></button>
                        <button class="icon-btn-mini icon-btn-ban" title="Toggle Ban" onclick="app.modalToggleBan(${u.telegram_id}, ${!u.banned})"><i class="fa-solid fa-ban"></i></button>
                    </div>
                </div>`;
            }).join('');
        } catch(e) {
            document.getElementById('admin-users-modal-list').innerHTML = `<p style="color:var(--danger-red);text-align:center;">Error: ${e.message}</p>`;
        }
    }

    async modalTogglePremium(targetId, makesPremium) {
        try {
            if(makesPremium) await supabaseClient.from('premium_users').upsert({telegram_id:targetId,added_at:new Date().toISOString()},{onConflict:'telegram_id'});
            else await supabaseClient.from('premium_users').delete().eq('telegram_id',targetId);
            await supabaseClient.from('users').update({premium:makesPremium}).eq('telegram_id',targetId);
            this.triggerToast(makesPremium?`✅ Premium granted`:`Premium removed`);
            document.getElementById('admin-users-modal')?.remove();
            this.openUsersModal();
        } catch(e) { alert('Error: '+e.message); }
    }

    async modalToggleBan(targetId, makesBanned) {
        try {
            await supabaseClient.from('users').update({banned:makesBanned}).eq('telegram_id',targetId);
            this.triggerToast(makesBanned?`🚫 User banned`:`User unbanned`);
            document.getElementById('admin-users-modal')?.remove();
            this.openUsersModal();
        } catch(e) { alert('Ban error (check "banned" column exists): '+e.message); }
    }

    async loadPremiumUsersList() {
        const el=document.getElementById('adm-premium-users-list');
        if(!el||!supabaseClient) return;
        el.innerHTML=`<div class="text-center text-muted p-2"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        try {
            const { data:prem, error } = await supabaseClient.from('premium_users').select('telegram_id, added_at');
            if(error) throw error;
            if(!prem?.length) { el.innerHTML=`<p class="text-muted text-center p-3">No premium users found.</p>`; return; }
            const ids = prem.map(u=>u.telegram_id);
            const { data:usrs } = await supabaseClient.from('users').select('telegram_id,first_name,username').in('telegram_id',ids);
            const uMap={}; (usrs||[]).forEach(u=>uMap[u.telegram_id]=u);
            el.innerHTML = prem.map(pu => {
                const u=uMap[pu.telegram_id]; const nm=u?(u.first_name||u.username||'Unknown'):'Unknown';
                const dt=pu.added_at?new Date(pu.added_at).toLocaleDateString('en-IN'):'—';
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div><div style="font-size:0.85rem;font-weight:700;">${nm}</div><div style="font-size:0.72rem;color:var(--text-muted);">ID: ${pu.telegram_id} · ${dt}</div></div>
                    <button class="adm-btn-red" style="padding:5px 10px;font-size:0.72rem;" onclick="app.adminRevokeById(${pu.telegram_id})">Remove</button>
                </div>`;
            }).join('');
        } catch(e) { el.innerHTML=`<p style="color:var(--danger-red);text-align:center;padding:12px;">Error: ${e.message}</p>`; }
    }

    async loadScheduledQuizzes(type) {
        const listId = type==='free'?'adm-free-scheduled-list':'adm-prem-scheduled-list';
        const el=document.getElementById(listId);
        if(!el||!supabaseClient) return;
        el.innerHTML=`<div class="text-center text-muted p-2"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        const today=new Date().toISOString().split('T')[0];
        const qt = type==='free'?'free':'daily_premium';
        try {
            const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type',qt).gt('topic',today).order('topic',{ascending:true});
            const dates=[...new Set((data||[]).map(r=>r.topic))];
            if(!dates.length) { el.innerHTML=`<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:8px;">No scheduled quizzes</p>`; return; }
            el.innerHTML = dates.map(d => {
                const ds=new Date(d).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
                return `<div class="admin-scheduled-row">
                    <div><div class="admin-scheduled-date">${ds}</div></div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="scheduled-quiz-tag"><i class="fa-solid fa-clock"></i> Scheduled</span>
                        <button class="adm-btn-red" style="padding:4px 8px;font-size:0.7rem;" onclick="app.deleteScheduledQuiz('${qt}','${d}','${type}')">✕</button>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { el.innerHTML=`<p style="color:var(--danger-red);text-align:center;">Error</p>`; }
    }

    async deleteScheduledQuiz(quizType, dateVal, uiType) {
        if(!confirm(`Delete scheduled quiz for ${dateVal}?`)) return;
        await supabaseClient.from('questions').delete().eq('quiz_type',quizType).eq('topic',dateVal);
        this.triggerToast(`Deleted ${dateVal} quiz`);
        this.loadScheduledQuizzes(uiType);
    }

    // ── PARSER ────────────────────────────────────────────────────
    parseAdminQuestions(rawText, quizType, topicName) {
        if(!rawText || !rawText.trim()) return [];
        const normalized = rawText.replace(/\r\n/g,'\n').trim();
        const blocks = normalized.split(/\n(?=\s*\d{1,3}[\.\)]\s)/);
        const results = [];
        for(let block of blocks) {
            const lines = block.trim().split('\n').map(l=>l.trim()).filter(Boolean);
            if(lines.length < 5) continue;
            const qMatch = lines[0].match(/^\d{1,3}[\.\)]\s*(.+)$/);
            if(!qMatch) continue;
            const qText = qMatch[1].trim();
            const opts = {}; let ans='A', expl='';
            for(let i=1;i<lines.length;i++) {
                const ln = lines[i];
                const optMatch = ln.match(/^([A-D])[\.\)]\s*(.+)$/i);
                const ansMatch = ln.match(/^Answer\s*:?\s*([A-D])/i);
                const explMatch = ln.match(/^Explanation\s*:?\s*(.+)$/i);
                if(optMatch)       opts[optMatch[1].toUpperCase()] = optMatch[2].trim();
                else if(ansMatch)  ans = ansMatch[1].toUpperCase();
                else if(explMatch) expl = explMatch[1].trim();
            }
            const optArr = [opts.A, opts.B, opts.C, opts.D];
            if(qText && optArr.every(o => o && o.length > 0)) {
                results.push({
                    quiz_type: quizType, topic: topicName, question: qText,
                    option_a: optArr[0], option_b: optArr[1], option_c: optArr[2], option_d: optArr[3],
                    correct_option: ans,
                    explanation_a: ans==='A'?expl:'', explanation_b: ans==='B'?expl:'',
                    explanation_c: ans==='C'?expl:'', explanation_d: ans==='D'?expl:''
                });
            }
        }
        return results;
    }

    // ── ADMIN DEPLOY ─────────────────────────────────────────────
    async publishAdminFreeQuiz() {
        const dateVal=document.getElementById('adm-free-date').value;
        const txt=document.getElementById('adm-free-txt').value;
        if(!txt.trim()) return alert('Paste questions first.');
        const parsed=this.parseAdminQuestions(txt,'free',dateVal);
        if(!parsed.length) return alert('Could not parse. Check format (Answer: A / Explanation: ...)');
        try {
            await supabaseClient.from('questions').delete().eq('quiz_type','free').eq('topic',dateVal);
            const { error } = await supabaseClient.from('questions').insert(parsed);
            if(error) throw error;
            await this.cleanupPastFreeQuestions(false);
            appState.cache.activeFreeDate=null;
            alert(`✅ Free Quiz for ${dateVal} published! ${parsed.length} questions uploaded. Old dated questions auto-cleaned.`);
            document.getElementById('adm-free-txt').value=''; document.getElementById('adm-free-count').innerText='';
        } catch(e) { alert('Error: '+e.message); }
    }

    async publishAdminPremiumQuiz() {
        const dateVal=document.getElementById('adm-prem-date').value;
        const txt=document.getElementById('adm-prem-txt').value;
        if(!txt.trim()) return alert('Paste questions first.');
        const parsed=this.parseAdminQuestions(txt,'daily_premium',dateVal);
        if(!parsed.length) return alert('Could not parse. Check format.');
        try {
            await supabaseClient.from('questions').delete().eq('quiz_type','daily_premium').eq('topic',dateVal);
            const { error } = await supabaseClient.from('questions').insert(parsed);
            if(error) throw error;
            appState.cache.activePremiumDate=null; appState.cache.archives=null;
            alert(`✅ Premium Mix for ${dateVal} published! ${parsed.length} questions uploaded.`);
            document.getElementById('adm-prem-txt').value=''; document.getElementById('adm-prem-count').innerText='';
        } catch(e) { alert('Error: '+e.message); }
    }

    async publishAdminTopicDeck() {
        const topicVal=document.getElementById('adm-topic-sel').value;
        const txt=document.getElementById('adm-topic-txt').value;
        if(!txt.trim()) return alert('Paste questions first.');
        try {
            const { data:ex } = await supabaseClient.from('questions').select('topic').eq('quiz_type','topic').like('topic',`${topicVal} - Set%`);
            const existing=[...new Set((ex||[]).map(r=>r.topic))];
            const setNum=existing.length+1;
            const setTitle=`${topicVal} - Set ${setNum}`;
            const parsed=this.parseAdminQuestions(txt,'topic',setTitle);
            if(!parsed.length) return alert('Could not parse questions.');
            const { error } = await supabaseClient.from('questions').insert(parsed);
            if(error) throw error;
            appState.cache.topicSets[topicVal]=null;
            alert(`✅ ${setTitle} published! ${parsed.length} questions uploaded.`);
            document.getElementById('adm-topic-txt').value=''; document.getElementById('adm-topic-count').innerText='';
        } catch(e) { alert('Error: '+e.message); }
    }

    async adminGrantPremium() {
        const id=document.getElementById('adm-user-tgid').value.trim();
        if(!id) return alert('Enter Telegram ID.');
        try {
            await supabaseClient.from('premium_users').upsert({telegram_id:parseInt(id),added_at:new Date().toISOString()},{onConflict:'telegram_id'});
            await supabaseClient.from('users').update({premium:true}).eq('telegram_id',parseInt(id));
            this.triggerToast(`✅ Premium granted to ${id}`);
            document.getElementById('adm-user-tgid').value=''; this.loadPremiumUsersList();
        } catch(e) { alert('Error: '+e.message); }
    }

    async adminRevokePremium() {
        const id=document.getElementById('adm-user-tgid').value.trim();
        if(!id) return alert('Enter Telegram ID.');
        await this.adminRevokeById(parseInt(id));
        document.getElementById('adm-user-tgid').value='';
    }

    async adminRevokeById(targetId) {
        try {
            await supabaseClient.from('premium_users').delete().eq('telegram_id',targetId);
            await supabaseClient.from('users').update({premium:false}).eq('telegram_id',targetId);
            this.triggerToast(`❌ Premium revoked from ${targetId}`);
            this.loadPremiumUsersList();
        } catch(e) { alert('Error: '+e.message); }
    }

    // ── USER SYNC + STREAK ─────────────────────────────────────────
    async syncSupabaseUser() {
        if(!supabaseClient||!appState.currentUser.id) { this.updateHeaderBadge(false); return; }
        try {
            await supabaseClient.from('users').upsert({
                telegram_id:appState.currentUser.id, username:appState.currentUser.username,
                first_name:appState.currentUser.name, photo_url:appState.currentUser.photo_url,
                joined_at:new Date().toISOString()
            },{onConflict:'telegram_id', ignoreDuplicates:false});

            const { data:userRow } = await supabaseClient.from('users').select('premium,banned,streak,last_active_date').eq('telegram_id',appState.currentUser.id).maybeSingle();

            if(userRow?.banned) {
                appState.isBanned = true;
                document.getElementById('app').innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px;">
                    <i class="fa-solid fa-ban" style="font-size:3rem;color:var(--danger-red);margin-bottom:16px;"></i>
                    <h2 style="margin-bottom:8px;">Access Restricted</h2>
                    <p style="color:var(--text-muted);">Your access to this app has been suspended. Contact support if you believe this is a mistake.</p>
                </div>`;
                return;
            }

            appState.isPremium = !!userRow?.premium;
            this.updateHeaderBadge(appState.isPremium);
            appState.streak = userRow?.streak || 0;
            this.updateStreakActivity(userRow?.last_active_date, userRow?.streak||0);
            this.renderStreakUI();

            await this.fetchVaultData();
        } catch(e) { console.error('Sync:',e); this.updateHeaderBadge(false); }
    }

    // Called once per session on load — bumps streak if user is active today
    async updateStreakActivity(lastActiveDate, currentStreak) {
        if(!supabaseClient||!appState.currentUser.id) return;
        const today = new Date().toISOString().split('T')[0];
        if(lastActiveDate === today) { appState.streak = currentStreak; this.renderStreakUI(); return; } // already counted today

        let newStreak = 1;
        if(lastActiveDate) {
            const diff = Math.round((new Date(today) - new Date(lastActiveDate)) / 86400000);
            newStreak = diff === 1 ? currentStreak + 1 : 1;
        }
        try {
            await supabaseClient.from('users').update({ streak:newStreak, last_active_date:today }).eq('telegram_id', appState.currentUser.id);
            appState.streak = newStreak;
            this.renderStreakUI();
        } catch(e) { /* streak/last_active_date columns may not exist yet */ console.error('Streak update failed (check columns exist):', e); }
    }

    renderStreakUI() {
        const streak = appState.streak;
        const miniB = document.getElementById('streak-badge-mini');
        const miniC = document.getElementById('streak-count-mini');
        const fullS = document.getElementById('streak-strip-full');
        const fullC = document.getElementById('streak-count-full');
        if(streak > 0) {
            if(miniB) miniB.classList.remove('hidden');
            if(miniC) miniC.innerText = streak;
            if(fullS) fullS.classList.remove('hidden');
            if(fullC) fullC.innerText = streak;
        } else {
            if(miniB) miniB.classList.add('hidden');
            if(fullS) fullS.classList.add('hidden');
        }
    }

    updateHeaderBadge(isPremium) {
        const b=document.getElementById('header-tier-indicator'); if(!b) return;
        if(isPremium) { b.innerHTML=`<i class="fa-solid fa-crown text-gold"></i> Elite`; b.classList.add('elite'); document.body.classList.add('premium-enhanced'); }
        else          { b.innerHTML=`<i class="fa-solid fa-user"></i> Free`;              b.classList.remove('elite'); document.body.classList.remove('premium-enhanced'); }
    }

    triggerHaptic(type) {
        const h=window.Telegram?.WebApp?.HapticFeedback; if(!h) return;
        try {
            if(type==='select')  h.selectionChanged();
            if(type==='correct') h.notificationOccurred('success');
            if(type==='wrong')   h.notificationOccurred('error');
            if(type==='result')  h.notificationOccurred('warning');
        } catch(e){}
    }

    // ── NAVIGATION ───────────────────────────────────────────────
    bindNavigationEvents() {
        document.querySelectorAll('.nav-tab').forEach(tab => { tab.onclick=()=>this.switchView(tab.getAttribute('data-target')); });
    }

    switchView(viewId) {
        if(appState.isBanned) return;
        if(appState.quiz.active && viewId!=='quiz' && viewId!=='result') {
            if(!confirm('Assessment running. Discard and exit?')) return;
            this.forceTerminateQuiz();
        }
        document.querySelector('.app-view.active')?.classList.remove('active');
        const v=document.getElementById(`view-${viewId}`);
        if(v) { v.classList.add('active'); appState.currentView=viewId; }
        document.querySelectorAll('.nav-tab').forEach(t=>t.classList.toggle('active',t.getAttribute('data-target')===viewId));
        if(viewId==='vault')   this.renderVault();
        if(viewId==='ranks')   this.renderLeaderboard();
        if(viewId==='premium') this.fetchAndRenderPremiumView();
        if(v) v.scrollTop=0;
    }

    navigateToPremiumView() { this.switchView('premium'); }
    cancelFromBlueprint() {
        const t=appState.quiz.type;
        if(t==='topic') this.switchView('topic-sets');
        else if(t==='daily_premium') this.switchView('premium');
        else this.switchView('dashboard');
    }
    triggerPremiumPaywallGate() {
        const msg=encodeURIComponent('Hi! I want to unlock Premium Membership for SSC MAX VOCAB.');
        const link=`https://t.me/jangra854x?text=${msg}`;
        if(window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(link);
        else window.open(link,'_blank');
    }

    // ── PREMIUM VIEW ─────────────────────────────────────────────
    async fetchAndRenderPremiumView() {
        if(!supabaseClient) return;
        const today=new Date().toISOString().split('T')[0];
        try {
            if(!appState.cache.activePremiumDate) {
                const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type','daily_premium').lte('topic',today).order('topic',{ascending:false}).limit(1).maybeSingle();
                appState.cache.activePremiumDate=data?.topic||null;
            }
            const lbl=document.getElementById('active-prem-date-label');
            if(lbl) lbl.innerText = appState.cache.activePremiumDate ? new Date(appState.cache.activePremiumDate).toLocaleDateString('en-IN',{month:'long',day:'numeric',year:'numeric'}) : 'No active quiz';
            if(!appState.cache.archives) {
                const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type','daily_premium').lte('topic',today).order('topic',{ascending:false});
                const all=[...new Set((data||[]).map(r=>r.topic))];
                appState.cache.archives = all.filter(d=>d!==appState.cache.activePremiumDate);
            }
            this.renderPastPremiumQuizzes(appState.cache.archives);
            this.renderTopicsSection();
        } catch(e) { console.error('Premium view:',e); }
    }

    renderTopicsSection() {
        if(!this.premiumTopicsList) return;
        this.premiumTopicsList.innerHTML = TOPICS.map(t => {
            const locked=LOCKED_TOPICS.includes(t);
            if(locked) return `<div class="topic-card-item glass-card coming-soon-topic">
                <div class="topic-meta-left"><span class="topic-title">${t}</span><span class="topic-timestamp" style="color:#a5b4fc;font-weight:700;">Coming Soon</span></div>
                <span class="coming-soon-badge">Coming Soon</span></div>`;
            return `<div class="topic-card-item glass-card" onclick="app.openTopicSets('${t}')">
                <div class="topic-meta-left"><span class="topic-title">${t}</span><span class="topic-timestamp" id="tmeta-${t.replace(/\W+/g,'_')}">Loading...</span></div>
                <i class="fa-solid fa-chevron-right text-muted"></i></div>`;
        }).join('');
        TOPICS.filter(t=>!LOCKED_TOPICS.includes(t)).forEach(async t => {
            try {
                if(!appState.cache.topicSets[t]) {
                    const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type','topic').like('topic',`${t} - Set%`);
                    appState.cache.topicSets[t] = [...new Set((data||[]).map(r=>r.topic))];
                }
                const cnt=appState.cache.topicSets[t].length;
                const el=document.getElementById(`tmeta-${t.replace(/\W+/g,'_')}`);
                if(el) el.innerText = cnt>0?`${cnt} Set${cnt>1?'s':''} · ${cnt*20} Questions`:'No sets yet';
            } catch(e){}
        });
    }

    async openTopicSets(topicKey) {
        this.triggerHaptic('select');
        if(!supabaseClient) return;
        document.getElementById('topic-sets-title').innerText = topicKey;
        const container=document.getElementById('topic-sets-list');
        container.innerHTML=`<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i> Loading sets...</div>`;
        try {
            const { data } = await supabaseClient.from('questions').select('topic, created_at').eq('quiz_type','topic').like('topic',`${topicKey} - Set%`);
            const setMap={};
            (data||[]).forEach(r => {
                if(!setMap[r.topic]) setMap[r.topic]={title:r.topic,count:0,date:r.created_at};
                setMap[r.topic].count++;
                if(r.created_at>setMap[r.topic].date) setMap[r.topic].date=r.created_at;
            });
            const sets=Object.values(setMap).sort((a,b)=>a.title.localeCompare(b.title));
            appState.cache.topicSets[topicKey]=sets.map(s=>s.title);
            if(!sets.length) { container.innerHTML=`<div class="glass-card text-center p-4"><p class="text-muted">No question sets yet.</p></div>`; }
            else {
                container.innerHTML = sets.map((set,i) => {
                    const dateStr=new Date(set.date).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
                    const setNum=i+1, s=(setNum-1)*20+1, e=setNum*20;
                    const isLast=i===sets.length-1, locked=!appState.isPremium;
                    return `<div class="topic-set-card glass-card ${isLast?'latest-set':''} ${locked?'locked-set':''}" onclick="app.handleTopicSetClick('${set.title}','${topicKey}',${set.count},${setNum})">
                        <div class="set-info"><span class="set-label">Set ${setNum}</span><span class="set-range-tag">Q ${s}–${e}</span>${isLast?`<span class="set-range-tag" style="background:rgba(0,242,254,0.15);border-color:rgba(0,242,254,0.4);">Latest</span>`:''}</div>
                        <div class="set-meta"><span><i class="fa-solid fa-circle-question"></i> ${set.count} Questions</span><span><i class="fa-regular fa-calendar"></i> ${dateStr}</span></div>
                        ${locked?`<div class="set-lock-bar" onclick="event.stopPropagation();app.triggerPremiumPaywallGate()"><i class="fa-solid fa-lock"></i> Unlock Premium</div>`:''}
                    </div>`;
                }).join('');
            }
        } catch(e) { container.innerHTML=`<div class="text-center text-muted p-3">Error loading sets.</div>`; }
        this.switchView('topic-sets');
    }

    handleTopicSetClick(setTitle, topicKey, qCount, setNum) {
        if(!appState.isPremium) { this.triggerPremiumPaywallGate(); return; }
        this.showQuizBlueprint('topic', setTitle, setTitle, qCount, setNum);
    }
    handleActivePremiumClick() {
        const date=appState.cache.activePremiumDate;
        if(!date) { this.triggerToast('No active quiz found.'); return; }
        const dateStr=new Date(date).toLocaleDateString('en-IN',{month:'long',day:'numeric',year:'numeric'});
        this.showQuizBlueprint('daily_premium',`Daily Premium Mix — ${dateStr}`,date,100);
    }

    renderPastPremiumQuizzes(pastDates) {
        if(!this.premiumArchivesEl) return;
        if(!pastDates?.length) { this.premiumArchivesEl.innerHTML=`<div class="text-center text-muted p-3">No past quizzes yet.</div>`; return; }
        const byMonth={};
        pastDates.forEach(d => { const key=new Date(d).toLocaleDateString('en-IN',{month:'long',year:'numeric'}); (byMonth[key]=byMonth[key]||[]).push(d); });
        this.premiumArchivesEl.innerHTML = Object.entries(byMonth).map(([month,dates]) => `
            <div class="archive-month-group">
                <div class="archive-month-header glass-card" onclick="this.parentElement.classList.toggle('open')">
                    <span><i class="fa-regular fa-calendar" style="margin-right:8px;"></i>${month}</span><i class="fa-solid fa-chevron-down arc-chevron"></i>
                </div>
                <div class="archive-month-dates">
                    ${dates.map(d => {
                        const dl=new Date(d).toLocaleDateString('en-IN',{month:'long',day:'numeric'}); const locked=!appState.isPremium;
                        return `<div class="archive-date-entry" onclick="app.handlePastQuizClick('${d}')">
                            <span><i class="fa-solid fa-calendar-day text-gold" style="margin-right:6px;"></i>${dl}</span>
                            ${locked?`<span class="locked-tag"><i class="fa-solid fa-lock"></i> Premium</span>`:`<i class="fa-solid fa-play text-gold"></i>`}
                        </div>`;
                    }).join('')}
                </div></div>`).join('');
    }

    handlePastQuizClick(date) {
        if(!appState.isPremium) { this.triggerPremiumPaywallGate(); return; }
        const ds=new Date(date).toLocaleDateString('en-IN',{month:'long',day:'numeric',year:'numeric'});
        this.showQuizBlueprint('daily_premium',`Premium Mix — ${ds}`,date,100);
    }

    // ── QUIZ BLUEPRINT ───────────────────────────────────────────
    async showQuizBlueprint(type, title, topicKey=null, qCount=null, setNum=null) {
        appState.quiz.type=type; appState.quiz.title=title;
        if(supabaseClient && !topicKey) {
            const today=new Date().toISOString().split('T')[0];
            if(type==='free') {
                const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type','free').lte('topic',today).order('topic',{ascending:false}).limit(1).maybeSingle();
                topicKey=data?.topic||null; appState.cache.activeFreeDate=topicKey;
            } else if(type==='daily_premium') { topicKey=appState.cache.activePremiumDate; }
        }
        appState.quiz.quizCategory=topicKey;
        const isPremContent = type==='daily_premium'||type==='topic';
        appState.quiz.isPremiumLocked = isPremContent && !appState.isPremium;

        let dateLbl=new Date().toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
        if(topicKey && (type==='free'||type==='daily_premium')) dateLbl=new Date(topicKey).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
        else if(type==='topic' && topicKey) dateLbl='Topic Based Practice';

        document.getElementById('qd-subtitle').innerText=title;
        document.getElementById('qd-date').innerText=dateLbl;
        const total=qCount||(type==='daily_premium'?100:type==='topic'?20:30);
        document.getElementById('qd-count').innerText=`${total} Questions`;

        const rangeRow=document.getElementById('qd-range-row');
        if(type==='topic' && setNum) { const s=(setNum-1)*20+1,e=setNum*20; document.getElementById('qd-range').innerText=`Q ${s}–${e}`; rangeRow.style.display='flex'; }
        else rangeRow.style.display='none';

        document.getElementById('qd-rank-status').innerText = type==='daily_premium'?'Ranked (Logs to Global Leaderboard)':'Unranked Practice';

        if(appState.quiz.isPremiumLocked) { this.btnStartQuiz.className='btn-unlock-premium w-100'; this.btnStartQuiz.innerHTML=`<i class="fa-solid fa-lock"></i> Unlock Premium`; }
        else { this.btnStartQuiz.className='btn-primary-gradient w-100'; this.btnStartQuiz.innerHTML=`<i class="fa-solid fa-flag-checkered"></i> START QUIZ`; }
        this.switchView('quiz-details');
    }

    handleStartQuizClick() { if(appState.quiz.isPremiumLocked) { this.triggerPremiumPaywallGate(); return; } this.executeQuizInstance(); }

    // ── QUIZ EXECUTION (NO SHUFFLE) ──────────────────────────────
    async executeQuizInstance() {
        this.btnStartQuiz.disabled=true;
        this.btnStartQuiz.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Loading...`;
        try {
            appState.quiz.active=true;
            const limit = appState.quiz.type==='daily_premium'?100:appState.quiz.type==='topic'?20:30;
            appState.quiz.questions = await this.fetchQuestionsFromDB(appState.quiz.type, appState.quiz.quizCategory, limit);
            if(!appState.quiz.questions.length) { alert('No questions found for this quiz.'); this.forceTerminateQuiz(); return; }
            appState.quiz.currentIndex=0; appState.quiz.correctCount=0; appState.quiz.wrongCount=0; appState.quiz.timeSeconds=0;
            document.getElementById('quiz-title-display').innerText=appState.quiz.title;
            this.switchView('quiz');
            this.startElapsedStopwatch();
            this.renderCurrentQuestion();
        } catch(e) { console.error('Quiz error:',e); alert('Failed to load quiz: '+e.message); this.forceTerminateQuiz(); }
        finally { this.btnStartQuiz.disabled=false; this.btnStartQuiz.innerHTML=`<i class="fa-solid fa-flag-checkered"></i> START QUIZ`; }
    }

    async fetchQuestionsFromDB(quizType, topicKey, limit) {
        if(!supabaseClient) return [];
        let q = supabaseClient.from('questions').select('*').eq('quiz_type',quizType);
        if(topicKey) q = q.eq('topic', topicKey);
        q = q.order('id',{ascending:true}).limit(limit);
        const { data, error } = await q;
        if(error) throw error;
        return (data||[]).map(r=>this.convertDBRow(r));
    }

    convertDBRow(row) {
        const ci = {A:0,B:1,C:2,D:3}[row.correct_option?.toUpperCase()] ?? 0;
        return { category:row.topic||'Vocabulary', text:row.question||'', options:[row.option_a||'',row.option_b||'',row.option_c||'',row.option_d||''], correctIndex:ci, explanations:[row.explanation_a||'',row.explanation_b||'',row.explanation_c||'',row.explanation_d||''] };
    }

    startElapsedStopwatch() {
        clearInterval(appState.quiz.stopwatchInterval);
        const el=document.getElementById('quiz-stopwatch');
        const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
        el.innerText=fmt(0);
        appState.quiz.stopwatchInterval=setInterval(()=>{ appState.quiz.timeSeconds++; el.innerText=fmt(appState.quiz.timeSeconds); },1000);
    }

    renderCurrentQuestion() {
        const q=appState.quiz.questions[appState.quiz.currentIndex];
        appState.quiz.selectedOption=null;
        this.btnBookmark.classList.remove('bookmarked');
        this.btnBookmark.innerHTML=`<i class="fa-regular fa-bookmark"></i> Bookmark`;
        this.btnNextQ.classList.add('hidden');
        this.optionsContainer.classList.remove('locked');
        const total=appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText=`Q ${appState.quiz.currentIndex+1} / ${total}`;
        document.getElementById('quiz-progress-fill').style.width=`${(appState.quiz.currentIndex/total)*100}%`;
        document.getElementById('question-category-tag').innerText=q.category||'Vocabulary';
        document.getElementById('question-text-body').innerText=q.text;
        this.quizFrame.classList.remove('card-animation-swap'); void this.quizFrame.offsetWidth; this.quizFrame.classList.add('card-animation-swap');
        this.optionsContainer.innerHTML = q.options.map((opt,idx)=>`
            <div class="option-wrapper">
                <div class="option-node" onclick="app.lockAnswerSelection(${idx})">
                    <span class="opt-letter">${String.fromCharCode(65+idx)}.</span><span class="opt-text">${opt}</span><div class="option-indicator"></div>
                </div>
                <div class="option-explanation-box hidden" id="expl-${idx}">${q.explanations[idx]||(idx===q.correctIndex?'✓ Correct answer':'✗ Incorrect choice')}</div>
            </div>`).join('');
    }

    async toggleBookmarkCurrentQuestion() {
        if(!supabaseClient||!appState.currentUser.id) return;
        const q=appState.quiz.questions[appState.quiz.currentIndex];
        const word=q.options[q.correctIndex].split(':')[0].trim();
        const meaning=q.explanations[q.correctIndex]||q.text;
        const bookmarked=!this.btnBookmark.classList.contains('bookmarked');
        if(bookmarked) {
            this.btnBookmark.classList.add('bookmarked'); this.btnBookmark.innerHTML=`<i class="fa-solid fa-bookmark"></i> Saved`; this.triggerHaptic('select');
            if(!appState.bookmarkedWords.find(w=>w.word===word)) {
                appState.bookmarkedWords.push({word,category:'bookmarked',meaning});
                this.triggerToast(`Saved "${word}" to Vault!`);
                await supabaseClient.from('vault').insert({telegram_id:appState.currentUser.id,word,category:'bookmarked',saved_at:new Date().toISOString()});
            }
        } else {
            this.btnBookmark.classList.remove('bookmarked'); this.btnBookmark.innerHTML=`<i class="fa-regular fa-bookmark"></i> Bookmark`;
            appState.bookmarkedWords=appState.bookmarkedWords.filter(w=>w.word!==word);
            await supabaseClient.from('vault').delete().eq('telegram_id',appState.currentUser.id).eq('word',word).eq('category','bookmarked');
        }
    }

    lockAnswerSelection(idx) {
        if(appState.quiz.selectedOption!==null) return;
        appState.quiz.selectedOption=idx;
        this.optionsContainer.classList.add('locked');
        const q=appState.quiz.questions[appState.quiz.currentIndex];
        const correct=idx===q.correctIndex;
        this.triggerHaptic(correct?'correct':'wrong');
        if(correct) appState.quiz.correctCount++; else { appState.quiz.wrongCount++; this.routeFailedWordToVault(q); }
        this.optionsContainer.querySelectorAll('.option-node').forEach((node,i)=>{
            const ex=document.getElementById(`expl-${i}`); if(ex) ex.classList.remove('hidden');
            if(i===q.correctIndex) { node.classList.add('correct'); if(ex) ex.classList.add('expl-correct'); }
            else if(i===idx) { node.classList.add('incorrect'); if(ex) ex.classList.add('expl-incorrect'); }
        });
        this.btnNextQ.classList.remove('hidden');
    }

    advanceQuestion() {
        appState.quiz.currentIndex++;
        if(appState.quiz.currentIndex<appState.quiz.questions.length) this.renderCurrentQuestion();
        else this.finalizeAssessmentExecution();
    }

    async routeFailedWordToVault(qObj) {
        if(!supabaseClient||!appState.currentUser.id) return;
        const word=qObj.options[qObj.correctIndex].split(':')[0].trim();
        const meaning=qObj.explanations[qObj.correctIndex]||qObj.text;
        if(!appState.weakWords.find(w=>w.word.toLowerCase()===word.toLowerCase())) {
            appState.weakWords.push({word,category:'weak',meaning});
            await supabaseClient.from('vault').insert({telegram_id:appState.currentUser.id,word,category:'weak',saved_at:new Date().toISOString()});
        }
    }

    async finalizeAssessmentExecution() {
        clearInterval(appState.quiz.stopwatchInterval);
        appState.quiz.active=false;
        this.triggerHaptic('result');
        const total=appState.quiz.questions.length;
        const acc=((appState.quiz.correctCount/total)*100).toFixed(1);
        const m=Math.floor(appState.quiz.timeSeconds/60), s=appState.quiz.timeSeconds%60;
        document.getElementById('res-score').innerText=`${appState.quiz.correctCount} / ${total}`;
        document.getElementById('res-accuracy').innerText=`${acc}%`;
        document.getElementById('res-correct').innerText=appState.quiz.correctCount;
        document.getElementById('res-wrong').innerText=appState.quiz.wrongCount;
        document.getElementById('res-time').innerText=`${m}m ${s}s`;
        document.getElementById('res-tier-badge').innerText=parseFloat(acc)>=90?'👑 ELITE ACCURACY':'⚡ STANDARD EVALUATION';

        if(parseFloat(acc)===100) this.launchConfetti();

        if(appState.quiz.type==='daily_premium' && appState.currentUser.id && supabaseClient) {
            try {
                await supabaseClient.from('leaderboard').insert({ telegram_id:appState.currentUser.id, name:appState.currentUser.name, score:appState.quiz.correctCount, time_seconds:appState.quiz.timeSeconds, date:new Date().toISOString().split('T')[0] });
                appState.cache.leaderboard=null;
                this.triggerToast('Score synced to Global Rankings!');
            } catch(e) { console.error('Score post:',e); }
        }

        // Reset result rank toggle state for fresh view
        appState.cache.resultRankLoaded=false;
        const lbSec=document.getElementById('result-lb-section');
        const toggleBtn=document.getElementById('btn-view-rank-toggle');
        if(lbSec) lbSec.classList.add('hidden');
        if(toggleBtn) { toggleBtn.classList.remove('expanded'); toggleBtn.innerHTML=`<i class="fa-solid fa-ranking-star"></i> View Your Rank`; }

        this.switchView('result');
    }

    launchConfetti() {
        const colors=['#00f2fe','#ffb800','#a855f7','#10b981','#ef4444'];
        for(let i=0;i<40;i++) {
            const c=document.createElement('div'); c.className='confetti-piece';
            c.style.left=Math.random()*100+'vw';
            c.style.background=colors[Math.floor(Math.random()*colors.length)];
            c.style.animationDelay=(Math.random()*0.5)+'s';
            c.style.borderRadius=Math.random()>0.5?'50%':'2px';
            document.body.appendChild(c);
            setTimeout(()=>c.remove(),3500);
        }
    }

    // ── VIEW YOUR RANK (result screen toggle — fixed) ─────────────
    async toggleResultRankView() {
        const sec = document.getElementById('result-lb-section');
        const con = document.getElementById('result-lb-container');
        const btn = document.getElementById('btn-view-rank-toggle');
        if(!sec||!con||!btn) return;
        this.triggerHaptic('select');

        const isHidden = sec.classList.contains('hidden');
        if(!isHidden) {
            sec.classList.add('hidden');
            btn.classList.remove('expanded');
            btn.innerHTML=`<i class="fa-solid fa-ranking-star"></i> View Your Rank`;
            return;
        }

        sec.classList.remove('hidden');
        btn.classList.add('expanded');
        btn.innerHTML=`<i class="fa-solid fa-chevron-up"></i> Hide Rank`;

        if(appState.cache.resultRankLoaded) return; // already fetched this session

        con.innerHTML=`<div class="skeleton-list">${[...Array(3)].map(()=>'<div class="skeleton-row"></div>').join('')}</div>`;
        if(!supabaseClient) { con.innerHTML=`<div class="text-center text-muted p-3">Database unavailable.</div>`; return; }
        try {
            const today=new Date().toISOString().split('T')[0];
            const { data } = await supabaseClient.from('leaderboard').select('*').eq('date',today).order('score',{ascending:false}).order('time_seconds',{ascending:true}).limit(10);
            const lb = data||[];
            appState.cache.resultRankLoaded = true;
            if(!lb.length) { con.innerHTML=`<div class="text-center text-muted p-3">No scores yet today. Be the first! 🏆</div>`; return; }
            con.innerHTML = this.renderLeaderboardRows(lb);
        } catch(e) { con.innerHTML=`<div class="text-center text-muted p-3">Failed to load rankings.</div>`; }
    }

    renderLeaderboardRows(lb) {
        const myId=String(appState.currentUser.id);
        return lb.map((u,i)=>{
            const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
            const isMe=String(u.telegram_id)===myId;
            return `<div class="leader-row glass-card ${isMe?'user-pinned-rank':''}">
                <div class="leader-meta"><span class="leader-num ${i<3?'top-3':''}">${medal}</span><span class="leader-name">${u.name||'Aspirant'}${isMe?' (You)':''}</span></div>
                <div class="leader-scores"><div class="leader-score-pts">${u.score} Correct</div><div class="leader-score-time">${Math.floor(u.time_seconds/60)}m ${u.time_seconds%60}s</div></div>
            </div>`;
        }).join('');
    }

    confirmAbandonQuiz() { if(confirm('Abandon assessment? Progress will be lost.')) this.forceTerminateQuiz(); }
    forceTerminateQuiz() { clearInterval(appState.quiz.stopwatchInterval); appState.quiz.active=false; this.switchView('dashboard'); }

    // ── VAULT ────────────────────────────────────────────────────
    async fetchVaultData() {
        if(!supabaseClient||!appState.currentUser.id) return;
        const { data, error } = await supabaseClient.from('vault').select('word,category,saved_at').eq('telegram_id',appState.currentUser.id);
        if(!error&&data) {
            appState.weakWords = data.filter(v=>v.category==='weak').map(v=>({word:v.word,category:'weak',meaning:'Review this in the context of your quiz.'}));
            appState.bookmarkedWords = data.filter(v=>v.category==='bookmarked').map(v=>({word:v.word,category:'bookmarked',meaning:'Bookmarked vocabulary item.'}));
        }
    }
    switchVaultTab(tabKey) {
        appState.activeVaultTab=tabKey;
        document.querySelectorAll('.vault-tab-btn').forEach(b=>b.classList.toggle('active',b.getAttribute('data-tab')===tabKey));
        this.triggerHaptic('select'); this.renderVault();
    }
    filterVaultContent() { appState.searchQuery=document.getElementById('vault-search-input').value.toLowerCase().trim(); this.renderVault(); }
    renderVault() {
        if(!this.vaultItemsEl) return;
        let arr=appState.activeVaultTab==='bookmarked'?appState.bookmarkedWords:appState.weakWords;
        if(appState.searchQuery) arr=arr.filter(i=>i.word.toLowerCase().includes(appState.searchQuery));
        document.getElementById('count-weak').innerText=appState.weakWords.length;
        document.getElementById('count-bookmarked').innerText=appState.bookmarkedWords.length;
        if(!arr.length) { this.vaultItemsEl.innerHTML=`<div class="glass-card text-center p-4"><p class="text-muted">No items here yet.</p><p class="text-muted" style="font-size:0.78rem;margin-top:6px;">Incorrect answers and bookmarks appear here.</p></div>`; return; }
        this.vaultItemsEl.innerHTML=arr.map(item=>`
            <div class="glass-card vault-word-card card-animation-swap">
                <div class="v-header-row"><h4>${item.word}</h4><button class="btn-delete-word" onclick="app.deleteVaultWord('${item.word.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash-can"></i> Remove</button></div>
                <p class="v-meaning">${item.meaning}</p>
            </div>`).join('');
    }
    async deleteVaultWord(word) {
        const cat=appState.activeVaultTab;
        if(cat==='bookmarked') appState.bookmarkedWords=appState.bookmarkedWords.filter(w=>w.word!==word);
        else appState.weakWords=appState.weakWords.filter(w=>w.word!==word);
        this.triggerHaptic('select'); this.renderVault(); this.triggerToast(`Removed "${word}"`);
        if(supabaseClient&&appState.currentUser.id) await supabaseClient.from('vault').delete().eq('telegram_id',appState.currentUser.id).eq('word',word).eq('category',cat);
    }

    // ── LEADERBOARD (Ranks page w/ Daily/Weekly/Monthly) ────────
    switchRankPeriod(period) {
        appState.activeRankPeriod=period;
        document.querySelectorAll('.rank-period-btn').forEach(b=>b.classList.toggle('active',b.getAttribute('data-period')===period));
        this.triggerHaptic('select');
        appState.cache.leaderboard=null;
        this.renderLeaderboard();
    }

    getRankDateRange(period) {
        const now=new Date();
        if(period==='daily') { const d=now.toISOString().split('T')[0]; return { from:d, to:d }; }
        if(period==='weekly') { const from=new Date(now); from.setDate(now.getDate()-6); return { from:from.toISOString().split('T')[0], to:now.toISOString().split('T')[0] }; }
        const from=new Date(now.getFullYear(), now.getMonth(), 1);
        return { from:from.toISOString().split('T')[0], to:now.toISOString().split('T')[0] };
    }

    async renderLeaderboard() {
        if(!this.leaderboardEl) return;
        const period=appState.activeRankPeriod;
        const labelMap={daily:'Daily',weekly:'Weekly',monthly:'Monthly'};
        document.querySelector('#view-ranks h2').innerText = `${labelMap[period]} Elite Ranks`;
        const dateStr=new Date().toLocaleDateString('en-IN',{month:'long',day:'numeric',year:'numeric'});
        document.getElementById('leaderboard-date-subtitle').innerText=`Standings — ${labelMap[period]} · ${dateStr}`;

        if(!appState.isPremium) {
            this.leaderboardEl.innerHTML=`
                <div class="blurred-leaderboard-box">
                    <div class="blur-mask">${[1,2,3].map(n=>`<div class="leader-row glass-card"><div class="leader-meta"><span class="leader-num top-3">#${n}</span><span class="leader-name">Elite Ranker</span></div><div class="leader-scores"><div class="leader-score-pts">●●/100</div></div></div>`).join('')}</div>
                    <div class="premium-unlock-overlay">
                        <i class="fa-solid fa-lock"></i><h3>Elite Rankings Locked</h3>
                        <p>Complete the Daily Premium Mix to appear on the global leaderboard.</p>
                        <button class="btn-primary-gradient mt-3" onclick="app.triggerPremiumPaywallGate()"><i class="fa-solid fa-crown"></i> Unlock Premium</button>
                    </div>
                </div>`;
            return;
        }
        if(!supabaseClient) { this.leaderboardEl.innerHTML=`<div class="text-center text-muted p-3">Database unavailable.</div>`; return; }
        this.leaderboardEl.innerHTML=`<div class="skeleton-list">${[...Array(5)].map(()=>'<div class="skeleton-row"></div>').join('')}</div>`;
        try {
            const { from, to } = this.getRankDateRange(period);
            if(!appState.cache.leaderboard) {
                let q = supabaseClient.from('leaderboard').select('*');
                q = period==='daily' ? q.eq('date',from) : q.gte('date',from).lte('date',to);
                const { data } = await q;
                let rows = data||[];
                if(period!=='daily') {
                    const agg={};
                    rows.forEach(r => {
                        if(!agg[r.telegram_id]) agg[r.telegram_id]={ telegram_id:r.telegram_id, name:r.name, score:0, time_seconds:0 };
                        agg[r.telegram_id].score += r.score;
                        agg[r.telegram_id].time_seconds += r.time_seconds;
                    });
                    rows = Object.values(agg);
                }
                rows.sort((a,b)=> b.score-a.score || a.time_seconds-b.time_seconds);
                appState.cache.leaderboard = rows.slice(0,10);
            }
            const lb=appState.cache.leaderboard;
            if(!lb.length) { this.leaderboardEl.innerHTML=`<div class="text-center text-muted p-4">No scores yet. Be the first! 🏆</div>`; return; }
            const myId=String(appState.currentUser.id);
            const myIndex=lb.findIndex(r=>String(r.telegram_id)===myId);
            let myRankHTML='';
            if(myIndex===-1 && appState.currentUser.id) {
                myRankHTML=`<div class="leader-row glass-card user-pinned-rank" style="margin-top:14px;"><div class="leader-meta"><span class="leader-num">#—</span><span class="leader-name">You (Not in Top 10)</span></div><div class="leader-scores"><div class="leader-score-pts" style="font-size:0.78rem;">Complete quiz to rank</div></div></div>`;
            }
            this.leaderboardEl.innerHTML=`<div class="leaderboard-list">${this.renderLeaderboardRows(lb)}</div>${myRankHTML}`;
        } catch(e) { console.error('LB error:',e); this.leaderboardEl.innerHTML=`<div class="text-center text-muted p-3">Failed to load rankings.</div>`; }
    }

    // ── TOAST ────────────────────────────────────────────────────
    triggerToast(msg) {
        const old=document.getElementById('app-toast-alert'); if(old) old.remove();
        const t=document.createElement('div'); t.id='app-toast-alert';
        Object.assign(t.style,{position:'fixed',bottom:'95px',left:'50%',transform:'translateX(-50%)',background:'rgba(18,22,39,0.97)',border:'1px solid var(--neon-cyan)',color:'#fff',padding:'12px 24px',borderRadius:'30px',fontSize:'0.8rem',fontWeight:'700',zIndex:'9999',boxShadow:'0 0 18px var(--neon-cyan-glow)',whiteSpace:'nowrap',pointerEvents:'none'});
        t.innerText=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2600);
    }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new SSCMaxVocabEngine(); });