/**
 * SSC MAX VOCAB - Supabase Production Client Engine
 * Features: Auto Telegram Verification, Supabase Backend integration, 
 * Server-side Ranks, Persistent Vault, High-Performance Local Caching,
 * and Secure Dynamic Command Center (Admin Portal).
 */

// 1. SUPABASE INITIALIZATION (Fixed Duplicate Identifier Crash)
const SUPABASE_URL = 'https://tbiktjhwdlwzrhwursxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaWt0amh3ZGx3enJod3Vyc3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzQ2MjYsImV4cCI6MjA5Nzg1MDYyNn0.aukjIOzRatuQCo_UgUir5WZX4uS2_CQ2t760VgRV-MA';

let supabaseClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (err) {
    console.error("Supabase initialization failed safely:", err);
}

// 2. Client Application Dynamic State & Cache
let appState = {
    isPremium: false,
    currentUser: { id: null, name: 'SSC Aspirant', username: '', photo_url: '' },
    currentView: 'dashboard',
    activeVaultTab: 'weak', 
    searchQuery: '',
    weakWords: [],       
    bookmarkedWords: [], 
    quiz: {
        active: false,
        type: 'free', 
        title: '',
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        isBookmarked: false,
        correctCount: 0,
        wrongCount: 0,
        timeSeconds: 0,
        stopwatchInterval: null
    },
    cache: {
        topics: null,
        archives: null,
        questions: {},
        leaderboard: null
    }
};

// 3. Core Engine Controller
class SSCMaxVocabEngine {
    constructor() {
        this.initDOMNodes();
        this.bindNavigationEvents();
        this.initTelegramContext();
    }

    initDOMNodes() {
        this.viewContainer = document.getElementById('view-container');
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.premiumTopicsList = document.getElementById('premium-topics-list');
        this.premiumArchivesContainer = document.getElementById('premium-archives-container');
        this.vaultItemsContainer = document.getElementById('vault-items-container');
        this.leaderboardContainer = document.getElementById('leaderboard-master-container');
        
        // Quiz Sandbox Bindings
        this.quizFrame = document.getElementById('question-card-frame');
        this.optionsContainer = document.getElementById('question-options-container');
        this.btnNextQ = document.getElementById('btn-next-q');
        this.btnBookmarkCurrent = document.getElementById('btn-bookmark-current');
        this.btnStartQuizConfirm = document.getElementById('btn-confirm-start-quiz');

        this.btnNextQ.addEventListener('click', () => this.advanceQuestion());
        this.btnStartQuizConfirm.addEventListener('click', () => this.executeQuizInstance());
    }

    initTelegramContext() {
        const tg = window.Telegram?.WebApp;
        
        let userId = null;
        let displayName = 'SSC Aspirant';
        let handleName = 'Offline Mode';
        let avatarUrl = '';

        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
            
            const user = tg.initDataUnsafe?.user;
            if (user) {
                userId = user.id;
                displayName = `${user.first_name} ${user.last_name || ''}`.trim();
                handleName = user.username ? `@${user.username}` : `ID: ${user.id}`;
                avatarUrl = user.photo_url || '';
                
                if (avatarUrl) {
                    const avatarNode = document.getElementById('tg-user-avatar');
                    if (avatarNode) avatarNode.src = avatarUrl;
                }
            }
        }
        
        appState.currentUser.id = userId;
        appState.currentUser.name = displayName;
        appState.currentUser.username = handleName;
        appState.currentUser.photo_url = avatarUrl;

        const nameNode = document.getElementById('tg-user-name');
        const handleNode = document.getElementById('tg-user-handle');
        if (nameNode) nameNode.innerText = displayName;
        if (handleNode) handleNode.innerText = handleName;
        
        // SECURE ADMIN GATE: Only display Admin panel to authorized Telegram ID
        if (appState.currentUser.id === 7603262906 || appState.currentUser.id === '7603262906') {
            this.buildAdminCommandCenter();
        }

