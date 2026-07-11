/**
 * SSC MAX VOCAB — Client Engine v6 (FINAL)
 * Topics now embedded directly on Dashboard (no separate premium screen).
 * Explanation shown ONLY under the correct option.
 * Topic cards simplified — name + arrow only.
 * Admin Topic Bank: create/edit/delete sets & questions, recalc counts,
 * free-quiz question editor, global search.
 *
 * ═══════════════════════════════════════════════════════════════
 * REQUIRED SUPABASE SETUP — run in SQL Editor (fixes "permission
 * denied for table topic_sets" seen in the admin panel):
 * ═══════════════════════════════════════════════════════════════
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0;
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date date;
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS last_grace_date date;
 * ALTER TABLE users ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false;
 *
 * CREATE TABLE IF NOT EXISTS topic_sets (
 *   id bigserial primary key,
 *   group_name text not null,
 *   letter text,
 *   set_number integer not null,
 *   full_key text unique not null,
 *   question_count integer default 0,
 *   created_at timestamptz default now()
 * );
 *
 * -- THE PERMISSION FIX (run both lines, harmless if already applied):
 * ALTER TABLE topic_sets DISABLE ROW LEVEL SECURITY;
 * GRANT ALL ON TABLE topic_sets TO anon, authenticated;
 * GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
 *
 * ═══════════════════════════════════════════════════════════════
 * v7 UPDATE — NEW TABLES REQUIRED FOR THE REBUILT VAULT (run once):
 * The old flat "vault" table (word/category) is no longer written to.
 * It is NOT deleted by this app — your existing data stays safe —
 * but the new Vault UI runs entirely on these two new tables instead:
 * ═══════════════════════════════════════════════════════════════
 * CREATE TABLE IF NOT EXISTS vault_sets (
 *   id bigserial primary key,
 *   telegram_id bigint not null,
 *   topic text not null,               -- 'Free Quiz' or a premium topic name
 *   set_number integer not null,
 *   question_count integer default 0,
 *   created_at timestamptz default now(),
 *   unique(telegram_id, topic, set_number)
 * );
 *
 * CREATE TABLE IF NOT EXISTS vault_questions (
 *   id bigserial primary key,
 *   telegram_id bigint not null,
 *   vault_set_id bigint references vault_sets(id) on delete cascade,
 *   topic text not null,
 *   question text not null,
 *   option_a text, option_b text, option_c text, option_d text,
 *   correct_option text,
 *   explanation_a text, explanation_b text, explanation_c text, explanation_d text,
 *   added_at timestamptz default now()
 * );
 *
 * ALTER TABLE vault_sets DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE vault_questions DISABLE ROW LEVEL SECURITY;
 * GRANT ALL ON TABLE vault_sets TO anon, authenticated;
 * GRANT ALL ON TABLE vault_questions TO anon, authenticated;
 * GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
 */

