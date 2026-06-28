/**
 * SSC MAX VOCAB — Client Engine v2
 * Updated: Admin Panel, Topic Sets, Premium Access, Rank Fix, 406 Fix
 */

// ── SUPABASE INIT ──────────────────────────────────────────────
const SUPABASE_URL = 'https://tbiktjhwdlwzrhwursxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaWt0amh3ZGx3enJod3Vyc3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzQ2MjYsImV4cCI6MjA5Nzg1MDYyNn0.aukjIOzRatuQCo_UgUir5WZX4uS2_CQ2t760VgRV-MA';

let supabaseClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (err) { console.error('Supabase init failed:', err); }

// ── FIXED 6 TOPICS ─────────────────────────────────────────────
const TOPICS = [
    'One Word Substitution',
    'Idioms & Phrases',
    'Synonyms',
    'Spelling',
    'Antonyms',
    'Homophones'
];

// ── APP STATE ──────────────────────────────────────────────────
let appState = {
    isPremium: false,
    isAdmin: false,
    currentUser: { id: null, name: 'SSC Aspirant', username: '', photo_url: '' },
    currentView: 'dashboard',
    activeVaultTab: 'weak',
    searchQuery: '',
    weakWords: [],
    bookmarkedWords: [],
    selectedTopic: null,
    quiz: {
        active: false, type: 'free', title: '', quizCategory: null,
        isPremiumLocked: false, questions: [], currentIndex: 0,
        selectedOption: null, isBookmarked: false,
        correctCount: 0, wrongCount: 0, timeSeconds: 0, stopwatchInterval: null
    },
    cache: {
        activePremiumQuiz: null, archives: null,
        topicSets: {}, questions: {}, leaderboard: null
    }
};

// ── ENGINE CLASS ───────────────────────────────────────────────
class SSCMaxVocabEngine {

    constructor() {
        this.initDOMNodes();
        this.bindNavigationEvents();
        this.initTelegramContext();
    }

    // ── DOM SETUP ──────────────────────────────────────────────
    initDOMNodes() {
        this.premiumTopicsList      = document.getElementById('premium-topics-list');
        this.premiumArchivesEl      = document.getElementById('premium-archives-container');
        this.vaultItemsContainer    = document.getElementById('vault-items-container');
        this.leaderboardContainer   = document.getElementById('leaderboard-master-container');
        this.quizFrame              = document.getElementById('question-card-frame');
        this.optionsContainer       = document.getElementById('question-options-container');
        this.btnNextQ               = document.getElementById('btn-next-q');
        this.btnBookmarkCurrent     = document.getElementById('btn-bookmark-current');
        this.btnStartQuiz           = document.getElementById('btn-confirm-start-quiz');
        this.btnNextQ.addEventListener('click', () => this.advanceQuestion());
        this.btnStartQuiz.addEventListener('click', () => this.handleStartQuizClick());
    }

    // ── TELEGRAM INIT ──────────────────────────────────────────
    initTelegramContext() {
        const tg = window.Telegram?.WebApp;
        let userId = null, displayName = 'SSC Aspirant', handleName = 'Offline Mode', avatarUrl = '';

        if (tg) {
            tg.ready(); tg.expand();
            if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
            const user = tg.initDataUnsafe?.user;
            if (user) {
                userId      = user.id;
                displayName = `${user.first_name} ${user.last_name || ''}`.trim();
                handleName  = user.username ? `@${user.username}` : `ID: ${user.id}`;
                avatarUrl   = user.photo_url || '';
                if (avatarUrl) { const av = document.getElementById('tg-user-avatar'); if (av) av.src = avatarUrl; }
            }
        }

        appState.currentUser = { id: userId, name: displayName, username: handleName, photo_url: avatarUrl };
        const n = document.getElementById('tg-user-name');   if (n) n.innerText = displayName;
        const h = document.getElementById('tg-user-handle'); if (h) h.innerText = handleName;

        // Admin ID updated to: 7990149560
        if (userId === 7990149560 || userId === '7990149560') {
            appState.isAdmin = true;
            this.buildAdminPanel();
        }

        this.syncSupabaseUser();
    }