        this.syncSupabaseUser();
    }

    // --- SECURE ADMIN COMMAND CENTER (Injected dynamically for ID: 7603262906) ---
    buildAdminCommandCenter() {
        const dashboardView = document.getElementById('view-dashboard');
        if (!dashboardView) return;

        // 1. Inject subtle gear icon on dashboard
        dashboardView.style.position = 'relative';
        const gearBtn = document.createElement('div');
        gearBtn.id = 'admin-portal-btn';
        gearBtn.innerHTML = `⚙`;
        gearBtn.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            width: 34px;
            height: 34px;
            background: rgba(18, 22, 39, 0.85);
            border: 1px solid var(--neon-cyan, #00f0ff);
            box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--neon-cyan, #00f0ff);
            cursor: pointer;
            z-index: 100;
            font-size: 1.1rem;
        `;
        gearBtn.onclick = () => this.switchView('admin');
        dashboardView.appendChild(gearBtn);

        // 2. Inject Admin View Page into view-container
        const adminView = document.createElement('div');
        adminView.id = 'view-admin';
        adminView.className = 'app-view';
        adminView.innerHTML = `
            <div class="p-3 pb-1">
                <div class="d-flex align-items-center justify-content-between mb-3" style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 class="m-0" style="color:#ffd700; margin:0;">⚙ COMMAND CENTER</h3>
                    <button style="background:#222; color:#fff; border:1px solid #555; padding:4px 10px; border-radius:6px;" onclick="app.switchView('dashboard')">Exit</button>
                </div>
                <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:10px; border-bottom:1px solid #333;">
                    <button class="adm-pill active" style="background:var(--neon-cyan); color:#000; border:none; padding:6px 12px; border-radius:15px; font-weight:bold;" onclick="app.switchAdminTab('free', this)">Free Quiz</button>
                    <button class="adm-pill" style="background:#222; color:#fff; border:1px solid #444; padding:6px 12px; border-radius:15px; font-weight:bold;" onclick="app.switchAdminTab('prem', this)">Premium Quiz</button>
                    <button class="adm-pill" style="background:#222; color:#fff; border:1px solid #444; padding:6px 12px; border-radius:15px; font-weight:bold;" onclick="app.switchAdminTab('topic', this)">Topics</button>
                    <button class="adm-pill" style="background:#222; color:#fff; border:1px solid #444; padding:6px 12px; border-radius:15px; font-weight:bold;" onclick="app.switchAdminTab('users', this)">Users</button>
                </div>
            </div>

            <div class="p-3 pt-1" style="padding:15px; overflow-y:auto; max-height:calc(100vh - 150px);">
                <div id="adm-sec-free" class="adm-sec block">
                    <div class="glass-card" style="background:rgba(255,255,255,0.05); border:1px solid #333; padding:15px; border-radius:12px; margin-bottom:15px;">
                        <h4 style="margin-top:0; color:#00f0ff;">Deploy Daily Free Quiz</h4>
                        <label style="font-size:0.8rem; color:#aaa;">Quiz Date</label>
                        <input type="date" id="adm-free-date" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px;" value="${new Date().toISOString().split('T')[0]}">
                        <label style="font-size:0.8rem; color:#aaa;">Instructions</label>
                        <input type="text" id="adm-free-inst" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px;" placeholder="e.g. Complete all 30 questions accurately.">
                        <label style="font-size:0.8rem; color:#aaa;">Questions (Paste 30 Qs format)</label>
                        <textarea id="adm-free-txt" rows="10" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px; font-family:monospace; font-size:0.85rem;" placeholder="1. Question text\nA. Option\nB. Option\nC. Option\nD. Option\nAnswer: A\nExplanation: Hindi meaning"></textarea>
                        <button style="width:100%; background:linear-gradient(45deg, #00f0ff, #0072ff); color:#000; font-weight:bold; padding:10px; border:none; border-radius:8px;" onclick="app.publishAdminFreeQuiz()">🚀 PUBLISH FREE QUIZ</button>
                    </div>
                </div>

                <div id="adm-sec-prem" class="adm-sec" style="display:none;">
                    <div class="glass-card" style="background:rgba(255,255,255,0.05); border:1px solid #333; padding:15px; border-radius:12px; margin-bottom:15px;">
                        <h4 style="margin-top:0; color:#ffd700;">Deploy Daily Premium Mix</h4>
                        <label style="font-size:0.8rem; color:#aaa;">Quiz Date</label>
                        <input type="date" id="adm-prem-date" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px;" value="${new Date().toISOString().split('T')[0]}">
                        <label style="font-size:0.8rem; color:#aaa;">Questions (Paste 100 Qs format)</label>
                        <textarea id="adm-prem-txt" rows="10" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px; font-family:monospace; font-size:0.85rem;" placeholder="1. Question text\nA. Option..."></textarea>
                        <button style="width:100%; background:linear-gradient(45deg, #ffd700, #ffa500); color:#000; font-weight:bold; padding:10px; border:none; border-radius:8px;" onclick="app.publishAdminPremiumQuiz()">👑 PUBLISH PREMIUM MIX</button>
                    </div>
                </div>

                <div id="adm-sec-topic" class="adm-sec" style="display:none;">
                    <div class="glass-card" style="background:rgba(255,255,255,0.05); border:1px solid #333; padding:15px; border-radius:12px; margin-bottom:15px;">
                        <h4 style="margin-top:0; color:#00f0ff;">Deploy Topic Questions</h4>
                        <label style="font-size:0.8rem; color:#aaa;">Select Category</label>
                        <select id="adm-topic-sel" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px;">
                            <option value="One Word Substitution">One Word Substitution</option>
                            <option value="Idioms & Phrases">Idioms & Phrases</option>
                            <option value="Synonyms">Synonyms</option>
                            <option value="Spelling">Spelling</option>
                            <option value="Antonyms">Antonyms</option>
                            <option value="Homophones">Homophones</option>
                        </select>
                        <label style="font-size:0.8rem; color:#aaa;">Questions (Standard format)</label>
                        <textarea id="adm-topic-txt" rows="10" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:8px; border-radius:6px; margin-bottom:10px; font-family:monospace; font-size:0.85rem;" placeholder="1. Question text\nA. Option..."></textarea>
                        <button style="width:100%; background:linear-gradient(45deg, #00f0ff, #0072ff); color:#000; font-weight:bold; padding:10px; border:none; border-radius:8px;" onclick="app.publishAdminTopicDeck()">📚 PUBLISH TOPIC DECK</button>
                    </div>
                </div>

                <div id="adm-sec-users" class="adm-sec" style="display:none;">
                    <div class="glass-card" style="background:rgba(255,255,255,0.05); border:1px solid #333; padding:15px; border-radius:12px; margin-bottom:15px;">
                        <h4 style="margin-top:0; color:#ffd700;">Premium Access Manager</h4>
                        <label style="font-size:0.8rem; color:#aaa;">Target Telegram ID</label>
                        <input type="number" id="adm-user-tgid" style="width:100%; background:#111; color:#fff; border:1px solid #444; padding:10px; border-radius:6px; margin-bottom:15px;" placeholder="e.g. 123456789">
                        <div style="display:flex; gap:10px;">
                            <button style="flex:1; background:linear-gradient(45deg, #00f0ff, #0072ff); color:#000; font-weight:bold; padding:10px; border:none; border-radius:8px;" onclick="app.adminGrantPremium()">Grant Premium</button>
                            <button style="flex:1; background:#dc3545; color:#fff; font-weight:bold; padding:10px; border:none; border-radius:8px;" onclick="app.adminRevokePremium()">Remove</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const container = document.getElementById('view-container') || document.body;
        container.appendChild(adminView);
    }

    switchAdminTab(secId, btnElem) {
        document.querySelectorAll('.adm-sec').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.adm-pill').forEach(b => {
            b.style.background = '#222';
            b.style.color = '#fff';
            b.style.border = '1px solid #444';
        });
        document.getElementById(`adm-sec-${secId}`).style.display = 'block';
        btnElem.style.background = secId === 'prem' || secId === 'users' ? '#ffd700' : 'var(--neon-cyan)';
        btnElem.style.color = '#000';
        btnElem.style.border = 'none';
        this.triggerHaptic('select');
    }

    // --- QUESTION BLOCK PARSER ---
    parseAdminQuestions(rawText, quizType, categoryName) {
        const blocks = rawText.replace(/\r\n/g, '\n').split(/\n(?=\d+[\.\)])/);
        const results = [];

        for (let block of blocks) {
            const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 6) continue;

            const qText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
            const options = [];
            let ansLetter = 'A';
            let explanationText = '';

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (/^[A-D][\.\)]\s*/i.test(line)) {
                    options.push(line.replace(/^[A-D][\.\)]\s*/i, '').trim());
                } else if (/^Answer:\s*/i.test(line)) {
                    ansLetter = line.replace(/^Answer:\s*/i, '').trim().toUpperCase().charAt(0);
                } else if (/^Explanation:\s*/i.test(line)) {
                    explanationText = line.replace(/^Explanation:\s*/i, '').trim();
                }
            }

            if (options.length >= 4 && qText) {
                const mapLetter = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                const correctIdx = mapLetter[ansLetter] !== undefined ? mapLetter[ansLetter] : 0;

                const explArray = ['', '', '', ''];
                explArray[correctIdx] = explanationText;

                results.push({
                    type: quizType,
                    category: categoryName,
                    text: qText,
                    options: options.slice(0, 4),
                    correctIndex: correctIdx,
                    explanations: explArray
                });
            }
        }
        return results;
    }

    // --- ADMIN BACKEND DEPLOY METHODS ---
    async publishAdminFreeQuiz() {
        const dateVal = document.getElementById('adm-free-date').value;
        const instVal = document.getElementById('adm-free-inst').value || 'Complete all vocabulary questions accurately.';
        const textVal = document.getElementById('adm-free-txt').value;

        if (!textVal.trim()) return alert("Please paste questions first.");
        const parsed = this.parseAdminQuestions(textVal, 'free', 'Daily Free');
        if (parsed.length === 0) return alert("Could not parse any valid questions. Please check the numbering/format.");

        try {
            await supabaseClient.from('quizzes').upsert({
                title: `Daily Free Quiz - ${dateVal}`,
                type: 'free',
                date: dateVal,
                instructions: instVal
            }, { onConflict: 'title' });

            await supabaseClient.from('questions').insert(parsed);
            alert(`Successfully deployed Free Quiz! Parsed & uploaded ${parsed.length} questions.`);
            document.getElementById('adm-free-txt').value = '';
        } catch(e) {
            alert("Deploy Error: " + e.message);
        }
    }

    async publishAdminPremiumQuiz() {
        const dateVal = document.getElementById('adm-prem-date').value;
        const textVal = document.getElementById('adm-prem-txt').value;

        if (!textVal.trim()) return alert("Please paste questions first.");
        const parsed = this.parseAdminQuestions(textVal, 'daily_premium', 'Premium Mix');
        if (parsed.length === 0) return alert("Could not parse any valid questions.");

        try {
            await supabaseClient.from('quizzes').upsert({
                title: `Daily Premium Mix - ${dateVal}`,
                type: 'daily_premium',
                date: dateVal
            }, { onConflict: 'title' });

            await supabaseClient.from('questions').insert(parsed);
            alert(`Successfully deployed Premium Mix! Uploaded ${parsed.length} questions.`);
            document.getElementById('adm-prem-txt').value = '';
        } catch(e) {
            alert("Deploy Error: " + e.message);
        }
    }

    async publishAdminTopicDeck() {
        const topicVal = document.getElementById('adm-topic-sel').value;
        const textVal = document.getElementById('adm-topic-txt').value;

        if (!textVal.trim()) return alert("Please paste questions first.");
        const parsed = this.parseAdminQuestions(textVal, 'topic', topicVal);
        if (parsed.length === 0) return alert("Could not parse any valid questions.");

        try {
            await supabaseClient.from('quizzes').upsert({
                title: topicVal,
                type: 'topic',
                date: new Date().toISOString().split('T')[0]
            }, { onConflict: 'title' });

            await supabaseClient.from('questions').insert(parsed);
            alert(`Successfully added ${parsed.length} questions to ${topicVal}!`);
            document.getElementById('adm-topic-txt').value = '';
        } catch(e) {
            alert("Deploy Error: " + e.message);
        }
    }

    async adminGrantPremium() {
        const targetId = document.getElementById('adm-user-tgid').value.trim();
        if (!targetId) return alert("Enter a valid Telegram ID.");

        try {
            await supabaseClient.from('premium_users').upsert({
                telegram_id: parseInt(targetId),
                added_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });

            await supabaseClient.from('users').update({ premium: true }).eq('telegram_id', parseInt(targetId));
            alert(`Successfully granted Premium Access to ID: ${targetId}`);
            document.getElementById('adm-user-tgid').value = '';
        } catch(e) {
            alert("Manager Error: " + e.message);
        }
    }

    async adminRevokePremium() {
        const targetId = document.getElementById('adm-user-tgid').value.trim();
        if (!targetId) return alert("Enter a valid Telegram ID.");

        try {
            await supabaseClient.from('premium_users').delete().eq('telegram_id', parseInt(targetId));
            await supabaseClient.from('users').update({ premium: false }).eq('telegram_id', parseInt(targetId));
            alert(`Successfully revoked Premium Access from ID: ${targetId}`);
            document.getElementById('adm-user-tgid').value = '';
        } catch(e) {
            alert("Manager Error: " + e.message);
        }
    }

    // --- SUPABASE BACKEND SYNC (Using Valid Columns Exclusively) ---
    async syncSupabaseUser() {
        if (!supabaseClient || !appState.currentUser.id) {
            this.updateHeaderBadge(false); 
            return;
        }

        try {
            await supabaseClient.from('users').upsert({
                telegram_id: appState.currentUser.id,
                username: appState.currentUser.username,
                first_name: appState.currentUser.name,
                photo_url: appState.currentUser.photo_url,
                premium: false, 
                joined_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });

            const { data: premiumCheck } = await supabaseClient
                .from('premium_users')
                .select('telegram_id')
                .eq('telegram_id', appState.currentUser.id)
                .single();

            appState.isPremium = !!premiumCheck;
            this.updateHeaderBadge(appState.isPremium);
            await this.fetchVaultData();
            
            if (appState.isPremium) {
                this.fetchPremiumMetadata();
            }
        } catch (error) {
            console.error("Backend Sync Error:", error);
            this.updateHeaderBadge(false);
        }
    }

    updateHeaderBadge(isPremium) {
        const badge = document.getElementById('header-tier-indicator');
        if (!badge) return;
        if (isPremium) {
            badge.innerHTML = `<i class="fa-solid fa-crown text-gold"></i> Elite Member`;
            badge.classList.add('elite');
            document.body.classList.add('premium-enhanced');
        } else {
            badge.innerHTML = `<i class="fa-solid fa-user"></i> Free User`;
            badge.classList.remove('elite');
            document.body.classList.remove('premium-enhanced');
        }
    }

    // --- TELEGRAM WEBAPP HAPTIC BRIDGE ---
    triggerHaptic(type) {
        const haptic = window.Telegram?.WebApp?.HapticFeedback;
        if (!haptic) return;
        try {
            if (type === 'select') haptic.selectionChanged();
            if (type === 'correct') haptic.notificationOccurred('success');
            if (type === 'wrong') haptic.notificationOccurred('error');
            if (type === 'result') haptic.notificationOccurred('warning');
        } catch (e) { }
    }

    bindNavigationEvents() {
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                this.switchView(target);
            });
        });
    }

    // --- VIEW ROUTER ---
    switchView(viewId) {
        if (appState.quiz.active && viewId !== 'quiz' && viewId !== 'result') {
            if (!confirm('An active vocabulary assessment is running. Discard progress?')) return;
            this.forceTerminateQuiz();
        }

        const activeView = document.querySelector('.app-view.active');
        if (activeView) activeView.classList.remove('active');

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            appState.currentView = viewId;
        }

        this.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-target') === viewId);
        });

        if (viewId === 'vault') this.renderVault();
        if (viewId === 'ranks') this.renderLeaderboard();
    }

    navigateToPremiumView() {
        if (!appState.isPremium) {
            this.triggerPremiumPaywallGate();
            return;
        }
        this.switchView('premium');
    }

    triggerPremiumPaywallGate() {
        const message = encodeURIComponent("I am interested in Premium Membership.");
        const tgBotLink = `https://t.me/jangra854x?text=${message}`;
        window.open(tgBotLink, '_blank');
    }

    // --- PREMIUM DB DATA FETCHING ---
    async fetchPremiumMetadata() {
        if (!supabaseClient) return;
        try {
            if(!appState.cache.topics) {
                const { data: topics } = await supabaseClient.from('quizzes').select('*').eq('type', 'topic');
                appState.cache.topics = topics || [];
            }
            if(!appState.cache.archives) {
                const { data: archives } = await supabaseClient.from('quizzes').select('*').eq('type', 'daily_premium').order('date', { ascending: false }).limit(10);
                appState.cache.archives = archives || [];
            }

            this.renderPremiumTopicsDeck(appState.cache.topics);
            this.renderPreviousPremiumTests(appState.cache.archives);
        } catch(e) {
            console.error("Failed to load premium data", e);
        }
    }

    renderPremiumTopicsDeck(topicsDB) {
        if(!this.premiumTopicsList) return;
        if(!topicsDB || topicsDB.length === 0) {
            this.premiumTopicsList.innerHTML = `<div class="text-center text-muted p-3">No topics configured in database.</div>`;
            return;
        }

        this.premiumTopicsList.innerHTML = topicsDB.map(topic => {
            return `
                <div class="topic-card-item glass-card" onclick="app.showQuizBlueprint('topic', '${topic.title}')">
                    <div class="topic-meta-left">
                        <span class="topic-title">${topic.title}</span>
                        <span class="topic-timestamp">Module Active</span>
                    </div>
                    <i class="fa-solid fa-arrow-right text-muted"></i>
                </div>
            `;
        }).join('');
    }

    renderPreviousPremiumTests(archivesDB) {
        if(!this.premiumArchivesContainer) return;
        if(!archivesDB || archivesDB.length === 0) {
            this.premiumArchivesContainer.innerHTML = `<div class="text-center text-muted p-3">No archives configured in database.</div>`;
            return;
        }

        this.premiumArchivesContainer.innerHTML = archivesDB.map(arc => `
            <div class="archive-entry-card" onclick="app.showQuizBlueprint('daily_premium', '${arc.title}')">
                <span class="archive-title">${arc.title} (Daily Mix)</span>
                <i class="fa-solid fa-play text-gold"></i>
            </div>
        `).join('');
    }

    // --- QUIZ ENGINE ---
    showQuizBlueprint(type, title) {
        appState.quiz.type = type;
        appState.quiz.title = title;

        document.getElementById('qd-subtitle').innerText = title;
        document.getElementById('qd-date').innerText = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        
        let qCount = 30;
        let rankStatus = "Unranked Practice Mode";
        if (type === 'daily_premium') {
            qCount = 100;
            rankStatus = "Ranked (Logs to Global Leaderboard)";
        } else if (type === 'topic') {
            qCount = 20;
        }

        document.getElementById('qd-count').innerText = `${qCount} Questions`;
        document.getElementById('qd-rank-status').innerText = rankStatus;

        this.switchView('quiz-details');
    }

    async executeQuizInstance() {
        this.btnStartQuizConfirm.classList.add('btn-loading');
        this.btnStartQuizConfirm.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching Data...`;
        
        try {
            appState.quiz.active = true;
            let targetCount = appState.quiz.type === 'daily_premium' ? 100 : (appState.quiz.type === 'topic' ? 20 : 30);
            appState.quiz.questions = await this.fetchQuestionsFromDB(appState.quiz.type, targetCount);
            
            if(appState.quiz.questions.length === 0) {
                alert("No questions configured or application is currently offline.");
                this.forceTerminateQuiz();
                return;
            }

            appState.quiz.currentIndex = 0;
            appState.quiz.correctCount = 0;
            appState.quiz.wrongCount = 0;
            appState.quiz.timeSeconds = 0;

            document.getElementById('quiz-title-display').innerText = appState.quiz.title;
            this.switchView('quiz');
            this.startElapsedStopwatch();
            this.renderCurrentQuestion();

        } catch (e) {
            console.error("Quiz Launch Error:", e);
            alert("Failed to establish secure connection to quiz servers.");
            this.forceTerminateQuiz();
        } finally {
            this.btnStartQuizConfirm.classList.remove('btn-loading');
            this.btnStartQuizConfirm.innerHTML = `<i class="fa-solid fa-flag-checkered"></i> EXECUTE QUIZ NOW`;
        }
    }

    async fetchQuestionsFromDB(quizType, limit) {
        if (appState.cache.questions[quizType] && appState.cache.questions[quizType].length >= limit) {
            return this.shuffleArray(appState.cache.questions[quizType]).slice(0, limit);
        }

        if (!supabaseClient) return [];

        const { data, error } = await supabaseClient
            .from('questions')
            .select('category, text, options, "correctIndex", explanations')
            .eq('type', quizType)
            .limit(limit * 2);

        if (error) throw error;
        
        appState.cache.questions[quizType] = data || [];
        return this.shuffleArray(data || []).slice(0, limit);
    }

    shuffleArray(array) {
        let shuffled = array.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    startElapsedStopwatch() {
        clearInterval(appState.quiz.stopwatchInterval);
        const stopwatchDisplay = document.getElementById('quiz-stopwatch');
        
        const formatTime = (sec) => {
            const m = Math.floor(sec / 60).toString().padStart(2, '0');
            const s = (sec % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };

        stopwatchDisplay.innerText = formatTime(appState.quiz.timeSeconds);
        appState.quiz.stopwatchInterval = setInterval(() => {
            appState.quiz.timeSeconds++;
            stopwatchDisplay.innerText = formatTime(appState.quiz.timeSeconds);
        }, 1000);
    }

    renderCurrentQuestion() {
        const q = appState.quiz.questions[appState.quiz.currentIndex];
        appState.quiz.selectedOption = null;
        appState.quiz.isBookmarked = false;

        this.btnBookmarkCurrent.classList.remove('bookmarked');
        this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;

        this.btnNextQ.classList.add('hidden');
        this.optionsContainer.classList.remove('locked');

        const totalQ = appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText = `Question ${appState.quiz.currentIndex + 1} of ${totalQ}`;
        
        const progressPercent = (appState.quiz.currentIndex / totalQ) * 100;
        document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;

        this.quizFrame.classList.remove('card-animation-swap');
        void this.quizFrame.offsetWidth;
        this.quizFrame.classList.add('card-animation-swap');

        document.getElementById('question-category-tag').innerText = q.category || 'Vocabulary';
        document.getElementById('question-text-body').innerText = q.text;

        this.optionsContainer.innerHTML = q.options.map((opt, idx) => `
            <div class="option-wrapper">
                <div class="option-node" onclick="app.lockAnswerSelection(${idx})">
                    <span>${opt}</span>
                    <div class="option-indicator"></div>
                </div>
                <div class="option-explanation-box hidden" id="expl-${idx}">
                    ${q.explanations && q.explanations[idx] ? q.explanations[idx] : 'No explanation provided.'}
                </div>
            </div>
        `).join('');
    }

    // --- LIVE VAULT SYNC ---
    async toggleBookmarkCurrentQuestion() {
        if(!supabaseClient || !appState.currentUser.id) return;

        appState.quiz.isBookmarked = !appState.quiz.isBookmarked;
        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const wordKey = q.options[q.correctIndex].split(':')[0].trim();
        const meaningText = (q.explanations && q.explanations[q.correctIndex]) || q.text;

        if (appState.quiz.isBookmarked) {
            this.btnBookmarkCurrent.classList.add('bookmarked');
            this.btnBookmarkCurrent.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
            this.triggerHaptic('select');

            if (!appState.bookmarkedWords.find(w => w.word === wordKey)) {
                const newWord = { word: wordKey, category: 'bookmarked', meaning: meaningText };
                appState.bookmarkedWords.push(newWord);
                this.triggerToast(`Saved "${wordKey}" to Vault!`);
                
                await supabaseClient.from('vault').insert({
                    telegram_id: appState.currentUser.id,
                    word: newWord.word,
                    category: newWord.category, 
                    saved_at: new Date().toISOString()
                }); 
            }
        } else {
            this.btnBookmarkCurrent.classList.remove('bookmarked');
            this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
            appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== wordKey);
            
            await supabaseClient.from('vault').delete()
                .eq('telegram_id', appState.currentUser.id)
                .eq('word', wordKey)
                .eq('category', 'bookmarked');
        }
    }

    lockAnswerSelection(selectedIndex) {
        if (appState.quiz.selectedOption !== null) return; 

        appState.quiz.selectedOption = selectedIndex;
        this.optionsContainer.classList.add('locked');

        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const isCorrect = selectedIndex === q.correctIndex;

        this.triggerHaptic(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            appState.quiz.correctCount++;
        } else {
            appState.quiz.wrongCount++;
            this.routeFailedWordToVault(q);
        }

        const optionNodes = this.optionsContainer.querySelectorAll('.option-node');
        optionNodes.forEach((node, idx) => {
            const explBox = document.getElementById(`expl-${idx}`);
            if(explBox) explBox.classList.remove('hidden');

            if (idx === q.correctIndex) {
                node.classList.add('correct');
                if(explBox) explBox.classList.add('expl-correct');
            } else if (idx === selectedIndex) {
                node.classList.add('incorrect');
                if(explBox) explBox.classList.add('expl-incorrect');
            }
        });

        this.btnNextQ.classList.remove('hidden');
    }

    advanceQuestion() {
        appState.quiz.currentIndex++;
        if (appState.quiz.currentIndex < appState.quiz.questions.length) {
            this.renderCurrentQuestion();
        } else {
            this.finalizeAssessmentExecution();
        }
    }

    async routeFailedWordToVault(qObj) {
        if(!supabaseClient || !appState.currentUser.id) return;
        const wordKey = qObj.options[qObj.correctIndex].split(':')[0].trim();
        const meaningText = (qObj.explanations && qObj.explanations[qObj.correctIndex]) || qObj.text;

        if (!appState.weakWords.find(w => w.word.toLowerCase() === wordKey.toLowerCase())) {
            const newWeakWord = { word: wordKey, category: 'weak', meaning: meaningText };
            appState.weakWords.push(newWeakWord);
            
            await supabaseClient.from('vault').insert({
                telegram_id: appState.currentUser.id,
                word: newWeakWord.word,
                category: newWeakWord.category, 
                saved_at: new Date().toISOString()
            });
        }
    }

    async finalizeAssessmentExecution() {
        clearInterval(appState.quiz.stopwatchInterval);
        appState.quiz.active = false;
        this.triggerHaptic('result');

        const totalQ = appState.quiz.questions.length;
        const accuracy = ((appState.quiz.correctCount / totalQ) * 100).toFixed(1);

        const minutes = Math.floor(appState.quiz.timeSeconds / 60);
        const seconds = appState.quiz.timeSeconds % 60;

        document.getElementById('res-score').innerText = `${appState.quiz.correctCount} / ${totalQ}`;
        document.getElementById('res-accuracy').innerText = `${accuracy}%`;
        document.getElementById('res-correct').innerText = appState.quiz.correctCount;
        document.getElementById('res-wrong').innerText = appState.quiz.wrongCount;
        document.getElementById('res-time').innerText = `${minutes}m ${seconds}s`;

        document.getElementById('res-tier-badge').innerText = accuracy >= 90 ? "👑 ELITE ACCURACY STANDINGS" : "⚡ STANDARD EVALUATION";

        if (appState.quiz.type === 'daily_premium' && appState.currentUser.id && supabaseClient) {
            try {
                await supabaseClient.from('leaderboard').insert({
                    telegram_id: appState.currentUser.id,
                    name: appState.currentUser.name,
                    score: appState.quiz.correctCount,
                    time_seconds: appState.quiz.timeSeconds,
                    date: new Date().toISOString().split('T')[0]
                });
                appState.cache.leaderboard = null; 
                this.triggerToast("Successfully synchronized performance to Global Rankings!");
            } catch(e) {
                console.error("Failed to post score", e);
            }
        }

        this.switchView('result');
    }

    confirmAbandonQuiz() {
        if (confirm("Abandoning the assessment will discard live progress. Exit immediately?")) {
            this.forceTerminateQuiz();
        }
    }

    forceTerminateQuiz() {
        clearInterval(appState.quiz.stopwatchInterval);
        appState.quiz.active = false;
        this.switchView('dashboard');
    }

    // --- VAULT RENDERER ---
    async fetchVaultData() {
        if(!supabaseClient || !appState.currentUser.id) return;
        const { data, error } = await supabaseClient
            .from('vault')
            .select('id, telegram_id, word, category, saved_at')
            .eq('telegram_id', appState.currentUser.id);

        if(!error && data) {
            appState.weakWords = data.filter(v => v.category === 'weak').map(v => ({ word: v.word, category: v.category, meaning: 'Review required vocabulary module context.' }));
            appState.bookmarkedWords = data.filter(v => v.category === 'bookmarked').map(v => ({ word: v.word, category: v.category, meaning: 'Saved vocabulary item references.' }));
        }
    }

    switchVaultTab(tabKey) {
        appState.activeVaultTab = tabKey;
        document.querySelectorAll('.vault-tab-btn').forEach(btn => btn.classList.remove('active'));
        if (window.event) {
            window.event.currentTarget.classList.add('active');
        }
        this.triggerHaptic('select');
        this.renderVault();
    }

    filterVaultContent() {
        appState.searchQuery = document.getElementById('vault-search-input').value.toLowerCase().trim();
        this.renderVault();
    }

    renderVault() {
        if (!this.vaultItemsContainer) return;
        let activeArray = appState.activeVaultTab === 'bookmarked' ? appState.bookmarkedWords : appState.weakWords;

        if (appState.searchQuery) {
            activeArray = activeArray.filter(item => 
                item.word.toLowerCase().includes(appState.searchQuery)
            );
        }

        document.getElementById('count-weak').innerText = appState.weakWords.length;
        document.getElementById('count-bookmarked').innerText = appState.bookmarkedWords.length;

        if (activeArray.length === 0) {
            this.vaultItemsContainer.innerHTML = `
                <div class="glass-card text-center p-4">
                    <p class="text-muted">No vocabulary items currently stored in this repository.</p>
                    <p class="text-muted font-size-sm mt-1">Errors during quizzes or clicked bookmarks will instantly route here.</p>
                </div>
            `;
            return;
        }

        this.vaultItemsContainer.innerHTML = activeArray.map(item => `
            <div class="glass-card vault-word-card card-animation-swap">
                <div class="v-header-row">
                    <h4>${item.word}</h4>
                    <button class="btn-delete-word" onclick="app.deleteVaultWord('${item.word}')">
                        <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                </div>
                <p class="v-meaning">${item.meaning}</p>
            </div>
        `).join('');
    }

    async deleteVaultWord(wordStr) {
        const categoryKey = appState.activeVaultTab;
        
        if (categoryKey === 'bookmarked') {
            appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== wordStr);
        } else {
            appState.weakWords = appState.weakWords.filter(w => w.word !== wordStr);
        }
        this.triggerHaptic('select');
        this.renderVault();
        this.triggerToast(`Removed "${wordStr}" from storage repository.`);

        if(supabaseClient && appState.currentUser.id) {
            await supabaseClient.from('vault').delete()
                .eq('telegram_id', appState.currentUser.id)
                .eq('word', wordStr)
                .eq('category', categoryKey);
        }
    }

    // --- LEADERBOARD RENDERER ---
    async renderLeaderboard() {
        if (!this.leaderboardContainer) return;
        const dateStr = new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('leaderboard-date-subtitle').innerText = `Standings for ${dateStr}`;

        if (!appState.isPremium) {
            this.leaderboardContainer.innerHTML = `
                <div class="blurred-leaderboard-box">
                    <div class="leaderboard-list blur-mask">
                        <div class="leader-row glass-card"><div class="leader-meta"><span class="leader-num top-3">#1</span><span class="leader-name">Hidden Rank</span></div><div class="leader-scores"><div class="leader-score-pts">100 Qs</div></div></div>
                        <div class="leader-row glass-card"><div class="leader-meta"><span class="leader-num top-3">#2</span><span class="leader-name">Hidden Rank</span></div><div class="leader-scores"><div class="leader-score-pts">98 Qs</div></div></div>
                        <div class="leader-row glass-card"><div class="leader-meta"><span class="leader-num top-3">#3</span><span class="leader-name">Hidden Rank</span></div><div class="leader-scores"><div class="leader-score-pts">96 Qs</div></div></div>
                    </div>
                    <div class="premium-unlock-overlay">
                        <i class="fa-solid fa-lock"></i>
                        <h3>Elite Rankings Locked</h3>
                        <p>Only Daily Premium Mix scores affect ranks. Unlock Premium Membership to compete globally.</p>
                        <button class="btn-primary-gradient mt-3" onclick="app.triggerPremiumPaywallGate()">
                            Unlock Premium Membership
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        if (!supabaseClient) {
            this.leaderboardContainer.innerHTML = `<div class="text-center text-muted p-3">Database connection unavailable.</div>`;
            return;
        }

        try {
            const todayISO = new Date().toISOString().split('T')[0];
            if(!appState.cache.leaderboard) {
                const { data } = await supabaseClient
                    .from('leaderboard')
                    .select('*')
                    .eq('date', todayISO)
                    .order('score', { ascending: false })
                    .order('time_seconds', { ascending: true }) 
                    .limit(10);
                
                appState.cache.leaderboard = data || [];
            }

            const lbData = appState.cache.leaderboard;

            if(lbData.length === 0) {
                this.leaderboardContainer.innerHTML = `<div class="text-center text-muted p-3">No scores logged today yet. Be the first!</div>`;
                return;
            }

            let myRankHTML = '';
            const myIndex = lbData.findIndex(row => row.telegram_id === appState.currentUser.id);
            
            if(myIndex !== -1) {
                const me = lbData[myIndex];
                myRankHTML = `
                    <div class="leader-row glass-card user-pinned-rank">
                        <div class="leader-meta">
                            <span class="leader-num">#${myIndex + 1}</span>
                            <span class="leader-name">You (Pinned)</span>
                        </div>
                        <div class="leader-scores">
                            <div class="leader-score-pts">${me.score} Correct</div>
                            <div class="leader-score-time">${Math.floor(me.time_seconds / 60)}m ${me.time_seconds % 60}s</div>
                        </div>
                    </div>
                `;
            }

            this.leaderboardContainer.innerHTML = `
                <div class="leaderboard-list">
                    ${lbData.map((user, idx) => {
                        const isTop3 = idx < 3;
                        return `
                        <div class="leader-row glass-card">
                            <div class="leader-meta">
                                <span class="leader-num ${isTop3 ? 'top-3' : ''}">#${idx + 1}</span>
                                <span class="leader-name">${user.name}</span>
                            </div>
                            <div class="leader-scores">
                                <div class="leader-score-pts">${user.score} Qs</div>
                                <div class="leader-score-time">${Math.floor(user.time_seconds / 60)}m ${user.time_seconds % 60}s</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                ${myRankHTML}
            `;
        } catch(e) {
            console.error("Leaderboard fetch error:", e);
            this.leaderboardContainer.innerHTML = `<div class="text-center text-muted p-3">Failed to load leaderboard.</div>`;
        }
    }

    // --- UTILITIES ---
    triggerToast(msg) {
        const existing = document.getElementById('app-toast-alert');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'app-toast-alert';
        toast.style.position = 'fixed';
        toast.style.bottom = '95px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(18, 22, 39, 0.95)';
        toast.style.border = '1px solid var(--neon-cyan)';
        toast.style.color = '#fff';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '30px';
        toast.style.fontSize = '0.8rem';
        toast.style.fontWeight = '700';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 0 15px var(--neon-cyan-glow)';
        toast.innerText = msg;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new SSCMaxVocabEngine();
});