const SUPABASE_URL = 'https://tbiktjhwdlwzrhwursxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaWt0amh3ZGx3enJod3Vyc3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzQ2MjYsImV4cCI6MjA5Nzg1MDYyNn0.aukjIOzRatuQCo_UgUir5WZX4uS2_CQ2t760VgRV-MA';
let supabaseClient = null;
try { if (window.supabase?.createClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch(e) { console.error('Supabase init:', e); }

const ALPHABET_TOPICS = ['One Word Substitution','Idioms & Phrases','Synonyms','Spellings'];
const DIRECT_TOPICS = []; // v8 — Spellings moved to letter-wise, no direct-only topics remain
const ALL_TOPICS = [
    { name:'One Word Substitution', kind:'alphabet' },
    { name:'Idioms & Phrases',      kind:'alphabet' },
    { name:'Synonyms',              kind:'alphabet' },
    { name:'Spellings',             kind:'alphabet' },
    { name:'Homonyms & Homophones', kind:'locked' },
    { name:'Fixed Prepositions',    kind:'locked' },
    { name:'Sentence Error Detection', kind:'locked' }
];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
// v7 — premium users see one row of these in the Vault (locked topics excluded)
const VAULT_TOPICS = ALL_TOPICS.filter(t => t.kind !== 'locked').map(t => t.name);

let appState = {
    isPremium:false, isAdmin:false, isBanned:false,
    currentUser:{ id:null, name:'', username:'', photo_url:'' },
    currentView:'dashboard', activeRankPeriod:'daily',
    searchQuery:'', activeVaultTopic:null, streak:0,
    activeTopicGroup:null, activeTopicLetter:null,
    quiz:{ active:false, type:'free', title:'', quizCategory:null, questions:[], currentIndex:0, selectedOption:null, correctCount:0, wrongCount:0, timeSeconds:0, stopwatchInterval:null, vaultTopic:null, vaultSetId:null },
    cache:{ activeFreeDate:null, leaderboard:null, resultRankLoaded:false },
    // Phase 1 preferences (localStorage-backed, see initPreferences())
    currentFontSize:'normal', hapticEnabled:true
};

class SSCMaxVocabEngine {
    constructor() {
        this.initDOMNodes();
        this.bindNavigationEvents();
        this.injectLiveThemeLayer();
        this.initPreferences();
        this.renderPremiumTopicsGrid(); // topics render immediately on dashboard, no click needed
        this.initTelegramContext();
    }

    initDOMNodes() {
        this.premiumTopicsList = document.getElementById('premium-topics-list');
        this.leaderboardEl     = document.getElementById('leaderboard-master-container');
        this.quizFrame         = document.getElementById('question-card-frame');
        this.optionsContainer  = document.getElementById('question-options-container');
        this.btnNextQ          = document.getElementById('btn-next-q');
        this.btnBookmark       = document.getElementById('btn-bookmark-current');
        this.btnStartQuiz      = document.getElementById('btn-confirm-start-quiz');
        this.btnNextQ.addEventListener('click', () => this.advanceQuestion());
        this.btnStartQuiz.addEventListener('click', () => this.handleStartQuizClick());
    }

    injectLiveThemeLayer() {
        const layer = document.getElementById('live-theme-layer'); if(!layer) return;
        document.body.setAttribute('data-theme','aurora');
        let html = '<div class="theme-orb"></div><div class="theme-orb"></div><div class="theme-orb"></div>';
        for(let i=0;i<14;i++) {
            const top=Math.random()*100, left=Math.random()*100, size=1+Math.random()*2;
            html += `<div class="theme-star" style="top:${top}%;left:${left}%;width:${size}px;height:${size}px;animation-delay:${(Math.random()*3).toFixed(1)}s;"></div>`;
        }
        layer.innerHTML = html;
    }

    permissionHint(e) {
        return (e?.message||'').toLowerCase().includes('permission denied')
            ? ' — Run the Supabase permission-fix SQL (see script.js header comment / setup notes) then try again.'
            : '';
    }

    // ── TELEGRAM ─────────────────────────────────────────────────
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
        const n=document.getElementById('tg-user-name');
        if(n) n.innerText=name;
        if(userId===7990149560||userId==='7990149560') { appState.isAdmin=true; this.buildAdminPanel(); }
        this.syncSupabaseUser();
    }

    // ══════════════════════════════════════════════════════════════
    // ADMIN PANEL
    // ══════════════════════════════════════════════════════════════
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
        <div class="screen-header"><h2>Admin Panel</h2><p>Full Control Center</p></div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:16px;scrollbar-width:none;">
            <button class="adm-pill active" onclick="app.switchAdminTab('free',this)">Free Quiz</button>
            <button class="adm-pill" onclick="app.switchAdminTab('bank',this)">Topic Bank</button>
            <button class="adm-pill" onclick="app.switchAdminTab('users',this)">Users</button>
            <button class="adm-pill" onclick="app.switchAdminTab('stats',this)">Stats</button>
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
                <button class="adm-btn-gold w-100 mt-2" onclick="app.openManageFreeQuizModal()"><i class="fa-solid fa-pen-to-square"></i> View / Edit Today's Questions</button>
            </div>
            <div class="glass-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);">SCHEDULED QUIZZES</span>
                    <button class="adm-btn-cyan" style="padding:5px 12px;font-size:0.72rem;" onclick="app.loadScheduledQuizzes()">↻ Load</button>
                </div>
                <div id="adm-free-scheduled-list"><p style="font-size:0.8rem;color:var(--text-muted);text-align:center;">Click Load to view</p></div>
            </div>
        </div>

        <!-- ══════ TOPIC BANK ══════ -->
        <div id="adm-sec-bank" class="adm-sec" style="display:none;">
            <div class="glass-card mb-3">
                <h4 style="color:var(--gold-premium);margin-bottom:10px;"><i class="fa-solid fa-magnifying-glass"></i> Search All Questions</h4>
                <input type="text" id="adm-search-input" class="adm-input" placeholder="Type keyword and press search..." onkeyup="if(event.key==='Enter') app.searchAllQuestions()">
                <button class="adm-btn-cyan w-100 mt-2" onclick="app.searchAllQuestions()">Search</button>
                <div id="adm-search-results" class="mt-2"></div>
            </div>

            <div class="glass-card mb-3">
                <h4 style="color:var(--gold-premium);margin-bottom:14px;"><i class="fa-solid fa-plus"></i> Create New Set</h4>
                <label class="adm-label">Topic Group</label>
                <select id="adm-bank-group" class="adm-input" onchange="app.onBankGroupChange()">
                    ${ALPHABET_TOPICS.concat(DIRECT_TOPICS).map(t=>`<option value="${t}">${t}</option>`).join('')}
                </select>
                <div id="adm-bank-letter-wrap">
                    <label class="adm-label">Letter</label>
                    <select id="adm-bank-letter" class="adm-input">
                        ${LETTERS.map(l=>`<option value="${l}">${l}</option>`).join('')}
                    </select>
                </div>
                <p style="font-size:0.72rem;color:var(--text-muted);margin-top:10px;">Set number is auto-assigned (next available for this group/letter).</p>
                <button class="adm-btn-gold w-100 mt-3" onclick="app.createTopicSet()"><i class="fa-solid fa-folder-plus"></i> CREATE EMPTY SET</button>
            </div>

            <div class="glass-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <h4 style="color:var(--neon-cyan);">All Sets</h4>
                    <div style="display:flex;gap:6px;">
                        <button class="adm-btn-cyan" style="padding:6px 10px;font-size:0.68rem;" onclick="app.loadAllTopicSets()">↻ Refresh</button>
                        <button class="adm-btn-gold" style="padding:6px 10px;font-size:0.68rem;" onclick="app.recalcAllSetCounts()">🔢 Recalc Counts</button>
                    </div>
                </div>
                <select id="adm-bank-filter" class="adm-input mb-3" onchange="app.loadAllTopicSets()">
                    <option value="all">All Topics</option>
                    ${ALPHABET_TOPICS.concat(DIRECT_TOPICS).map(t=>`<option value="${t}">${t}</option>`).join('')}
                </select>
                <div id="adm-bank-sets-list"><div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
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
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">Free quiz keeps no archive — old dated questions auto-delete on every publish.</p>
                <button class="adm-btn-red w-100" onclick="app.cleanupPastFreeQuestions(true)"><i class="fa-solid fa-broom"></i> Clean Old Free Quiz Questions</button>
            </div>
        </div>`;
        document.getElementById('view-container').appendChild(av);

        document.getElementById('adm-free-txt')?.addEventListener('input', e => {
            const n = this.parseAdminQuestions(e.target.value).length;
            document.getElementById('adm-free-count').innerText = `${n} question(s) detected`;
        });
        this.onBankGroupChange();
    }

    onBankGroupChange() {
        const group = document.getElementById('adm-bank-group')?.value;
        const wrap = document.getElementById('adm-bank-letter-wrap');
        if(!wrap) return;
        wrap.style.display = ALPHABET_TOPICS.includes(group) ? 'block' : 'none';
    }

    switchAdminTab(secId, btn) {
        document.querySelectorAll('.adm-sec').forEach(s => s.style.display='none');
        document.querySelectorAll('.adm-pill').forEach(b => b.classList.remove('active'));
        const s=document.getElementById(`adm-sec-${secId}`); if(s) s.style.display='block';
        if(btn) btn.classList.add('active');
        this.triggerHaptic('select');
        if(secId==='users') this.loadPremiumUsersList();
        if(secId==='stats') this.loadAdminStats();
        if(secId==='bank')  this.loadAllTopicSets();
    }

    // ── GLOBAL QUESTION SEARCH ────────────────────────────────────
    async searchAllQuestions() {
        const term = document.getElementById('adm-search-input')?.value.trim();
        const el = document.getElementById('adm-search-results');
        if(!el) return;
        if(!term) { el.innerHTML=''; return; }
        el.innerHTML = `<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        try {
            const { data, error } = await supabaseClient.from('questions').select('id,quiz_type,topic,question').ilike('question', `%${term}%`).limit(30);
            if(error) throw error;
            if(!data?.length) { el.innerHTML = `<p class="text-muted text-center p-3">No matches found.</p>`; return; }
            el.innerHTML = data.map(q => `
                <div class="admin-scheduled-row" style="cursor:pointer;" onclick="app.jumpToQuestionSet('${q.quiz_type}','${q.topic.replace(/'/g,"\\'")}')">
                    <div><div class="admin-scheduled-date" style="font-size:0.8rem;">${q.question.slice(0,55)}${q.question.length>55?'…':''}</div>
                    <div class="admin-scheduled-count">${q.quiz_type} • ${q.topic}</div></div>
                    <i class="fa-solid fa-chevron-right text-muted"></i>
                </div>`).join('');
        } catch(e) { el.innerHTML = `<p style="color:var(--danger-red);text-align:center;">Error: ${e.message}${this.permissionHint(e)}</p>`; }
    }

    jumpToQuestionSet(quizType, topicKey) {
        if(quizType==='topic') this.openManageSetModal(topicKey);
        else if(quizType==='free') this.openManageFreeQuizModal();
    }

    // ── TOPIC BANK: Create / List / Manage Sets ─────────────────
    async createTopicSet() {
        if(!supabaseClient) return;
        const group = document.getElementById('adm-bank-group').value;
        const isAlpha = ALPHABET_TOPICS.includes(group);
        const letter = isAlpha ? document.getElementById('adm-bank-letter').value : null;
        try {
            let q = supabaseClient.from('topic_sets').select('set_number').eq('group_name',group);
            q = isAlpha ? q.eq('letter',letter) : q.is('letter',null);
            const { data:existing, error:selErr } = await q;
            if(selErr) throw selErr;
            const setNumber = (existing?.length||0) + 1;
            const fullKey = isAlpha ? `${group} - ${letter} - Set ${setNumber}` : `${group} - Set ${setNumber}`;
            const { error } = await supabaseClient.from('topic_sets').insert({ group_name:group, letter, set_number:setNumber, full_key:fullKey, question_count:0 });
            if(error) throw error;
            this.triggerToast(`✅ Created: ${fullKey}`);
            this.loadAllTopicSets();
        } catch(e) { alert('Error creating set: '+e.message+this.permissionHint(e)); }
    }

    async loadAllTopicSets() {
        const el = document.getElementById('adm-bank-sets-list');
        if(!el||!supabaseClient) return;
        el.innerHTML = `<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        const filter = document.getElementById('adm-bank-filter')?.value || 'all';
        try {
            let q = supabaseClient.from('topic_sets').select('*').order('group_name').order('letter').order('set_number');
            if(filter!=='all') q = q.eq('group_name', filter);
            const { data, error } = await q;
            if(error) throw error;
            if(!data?.length) { el.innerHTML = `<p class="text-muted text-center p-3">No sets created yet.</p>`; return; }
            el.innerHTML = data.map(s => `
                <div class="admin-scheduled-row" style="cursor:pointer;" onclick="app.openManageSetModal('${s.full_key}')">
                    <div>
                        <div class="admin-scheduled-date">${s.full_key} ${s.question_count===0?'<span class="set-empty-badge">EMPTY</span>':''}</div>
                        <div class="admin-scheduled-count">${s.question_count} question(s)</div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-muted"></i>
                </div>`).join('');
        } catch(e) { el.innerHTML = `<p style="color:var(--danger-red);text-align:center;">Error: ${e.message}${this.permissionHint(e)}</p>`; }
    }

    async recalcAllSetCounts() {
        if(!supabaseClient) return;
        try {
            const { data: sets, error } = await supabaseClient.from('topic_sets').select('full_key');
            if(error) throw error;
            if(!sets?.length) { this.triggerToast('No sets to recalculate.'); return; }
            for(const s of sets) { await this.syncSetQuestionCount(s.full_key); }
            this.triggerToast(`✅ Recalculated ${sets.length} set(s)`);
            this.loadAllTopicSets();
        } catch(e) { alert('Error: '+e.message+this.permissionHint(e)); }
    }

    async openManageSetModal(fullKey) {
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay'; overlay.id = 'manage-set-modal';
        overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="admin-modal-sheet">
                <div class="admin-modal-header">
                    <h3 style="font-size:0.9rem;flex:1;">${fullKey}</h3>
                    <button class="admin-modal-close" onclick="document.getElementById('manage-set-modal').remove()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <button class="adm-btn-red w-100 mb-3" onclick="app.deleteEntireSet('${fullKey}')"><i class="fa-solid fa-trash"></i> Delete Entire Set</button>
                <div class="glass-card mb-3">
                    <label class="adm-label" style="margin-top:0;">Add More Questions</label>
                    <textarea id="manage-set-add-txt" class="adm-textarea" rows="6" placeholder="1. Question text&#10;A. Option&#10;B. Option&#10;C. Option&#10;D. Option&#10;Answer: A&#10;Explanation: Meaning"></textarea>
                    <button class="adm-btn-cyan w-100 mt-2" onclick="app.addMoreQuestionsToSet('${fullKey}')"><i class="fa-solid fa-plus"></i> Add to Set</button>
                </div>
                <div id="manage-set-questions-list"><div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
            </div>`;
        document.body.appendChild(overlay);
        this.loadQuestionsIntoContainer('manage-set-questions-list', 'topic', fullKey, fullKey);
    }

    async deleteEntireSet(fullKey) {
        if(!confirm(`Delete ENTIRE set "${fullKey}" and ALL its questions? This cannot be undone.`)) return;
        if(!confirm('Really sure? This is permanent.')) return;
        try {
            await supabaseClient.from('questions').delete().eq('quiz_type','topic').eq('topic', fullKey);
            await supabaseClient.from('topic_sets').delete().eq('full_key', fullKey);
            document.getElementById('manage-set-modal')?.remove();
            this.triggerToast('Set deleted.');
            this.loadAllTopicSets();
        } catch(e) { alert('Delete error: '+e.message+this.permissionHint(e)); }
    }

    // ── Free Quiz question editor (reuses same UI as Topic Bank) ─
    async openManageFreeQuizModal() {
        if(!supabaseClient) return;
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type','free').lte('topic',today).order('topic',{ascending:false}).limit(1).maybeSingle();
        const dateKey = data?.topic;
        if(!dateKey) { alert('No active free quiz found for today or earlier.'); return; }
        const overlay = document.createElement('div');
        overlay.className='admin-modal-overlay'; overlay.id='manage-free-modal';
        overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="admin-modal-sheet">
                <div class="admin-modal-header">
                    <h3 style="font-size:0.9rem;">Free Quiz — ${new Date(dateKey).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'})}</h3>
                    <button class="admin-modal-close" onclick="document.getElementById('manage-free-modal').remove()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="manage-free-questions-list"><div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
            </div>`;
        document.body.appendChild(overlay);
        this.loadQuestionsIntoContainer('manage-free-questions-list', 'free', dateKey, null);
    }

    // Shared editable-question list renderer (used by Topic Bank + Free Quiz editor)
    async loadQuestionsIntoContainer(containerId, quizType, topicKey, fullKeyForCount) {
        const el = document.getElementById(containerId);
        if(!el||!supabaseClient) return;
        try {
            const { data, error } = await supabaseClient.from('questions').select('*').eq('quiz_type',quizType).eq('topic',topicKey).order('id',{ascending:true});
            if(error) throw error;
            if(!data?.length) { el.innerHTML = `<p class="text-muted text-center p-3">No questions yet.</p>`; return; }
            el.innerHTML = data.map(q => `
                <div class="glass-card mb-2" id="qrow-${q.id}" style="padding:14px;">
                    <textarea class="adm-input" style="min-height:44px;margin-bottom:8px;" id="qedit-text-${q.id}">${q.question}</textarea>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                        <input class="adm-input" style="padding:8px 10px;font-size:0.8rem;" id="qedit-a-${q.id}" value="${(q.option_a||'').replace(/"/g,'&quot;')}">
                        <input class="adm-input" style="padding:8px 10px;font-size:0.8rem;" id="qedit-b-${q.id}" value="${(q.option_b||'').replace(/"/g,'&quot;')}">
                        <input class="adm-input" style="padding:8px 10px;font-size:0.8rem;" id="qedit-c-${q.id}" value="${(q.option_c||'').replace(/"/g,'&quot;')}">
                        <input class="adm-input" style="padding:8px 10px;font-size:0.8rem;" id="qedit-d-${q.id}" value="${(q.option_d||'').replace(/"/g,'&quot;')}">
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                        <label style="font-size:0.72rem;color:var(--text-muted);">Correct:</label>
                        <select class="adm-input" style="padding:6px 10px;width:auto;" id="qedit-correct-${q.id}">
                            ${['A','B','C','D'].map(l=>`<option value="${l}" ${q.correct_option===l?'selected':''}>${l}</option>`).join('')}
                        </select>
                    </div>
                    <input class="adm-input" style="padding:8px 10px;font-size:0.78rem;margin-bottom:10px;" id="qedit-expl-${q.id}" placeholder="Explanation" value="${(q.explanation_a||q.explanation_b||q.explanation_c||q.explanation_d||'').replace(/"/g,'&quot;')}">
                    <div style="display:flex;gap:8px;">
                        <button class="adm-btn-cyan" style="flex:1;padding:8px;font-size:0.75rem;" onclick="app.saveQuestionEdit(${q.id})"><i class="fa-solid fa-check"></i> Save</button>
                        <button class="adm-btn-red" style="flex:1;padding:8px;font-size:0.75rem;" onclick="app.deleteQuestionRow(${q.id}, ${fullKeyForCount?`'${fullKeyForCount}'`:'null'})"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>`).join('');
        } catch(e) { el.innerHTML = `<p style="color:var(--danger-red);text-align:center;">Error: ${e.message}${this.permissionHint(e)}</p>`; }
    }

    async saveQuestionEdit(id) {
        const text = document.getElementById(`qedit-text-${id}`).value.trim();
        const a=document.getElementById(`qedit-a-${id}`).value.trim();
        const b=document.getElementById(`qedit-b-${id}`).value.trim();
        const c=document.getElementById(`qedit-c-${id}`).value.trim();
        const d=document.getElementById(`qedit-d-${id}`).value.trim();
        const correct=document.getElementById(`qedit-correct-${id}`).value;
        const expl=document.getElementById(`qedit-expl-${id}`).value.trim();
        try {
            await supabaseClient.from('questions').update({
                question:text, option_a:a, option_b:b, option_c:c, option_d:d, correct_option:correct,
                explanation_a: correct==='A'?expl:'', explanation_b: correct==='B'?expl:'',
                explanation_c: correct==='C'?expl:'', explanation_d: correct==='D'?expl:''
            }).eq('id', id);
            this.triggerToast('Question updated!');
        } catch(e) { alert('Save error: '+e.message+this.permissionHint(e)); }
    }

    async deleteQuestionRow(id, fullKey) {
        if(!confirm('Delete this question permanently?')) return;
        try {
            await supabaseClient.from('questions').delete().eq('id', id);
            if(fullKey) await this.syncSetQuestionCount(fullKey);
            document.getElementById(`qrow-${id}`)?.remove();
            this.triggerToast('Question deleted');
        } catch(e) { alert('Delete error: '+e.message+this.permissionHint(e)); }
    }

    async addMoreQuestionsToSet(fullKey) {
        const txt = document.getElementById('manage-set-add-txt').value;
        const parsed = this.parseAdminQuestions(txt).map(p => ({ ...p, quiz_type:'topic', topic:fullKey }));
        if(!parsed.length) return alert('Could not parse questions. Check format.');
        try {
            const { error } = await supabaseClient.from('questions').insert(parsed);
            if(error) throw error;
            await this.syncSetQuestionCount(fullKey);
            document.getElementById('manage-set-add-txt').value='';
            this.triggerToast(`✅ Added ${parsed.length} question(s)`);
            this.loadQuestionsIntoContainer('manage-set-questions-list', 'topic', fullKey, fullKey);
        } catch(e) { alert('Error: '+e.message+this.permissionHint(e)); }
    }

    async syncSetQuestionCount(fullKey) {
        try {
            const { count } = await supabaseClient.from('questions').select('*',{count:'exact',head:true}).eq('quiz_type','topic').eq('topic',fullKey);
            await supabaseClient.from('topic_sets').update({ question_count: count||0 }).eq('full_key', fullKey);
        } catch(e) { console.error('Count sync failed:', e); }
    }

    // ── FREE QUIZ AUTO-CLEANUP + ADMIN STATS ────────────────────
    async cleanupPastFreeQuestions(showAlert) {
        if(!supabaseClient) return;
        const today = new Date().toISOString().split('T')[0];
        try {
            await supabaseClient.from('questions').delete().eq('quiz_type','free').lt('topic',today);
            if(showAlert) this.triggerToast(`Cleaned up old free quiz questions.`);
        } catch(e) { if(showAlert) alert('Cleanup error: '+e.message); }
    }

    async loadAdminStats() {
        const el = document.getElementById('adm-stats-container');
        if(!el||!supabaseClient) return;
        el.innerHTML = `<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        try {
            const today = new Date().toISOString().split('T')[0];
            const todayStart = `${today}T00:00:00`;

            const { count: totalUsers }   = await supabaseClient.from('users').select('*',{count:'exact',head:true});
            const { count: premiumCount } = await supabaseClient.from('premium_users').select('*',{count:'exact',head:true});
            let bannedCount = 0, newUsersToday = 0;
            try { const r = await supabaseClient.from('users').select('*',{count:'exact',head:true}).eq('banned',true); bannedCount = r.count||0; } catch(e){}
            try { const r = await supabaseClient.from('users').select('*',{count:'exact',head:true}).gte('joined_at',todayStart); newUsersToday = r.count||0; } catch(e){}

            const { count: todayAttempts } = await supabaseClient.from('leaderboard').select('*',{count:'exact',head:true}).eq('date',today);
            const { count: totalAttempts } = await supabaseClient.from('leaderboard').select('*',{count:'exact',head:true});

            const { count: totalFreeQ }  = await supabaseClient.from('questions').select('*',{count:'exact',head:true}).eq('quiz_type','free');
            const { count: totalTopicQ } = await supabaseClient.from('questions').select('*',{count:'exact',head:true}).eq('quiz_type','topic');
            let totalSets = 0, emptySets = 0;
            try { const r = await supabaseClient.from('topic_sets').select('*',{count:'exact',head:true}); totalSets = r.count||0; } catch(e){}
            try { const r = await supabaseClient.from('topic_sets').select('*',{count:'exact',head:true}).eq('question_count',0); emptySets = r.count||0; } catch(e){}

            let vaultSets = 0, vaultQuestions = 0;
            try { const r = await supabaseClient.from('vault_sets').select('*',{count:'exact',head:true}); vaultSets = r.count||0; } catch(e){}
            try { const r = await supabaseClient.from('vault_questions').select('*',{count:'exact',head:true}); vaultQuestions = r.count||0; } catch(e){}

            const statBlock = (val,label,color='',onclick='') => `<div class="res-card glass-card ${onclick?'stat-clickable':''}" ${onclick?`onclick="${onclick}"`:''}><span class="res-val ${color}">${val}</span><span class="res-lbl">${label}</span></div>`;
            el.innerHTML = `
                <div style="font-size:0.72rem;font-weight:800;color:var(--text-muted);letter-spacing:0.03em;margin-bottom:8px;">👥 Users</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    ${statBlock(totalUsers??0,'Total Users','text-cyan','app.openUsersModal()')}
                    ${statBlock(premiumCount??0,'Premium Users','text-gold')}
                    ${statBlock(newUsersToday,'New Users Today','text-success')}
                    ${statBlock(bannedCount,'Banned Users','text-danger')}
                </div>
                <div style="font-size:0.72rem;font-weight:800;color:var(--text-muted);letter-spacing:0.03em;margin-bottom:8px;">📊 Activity</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    ${statBlock(todayAttempts??0,'Attempts Today','text-success')}
                    ${statBlock(totalAttempts??0,'Attempts All-Time','')}
                </div>
                <div style="font-size:0.72rem;font-weight:800;color:var(--text-muted);letter-spacing:0.03em;margin-bottom:8px;">📚 Content</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    ${statBlock(totalFreeQ??0,'Free Questions in DB','')}
                    ${statBlock(totalTopicQ??0,'Topic Questions in DB','')}
                    ${statBlock(totalSets,'Total Sets Created','')}
                    ${statBlock(emptySets,'Empty Sets (need Qs)', emptySets>0?'text-danger':'text-success')}
                </div>
                <div style="font-size:0.72rem;font-weight:800;color:var(--text-muted);letter-spacing:0.03em;margin-bottom:8px;">🗂️ Vault Engagement</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    ${statBlock(vaultSets,'Vault Sets (all users)','text-cyan')}
                    ${statBlock(vaultQuestions,'Wrong Qs Tracked','text-gold')}
                </div>`;
        } catch(e) { el.innerHTML = `<p style="color:var(--danger-red);text-align:center;">Error: ${e.message}${this.permissionHint(e)}</p>`; }
    }

    async openUsersModal() {
        if(!supabaseClient) return;
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay'; overlay.id = 'admin-users-modal';
        overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="admin-modal-sheet">
                <div class="admin-modal-header"><h3>All Users</h3><button class="admin-modal-close" onclick="document.getElementById('admin-users-modal').remove()"><i class="fa-solid fa-xmark"></i></button></div>
                <div id="admin-users-modal-list"><div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div></div>
            </div>`;
        document.body.appendChild(overlay);
        try {
            const { data: users } = await supabaseClient.from('users').select('telegram_id,first_name,username,premium,banned').order('joined_at',{ascending:false}).limit(100);
            const list = document.getElementById('admin-users-modal-list');
            if(!users?.length) { list.innerHTML = `<p class="text-muted text-center p-3">No users found.</p>`; return; }
            list.innerHTML = users.map(u => {
                const nm = u.first_name || u.username || 'Unknown', initial = nm.charAt(0).toUpperCase();
                return `<div class="admin-user-row">
                    <div class="admin-user-row-left">
                        <div class="admin-user-avatar-mini">${initial}</div>
                        <div><div class="admin-user-name-mini">${nm}${u.premium?'<span class="admin-user-premium-tag">PRO</span>':''}${u.banned?'<span class="admin-user-premium-tag" style="background:rgba(239,68,68,0.15);color:var(--danger-red);">BANNED</span>':''}</div>
                        <div class="admin-user-id-mini">ID: ${u.telegram_id}</div></div>
                    </div>
                    <div class="admin-user-row-actions">
                        <button class="icon-btn-mini icon-btn-grant" onclick="app.modalTogglePremium(${u.telegram_id}, ${!u.premium})"><i class="fa-solid fa-crown"></i></button>
                        <button class="icon-btn-mini icon-btn-ban" onclick="app.modalToggleBan(${u.telegram_id}, ${!u.banned})"><i class="fa-solid fa-ban"></i></button>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { document.getElementById('admin-users-modal-list').innerHTML = `<p style="color:var(--danger-red);text-align:center;">Error: ${e.message}</p>`; }
    }

    async modalTogglePremium(targetId, makesPremium) {
        try {
            if(makesPremium) await supabaseClient.from('premium_users').upsert({telegram_id:targetId,added_at:new Date().toISOString()},{onConflict:'telegram_id'});
            else await supabaseClient.from('premium_users').delete().eq('telegram_id',targetId);
            await supabaseClient.from('users').update({premium:makesPremium}).eq('telegram_id',targetId);
            this.triggerToast(makesPremium?`✅ Premium granted`:`Premium removed`);
            document.getElementById('admin-users-modal')?.remove(); this.openUsersModal();
        } catch(e) { alert('Error: '+e.message); }
    }
    async modalToggleBan(targetId, makesBanned) {
        try {
            await supabaseClient.from('users').update({banned:makesBanned}).eq('telegram_id',targetId);
            this.triggerToast(makesBanned?`🚫 User banned`:`User unbanned`);
            document.getElementById('admin-users-modal')?.remove(); this.openUsersModal();
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

    async loadScheduledQuizzes() {
        const el=document.getElementById('adm-free-scheduled-list');
        if(!el||!supabaseClient) return;
        el.innerHTML=`<div class="text-center text-muted p-2"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        const today=new Date().toISOString().split('T')[0];
        try {
            const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type','free').gt('topic',today).order('topic',{ascending:true});
            const dates=[...new Set((data||[]).map(r=>r.topic))];
            if(!dates.length) { el.innerHTML=`<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:8px;">No scheduled quizzes</p>`; return; }
            el.innerHTML = dates.map(d => {
                const ds=new Date(d).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
                return `<div class="admin-scheduled-row">
                    <div><div class="admin-scheduled-date">${ds}</div></div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="scheduled-quiz-tag"><i class="fa-solid fa-clock"></i> Scheduled</span>
                        <button class="adm-btn-red" style="padding:4px 8px;font-size:0.7rem;" onclick="app.deleteScheduledQuiz('${d}')">✕</button>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { el.innerHTML=`<p style="color:var(--danger-red);text-align:center;">Error</p>`; }
    }
    async deleteScheduledQuiz(dateVal) {
        if(!confirm(`Delete scheduled quiz for ${dateVal}?`)) return;
        await supabaseClient.from('questions').delete().eq('quiz_type','free').eq('topic',dateVal);
        this.triggerToast(`Deleted ${dateVal} quiz`); this.loadScheduledQuizzes();
    }

    // ── PARSER ────────────────────────────────────────────────────
    parseAdminQuestions(rawText) {
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
                    question: qText, option_a: optArr[0], option_b: optArr[1], option_c: optArr[2], option_d: optArr[3],
                    correct_option: ans,
                    explanation_a: ans==='A'?expl:'', explanation_b: ans==='B'?expl:'',
                    explanation_c: ans==='C'?expl:'', explanation_d: ans==='D'?expl:''
                });
            }
        }
        return results;
    }

    async publishAdminFreeQuiz() {
        const dateVal=document.getElementById('adm-free-date').value;
        const txt=document.getElementById('adm-free-txt').value;
        if(!txt.trim()) return alert('Paste questions first.');
        const parsed=this.parseAdminQuestions(txt).map(p=>({...p, quiz_type:'free', topic:dateVal}));
        if(!parsed.length) return alert('Could not parse. Check format (Answer: A / Explanation: ...)');
        try {
            await supabaseClient.from('questions').delete().eq('quiz_type','free').eq('topic',dateVal);
            const { error } = await supabaseClient.from('questions').insert(parsed);
            if(error) throw error;
            await this.cleanupPastFreeQuestions(false);
            appState.cache.activeFreeDate=null;
            alert(`✅ Free Quiz for ${dateVal} published! ${parsed.length} questions uploaded.`);
            document.getElementById('adm-free-txt').value=''; document.getElementById('adm-free-count').innerText='';
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

    // ══════════════════════════════════════════════════════════════
    // USER SYNC + STREAK (grace-day logic)
    // ══════════════════════════════════════════════════════════════
    async syncSupabaseUser() {
        if(!supabaseClient||!appState.currentUser.id) { this.updateHeaderBadge(false); return; }
        try {
            await supabaseClient.from('users').upsert({
                telegram_id:appState.currentUser.id, username:appState.currentUser.username,
                first_name:appState.currentUser.name, photo_url:appState.currentUser.photo_url,
                joined_at:new Date().toISOString()
            },{onConflict:'telegram_id'});

            const { data:userRow } = await supabaseClient.from('users').select('premium,banned,streak').eq('telegram_id',appState.currentUser.id).maybeSingle();

            if(userRow?.banned) {
                appState.isBanned = true;
                document.getElementById('app').innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px;">
                    <i class="fa-solid fa-ban" style="font-size:3rem;color:var(--danger-red);margin-bottom:16px;"></i>
                    <h2 style="margin-bottom:8px;">Access Restricted</h2>
                    <p style="color:var(--text-muted);">Your access to this app has been suspended.</p>
                </div>`;
                return;
            }
            appState.isPremium = !!userRow?.premium;
            appState.streak = userRow?.streak || 0;
            this.updateHeaderBadge(appState.isPremium);
            this.renderStreakUI();
        } catch(e) { console.error('Sync:',e); this.updateHeaderBadge(false); }
    }

    // Called ONLY when a Free Quiz is completed
    async markFreeQuizStreak() {
        if(!supabaseClient||!appState.currentUser.id) return;
        try {
            const { data:row } = await supabaseClient.from('users').select('streak,last_active_date,last_grace_date').eq('telegram_id',appState.currentUser.id).maybeSingle();
            const today = new Date().toISOString().split('T')[0];
            if(row?.last_active_date === today) return; // already counted today

            let newStreak = 1, newGraceDate = row?.last_grace_date || null;
            if(row?.last_active_date) {
                const diff = Math.round((new Date(today) - new Date(row.last_active_date)) / 86400000);
                if(diff === 1) {
                    newStreak = (row.streak||0) + 1;
                } else if(diff === 2) {
                    const graceRecent = newGraceDate && (Math.round((new Date(today)-new Date(newGraceDate))/86400000) <= 7);
                    if(!graceRecent) { newStreak = (row.streak||0) + 1; newGraceDate = today; }
                    else { newStreak = 1; }
                } else { newStreak = 1; }
            }
            await supabaseClient.from('users').update({ streak:newStreak, last_active_date:today, last_grace_date:newGraceDate }).eq('telegram_id', appState.currentUser.id);
            appState.streak = newStreak;
            this.renderStreakUI();
        } catch(e) { console.error('Streak update failed (check columns exist):', e); }
    }

    renderStreakUI() {
        const miniB=document.getElementById('streak-badge-mini'), miniC=document.getElementById('streak-count-mini');
        if(appState.streak > 0) { if(miniB) miniB.classList.remove('hidden'); if(miniC) miniC.innerText=appState.streak; }
        else if(miniB) miniB.classList.add('hidden');
    }

    updateHeaderBadge(isPremium) {
        const b=document.getElementById('header-tier-indicator'); if(!b) return;
        if(isPremium) { b.innerHTML=`<i class="fa-solid fa-crown text-gold"></i> Elite`; b.classList.add('elite'); }
        else          { b.innerHTML=`<i class="fa-solid fa-user"></i> Free`;              b.classList.remove('elite'); }
    }

    triggerHaptic(type) {
        if (appState.hapticEnabled === false) return;
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

    // Defines back-navigation relationships so switchView knows which
    // direction to animate (forward = slide from right, back = slide from left)
    viewHierarchy = { 'dashboard':0, 'topic-letters':1, 'topic-sets':2, 'quiz-details':3, 'quiz':4, 'result':5, 'vault':1, 'ranks':1 };

    switchView(viewId) {
        if(appState.isBanned) return;
        if(appState.quiz.active && viewId!=='quiz' && viewId!=='result') {
            if(!confirm('Assessment running. Discard and exit?')) return;
            this.forceTerminateQuiz();
        }
        const prevViewId = appState.currentView;
        const prevRank = this.viewHierarchy[prevViewId] ?? 0;
        const nextRank = this.viewHierarchy[viewId] ?? 0;
        const goingBack = nextRank < prevRank;

        const prevEl = document.querySelector('.app-view.active');
        prevEl?.classList.remove('active','view-back');
        const v=document.getElementById(`view-${viewId}`);
        if(v) {
            v.classList.remove('view-back');
            if(goingBack) v.classList.add('view-back');
            // restart animation reliably
            void v.offsetWidth;
            v.classList.add('active');
            appState.currentView=viewId;
        }
        document.querySelectorAll('.nav-tab').forEach(t=>t.classList.toggle('active',t.getAttribute('data-target')===viewId));
        if(viewId==='dashboard') this.renderPremiumTopicsGrid();
        if(viewId==='vault')     this.renderVault();
        if(viewId==='ranks')     this.renderLeaderboard();
        if(v) v.scrollTop=0;

        // Keep the settings FAB clear of full-screen quiz/result overlays
        document.body.classList.toggle('hide-settings-fab', viewId==='quiz' || viewId==='result');
    }

    triggerPremiumPaywallGate() {
        const msg=encodeURIComponent('Hi! I want to unlock Premium Membership for SSC MAX VOCAB.');
        const link=`https://t.me/jangra854x?text=${msg}`;
        if(window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(link);
        else window.open(link,'_blank');
    }

    // ══════════════════════════════════════════════════════════════
    // TOPIC-WISE VOCAB FLOW: Topics(dashboard) -> Letters/Direct -> Sets -> Confirm -> Quiz
    // ══════════════════════════════════════════════════════════════
    renderPremiumTopicsGrid() {
        if(!this.premiumTopicsList) return;
        this.premiumTopicsList.innerHTML = ALL_TOPICS.map((t,i) => {
            if(t.kind==='locked') return `
                <div class="topic-mega-card coming-soon-mega stagger-in" style="--stagger-i:${i}">
                    <span class="coming-soon-ribbon">SOON</span>
                    <div class="topic-mega-name">${t.name}</div>
                </div>`;
            return `
                <div class="topic-mega-card stagger-in" style="--stagger-i:${i}" onclick="app.openTopicGroup('${t.name}','${t.kind}')">
                    <div class="topic-mega-name">${t.name}</div>
                    <i class="fa-solid fa-chevron-right topic-mega-arrow"></i>
                </div>`;
        }).join('');
    }

    async openTopicGroup(groupName, kind) {
        this.triggerHaptic('select');
        appState.activeTopicGroup = groupName;
        if(kind === 'direct') {
            if(!appState.isPremium) { this.triggerPremiumPaywallGate(); return; }
            this.openSetsView(groupName, null, 'Mixed Spelling Questions • Select a set');
            return;
        }
        document.getElementById('topic-letters-title').innerText = groupName;
        const container = document.getElementById('topic-letters-list');
        container.innerHTML = `<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i> Loading letters...</div>`;
        this.switchView('topic-letters');
        try {
            const { data, error } = await supabaseClient.from('topic_sets').select('letter,question_count').eq('group_name',groupName);
            if(error) throw error;
            const counts = {};
            (data||[]).forEach(r => { counts[r.letter] = (counts[r.letter]||0) + (r.question_count||0); });
            container.innerHTML = LETTERS.map(l => {
                const cnt = counts[l] || 0;
                const empty = cnt === 0;
                return `<div class="letter-box ${empty?'letter-empty':''}" onclick="${empty?'':`app.openLetterSets('${groupName}','${l}')`}">
                    ${!appState.isPremium && !empty ? '<i class="fa-solid fa-lock letter-lock-dot"></i>' : ''}
                    <span class="letter-char">${l}</span>
                    <span class="letter-count">${cnt} Qs</span>
                </div>`;
            }).join('');
        } catch(e) { container.innerHTML = `<div class="text-center text-muted p-3">Error loading letters: ${e.message}${this.permissionHint(e)}</div>`; }
    }

    openLetterSets(groupName, letter) {
        if(!appState.isPremium) { this.triggerPremiumPaywallGate(); return; }
        appState.activeTopicLetter = letter;
        this.openSetsView(groupName, letter, `${groupName} • Letter ${letter}`);
    }

    async openSetsView(groupName, letter, subtitleText) {
        const backBtn = document.getElementById('btn-topic-sets-back');
        const backFn = letter ? () => this.switchView('topic-letters') : () => this.switchView('dashboard');
        backBtn.onclick = backFn;

        // v7 — fetch first, so a single set can skip straight to the
        // start popup instead of forcing an extra "pick a set" click.
        try {
            let q = supabaseClient.from('topic_sets').select('*').eq('group_name',groupName).order('set_number',{ascending:true});
            q = letter ? q.eq('letter',letter) : q.is('letter',null);
            const { data, error } = await q;
            if(error) throw error;
            const sets = data||[];

            if(sets.length === 1) {
                const s = sets[0];
                const title = letter ? `${groupName} • Letter ${letter} • Set ${s.set_number}` : `${groupName} • Set ${s.set_number}`;
                this.showSetConfirmPopup(s.full_key, s.question_count, title);
                return;
            }

            document.getElementById('topic-sets-title').innerText = letter ? `Letter ${letter}` : groupName;
            document.getElementById('topic-sets-subtitle').innerText = subtitleText;
            const container = document.getElementById('topic-sets-list');
            this.switchView('topic-sets');
            if(!sets.length) { container.innerHTML = `<div class="glass-card text-center p-4"><p class="text-muted">No sets available yet.</p></div>`; return; }
            container.innerHTML = sets.map(s => `
                <div class="topic-set-card glass-card" onclick="app.showSetConfirmPopup('${s.full_key}',${s.question_count},'${s.full_key.replace(/'/g,"\\'")}')">
                    <div class="set-info"><span class="set-label">Set ${s.set_number}</span><span class="set-range-tag">${s.question_count} Questions</span></div>
                </div>`).join('');
        } catch(e) {
            document.getElementById('topic-sets-title').innerText = letter ? `Letter ${letter}` : groupName;
            document.getElementById('topic-sets-subtitle').innerText = subtitleText;
            this.switchView('topic-sets');
            document.getElementById('topic-sets-list').innerHTML = `<div class="text-center text-muted p-3">Error loading sets: ${e.message}${this.permissionHint(e)}</div>`;
        }
    }

    // ── Custom confirm popup (not native alert) ─────────────────
    showSetConfirmPopup(fullKey, qCount, title) {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay'; overlay.id = 'set-confirm-modal';
        overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="confirm-modal-box">
                <div class="confirm-modal-icon"><i class="fa-solid fa-flag-checkered"></i></div>
                <div class="confirm-modal-title">Start This Set?</div>
                <div class="confirm-modal-info"><b>${title}</b><br>${qCount} Questions</div>
                <div class="confirm-modal-actions">
                    <button class="confirm-btn-cancel" onclick="document.getElementById('set-confirm-modal').remove()">Cancel</button>
                    <button class="confirm-btn-start" onclick="app.startTopicQuizFromSet('${fullKey}','${title.replace(/'/g,"\\'")}')">Start</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    startTopicQuizFromSet(fullKey, title) {
        document.getElementById('set-confirm-modal')?.remove();
        appState.quiz.type = 'topic';
        appState.quiz.title = title;
        appState.quiz.quizCategory = fullKey;
        this.executeQuizInstance();
    }

    // ── FREE QUIZ BLUEPRINT (only path using quiz-details screen) */
    async showQuizBlueprint(type, title) {
        appState.quiz.type=type; appState.quiz.title=title;
        let topicKey=null;
        if(supabaseClient) {
            const today=new Date().toISOString().split('T')[0];
            const { data } = await supabaseClient.from('questions').select('topic').eq('quiz_type','free').lte('topic',today).order('topic',{ascending:false}).limit(1).maybeSingle();
            topicKey=data?.topic||null; appState.cache.activeFreeDate=topicKey;
        }
        appState.quiz.quizCategory=topicKey;
        const dateLbl = topicKey ? new Date(topicKey).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'}) : new Date().toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
        document.getElementById('qd-subtitle').innerText=title;
        document.getElementById('qd-date').innerText=dateLbl;
        document.getElementById('qd-count').innerText=`30 Questions`;
        this.btnStartQuiz.className='btn-primary-gradient w-100';
        this.btnStartQuiz.innerHTML=`<i class="fa-solid fa-flag-checkered"></i> START QUIZ`;
        this.switchView('quiz-details');
    }

    handleStartQuizClick() { this.executeQuizInstance(); }

    // ── QUIZ EXECUTION (NO SHUFFLE) ──────────────────────────────
    async executeQuizInstance() {
        this.btnStartQuiz.disabled=true;
        this.btnStartQuiz.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Loading...`;
        try {
            appState.quiz.active=true;
            if(appState.quiz.type==='vault') {
                appState.quiz.questions = await this.fetchVaultSetQuestions(appState.quiz.quizCategory);
            } else {
                const limit = appState.quiz.type==='free' ? 30 : 20;
                appState.quiz.questions = await this.fetchQuestionsFromDB(appState.quiz.type, appState.quiz.quizCategory, limit);
            }
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

    // v7 — questions for a Vault "wrong answer" set (used by both free-quiz
    // and premium-topic vault sets, same table either way)
    async fetchVaultSetQuestions(setId) {
        if(!supabaseClient) return [];
        const { data, error } = await supabaseClient.from('vault_questions').select('*').eq('vault_set_id', setId).order('id',{ascending:true});
        if(error) throw error;
        return (data||[]).map(r=>this.convertDBRow(r));
    }

    startElapsedStopwatch() {
        clearInterval(appState.quiz.stopwatchInterval);
        const el=document.getElementById('quiz-stopwatch');
        const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
        el.innerText=fmt(0);
        appState.quiz.stopwatchInterval=setInterval(()=>{ appState.quiz.timeSeconds++; el.innerText=fmt(appState.quiz.timeSeconds); },1000);
    }

    // Explanation is now rendered ONLY for the correct option
    renderCurrentQuestion() {
        const q=appState.quiz.questions[appState.quiz.currentIndex];
        appState.quiz.selectedOption=null;
        this.btnBookmark.classList.remove('bookmarked');
        this.btnBookmark.innerHTML=`<i class="fa-regular fa-bookmark"></i> Bookmark`;
        this.btnBookmark.style.display = appState.quiz.type==='free' ? 'flex' : 'none';
        this.btnNextQ.classList.add('hidden');
        this.optionsContainer.classList.remove('locked');
        const total=appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText=`Q ${appState.quiz.currentIndex+1} / ${total}`;
        document.getElementById('quiz-progress-fill').style.width=`${(appState.quiz.currentIndex/total)*100}%`;
        document.getElementById('question-category-tag').innerText=q.category||'Vocabulary';
        document.getElementById('question-text-body').innerText=q.text;
        this.quizFrame.classList.remove('card-animation-swap'); void this.quizFrame.offsetWidth; this.quizFrame.classList.add('card-animation-swap');
        this.optionsContainer.innerHTML = q.options.map((opt,idx)=>{
            const isCorrect = idx === q.correctIndex;
            return `
            <div class="option-wrapper">
                <div class="option-node" onclick="app.lockAnswerSelection(${idx})">
                    <span class="opt-letter">${String.fromCharCode(65+idx)}.</span><span class="opt-text">${opt}</span><div class="option-indicator"></div>
                </div>
                ${isCorrect ? `<div class="option-explanation-box hidden expl-correct" id="expl-${idx}">${q.explanations[idx] || 'This is the correct answer.'}</div>` : ''}
            </div>`;
        }).join('');
    }

    // v7 — the old word-splitting "insert word into vault" system is
    // retired per instructions (Vault is now built from wrong-answer
    // sets automatically — see routeFailedQuestionToVault below).
    // Button kept harmless/inert so the existing quiz-screen markup
    // doesn't error; no DB writes happen here anymore.
    toggleBookmarkCurrentQuestion() {
        this.triggerHaptic('select');
        this.triggerToast('Wrong answers are auto-saved to your Vault now.');
    }

    // Explanation reveal — only the correct option's box (if it exists) gets shown
    lockAnswerSelection(idx) {
        if(appState.quiz.selectedOption!==null) return;
        appState.quiz.selectedOption=idx;

        // Brief "tap-pending" pulse on the tapped option before the
        // correct/incorrect reveal — gives immediate tactile feedback.
        const tappedNode = this.optionsContainer.querySelectorAll('.option-node')[idx];
        if(tappedNode) tappedNode.classList.add('tap-pending');
        this.triggerHaptic('select');

        setTimeout(() => this.revealAnswerResult(idx), 140);
    }

    revealAnswerResult(idx) {
        this.optionsContainer.classList.add('locked');
        const q=appState.quiz.questions[appState.quiz.currentIndex];
        const correct=idx===q.correctIndex;
        this.triggerHaptic(correct?'correct':'wrong');
        if(correct) { appState.quiz.correctCount++; this.removeQuestionFromVaultIfPresent(q); }
        else        { appState.quiz.wrongCount++;   this.routeFailedQuestionToVault(q); }
        this.optionsContainer.querySelectorAll('.option-node').forEach((node,i)=>{
            node.classList.remove('tap-pending');
            if(i===q.correctIndex) {
                node.classList.add('correct');
                const ex=document.getElementById(`expl-${i}`); if(ex) ex.classList.remove('hidden');
            } else if(i===idx) {
                node.classList.add('incorrect');
            }
        });
        this.btnNextQ.classList.remove('hidden');
    }

    advanceQuestion() {
        appState.quiz.currentIndex++;
        if(appState.quiz.currentIndex<appState.quiz.questions.length) this.renderCurrentQuestion();
        else this.finalizeAssessmentExecution();
    }

    // v7 — VAULT ENGINE (wrong-answer sets, max 20 Qs each, auto-splitting)
    // Works for Free Quiz AND every Premium topic. A question answered
    // wrong in a normal quiz gets filed here; answering it right later
    // (from anywhere — normal quiz OR a vault retry) removes it again.
    getVaultTopicLabel() {
        if(appState.quiz.type==='free')  return 'Free Quiz';
        if(appState.quiz.type==='topic') return appState.activeTopicGroup || appState.quiz.title || 'Topic';
        if(appState.quiz.type==='vault') return appState.quiz.vaultTopic || 'Free Quiz';
        return 'Free Quiz';
    }

    async getOrCreateOpenVaultSet(topic) {
        const { data:sets, error } = await supabaseClient.from('vault_sets').select('*')
            .eq('telegram_id',appState.currentUser.id).eq('topic',topic).order('set_number',{ascending:true});
        if(error) throw error;
        const openSet = (sets||[]).find(s => (s.question_count||0) < 20);
        if(openSet) return openSet;
        const nextNum = sets?.length ? Math.max(...sets.map(s=>s.set_number)) + 1 : 1;
        const { data:created, error:insErr } = await supabaseClient.from('vault_sets')
            .insert({ telegram_id:appState.currentUser.id, topic, set_number:nextNum, question_count:0 })
            .select().single();
        if(insErr) throw insErr;
        return created;
    }

    async routeFailedQuestionToVault(qObj) {
        if(!supabaseClient||!appState.currentUser.id) return;
        const topic = this.getVaultTopicLabel();
        try {
            const { data:existing } = await supabaseClient.from('vault_questions').select('id')
                .eq('telegram_id',appState.currentUser.id).eq('topic',topic).eq('question',qObj.text).maybeSingle();
            if(existing) return; // already tracked in vault, no duplicate
            const set = await this.getOrCreateOpenVaultSet(topic);
            const letters=['A','B','C','D'];
            await supabaseClient.from('vault_questions').insert({
                telegram_id:appState.currentUser.id, vault_set_id:set.id, topic, question:qObj.text,
                option_a:qObj.options[0], option_b:qObj.options[1], option_c:qObj.options[2], option_d:qObj.options[3],
                correct_option:letters[qObj.correctIndex],
                explanation_a:qObj.explanations[0], explanation_b:qObj.explanations[1], explanation_c:qObj.explanations[2], explanation_d:qObj.explanations[3]
            });
            await supabaseClient.from('vault_sets').update({ question_count:(set.question_count||0)+1 }).eq('id',set.id);
        } catch(e) { console.error('Vault route failed:', e, this.permissionHint(e)); }
    }

    async removeQuestionFromVaultIfPresent(qObj) {
        if(!supabaseClient||!appState.currentUser.id) return;
        const topic = this.getVaultTopicLabel();
        try {
            const { data:existing } = await supabaseClient.from('vault_questions').select('id,vault_set_id')
                .eq('telegram_id',appState.currentUser.id).eq('topic',topic).eq('question',qObj.text).maybeSingle();
            if(!existing) return;
            await supabaseClient.from('vault_questions').delete().eq('id',existing.id);
            const { data:setRow } = await supabaseClient.from('vault_sets').select('question_count').eq('id',existing.vault_set_id).maybeSingle();
            const newCount = Math.max(0, (setRow?.question_count||1) - 1);
            if(newCount === 0) await supabaseClient.from('vault_sets').delete().eq('id',existing.vault_set_id);
            else await supabaseClient.from('vault_sets').update({ question_count:newCount }).eq('id',existing.vault_set_id);
        } catch(e) { console.error('Vault remove failed:', e, this.permissionHint(e)); }
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

        if(parseFloat(acc)===100) this.launchConfetti(45);
        else if(parseFloat(acc)>=80) this.launchConfetti(18);

        this.staggerResultCards();

        if(appState.quiz.type==='free') await this.markFreeQuizStreak();

        // v8 FIX — free quiz completions never posted to the leaderboard
        // before, so free-quiz-only users never had a rank to show.
        // Vault-origin retries are excluded (they're revision drills,
        // not fresh attempts) but both Free Quiz and Premium Topic count.
        if((appState.quiz.type==='free' || appState.quiz.type==='topic') && appState.currentUser.id && supabaseClient) {
            try {
                await supabaseClient.from('leaderboard').insert({ telegram_id:appState.currentUser.id, name:appState.currentUser.name, score:appState.quiz.correctCount, time_seconds:appState.quiz.timeSeconds, date:new Date().toISOString().split('T')[0] });
                appState.cache.leaderboard=null;
            } catch(e) { console.error('Score post:',e); }
        }

        this.switchView('result');
        this.loadResultRankings(); // v8 — rank shown directly now, no toggle click needed
    }

    // Staggers the result stat cards (score/accuracy/correct/wrong/time)
    // in with a rising fade instead of appearing instantly.
    staggerResultCards() {
        document.querySelectorAll('.res-card').forEach((card, i) => {
            card.classList.remove('stagger-in');
            card.style.setProperty('--stagger-i', i);
            void card.offsetWidth;
            card.classList.add('stagger-in');
        });
    }

    launchConfetti(count = 40) {
        const colors=['#00f2fe','#ffb800','#a855f7','#10b981','#ef4444'];
        for(let i=0;i<count;i++) {
            const c=document.createElement('div'); c.className='confetti-piece';
            c.style.left=Math.random()*100+'vw';
            c.style.background=colors[Math.floor(Math.random()*colors.length)];
            c.style.animationDelay=(Math.random()*0.5)+'s';
            c.style.animationDuration=(2.6+Math.random()*1.2)+'s';
            c.style.borderRadius=Math.random()>0.5?'50%':'2px';
            c.style.setProperty('--drift', `${(Math.random()*160-80).toFixed(0)}px`);
            document.body.appendChild(c);
            setTimeout(()=>c.remove(),4200);
        }
    }

    // v8 — rank now loads directly on the result screen automatically,
    // no "View Your Rank" click needed. Works for ALL users (free + premium).
    async loadResultRankings() {
        const con=document.getElementById('result-lb-container');
        if(!con) return;
        con.innerHTML=`<div class="skeleton-list">${[...Array(3)].map(()=>'<div class="skeleton-row"></div>').join('')}</div>`;
        if(!supabaseClient) { con.innerHTML=`<div class="text-center text-muted p-3">Database unavailable.</div>`; return; }
        try {
            const today=new Date().toISOString().split('T')[0];
            const { data, error } = await supabaseClient.from('leaderboard').select('*').eq('date',today).order('score',{ascending:false}).order('time_seconds',{ascending:true}).limit(10);
            if(error) throw error;
            const lb = data||[];
            if(!lb.length) { con.innerHTML=`<div class="text-center text-muted p-3">No scores logged today yet. Be the first! 🏆</div>`; return; }
            con.innerHTML = this.renderLeaderboardRows(lb);
        } catch(e) { con.innerHTML=`<div class="text-center text-muted p-3">Failed to load rankings: ${e.message}${this.permissionHint(e)}</div>`; }
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

    // ── VAULT (v8 — wrong-answer sets, rendered per topic) ──────
    // Free users  → only "Free Quiz" sets.
    // Premium users → one-line topic row, sets shown per selected topic.
    async renderVault() {
        const freeLabelEl = document.getElementById('vault-freequiz-label');
        const topicsRowEl = document.getElementById('vault-topics-row');
        const setsEl = document.getElementById('vault-sets-container');
        if(!setsEl) return;

        // Decide + apply the free/premium layout FIRST (synchronously),
        // before any await — this is what was showing "Free Quiz" stuck
        // above the spinner for premium/admin accounts before.
        if(appState.isPremium) {
            if(freeLabelEl) freeLabelEl.classList.add('hidden');
            if(topicsRowEl) topicsRowEl.classList.remove('hidden');
            if(!appState.activeVaultTopic || !VAULT_TOPICS.includes(appState.activeVaultTopic)) {
                appState.activeVaultTopic = VAULT_TOPICS[0];
            }
            if(topicsRowEl) {
                topicsRowEl.innerHTML = VAULT_TOPICS.map(t => `
                    <div class="vault-topic-pill ${t===appState.activeVaultTopic?'active':''}" onclick="app.switchVaultTopic('${t.replace(/'/g,"\\'")}')">${t}</div>
                `).join('');
            }
        } else {
            if(freeLabelEl) freeLabelEl.classList.remove('hidden');
            if(topicsRowEl) { topicsRowEl.classList.add('hidden'); topicsRowEl.innerHTML=''; }
            appState.activeVaultTopic = 'Free Quiz';
        }

        if(!supabaseClient || !appState.currentUser.id) {
            setsEl.innerHTML = `<div class="text-center text-muted p-3">Login required to load your Vault.</div>`;
            return;
        }
        await this.loadVaultSetsForTopic(appState.activeVaultTopic);
    }

    switchVaultTopic(topic) {
        appState.activeVaultTopic = topic;
        this.triggerHaptic('select');
        document.querySelectorAll('.vault-topic-pill').forEach(p => p.classList.toggle('active', p.innerText===topic));
        this.loadVaultSetsForTopic(topic);
    }

    filterVaultContent() {
        appState.searchQuery = document.getElementById('vault-search-input').value.toLowerCase().trim();
        this.loadVaultSetsForTopic(appState.activeVaultTopic || 'Free Quiz');
    }

    async loadVaultSetsForTopic(topic) {
        const setsEl = document.getElementById('vault-sets-container');
        if(!setsEl) return;
        setsEl.innerHTML = `<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        if(!supabaseClient) { setsEl.innerHTML = `<div class="text-center text-muted p-3">Database unavailable.</div>`; return; }
        try {
            const { data, error } = await supabaseClient.from('vault_sets').select('*')
                .eq('telegram_id', appState.currentUser.id).eq('topic', topic).order('set_number',{ascending:true});
            if(error) throw error;
            let sets = data||[];
            if(appState.searchQuery) sets = sets.filter(s => `${topic} wrong set ${s.set_number}`.toLowerCase().includes(appState.searchQuery));
            if(!sets.length) {
                setsEl.innerHTML = `<div class="glass-card text-center p-4"><p class="text-muted">No wrong-answer sets here yet.</p><p class="text-muted" style="font-size:0.78rem;margin-top:6px;">Mistakes from your ${topic} quizzes will show up here automatically.</p></div>`;
                return;
            }
            setsEl.innerHTML = sets.map(s => `
                <div class="vault-set-card glass-card" onclick="app.showVaultSetConfirmPopup(${s.id},'${topic.replace(/'/g,"\\'")}',${s.set_number},${s.question_count})">
                    <i class="fa-solid fa-triangle-exclamation vs-icon"></i>
                    <span class="vs-title">Wrong Set ${s.set_number}</span>
                    <span class="vs-count">${s.question_count} / 20 Questions</span>
                    <div class="vs-progress-track"><div class="vs-progress-fill" style="width:${Math.min(100,(s.question_count/20)*100)}%;"></div></div>
                </div>`).join('');
        } catch(e) {
            setsEl.innerHTML = `<div class="text-center text-muted p-3">Error loading vault: ${e.message}${this.permissionHint(e)}</div>`;
        }
    }

    showVaultSetConfirmPopup(setId, topic, setNumber, qCount) {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay'; overlay.id = 'vault-set-confirm-modal';
        overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="confirm-modal-box">
                <div class="confirm-modal-icon"><i class="fa-solid fa-flag-checkered"></i></div>
                <div class="confirm-modal-title">Start This Set?</div>
                <div class="confirm-modal-info"><b>${topic} — Wrong Set ${setNumber}</b><br>${qCount} Questions</div>
                <div class="confirm-modal-actions">
                    <button class="confirm-btn-cancel" onclick="document.getElementById('vault-set-confirm-modal').remove()">Cancel</button>
                    <button class="confirm-btn-start" onclick="app.startVaultQuizFromSet(${setId},'${topic.replace(/'/g,"\\'")}',${setNumber})">Start</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    startVaultQuizFromSet(setId, topic, setNumber) {
        document.getElementById('vault-set-confirm-modal')?.remove();
        appState.quiz.type = 'vault';
        appState.quiz.title = `${topic} — Wrong Set ${setNumber}`;
        appState.quiz.quizCategory = setId;
        appState.quiz.vaultTopic = topic;
        appState.quiz.vaultSetId = setId;
        this.executeQuizInstance();
    }

    // ── LEADERBOARD (Ranks page) ─────────────────────────────────
    switchRankPeriod(period) {
        appState.activeRankPeriod=period;
        document.querySelectorAll('.rank-period-btn').forEach(b=>b.classList.toggle('active',b.getAttribute('data-period')===period));
        this.triggerHaptic('select'); appState.cache.leaderboard=null; this.renderLeaderboard();
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
                        <p>Complete Premium Topic quizzes to appear on the global leaderboard.</p>
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
                        agg[r.telegram_id].score += r.score; agg[r.telegram_id].time_seconds += r.time_seconds;
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
            if(myIndex===-1 && appState.currentUser.id) myRankHTML=`<div class="leader-row glass-card user-pinned-rank" style="margin-top:14px;"><div class="leader-meta"><span class="leader-num">#—</span><span class="leader-name">You (Not in Top 10)</span></div><div class="leader-scores"><div class="leader-score-pts" style="font-size:0.78rem;">Complete quiz to rank</div></div></div>`;
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

    // ══════════════════════════════════════════════════════════════
    // PHASE 1 — FONT SIZE ADJUSTER, RIPPLE, SETTINGS SHEET
    // Pure client-side, localStorage-backed, no Supabase changes.
    // ══════════════════════════════════════════════════════════════

    initPreferences() {
        // Font size
        const savedFontSize = localStorage.getItem('ssc_fontsize') || 'normal';
        this.applyFontSize(savedFontSize, false);

        // Haptic toggle
        const hapticOn = localStorage.getItem('ssc_haptic_enabled');
        appState.hapticEnabled = hapticOn === null ? true : hapticOn === 'true';
        const hapticToggle = document.getElementById('toggle-haptic');
        if (hapticToggle) hapticToggle.checked = appState.hapticEnabled;

        this.initRippleEffect();
    }

    // ── Font Size ────────────────────────────────────────────────
    applyFontSize(sizeName, animate = true) {
        document.documentElement.setAttribute('data-fontsize', sizeName);
        const labels = { small: 'Small', normal: 'Normal', large: 'Large', xlarge: 'Extra Large' };
        const lbl = document.getElementById('fontsize-current-label');
        if (lbl) lbl.innerText = labels[sizeName] || 'Normal';
        appState.currentFontSize = sizeName;
        if (animate) this.triggerHaptic('select');
    }

    adjustFontSize(direction) {
        const steps = ['small', 'normal', 'large', 'xlarge'];
        const current = appState.currentFontSize || 'normal';
        let idx = steps.indexOf(current);
        idx = Math.min(steps.length - 1, Math.max(0, idx + direction));
        const next = steps[idx];
        this.applyFontSize(next, true);
        localStorage.setItem('ssc_fontsize', next);
    }

    // ── Settings toggle (haptic on/off, extensible later) ───────
    toggleSetting(key, value) {
        if (key === 'haptic') {
            appState.hapticEnabled = value;
            localStorage.setItem('ssc_haptic_enabled', value ? 'true' : 'false');
        }
    }

    // ── Settings Sheet open/close ────────────────────────────────
    openSettingsSheet() {
        const bd = document.getElementById('settings-sheet-backdrop');
        if (bd) bd.classList.add('open');
        this.triggerHaptic('select');
    }
    closeSettingsSheet() {
        const bd = document.getElementById('settings-sheet-backdrop');
        if (bd) bd.classList.remove('open');
    }
    closeSettingsSheetIfBackdrop(e) {
        if (e.target && e.target.id === 'settings-sheet-backdrop') this.closeSettingsSheet();
    }

    // ── Ripple Effect ────────────────────────────────────────────
    // Delegated pointerdown listener — works for elements added
    // dynamically after quiz/topic data loads, no per-element binding needed.
    initRippleEffect() {
        const rippleSelector = '.btn-primary-gradient, .btn-secondary, .portal-card, .option-node, .topic-mega-card, .vault-set-card, .nav-tab, .settings-fab, .fontsize-btn, .rank-period-btn';
        document.addEventListener('pointerdown', (e) => {
            const target = e.target.closest(rippleSelector);
            if (!target) return;
            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 1.4;
            const dot = document.createElement('span');
            dot.className = 'ripple-dot';
            dot.style.width = dot.style.height = `${size}px`;
            dot.style.left = `${e.clientX - rect.left - size / 2}px`;
            dot.style.top = `${e.clientY - rect.top - size / 2}px`;
            target.appendChild(dot);
            setTimeout(() => dot.remove(), 650);
        }, { passive: true });
    }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new SSCMaxVocabEngine(); });