    // ── ADMIN PANEL (Secure — ID: 7990149560) ──────────────────
    buildAdminPanel() {
        // Add 4th tab to bottom nav
        const navBar = document.querySelector('.bottom-nav-bar');
        if (navBar) {
            navBar.classList.add('admin-nav');
            const tab = document.createElement('button');
            tab.className = 'nav-tab';
            tab.setAttribute('data-target', 'admin');
            tab.innerHTML = `<i class="fa-solid fa-shield-halved"></i><span>Admin</span>`;
            navBar.appendChild(tab);
            this.bindNavigationEvents(); // rebind to include new tab
        }

        const today = new Date().toISOString().split('T')[0];
        const adminView = document.createElement('div');
        adminView.id = 'view-admin';
        adminView.className = 'app-view';
        adminView.innerHTML = `
            <div class="screen-header">
                <h2>Admin Panel</h2><p>Secure Command Interface</p>
            </div>
            <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:16px;scrollbar-width:none;">
                <button class="adm-pill active" onclick="app.switchAdminTab('free',this)">Free Quiz</button>
                <button class="adm-pill" onclick="app.switchAdminTab('prem',this)">Premium Mix</button>
                <button class="adm-pill" onclick="app.switchAdminTab('topic',this)">Topics</button>
                <button class="adm-pill" onclick="app.switchAdminTab('users',this)">Users</button>
            </div>

            <div id="adm-sec-free" class="adm-sec">
                <div class="glass-card mb-3">
                    <h4 style="color:var(--neon-cyan);margin-bottom:14px;">Deploy Daily Free Quiz</h4>
                    <label class="adm-label">Quiz Date</label>
                    <input type="date" id="adm-free-date" class="adm-input" value="${today}">
                    <label class="adm-label">Instructions</label>
                    <input type="text" id="adm-free-inst" class="adm-input" placeholder="Complete all 30 questions accurately.">
                    <label class="adm-label">Questions (30 Qs)</label>
                    <textarea id="adm-free-txt" class="adm-textarea" rows="8" placeholder="1. Question\nA. Opt\nB. Opt\nC. Opt\nD. Opt\nAnswer: A\nExplanation: Meaning"></textarea>
                    <button class="adm-btn-cyan w-100 mt-3" onclick="app.publishAdminFreeQuiz()">🚀 PUBLISH FREE QUIZ</button>
                </div>
            </div>

            <div id="adm-sec-prem" class="adm-sec" style="display:none;">
                <div class="glass-card mb-3">
                    <h4 style="color:var(--gold-premium);margin-bottom:14px;">Deploy Daily Premium Mix</h4>
                    <label class="adm-label">Quiz Date</label>
                    <input type="date" id="adm-prem-date" class="adm-input" value="${today}">
                    <label class="adm-label">Questions (100 Qs)</label>
                    <textarea id="adm-prem-txt" class="adm-textarea" rows="8" placeholder="1. Question\nA. Opt..."></textarea>
                    <button class="adm-btn-gold w-100 mt-3" onclick="app.publishAdminPremiumQuiz()">👑 PUBLISH PREMIUM MIX</button>
                </div>
            </div>

            <div id="adm-sec-topic" class="adm-sec" style="display:none;">
                <div class="glass-card mb-3">
                    <h4 style="color:var(--neon-cyan);margin-bottom:14px;">Deploy Topic Set</h4>
                    <label class="adm-label">Topic</label>
                    <select id="adm-topic-sel" class="adm-input">
                        ${TOPICS.map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                    <label class="adm-label">Questions (20 Qs per set)</label>
                    <textarea id="adm-topic-txt" class="adm-textarea" rows="8" placeholder="1. Question\nA. Opt..."></textarea>
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
            </div>`;

        document.getElementById('view-container').appendChild(adminView);
    }

    switchAdminTab(secId, btn) {
        document.querySelectorAll('.adm-sec').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.adm-pill').forEach(b => b.classList.remove('active'));
        const sec = document.getElementById(`adm-sec-${secId}`);
        if (sec) sec.style.display = 'block';
        if (btn) btn.classList.add('active');
        this.triggerHaptic('select');
        if (secId === 'users') this.loadPremiumUsersList();
    }

    async loadPremiumUsersList() {
        const el = document.getElementById('adm-premium-users-list');
        if (!el || !supabaseClient) return;
        el.innerHTML = `<div class="text-center text-muted p-2"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
        try {
            const { data: prem, error } = await supabaseClient.from('premium_users').select('telegram_id, added_at');
            if (error) throw error;
            if (!prem || prem.length === 0) { el.innerHTML = `<p class="text-muted text-center p-3">No premium users found.</p>`; return; }

            const ids = prem.map(u => u.telegram_id);
            const { data: usrs } = await supabaseClient.from('users').select('telegram_id, first_name, username').in('telegram_id', ids);
            const uMap = {}; (usrs || []).forEach(u => { uMap[u.telegram_id] = u; });

            el.innerHTML = prem.map(pu => {
                const u = uMap[pu.telegram_id];
                const name = u ? (u.first_name || u.username || 'Unknown') : 'Unknown';
                const dt = pu.added_at ? new Date(pu.added_at).toLocaleDateString('en-IN') : '—';
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div>
                        <div style="font-size:0.85rem;font-weight:700;">${name}</div>
                        <div style="font-size:0.72rem;color:var(--text-muted);">ID: ${pu.telegram_id} · ${dt}</div>
                    </div>
                    <button class="adm-btn-red" style="padding:5px 10px;font-size:0.72rem;" onclick="app.adminRevokeById(${pu.telegram_id})">Remove</button>
                </div>`;
            }).join('');
        } catch(e) { el.innerHTML = `<p style="color:var(--danger-red);text-align:center;padding:12px;">Error: ${e.message}</p>`; }
    }

    // ── QUESTION PARSER ────────────────────────────────────────
    parseAdminQuestions(rawText, quizType, categoryName) {
        const blocks = rawText.replace(/\r\n/g, '\n').split(/\n(?=\d+[\.\)])/);
        const results = [];
        for (let block of blocks) {
            const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 6) continue;
            const qText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
            const options = []; let ansLetter = 'A', explText = '';
            for (let i = 1; i < lines.length; i++) {
                const ln = lines[i];
                if (/^[A-D][\.\)]\s*/i.test(ln))      options.push(ln.replace(/^[A-D][\.\)]\s*/i, '').trim());
                else if (/^Answer:\s*/i.test(ln))       ansLetter = ln.replace(/^Answer:\s*/i, '').trim().toUpperCase().charAt(0);
                else if (/^Explanation:\s*/i.test(ln))  explText  = ln.replace(/^Explanation:\s*/i, '').trim();
            }
            if (options.length >= 4 && qText) {
                const ci = { A:0, B:1, C:2, D:3 }[ansLetter] ?? 0;
                const ea = ['','','','']; ea[ci] = explText;
                results.push({ type: quizType, category: categoryName, text: qText, options: options.slice(0,4), correctIndex: ci, explanations: ea });
            }
        }
        return results;
    }

    // ── ADMIN DEPLOY METHODS ───────────────────────────────────
    async publishAdminFreeQuiz() {
        const dateVal = document.getElementById('adm-free-date').value;
        const instVal = document.getElementById('adm-free-inst').value || 'Complete all 30 vocabulary questions accurately.';
        const textVal = document.getElementById('adm-free-txt').value;
        if (!textVal.trim()) return alert('Paste questions first.');
        const parsed = this.parseAdminQuestions(textVal, 'free', 'Daily Free');
        if (!parsed.length) return alert('Could not parse questions. Check format.');
        try {
            // Delete ALL old free quiz data (only 1 active free quiz at a time)
            await supabaseClient.from('questions').delete().eq('type', 'free');
            await supabaseClient.from('quizzes').delete().eq('type', 'free');
            await supabaseClient.from('quizzes').insert({ title: `Daily Free Quiz - ${dateVal}`, type: 'free', date: dateVal, instructions: instVal });
            await supabaseClient.from('questions').insert(parsed);
            appState.cache.questions['free'] = null;
            alert(`✅ Free Quiz published! ${parsed.length} questions uploaded.`);
            document.getElementById('adm-free-txt').value = '';
        } catch(e) { alert('Error: ' + e.message); }
    }

    async publishAdminPremiumQuiz() {
        const dateVal = document.getElementById('adm-prem-date').value;
        const textVal = document.getElementById('adm-prem-txt').value;
        if (!textVal.trim()) return alert('Paste questions first.');
        // Category encodes the date so each quiz's questions can be fetched individually
        const cat = `Premium Mix - ${dateVal}`;
        const parsed = this.parseAdminQuestions(textVal, 'daily_premium', cat);
        if (!parsed.length) return alert('Could not parse questions.');
        try {
            // INSERT (not upsert) — old quiz becomes archive automatically
            await supabaseClient.from('quizzes').insert({ title: `Daily Premium Mix - ${dateVal}`, type: 'daily_premium', date: dateVal });
            await supabaseClient.from('questions').insert(parsed);
            appState.cache.archives = null;
            appState.cache.activePremiumQuiz = null;
            alert(`✅ Premium Mix published! ${parsed.length} questions uploaded.`);
            document.getElementById('adm-prem-txt').value = '';
        } catch(e) { alert('Error: ' + e.message); }
    }

    async publishAdminTopicDeck() {
        const topicVal = document.getElementById('adm-topic-sel').value;
        const textVal  = document.getElementById('adm-topic-txt').value;
        if (!textVal.trim()) return alert('Paste questions first.');
        try {
            // Count existing sets for this topic to auto-number the new set
            const { data: existing } = await supabaseClient.from('quizzes').select('id').eq('type','topic').like('title', `${topicVal} - Set%`);
            const setNum   = (existing?.length || 0) + 1;
            const setTitle = `${topicVal} - Set ${setNum}`;
            const parsed   = this.parseAdminQuestions(textVal, 'topic', setTitle);
            if (!parsed.length) return alert('Could not parse questions.');
            await supabaseClient.from('quizzes').insert({ title: setTitle, type: 'topic', date: new Date().toISOString().split('T')[0] });
            await supabaseClient.from('questions').insert(parsed);
            appState.cache.topicSets[topicVal] = null;
            alert(`✅ ${setTitle} published! ${parsed.length} questions uploaded.`);
            document.getElementById('adm-topic-txt').value = '';
        } catch(e) { alert('Error: ' + e.message); }
    }

    async adminGrantPremium() {
        const id = document.getElementById('adm-user-tgid').value.trim();
        if (!id) return alert('Enter Telegram ID.');
        try {
            await supabaseClient.from('premium_users').upsert({ telegram_id: parseInt(id), added_at: new Date().toISOString() }, { onConflict: 'telegram_id' });
            await supabaseClient.from('users').update({ premium: true }).eq('telegram_id', parseInt(id));
            this.triggerToast(`✅ Premium granted to ${id}`);
            document.getElementById('adm-user-tgid').value = '';
            this.loadPremiumUsersList();
        } catch(e) { alert('Error: ' + e.message); }
    }

    async adminRevokePremium() {
        const id = document.getElementById('adm-user-tgid').value.trim();
        if (!id) return alert('Enter Telegram ID.');
        await this.adminRevokeById(parseInt(id));
        document.getElementById('adm-user-tgid').value = '';
    }

    async adminRevokeById(targetId) {
        try {
            await supabaseClient.from('premium_users').delete().eq('telegram_id', targetId);
            await supabaseClient.from('users').update({ premium: false }).eq('telegram_id', targetId);
            this.triggerToast(`❌ Premium revoked from ${targetId}`);
            this.loadPremiumUsersList();
        } catch(e) { alert('Error: ' + e.message); }
    }

    // ── SUPABASE USER SYNC ─────────────────────────────────────
    async syncSupabaseUser() {
        if (!supabaseClient || !appState.currentUser.id) { this.updateHeaderBadge(false); return; }
        try {
            await supabaseClient.from('users').upsert({
                telegram_id: appState.currentUser.id,
                username: appState.currentUser.username,
                first_name: appState.currentUser.name,
                photo_url: appState.currentUser.photo_url,
                premium: false,
                joined_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });

            // Fix 406 error: use maybeSingle() instead of single()
            const { data: premCheck } = await supabaseClient
                .from('premium_users').select('telegram_id')
                .eq('telegram_id', appState.currentUser.id).maybeSingle();

            appState.isPremium = !!premCheck;
            this.updateHeaderBadge(appState.isPremium);
            await this.fetchVaultData();
        } catch(err) { console.error('Sync error:', err); this.updateHeaderBadge(false); }
    }

    updateHeaderBadge(isPremium) {
        const b = document.getElementById('header-tier-indicator');
        if (!b) return;
        if (isPremium) { b.innerHTML = `<i class="fa-solid fa-crown text-gold"></i> Elite`; b.classList.add('elite'); document.body.classList.add('premium-enhanced'); }
        else           { b.innerHTML = `<i class="fa-solid fa-user"></i> Free`;               b.classList.remove('elite'); document.body.classList.remove('premium-enhanced'); }
    }

    triggerHaptic(type) {
        const h = window.Telegram?.WebApp?.HapticFeedback; if (!h) return;
        try {
            if (type === 'select')  h.selectionChanged();
            if (type === 'correct') h.notificationOccurred('success');
            if (type === 'wrong')   h.notificationOccurred('error');
            if (type === 'result')  h.notificationOccurred('warning');
        } catch(e) {}
    }

    // ── NAVIGATION ─────────────────────────────────────────────
    bindNavigationEvents() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.onclick = () => this.switchView(tab.getAttribute('data-target'));
        });
    }

    switchView(viewId) {
        if (appState.quiz.active && viewId !== 'quiz' && viewId !== 'result') {
            if (!confirm('Assessment running. Discard and exit?')) return;
            this.forceTerminateQuiz();
        }
        document.querySelector('.app-view.active')?.classList.remove('active');
        const target = document.getElementById(`view-${viewId}`);
        if (target) { target.classList.add('active'); appState.currentView = viewId; }
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-target') === viewId));

        if (viewId === 'vault')   this.renderVault();
        if (viewId === 'ranks')   this.renderLeaderboard();
        if (viewId === 'premium') this.fetchAndRenderPremiumView();
    }

    // Free users can VIEW premium, start buttons will be locked
    navigateToPremiumView() { this.switchView('premium'); }

    triggerPremiumPaywallGate() {
        const msg  = encodeURIComponent('Hi! I want to unlock Premium Membership for SSC MAX VOCAB.');
        const link = `https://t.me/jangra854x?text=${msg}`;
        if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(link);
        else window.open(link, '_blank');
    }

    // ── PREMIUM VIEW ───────────────────────────────────────────
    async fetchAndRenderPremiumView() {
        if (!supabaseClient) return;
        try {
            // Fetch latest active daily premium quiz
            if (!appState.cache.activePremiumQuiz) {
                const { data } = await supabaseClient.from('quizzes').select('*').eq('type','daily_premium').order('date', { ascending: false }).limit(1).maybeSingle();
                appState.cache.activePremiumQuiz = data || null;
            }
            // Update date label on active card
            if (appState.cache.activePremiumQuiz) {
                const d = new Date(appState.cache.activePremiumQuiz.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
                const lbl = document.getElementById('active-prem-date-label');
                if (lbl) lbl.innerText = d;
            }
            // Fetch all archives
            if (!appState.cache.archives) {
                const { data: arcs } = await supabaseClient.from('quizzes').select('*').eq('type','daily_premium').order('date', { ascending: false });
                appState.cache.archives = arcs || [];
            }
            // Past = all except the latest (index 0)
            this.renderPastPremiumQuizzes(appState.cache.archives.slice(1));
            // Render 6 fixed topics
            this.renderTopicsSection();
        } catch(e) { console.error('Premium view error:', e); }
    }

    renderTopicsSection() {
        if (!this.premiumTopicsList) return;
        this.premiumTopicsList.innerHTML = TOPICS.map(t => `
            <div class="topic-card-item glass-card" onclick="app.openTopicSets('${t}')">
                <div class="topic-meta-left">
                    <span class="topic-title">${t}</span>
                    <span class="topic-timestamp" id="tmeta-${t.replace(/\W+/g,'_')}">Loading sets...</span>
                </div>
                <i class="fa-solid fa-chevron-right text-muted"></i>
            </div>`).join('');

        // Load set counts in background for each topic
        TOPICS.forEach(async t => {
            try {
                if (!appState.cache.topicSets[t]) {
                    const { data } = await supabaseClient.from('quizzes').select('id,title,date').eq('type','topic').like('title', `${t} - Set%`).order('date', { ascending: true });
                    appState.cache.topicSets[t] = data || [];
                }
                const cnt = appState.cache.topicSets[t].length;
                const el  = document.getElementById(`tmeta-${t.replace(/\W+/g,'_')}`);
                if (el) el.innerText = cnt > 0 ? `${cnt} Set${cnt > 1 ? 's' : ''} · ${cnt * 20} Questions` : 'No sets yet';
            } catch(e) {}
        });
    }

    async openTopicSets(topicKey) {
        this.triggerHaptic('select');
        appState.selectedTopic = topicKey;

        if (!appState.cache.topicSets[topicKey]) {
            const { data } = await supabaseClient.from('quizzes').select('id,title,date').eq('type','topic').like('title', `${topicKey} - Set%`).order('date', { ascending: true });
            appState.cache.topicSets[topicKey] = data || [];
        }
        const sets = appState.cache.topicSets[topicKey];
        document.getElementById('topic-sets-title').innerText = topicKey;
        const container = document.getElementById('topic-sets-list');

        if (!sets.length) {
            container.innerHTML = `<div class="glass-card text-center p-4"><p class="text-muted">No question sets available yet for this topic.</p></div>`;
        } else {
            container.innerHTML = sets.map((set, i) => {
                const dateStr = new Date(set.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
                const setNum  = i + 1;
                const s = (setNum - 1) * 20 + 1, e = setNum * 20;
                const locked  = !appState.isPremium;
                return `
                    <div class="topic-set-card glass-card ${locked ? 'locked-set' : ''}" onclick="app.handleTopicSetClick('${set.title}')">
                        <div class="set-info">
                            <span class="set-label">Set ${setNum}</span>
                            <span class="set-range-tag">Q ${s}–${e}</span>
                        </div>
                        <div class="set-meta">
                            <span><i class="fa-solid fa-circle-question"></i> 20 Questions</span>
                            <span><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                        </div>
                        ${locked ? `<div class="set-lock-bar" onclick="event.stopPropagation();app.triggerPremiumPaywallGate()"><i class="fa-solid fa-lock"></i> Unlock Premium</div>` : ''}
                    </div>`;
            }).join('');
        }
        this.switchView('topic-sets');
    }

    handleTopicSetClick(setTitle) {
        if (!appState.isPremium) { this.triggerPremiumPaywallGate(); return; }
        this.showQuizBlueprint('topic', setTitle, setTitle, 20);
    }

    handleActivePremiumClick() {
        const q = appState.cache.activePremiumQuiz;
        if (!q) { this.triggerToast('No active quiz found.'); return; }
        const cat = `Premium Mix - ${q.date}`;
        this.showQuizBlueprint('daily_premium', q.title || 'Daily Premium Mix', cat, 100);
    }

    renderPastPremiumQuizzes(pastQuizzes) {
        if (!this.premiumArchivesEl) return;
        if (!pastQuizzes || !pastQuizzes.length) {
            this.premiumArchivesEl.innerHTML = `<div class="text-center text-muted p-3">No past quizzes yet.</div>`;
            return;
        }
        // Group by month
        const byMonth = {};
        pastQuizzes.forEach(q => {
            const key = new Date(q.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            (byMonth[key] = byMonth[key] || []).push(q);
        });
        this.premiumArchivesEl.innerHTML = Object.entries(byMonth).map(([month, quizzes]) => `
            <div class="archive-month-group">
                <div class="archive-month-header glass-card" onclick="this.parentElement.classList.toggle('open')">
                    <span><i class="fa-regular fa-calendar" style="margin-right:8px;"></i>${month}</span>
                    <i class="fa-solid fa-chevron-down arc-chevron"></i>
                </div>
                <div class="archive-month-dates">
                    ${quizzes.map(q => {
                        const dl = new Date(q.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' });
                        const locked = !appState.isPremium;
                        return `<div class="archive-date-entry" onclick="app.handlePastQuizClick('${q.title}','${q.date}')">
                            <span><i class="fa-solid fa-calendar-day text-gold" style="margin-right:6px;"></i>${dl}</span>
                            ${locked ? `<span class="locked-tag"><i class="fa-solid fa-lock"></i> Premium</span>` : `<i class="fa-solid fa-play text-gold"></i>`}
                        </div>`;
                    }).join('')}
                </div>
            </div>`).join('');
    }

    handlePastQuizClick(title, date) {
        if (!appState.isPremium) { this.triggerPremiumPaywallGate(); return; }
        const cat = `Premium Mix - ${date}`;
        this.showQuizBlueprint('daily_premium', title, cat, 100);
    }

    // ── QUIZ BLUEPRINT ─────────────────────────────────────────
    showQuizBlueprint(type, title, category = null, qCount = null) {
        appState.quiz.type         = type;
        appState.quiz.title        = title;
        appState.quiz.quizCategory = category;

        const isPremContent = type === 'daily_premium' || type === 'topic';
        appState.quiz.isPremiumLocked = isPremContent && !appState.isPremium;

        document.getElementById('qd-subtitle').innerText = title;
        document.getElementById('qd-date').innerText = new Date().toLocaleDateString('en-IN', { month:'short', day:'numeric', year:'numeric' });

        const total = qCount || (type === 'daily_premium' ? 100 : type === 'topic' ? 20 : 30);
        const rank  = type === 'daily_premium' ? 'Ranked (Logs to Global Leaderboard)' : 'Unranked Practice';
        document.getElementById('qd-count').innerText = `${total} Questions`;
        document.getElementById('qd-rank-status').innerText = rank;

        // Update start button based on premium lock
        if (appState.quiz.isPremiumLocked) {
            this.btnStartQuiz.className = 'btn-unlock-premium w-100';
            this.btnStartQuiz.innerHTML = `<i class="fa-solid fa-lock"></i> Unlock Premium`;
        } else {
            this.btnStartQuiz.className = 'btn-primary-gradient w-100';
            this.btnStartQuiz.innerHTML = `<i class="fa-solid fa-flag-checkered"></i> START QUIZ`;
        }
        this.switchView('quiz-details');
    }

    handleStartQuizClick() {
        if (appState.quiz.isPremiumLocked) { this.triggerPremiumPaywallGate(); return; }
        this.executeQuizInstance();
    }

    // ── QUIZ EXECUTION ─────────────────────────────────────────
    async executeQuizInstance() {
        this.btnStartQuiz.disabled = true;
        this.btnStartQuiz.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading...`;
        try {
            appState.quiz.active = true;
            const limit = appState.quiz.type === 'daily_premium' ? 100 : appState.quiz.type === 'topic' ? 20 : 30;
            appState.quiz.questions = await this.fetchQuestionsFromDB(appState.quiz.type, appState.quiz.quizCategory, limit);
            if (!appState.quiz.questions.length) { alert('No questions found. Database may be empty.'); this.forceTerminateQuiz(); return; }
            appState.quiz.currentIndex = 0; appState.quiz.correctCount = 0;
            appState.quiz.wrongCount   = 0; appState.quiz.timeSeconds  = 0;
            document.getElementById('quiz-title-display').innerText = appState.quiz.title;
            this.switchView('quiz');
            this.startElapsedStopwatch();
            this.renderCurrentQuestion();
        } catch(e) { console.error('Quiz error:', e); alert('Failed to load quiz.'); this.forceTerminateQuiz(); }
        finally { this.btnStartQuiz.disabled = false; this.btnStartQuiz.innerHTML = `<i class="fa-solid fa-flag-checkered"></i> START QUIZ`; }
    }

    async fetchQuestionsFromDB(quizType, category, limit) {
        if (!supabaseClient) return [];
        let query = supabaseClient.from('questions').select('category, text, options, "correctIndex", explanations');

        if (quizType === 'free') {
            // Free quiz — only one active, fetch by type
            query = query.eq('type', 'free');
        } else if (quizType === 'daily_premium') {
            // Fetch by exact category (category = 'Premium Mix - YYYY-MM-DD')
            query = category ? query.eq('type','daily_premium').eq('category', category) : query.eq('type','daily_premium');
        } else if (quizType === 'topic') {
            // Fetch by set title as category (category = 'TopicName - Set N')
            query = query.eq('type','topic').eq('category', category);
        }

        const { data, error } = await query.limit(limit * 2);
        if (error) throw error;
        return this.shuffleArray(data || []).slice(0, limit);
    }

    shuffleArray(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
        return a;
    }

    startElapsedStopwatch() {
        clearInterval(appState.quiz.stopwatchInterval);
        const el  = document.getElementById('quiz-stopwatch');
        const fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
        el.innerText = fmt(0);
        appState.quiz.stopwatchInterval = setInterval(() => { appState.quiz.timeSeconds++; el.innerText = fmt(appState.quiz.timeSeconds); }, 1000);
    }

    renderCurrentQuestion() {
        const q = appState.quiz.questions[appState.quiz.currentIndex];
        appState.quiz.selectedOption = null;
        appState.quiz.isBookmarked = false;
        this.btnBookmarkCurrent.classList.remove('bookmarked');
        this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
        this.btnNextQ.classList.add('hidden');
        this.optionsContainer.classList.remove('locked');

        const total = appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText = `Q ${appState.quiz.currentIndex + 1} / ${total}`;
        document.getElementById('quiz-progress-fill').style.width  = `${(appState.quiz.currentIndex / total) * 100}%`;
        document.getElementById('question-category-tag').innerText  = q.category || 'Vocabulary';
        document.getElementById('question-text-body').innerText     = q.text;

        this.quizFrame.classList.remove('card-animation-swap');
        void this.quizFrame.offsetWidth;
        this.quizFrame.classList.add('card-animation-swap');

        // opt-letter + opt-text spans for better CSS styling
        this.optionsContainer.innerHTML = q.options.map((opt, idx) => `
            <div class="option-wrapper">
                <div class="option-node" onclick="app.lockAnswerSelection(${idx})">
                    <span class="opt-letter">${String.fromCharCode(65+idx)}.</span>
                    <span class="opt-text">${opt}</span>
                    <div class="option-indicator"></div>
                </div>
                <div class="option-explanation-box hidden" id="expl-${idx}">
                    ${q.explanations && q.explanations[idx] ? q.explanations[idx] : (idx === q.correctIndex ? '✓ Correct answer' : '✗ Incorrect choice')}
                </div>
            </div>`).join('');
    }

    async toggleBookmarkCurrentQuestion() {
        if (!supabaseClient || !appState.currentUser.id) return;
        appState.quiz.isBookmarked = !appState.quiz.isBookmarked;
        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const word = q.options[q.correctIndex].split(':')[0].trim();
        const meaning = (q.explanations && q.explanations[q.correctIndex]) || q.text;

        if (appState.quiz.isBookmarked) {
            this.btnBookmarkCurrent.classList.add('bookmarked');
            this.btnBookmarkCurrent.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
            this.triggerHaptic('select');
            if (!appState.bookmarkedWords.find(w => w.word === word)) {
                appState.bookmarkedWords.push({ word, category:'bookmarked', meaning });
                this.triggerToast(`Saved "${word}" to Vault!`);
                await supabaseClient.from('vault').insert({ telegram_id: appState.currentUser.id, word, category:'bookmarked', saved_at: new Date().toISOString() });
            }
        } else {
            this.btnBookmarkCurrent.classList.remove('bookmarked');
            this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
            appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== word);
            await supabaseClient.from('vault').delete().eq('telegram_id', appState.currentUser.id).eq('word', word).eq('category', 'bookmarked');
        }
    }

    lockAnswerSelection(selectedIndex) {
        if (appState.quiz.selectedOption !== null) return;
        appState.quiz.selectedOption = selectedIndex;
        this.optionsContainer.classList.add('locked');
        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const correct = selectedIndex === q.correctIndex;
        this.triggerHaptic(correct ? 'correct' : 'wrong');
        if (correct) appState.quiz.correctCount++; else { appState.quiz.wrongCount++; this.routeFailedWordToVault(q); }

        this.optionsContainer.querySelectorAll('.option-node').forEach((node, idx) => {
            const expl = document.getElementById(`expl-${idx}`);
            if (expl) expl.classList.remove('hidden');
            if (idx === q.correctIndex)  { node.classList.add('correct');   if(expl) expl.classList.add('expl-correct'); }
            else if (idx === selectedIndex) { node.classList.add('incorrect'); if(expl) expl.classList.add('expl-incorrect'); }
        });
        this.btnNextQ.classList.remove('hidden');
    }

    advanceQuestion() {
        appState.quiz.currentIndex++;
        if (appState.quiz.currentIndex < appState.quiz.questions.length) this.renderCurrentQuestion();
        else this.finalizeAssessmentExecution();
    }

    async routeFailedWordToVault(qObj) {
        if (!supabaseClient || !appState.currentUser.id) return;
        const word = qObj.options[qObj.correctIndex].split(':')[0].trim();
        const meaning = (qObj.explanations && qObj.explanations[qObj.correctIndex]) || qObj.text;
        if (!appState.weakWords.find(w => w.word.toLowerCase() === word.toLowerCase())) {
            appState.weakWords.push({ word, category:'weak', meaning });
            await supabaseClient.from('vault').insert({ telegram_id: appState.currentUser.id, word, category:'weak', saved_at: new Date().toISOString() });
        }
    }

    async finalizeAssessmentExecution() {
        clearInterval(appState.quiz.stopwatchInterval);
        appState.quiz.active = false;
        this.triggerHaptic('result');
        const total = appState.quiz.questions.length;
        const acc   = ((appState.quiz.correctCount / total) * 100).toFixed(1);
        const m = Math.floor(appState.quiz.timeSeconds / 60), s = appState.quiz.timeSeconds % 60;
        document.getElementById('res-score').innerText    = `${appState.quiz.correctCount} / ${total}`;
        document.getElementById('res-accuracy').innerText = `${acc}%`;
        document.getElementById('res-correct').innerText  = appState.quiz.correctCount;
        document.getElementById('res-wrong').innerText    = appState.quiz.wrongCount;
        document.getElementById('res-time').innerText     = `${m}m ${s}s`;
        document.getElementById('res-tier-badge').innerText = parseFloat(acc) >= 90 ? '👑 ELITE ACCURACY' : '⚡ STANDARD EVALUATION';

        if (appState.quiz.type === 'daily_premium' && appState.currentUser.id && supabaseClient) {
            try {
                await supabaseClient.from('leaderboard').insert({ telegram_id: appState.currentUser.id, name: appState.currentUser.name, score: appState.quiz.correctCount, time_seconds: appState.quiz.timeSeconds, date: new Date().toISOString().split('T')[0] });
                appState.cache.leaderboard = null;
                this.triggerToast('Score synced to Global Rankings!');
            } catch(e) { console.error('Score post failed:', e); }
        }
        this.switchView('result');
    }

    confirmAbandonQuiz() { if (confirm('Abandon assessment? Progress will be lost.')) this.forceTerminateQuiz(); }
    forceTerminateQuiz() { clearInterval(appState.quiz.stopwatchInterval); appState.quiz.active = false; this.switchView('dashboard'); }

    // ── VAULT ──────────────────────────────────────────────────
    async fetchVaultData() {
        if (!supabaseClient || !appState.currentUser.id) return;
        const { data, error } = await supabaseClient.from('vault').select('word, category, saved_at').eq('telegram_id', appState.currentUser.id);
        if (!error && data) {
            appState.weakWords      = data.filter(v => v.category === 'weak').map(v => ({ word: v.word, category:'weak', meaning:'Review required in context of quiz question.' }));
            appState.bookmarkedWords = data.filter(v => v.category === 'bookmarked').map(v => ({ word: v.word, category:'bookmarked', meaning:'Bookmarked vocabulary item.' }));
        }
    }

    // Fix: use data-tab attribute instead of window.event
    switchVaultTab(tabKey) {
        appState.activeVaultTab = tabKey;
        document.querySelectorAll('.vault-tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabKey));
        this.triggerHaptic('select');
        this.renderVault();
    }

    filterVaultContent() { appState.searchQuery = document.getElementById('vault-search-input').value.toLowerCase().trim(); this.renderVault(); }

    renderVault() {
        if (!this.vaultItemsContainer) return;
        let arr = appState.activeVaultTab === 'bookmarked' ? appState.bookmarkedWords : appState.weakWords;
        if (appState.searchQuery) arr = arr.filter(i => i.word.toLowerCase().includes(appState.searchQuery));
        document.getElementById('count-weak').innerText        = appState.weakWords.length;
        document.getElementById('count-bookmarked').innerText  = appState.bookmarkedWords.length;

        if (!arr.length) {
            this.vaultItemsContainer.innerHTML = `<div class="glass-card text-center p-4"><p class="text-muted">No items in this repository.</p><p class="text-muted" style="font-size:0.78rem;margin-top:6px;">Incorrect answers and bookmarks appear here.</p></div>`;
            return;
        }
        this.vaultItemsContainer.innerHTML = arr.map(item => `
            <div class="glass-card vault-word-card card-animation-swap">
                <div class="v-header-row">
                    <h4>${item.word}</h4>
                    <button class="btn-delete-word" onclick="app.deleteVaultWord('${item.word.replace(/'/g,"\\'")}')"><i class="fa-solid fa-trash-can"></i> Remove</button>
                </div>
                <p class="v-meaning">${item.meaning}</p>
            </div>`).join('');
    }

    async deleteVaultWord(word) {
        const cat = appState.activeVaultTab;
        if (cat === 'bookmarked') appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== word);
        else appState.weakWords = appState.weakWords.filter(w => w.word !== word);
        this.triggerHaptic('select'); this.renderVault(); this.triggerToast(`Removed "${word}" from vault.`);
        if (supabaseClient && appState.currentUser.id) await supabaseClient.from('vault').delete().eq('telegram_id', appState.currentUser.id).eq('word', word).eq('category', cat);
    }

    // ── LEADERBOARD ────────────────────────────────────────────
    async renderLeaderboard() {
        if (!this.leaderboardContainer) return;
        const dateStr = new Date().toLocaleDateString('en-IN', { month:'long', day:'numeric', year:'numeric' });
        document.getElementById('leaderboard-date-subtitle').innerText = `Standings for ${dateStr}`;

        if (!appState.isPremium) {
            this.leaderboardContainer.innerHTML = `
                <div class="blurred-leaderboard-box">
                    <div class="leaderboard-list blur-mask">
                        ${[1,2,3].map(n => `<div class="leader-row glass-card"><div class="leader-meta"><span class="leader-num top-3">#${n}</span><span class="leader-name">Elite Ranker</span></div><div class="leader-scores"><div class="leader-score-pts">●●/100</div></div></div>`).join('')}
                    </div>
                    <div class="premium-unlock-overlay">
                        <i class="fa-solid fa-lock"></i>
                        <h3>Elite Rankings Locked</h3>
                        <p>Complete Daily Premium Mix to appear on the global leaderboard.</p>
                        <button class="btn-primary-gradient mt-3" onclick="app.triggerPremiumPaywallGate()"><i class="fa-solid fa-crown"></i> Unlock Premium</button>
                    </div>
                </div>`;
            return;
        }

        if (!supabaseClient) { this.leaderboardContainer.innerHTML = `<div class="text-center text-muted p-3">Database unavailable.</div>`; return; }

        // Show skeletons while loading
        this.leaderboardContainer.innerHTML = `<div class="skeleton-list">${[...Array(5)].map(()=>'<div class="skeleton-row"></div>').join('')}</div>`;

        try {
            const today = new Date().toISOString().split('T')[0];
            if (!appState.cache.leaderboard) {
                const { data } = await supabaseClient.from('leaderboard').select('*').eq('date', today).order('score', { ascending: false }).order('time_seconds', { ascending: true }).limit(10);
                appState.cache.leaderboard = data || [];
            }
            const lb = appState.cache.leaderboard;
            if (!lb.length) { this.leaderboardContainer.innerHTML = `<div class="text-center text-muted p-4">No scores today yet. Be the first! 🏆</div>`; return; }

            const myId    = String(appState.currentUser.id);
            const myIndex = lb.findIndex(r => String(r.telegram_id) === myId);

            // If user not in top 10, show their pinned card below
            let myRankHTML = '';
            if (myIndex === -1 && appState.currentUser.id) {
                myRankHTML = `<div class="leader-row glass-card user-pinned-rank" style="margin-top:16px;">
                    <div class="leader-meta"><span class="leader-num">#—</span><span class="leader-name">You</span></div>
                    <div class="leader-scores"><div class="leader-score-pts" style="font-size:0.78rem;">Not in Top 10 yet</div></div>
                </div>`;
            }

            this.leaderboardContainer.innerHTML = `
                <div class="leaderboard-list">
                    ${lb.map((u, i) => {
                        const isMe   = String(u.telegram_id) === myId;
                        const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
                        return `<div class="leader-row glass-card ${isMe ? 'user-pinned-rank' : ''}">
                            <div class="leader-meta">
                                <span class="leader-num ${i < 3 ? 'top-3' : ''}">${medal}</span>
                                <span class="leader-name">${u.name || 'Aspirant'}${isMe ? ' (You)' : ''}</span>
                            </div>
                            <div class="leader-scores">
                                <div class="leader-score-pts">${u.score} Correct</div>
                                <div class="leader-score-time">${Math.floor(u.time_seconds/60)}m ${u.time_seconds%60}s</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                ${myRankHTML}`;
        } catch(e) { console.error('Leaderboard error:', e); this.leaderboardContainer.innerHTML = `<div class="text-center text-muted p-3">Failed to load rankings.</div>`; }
    }

    // ── TOAST ──────────────────────────────────────────────────
    triggerToast(msg) {
        const old = document.getElementById('app-toast-alert'); if (old) old.remove();
        const t = document.createElement('div');
        t.id = 'app-toast-alert';
        Object.assign(t.style, { position:'fixed', bottom:'95px', left:'50%', transform:'translateX(-50%)', background:'rgba(18,22,39,0.97)', border:'1px solid var(--neon-cyan)', color:'#fff', padding:'12px 24px', borderRadius:'30px', fontSize:'0.8rem', fontWeight:'700', zIndex:'9999', boxShadow:'0 0 18px var(--neon-cyan-glow)', whiteSpace:'nowrap' });
        t.innerText = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2600);
    }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new SSCMaxVocabEngine(); });