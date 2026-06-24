/**
 * ==========================================================================
 * SSC MAX VOCAB - PRODUCTION TELEGRAM MINI APP SUITE STANDARD FRAMEWORK
 * Architecture: Realtime Reactive State Machines, Native Telegram Haptics,
 * Structured Accordion Slicers, and Dynamic Secure Guarded Access Controls.
 * ==========================================================================
 */

// 1. Backend Core Credentials
const SUPABASE_URL = 'https://tbiktjhwdlwzrhwursxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaWt0amh3ZGx3enJod3Vyc3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzQ2MjYsImV4cCI6MjA5Nzg1MDYyNn0.aukjIOzRatuQCo_UgUir5WZX4uS2_CQ2t760VgRV-MA';

let supabase = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (err) {
    console.error("Critical Safety Backend Link Failure:", err);
}

// 2. State Management Machine
let state = {
    isPremium: false,
    isAdmin: false,
    currentUser: { id: null, name: 'SSC Aspirant', username: 'offline_mode', photo_url: '' },
    currentView: 'dashboard',
    activePremiumTab: 'topics',
    activeVaultTab: 'weak',
    searchQuery: '',
    weakWords: [],
    bookmarkedWords: [],
    quiz: {
        active: false,
        type: 'free', // 'free' | 'daily_premium' | 'topic'
        title: '',
        instructions: '',
        date: '',
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        isBookmarked: false,
        correctCount: 0,
        wrongCount: 0,
        timeSeconds: 0,
        timerInterval: null
    },
    cache: {
        topics: null,
        archives: null,
        leaderboard: null,
        premiumUsersList: null
    }
};

// 3. Main Application Controller Engine
class SSCMaxVocabEngine {
    constructor() {
        this.initDOMAnchors();
        this.spawnAmbientParticles();
        this.initTelegramConnection();
        this.registerNavigationBridges();
    }

    initDOMAnchors() {
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.viewContainer = document.getElementById('view-container');
        this.topicsListContainer = document.getElementById('premium-topics-list');
        this.archivesContainer = document.getElementById('premium-archives-container');
        this.vaultContainer = document.getElementById('vault-items-container');
        this.leaderboardContainer = document.getElementById('leaderboard-master-container');
        this.adminUsersListContainer = document.getElementById('admin-users-directory-node');
        
        // Quiz Core Binding Nodes
        this.optionsContainer = document.getElementById('question-options-container');
        this.btnNextQ = document.getElementById('btn-next-q');
        this.btnBookmarkCurrent = document.getElementById('btn-bookmark-current');

        if (this.btnNextQ) {
            this.btnNextQ.addEventListener('click', () => this.advanceQuizLoopSequence());
        }
    }

    spawnAmbientParticles() {
        const canvas = document.getElementById('ambient-particles');
        if (!canvas) return;
        for (let i = 0; i < 15; i++) {
            const part = document.createElement('div');
            part.className = 'ambient-micro-particle';
            part.style.left = `${Math.random() * 100}%`;
            part.style.animationDuration = `${15 + Math.random() * 20}s`;
            part.style.animationDelay = `${Math.random() * 10}s`;
            canvas.appendChild(part);
        }
    }

    initTelegramConnection() {
        const tg = window.Telegram?.WebApp;
        let uID = null, dName = 'SSC Aspirant', uName = 'offline_mode', pUrl = '';

        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
            
            const user = tg.initDataUnsafe?.user;
            if (user) {
                uID = user.id;
                dName = `${user.first_name} ${user.last_name || ''}`.trim();
                uName = user.username ? `@${user.username}` : `ID: ${user.id}`;
                pUrl = user.photo_url || '';
                
                if (pUrl) {
                    const img = document.getElementById('tg-user-avatar');
                    if (img) img.src = pUrl;
                }
            }
        }

        state.currentUser = { id: uID, name: dName, username: uName, photo_url: pUrl };
        
        document.getElementById('tg-user-name').innerText = dName;
        document.getElementById('tg-user-handle').innerText = uName;

        // Security Validation Access Verification Gate
        if (state.currentUser.id === 7603262906 || String(state.currentUser.id) === '7603262906') {
            state.isAdmin = true;
            const adminNav = document.getElementById('nav-anchor-admin-portal');
            const navDock = document.querySelector('.app-persistent-nav-dock');
            if (adminNav) {
                adminNav.style.display = 'flex';
                adminNav.classList.remove('hidden-admin-gate');
            }
            if (navDock) navDock.classList.add('has-admin');
            
            // Set dynamic inputs defaults in form blocks
            const today = new Date().toISOString().split('T')[0];
            if(document.getElementById('adm-free-date')) document.getElementById('adm-free-date').value = today;
            if(document.getElementById('adm-prem-date')) document.getElementById('adm-prem-date').value = today;
        }

        this.syncUserIdentityWithBackend();
    }

    registerNavigationBridges() {
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                this.switchView(target);
            });
        });
    }

    // --- VIEW EXECUTIVE ROUTER MATRIX ---
    switchView(viewId) {
        if (state.quiz.active && viewId !== 'quiz' && viewId !== 'quiz-details' && viewId !== 'result') {
            if (!confirm('An active vocabulary assessment is running. Discard progress?')) return;
            this.abortQuizContext();
        }

        document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
        this.navTabs.forEach(t => t.classList.remove('active'));

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) targetView.classList.add('active');

        const activeNav = document.querySelector(`.nav-tab[data-target="${viewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        state.currentView = viewId;
        this.triggerDeviceHaptic('select');

        // Route Pipeline Triggers
        if (viewId === 'vault') this.renderVaultEcosystem();
        if (viewId === 'ranks') this.renderGlobalLeaderboard();
        if (viewId === 'admin') this.loadAdminUsersDirectory();
    }

    triggerDeviceHaptic(type) {
        const hp = window.Telegram?.WebApp?.HapticFeedback;
        if (!hp) return;
        try {
            if (type === 'select') hp.selectionChanged();
            if (type === 'correct') hp.notificationOccurred('success');
            if (type === 'wrong') hp.notificationOccurred('error');
            if (type === 'finalize') hp.notificationOccurred('warning');
        } catch(e){}
    }

    triggerToastNotification(msg) {
        const old = document.getElementById('app-runtime-toast');
        if (old) old.remove();

        const toast = document.createElement('div');
        toast.id = 'app-runtime-toast';
        toast.style.cssText = `
            position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
            background: rgba(11, 15, 36, 0.95); border: 1px solid var(--neon-cyan);
            color: #fff; padding: 10px 20px; border-radius: 30px; font-size: 0.8rem;
            font-weight: 700; z-index: 9999; box-shadow: 0 0 15px var(--neon-cyan-glow);
            pointer-events: none;
        `;
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    }

    // --- IDENTITY RECONCILIATION GATEWAYS ---
    async syncUserIdentityWithBackend() {
        if (!supabase || !state.currentUser.id) return;
        try {
            await supabase.from('users').upsert({
                telegram_id: state.currentUser.id,
                username: state.currentUser.username,
                first_name: state.currentUser.name,
                photo_url: state.currentUser.photo_url,
                joined_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });

            const { data: premiumCheck } = await supabase
                .from('premium_users')
                .select('telegram_id')
                .eq('telegram_id', state.currentUser.id)
                .maybeSingle();

            state.isPremium = !!premiumCheck;
            this.reframeVisualTierIndicators(state.isPremium);
            this.syncVaultCollectionCache();
        } catch (err) {
            console.error("Identity synchronization error:", err);
        }
    }

    reframeVisualTierIndicators(premiumFlag) {
        const badge = document.getElementById('header-tier-indicator');
        if (!badge) return;
        if (premiumFlag) {
            badge.className = 'tier-status-badge elite-tier';
            badge.innerHTML = `<i class="fa-solid fa-crown"></i> Elite Member`;
        } else {
            badge.className = 'tier-status-badge free-tier';
            badge.innerHTML = `<i class="fa-solid fa-user"></i> Free User`;
        }
    }

    triggerPremiumPaywallGate(contextMessage = "Unlock Premium Membership") {
        const text = encodeURIComponent(`Hello, I want to activate Premium Access for my account ID: ${state.currentUser.id || 'N/A'}. Context: ${contextMessage}`);
        window.open(`https://t.me/jangra854x?text=${text}`, '_blank');
    }

    // --- PREMIUM SUB-EXPLORER CONTENT ROUTINES ---
    switchPremiumTab(tabId, btn) {
        document.querySelectorAll('.premium-subview-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        
        document.getElementById(`prem-sub-${tabId}`).classList.add('active');
        btn.classList.add('active');
        state.activePremiumTab = tabId;
        this.triggerDeviceHaptic('select');
    }

    async fetchPremiumMetadata() {
        if (!supabase) return;
        if (this.topicsListContainer) this.topicsListContainer.innerHTML = `<div class="skeleton-strip-line"></div><div class="skeleton-strip-line"></div>`;

        try {
            if (!state.cache.topics) {
                const { data: qData } = await supabase.from('questions').select('category, id').eq('type', 'topic');
                
                // Process mathematical buckets logic maps arrays
                let grouped = {};
                (qData || []).forEach(q => {
                    if(!grouped[q.category]) grouped[q.category] = 0;
                    grouped[q.category]++;
                });

                state.cache.topics = Object.keys(grouped).map(cat => ({
                    title: cat,
                    totalQuestions: grouped[cat]
                }));
            }

            if (!state.cache.archives) {
                const { data: arcData } = await supabase.from('quizzes')
                    .select('title, date')
                    .eq('type', 'daily_premium')
                    .order('date', { ascending: false });
                state.cache.archives = arcData || [];
            }

            this.renderPremiumTopicsGrid(state.cache.topics);
            this.renderPremiumArchivesAccordion(state.cache.archives);
        } catch (e) {
            console.error(e);
        }
    }

    renderPremiumTopicsGrid(topics) {
        if (!this.topicsListContainer) return;
        if (topics.length === 0) {
            this.topicsListContainer.innerHTML = `<div class="empty-state-card"><i class="fa-solid fa-folder-open"></i><p>No topic configurations discovered.</p></div>`;
            return;
        }

        this.topicsListContainer.innerHTML = topics.map(t => {
            const setSlicesCount = Math.ceil(t.totalQuestions / 20);
            let setsHTML = '';
            
            for(let i = 0; i < setSlicesCount; i++) {
                const startRange = (i * 20) + 1;
                const endRange = Math.min((i + 1) * 20, t.totalQuestions);
                setsHTML += `
                    <div class="archive-inline-row" onclick="app.prepareQuizBlueprint('topic', '${t.title}', 'Set ${i+1} (${startRange}-${endRange})', ${startRange}, ${endRange})">
                        <span class="archive-date-lbl"><i class="fa-solid fa-layer-group text-muted mr-2"></i> Set ${i+1} (${startRange}-${endRange})</span>
                        <div class="d-flex align-items-center">
                            <small class="text-muted" style="font-size:0.75rem; margin-right:8px;">20 Qs</small>
                            <i class="fa-solid ${state.isPremium ? 'fa-circle-play text-accent-cyan' : 'fa-lock text-gold'}" style="font-size:0.9rem;"></i>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="glass-element p-3" style="border-radius:12px;">
                    <h5 style="font-size:0.95rem; font-weight:700; margin-bottom:8px; color:var(--neon-cyan);">${t.title}</h5>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${setsHTML}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderPremiumArchivesAccordion(archives) {
        if (!this.archivesContainer) return;
        if (archives.length === 0) {
            this.archivesContainer.innerHTML = `<div class="empty-state-card"><i class="fa-solid fa-calendar-xmark"></i><p>No premium archives logged.</p></div>`;
            return;
        }

        // Map calendar keys tracking values arrays
        let monthsTree = {};
        archives.forEach(arc => {
            if(!arc.date) return;
            const dObj = new Date(arc.date);
            const labelMonth = dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // Ex: "June 2026"
            if (!monthsTree[labelMonth]) monthsTree[labelMonth] = [];
            monthsTree[labelMonth].push(arc);
        });

        this.archivesContainer.innerHTML = Object.keys(monthsTree).map(monthKey => {
            const childrenHTML = monthsTree[monthKey].map(item => {
                const dayLabel = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // Ex: "June 24"
                return `
                    <div class="archive-inline-row" onclick="app.prepareQuizBlueprint('daily_premium', '${item.title}', '${item.title}', null, null, '${item.date}')">
                        <span class="archive-date-lbl">${dayLabel} - Evaluation Mix</span>
                        <i class="fa-solid ${state.isPremium ? 'fa-circle-play text-accent-cyan' : 'fa-lock text-gold'}"></i>
                    </div>
                `;
            }).join('');

            return `
                <div class="accordion-month-block glass-element">
                    <button class="accordion-trigger-header" onclick="this.parentElement.classList.toggle('open')">
                        <span><i class="fa-regular fa-calendar-check text-muted" style="margin-right:8px;"></i> ${monthKey}</span>
                        <i class="fa-solid fa-chevron-down chevron-rot"></i>
                    </button>
                    <div class="accordion-content-panel">
                        ${childrenHTML}
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- QUIZ ENGINE BUSINESS LOGIC ---
    async loadFreeQuizDirect() {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('quizzes').select('*').eq('type', 'free').order('date', { ascending: false }).limit(1).maybeSingle();
            if (error || !data) return alert("No active Daily Free Quiz found in verification system records.");
            this.prepareQuizBlueprint('free', data.title, 'Daily Diagnostics Pool', null, null, data.date, data.instructions);
        } catch(e){ console.error(e); }
    }

    prepareQuizBlueprint(type, title, subsetLabel = '', offsetStart = null, offsetEnd = null, targetDate = '', instructions = '') {
        state.quiz.type = type;
        state.quiz.title = title;
        state.quiz.instructions = instructions || "Comprehensive text configuration evaluation sequence running zero negative deductions frameworks patterns.";
        state.quiz.date = targetDate || new Date().toISOString().split('T')[0];
        
        // Context Range Attachment Maps
        state.quiz.offsetStart = offsetStart;
        state.quiz.offsetEnd = offsetEnd;

        document.getElementById('qd-subtitle').innerText = `${title} ${subsetLabel ? '- ' + subsetLabel : ''}`;
        document.getElementById('qd-date').innerText = new Date(state.quiz.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        
        const qCount = type === 'daily_premium' ? 100 : (type === 'topic' ? 20 : 30);
        document.getElementById('qd-count').innerText = `${qCount} Questions`;
        
        const rStatus = type === 'daily_premium' ? "Ranked Session (Results synchronize automatically to Live Global Leaderboard Grid)" : "Practice Assessment Environment Frame";
        document.getElementById('qd-rank-status').innerText = rStatus;

        const actionZone = document.getElementById('blueprint-action-zone');
        if (actionZone) {
            if (type !== 'free' && !state.isPremium) {
                actionZone.innerHTML = `
                    <div class="paywall-locked-gate-shield">
                        <i class="fa-solid fa-lock-open"></i>
                        <h4>Premium Credentials Required</h4>
                        <p>This track remains guarded. Tap below to acquire explicit subscription clearance access tiers.</p>
                        <button class="btn-gold-gradient w-100" onclick="app.triggerPremiumPaywallGate('Unlock ${title}')">
                            <i class="fa-solid fa-crown"></i> Activate Premium Tier
                        </button>
                    </div>
                `;
            } else {
                actionZone.innerHTML = `
                    <button class="btn-primary-gradient w-100 py-3" id="btn-confirm-start-quiz" onclick="app.executeQuizSessionEngine()">
                        <i class="fa-solid fa-play-circle"></i> INITIALIZE ASSESSMENT SEQUENCE
                    </button>
                `;
            }
        }

        this.switchView('quiz-details');
    }

    async executeQuizSessionEngine() {
        const btn = document.getElementById('btn-confirm-start-quiz');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Linking Clusters...`;
        }

        try {
            state.quiz.questions = await this.queryQuestionsDatasetPayload();
            if (state.quiz.questions.length === 0) {
                alert("Target repository empty or synchronization link severed.");
                this.switchView('dashboard');
                return;
            }

            state.quiz.active = true;
            state.quiz.currentIndex = 0;
            state.quiz.correctCount = 0;
            state.quiz.wrongCount = 0;
            state.quiz.timeSeconds = 0;

            document.getElementById('quiz-title-display').innerText = state.quiz.title;
            this.switchView('quiz');
            this.kickstartStopwatchTracker();
            this.renderActiveQuestionToSandbox();
        } catch (e) {
            console.error(e);
            alert("Execution fault running remote queries.");
            this.switchView('dashboard');
        }
    }

    async queryQuestionsDatasetPayload() {
        if (!supabase) return [];
        
        if (state.quiz.type === 'topic') {
            const { data } = await supabase.from('questions')
                .select('category, text, options, "correctIndex", explanations')
                .eq('type', 'topic')
                .eq('category', state.quiz.title)
                .order('id', { ascending: true });
            
            if(!data || data.length === 0) return [];
            
            // Slice array based on offset markers configurations blocks
            const startIdx = state.quiz.offsetStart - 1;
            const endIdx = state.quiz.offsetEnd;
            return data.slice(startIdx, endIdx);
        } else {
            // Free and Premium Daily tracks draw configurations records sets maps
            const { data } = await supabase.from('questions')
                .select('category, text, options, "correctIndex", explanations')
                .eq('type', state.quiz.type)
                .eq('category', state.quiz.type === 'free' ? 'Daily Free' : 'Premium Mix');
            return data || [];
        }
    }

    kickstartStopwatchTracker() {
        clearInterval(state.quiz.timerInterval);
        const el = document.getElementById('quiz-stopwatch');
        const format = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
        
        if (el) el.innerText = format(0);
        state.quiz.timerInterval = setInterval(() => {
            state.quiz.timeSeconds++;
            if (el) el.innerText = format(state.quiz.timeSeconds);
        }, 1000);
    }

    renderActiveQuestionToSandbox() {
        const q = state.quiz.questions[state.quiz.currentIndex];
        state.quiz.selectedOption = null;
        state.quiz.isBookmarked = false;

        if (this.btnBookmarkCurrent) {
            this.btnBookmarkCurrent.className = 'btn-action-pill';
            this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
        }
        if (this.btnNextQ) this.btnNextQ.classList.add('hidden');
        if (this.optionsContainer) this.optionsContainer.classList.remove('locked');

        const total = state.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText = `Question ${state.quiz.currentIndex + 1} of ${total}`;
        if (document.getElementById('quiz-progress-fill')) {
            document.getElementById('quiz-progress-fill').style.width = `${((state.quiz.currentIndex) / total) * 100}%`;
        }

        document.getElementById('question-category-tag').innerText = q.category || 'Vocabulary Matrix';
        document.getElementById('question-text-body').innerText = q.text;

        const alphabet = ['A', 'B', 'C', 'D'];
        if (this.optionsContainer) {
            this.optionsContainer.innerHTML = q.options.map((opt, i) => `
                <div class="option-wrapper">
                    <div class="option-node" onclick="app.commitAnswerSelectionValidation(${i})">
                        <span><strong>${alphabet[i]}.</strong> ${opt}</span>
                        <div class="option-indicator"></div>
                    </div>
                    <div class="option-explanation-box hidden" id="exp-bubble-${i}">
                        <i class="fa-solid fa-circle-info mr-1"></i> ${q.explanations && q.explanations[i] ? q.explanations[i] : 'No documentation map available for this item.'}
                    </div>
                </div>
            `).join('');
        }
    }

    commitAnswerSelectionValidation(idx) {
        if (state.quiz.selectedOption !== null) return;
        state.quiz.selectedOption = idx;
        
        if (this.optionsContainer) this.optionsContainer.classList.add('locked');
        
        const q = state.quiz.questions[state.quiz.currentIndex];
        const hit = (idx === q.correctIndex);

        if (hit) {
            state.quiz.correctCount++;
            this.triggerDeviceHaptic('correct');
        } else {
            state.quiz.wrongCount++;
            this.triggerDeviceHaptic('wrong');
            this.routeFailedWordToVaultEcosystem(q);
        }

        const items = this.optionsContainer.querySelectorAll('.option-node');
        items.forEach((node, i) => {
            const exp = document.getElementById(`exp-bubble-${i}`);
            if (exp) exp.classList.remove('hidden');

            if (i === q.correctIndex) {
                node.classList.add('correct');
                if (exp) exp.className = 'option-explanation-box expl-correct';
            } else if (i === idx) {
                node.classList.add('incorrect');
                if (exp) exp.className = 'option-explanation-box expl-incorrect';
            } else {
                if (exp) exp.className = 'option-explanation-box expl-incorrect';
            }
        });

        if (this.btnNextQ) this.btnNextQ.classList.remove('hidden');
    }

    advanceQuizLoopSequence() {
        state.quiz.currentIndex++;
        if (state.quiz.currentIndex < state.quiz.questions.length) {
            this.renderActiveQuestionToSandbox();
        } else {
            this.compileFinalAssessmentReport();
        }
    }

    async toggleBookmarkCurrentQuestion() {
        if (!supabase || !state.currentUser.id) return;
        const q = state.quiz.questions[state.quiz.currentIndex];
        const keyword = q.options[q.correctIndex].replace(/^[A-D][\.\)]\s*/i, '').split(/[:,-]/)[0].trim();
        const explText = (q.explanations && q.explanations[q.correctIndex]) || q.text;

        state.quiz.isBookmarked = !state.quiz.isBookmarked;
        
        if (state.quiz.isBookmarked) {
            if (this.btnBookmarkCurrent) {
                this.btnBookmarkCurrent.className = 'btn-action-pill bookmarked';
                this.btnBookmarkCurrent.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
            }
            this.triggerToastNotification(`Saved "${keyword}" to Vault.`);

            if (!state.bookmarkedWords.find(w => w.word.toLowerCase() === keyword.toLowerCase())) {
                state.bookmarkedWords.push({ word: keyword, meaning: explText });
                await supabase.from('vault').insert({
                    telegram_id: state.currentUser.id,
                    word: keyword,
                    category: 'bookmarked',
                    saved_at: new Date().toISOString()
                });
            }
        } else {
            if (this.btnBookmarkCurrent) {
                this.btnBookmarkCurrent.className = 'btn-action-pill';
                this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
            }
            state.bookmarkedWords = state.bookmarkedWords.filter(w => w.word.toLowerCase() !== keyword.toLowerCase());
            await supabase.from('vault').delete()
                .eq('telegram_id', state.currentUser.id)
                .eq('word', keyword)
                .eq('category', 'bookmarked');
        }
    }

    async routeFailedWordToVaultEcosystem(q) {
        if (!supabase || !state.currentUser.id) return;
        const keyword = q.options[q.correctIndex].replace(/^[A-D][\.\)]\s*/i, '').split(/[:,-]/)[0].trim();
        const explText = (q.explanations && q.explanations[q.correctIndex]) || q.text;

        if (!state.weakWords.find(w => w.word.toLowerCase() === keyword.toLowerCase())) {
            state.weakWords.push({ word: keyword, meaning: explText });
            await supabase.from('vault').insert({
                telegram_id: state.currentUser.id,
                word: keyword,
                category: 'weak',
                saved_at: new Date().toISOString()
            });
        }
    }

    async compileFinalAssessmentReport() {
        clearInterval(state.quiz.timerInterval);
        state.quiz.active = false;
        this.triggerDeviceHaptic('finalize');

        const total = state.quiz.questions.length;
        const ratio = ((state.quiz.correctCount / total) * 100).toFixed(1);

        document.getElementById('res-score').innerText = `${state.quiz.correctCount} / ${total}`;
        document.getElementById('res-accuracy').innerText = `${ratio}%`;
        document.getElementById('res-correct').innerText = state.quiz.correctCount;
        document.getElementById('res-wrong').innerText = state.quiz.wrongCount;
        document.getElementById('res-time').innerText = `${Math.floor(state.quiz.timeSeconds/60)}m ${state.quiz.timeSeconds%60}s`;
        
        document.getElementById('res-tier-badge').innerText = ratio >= 90 ? "👑 ELITE PROFICIENCY RECORD" : "⚡ STANDARD SESSION ACCURACY";

        if (state.quiz.type === 'daily_premium' && state.currentUser.id && supabase) {
            try {
                await supabase.from('leaderboard').insert({
                    telegram_id: state.currentUser.id,
                    name: state.currentUser.name,
                    score: state.quiz.correctCount,
                    time_seconds: state.quiz.timeSeconds,
                    date: new Date().toISOString().split('T')[0]
                });
                state.cache.leaderboard = null; // Purge out stale caches structures configurations maps
            } catch(e) { console.error(e); }
        }

        this.switchView('result');
    }

    abortQuizContext() {
        clearInterval(state.quiz.timerInterval);
        state.quiz.active = false;
        this.switchView('dashboard');
    }

    // --- RANKS ECOLOGY COMPONENT ---
    async renderGlobalLeaderboard() {
        if (!this.leaderboardContainer) return;
        const subtitle = document.getElementById('leaderboard-date-subtitle');
        if (subtitle) subtitle.innerText = `Standings Cycle: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}`;

        this.leaderboardContainer.innerHTML = `<div class="skeleton-strip-line"></div><div class="skeleton-strip-line"></div>`;

        if (!supabase) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            if (!state.cache.leaderboard) {
                const { data } = await supabase.from('leaderboard')
                    .select('*')
                    .eq('date', today)
                    .order('score', { ascending: false })
                    .order('time_seconds', { ascending: true })
                    .limit(10);
                state.cache.leaderboard = data || [];
            }

            const rows = state.cache.leaderboard;
            if (rows.length === 0) {
                this.leaderboardContainer.innerHTML = `<div class="empty-state-card"><i class="fa-solid fa-users-slash"></i><p>No score logs recorded for this loop cycle yet.</p></div>`;
                return;
            }

            let html = '<div class="d-flex flex-column gap-2" style="width:100%;">';
            rows.forEach((row, idx) => {
                const topClass = idx < 3 ? `top-3 rank-${idx+1}` : '';
                html += `
                    <div class="leader-row glass-element card-animation-swap">
                        <div class="leader-meta">
                            <span class="leader-num ${topClass}">#${idx+1}</span>
                            <span class="leader-name">${row.name || 'Anonymous Aspirant'}</span>
                        </div>
                        <div class="leader-scores">
                            <div class="leader-score-pts">${row.score} Hits</div>
                            <div class="leader-score-time">${Math.floor(row.time_seconds/60)}m ${row.time_seconds%60}s</div>
                        </div>
                    </div>
                `;
            });

            // Handle Pinned User Rank Position Calculations Out-Of-Bounds
            const myMatchIdx = rows.findIndex(r => r.telegram_id === state.currentUser.id);
            if (myMatchIdx === -1 && state.currentUser.id) {
                // Verify if record exists lower in DB records entries
                const { data: myFringeRecord } = await supabase.from('leaderboard')
                    .select('*')
                    .eq('date', today)
                    .eq('telegram_id', state.currentUser.id)
                    .maybeSingle();

                if (myFringeRecord) {
                    html += `
                        <div class="leader-row glass-element user-pinned-rank">
                            <div class="leader-meta">
                                <span class="leader-num"><i class="fa-solid fa-user-pin"></i></span>
                                <span class="leader-name">Your Record (Pinned)</span>
                            </div>
                            <div class="leader-scores">
                                <div class="leader-score-pts">${myFringeRecord.score} Hits</div>
                                <div class="leader-score-time">${Math.floor(myFringeRecord.time_seconds/60)}m ${myFringeRecord.time_seconds%60}s</div>
                            </div>
                        </div>
                    `;
                }
            }
            html += '</div>';
            this.leaderboardContainer.innerHTML = html;
        } catch(e) { console.error(e); }
    }

    // --- VAULT SUBSYSTEM MANAGEMENT ---
    async syncVaultCollectionCache() {
        if (!supabase || !state.currentUser.id) return;
        try {
            const { data } = await supabase.from('vault').select('*').eq('telegram_id', state.currentUser.id);
            if (data) {
                // Resolve words lists mapping array structures safely
                state.weakWords = data.filter(w => w.category === 'weak').map(w => ({ word: w.word, meaning: 'Review needed for vocabulary query tracking blocks context.' }));
                state.bookmarkedWords = data.filter(w => w.category === 'bookmarked').map(w => ({ word: w.word, meaning: 'Explicit saved bookmark reference.' }));
            }
        } catch(e){ console.error(e); }
    }

    switchVaultTab(tabKey) {
        state.activeVaultTab = tabKey;
        document.querySelectorAll('.vault-tab-btn').forEach(b => b.classList.remove('active'));
        if (window.event) window.event.currentTarget.classList.add('active');
        this.renderVaultEcosystem();
    }

    filterVaultContent() {
        const el = document.getElementById('vault-search-input');
        state.searchQuery = el ? el.value.toLowerCase().trim() : '';
        this.renderVaultEcosystem();
    }

    renderVaultEcosystem() {
        if (!this.vaultContainer) return;
        let pool = state.activeVaultTab === 'bookmarked' ? state.bookmarkedWords : state.weakWords;

        if (state.searchQuery) {
            pool = pool.filter(w => w.word.toLowerCase().includes(state.searchQuery));
        }

        document.getElementById('count-weak').innerText = state.weakWords.length;
        document.getElementById('count-bookmarked').innerText = state.bookmarkedWords.length;

        if (pool.length === 0) {
            this.vaultContainer.innerHTML = `
                <div class="empty-state-card glass-element" style="border-radius:12px; margin-top:10px;">
                    <i class="fa-solid fa-bezier-curve"></i>
                    <p>Repository workspace clear.</p>
                </div>
            `;
            return;
        }

        this.vaultContainer.innerHTML = pool.map(item => `
            <div class="vault-word-card glass-element card-animation-swap">
                <div class="v-header-row">
                    <h4>${item.word}</h4>
                    <button class="btn-delete-word" onclick="app.purgeWordFromVault('${item.word}')">
                        <i class="fa-solid fa-trash-arrow-up"></i> Clear
                    </button>
                </div>
                <p class="v-meaning">${item.meaning}</p>
            </div>
        `).join('');
    }

    async purgeWordFromVault(wordStr) {
        const cat = state.activeVaultTab;
        if (cat === 'bookmarked') {
            state.bookmarkedWords = state.bookmarkedWords.filter(w => w.word.toLowerCase() !== wordStr.toLowerCase());
        } else {
            state.weakWords = state.weakWords.filter(w => w.word.toLowerCase() !== wordStr.toLowerCase());
        }
        
        this.renderVaultEcosystem();
        this.triggerDeviceHaptic('select');

        if (supabase && state.currentUser.id) {
            await supabase.from('vault').delete()
                .eq('telegram_id', state.currentUser.id)
                .eq('word', wordStr)
                .eq('category', cat);
        }
    }

    // --- ADMIN PANEL CONTROLLER SECTION ---
    switchAdminTab(id, tabBtn) {
        document.querySelectorAll('.adm-sec-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.admin-tab-pill').forEach(b => b.classList.remove('active'));
        
        document.getElementById(`adm-sec-${id}`).classList.add('active');
        tabBtn.classList.add('active');
        this.triggerDeviceHaptic('select');
    }

    parseCentralQuestionsBlock(rawText, type, category) {
        const structuralChunks = rawText.replace(/\r\n/g, '\n').split(/\n(?=\d+[\.\)])/);
        const compiledRecords = [];

        for (let chunk of structuralChunks) {
            const lines = chunk.trim().split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 6) continue;

            const qText = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
            const options = [];
            let ansChar = 'A';
            let explanation = 'Core study data definition reference.';

            for (let i = 1; i < lines.length; i++) {
                const ln = lines[i];
                if (/^[A-D][\.\)]\s*/i.test(ln)) {
                    options.push(ln.replace(/^[A-D][\.\)]\s*/i, '').trim());
                } else if (/^Answer:\s*/i.test(ln)) {
                    ansChar = ln.replace(/^Answer:\s*/i, '').trim().toUpperCase().charAt(0);
                } else if (/^Explanation:\s*/i.test(ln)) {
                    explanation = ln.replace(/^Explanation:\s*/i, '').trim();
                }
            }

            if (options.length >= 4 && qText) {
                const mapper = { 'A':0, 'B':1, 'C':2, 'D':3 };
                const correctIdx = mapper[ansChar] !== undefined ? mapper[ansChar] : 0;
                
                // Explanations array matching structural configuration indices
                const expArray = ['', '', '', ''];
                expArray[correctIdx] = explanation;

                compiledRecords.push({
                    type: type,
                    category: category,
                    text: qText,
                    options: options.slice(0, 4),
                    correctIndex: correctIdx,
                    explanations: expArray
                });
            }
        }
        return compiledRecords;
    }

    async publishAdminFreeQuiz() {
        const date = document.getElementById('adm-free-date').value;
        const inst = document.getElementById('adm-free-inst').value || 'Daily Diagnostic Evaluation Sequence Track.';
        const text = document.getElementById('adm-free-txt').value;

        if (!text.trim()) return alert("Payload input tracking field blank.");
        const parsed = this.parseCentralQuestionsBlock(text, 'free', 'Daily Free');
        
        if (parsed.length === 0) return alert("Questions compilation error. Verify numbering format constraints.");

        try {
            // Delete old configurations entries preserving singular deployment state parameters
            await supabase.from('quizzes').delete().eq('type', 'free');
            await supabase.from('questions').delete().eq('type', 'free');

            await supabase.from('quizzes').insert({ title: `Daily Free Quiz - ${date}`, type: 'free', date: date, instructions: inst });
            await supabase.from('questions').insert(parsed);

            alert(`Successfully initialized singular track sequence. Logged ${parsed.length} items.`);
            document.getElementById('adm-free-txt').value = '';
        } catch(e){ alert(e.message); }
    }

    async publishAdminPremiumQuiz() {
        const date = document.getElementById('adm-prem-date').value;
        const text = document.getElementById('adm-prem-txt').value;

        if (!text.trim()) return alert("Payload processing field empty.");
        const parsed = this.parseCentralQuestionsBlock(text, 'daily_premium', 'Premium Mix');
        
        if (parsed.length === 0) return alert("Structural data processing extraction failure.");

        try {
            // Insert tracking identity keys indexes
            await supabase.from('quizzes').upsert({ title: `Daily Premium Mix - ${date}`, type: 'daily_premium', date: date }, { onConflict: 'title' });
            await supabase.from('questions').insert(parsed);

            alert(`Successfully posted premium array deck sequence layout. Logged ${parsed.length} entries.`);
            document.getElementById('adm-prem-txt').value = '';
            state.cache.archives = null; // Clear out cached lists indexes structures
        } catch(e) { alert(e.message); }
    }

    async publishAdminTopicDeck() {
        const topic = document.getElementById('adm-topic-sel').value;
        const text = document.getElementById('adm-topic-txt').value;

        if (!text.trim()) return alert("Text input parsing space empty.");
        const parsed = this.parseCentralQuestionsBlock(text, 'topic', topic);
        
        if (parsed.length === 0) return alert("Compilation tokenizer fault running mapping blocks.");

        try {
            await supabase.from('quizzes').upsert({ title: topic, type: 'topic', date: new Date().toISOString().split('T')[0] }, { onConflict: 'title' });
            await supabase.from('questions').insert(parsed);

            alert(`Successfully annexed ${parsed.length} structural queries to system category: ${topic}`);
            document.getElementById('adm-topic-txt').value = '';
            state.cache.topics = null; // Purge outdated tracking tree array pointers caches
        } catch(e){ alert(e.message); }
    }

    async loadAdminUsersDirectory() {
        if (!state.isAdmin || !this.adminUsersListContainer || !supabase) return;
        this.adminUsersListContainer.innerHTML = `<div class="skeleton-strip-line"></div>`;

        try {
            const { data } = await supabase.from('premium_users').select('*').order('added_at', { ascending: false });
            state.cache.premiumUsersList = data || [];
            
            if (state.cache.premiumUsersList.length === 0) {
                this.adminUsersListContainer.innerHTML = `<small class="text-muted p-2 d-block">No verified premium accounts currently deployed.</small>`;
                return;
            }

            this.adminUsersListContainer.innerHTML = state.cache.premiumUsersList.map(u => `
                <div class="adm-user-row card-animation-swap">
                    <div class="adm-user-info">
                        <span>${u.name || 'Premium Aspirant'}</span>
                        <small>ID: ${u.telegram_id}</small>
                    </div>
                    <button class="adm-user-del-btn" onclick="app.adminRevokePremium('${u.telegram_id}')">
                        <i class="fa-solid fa-user-xmark"></i>
                    </button>
                </div>
            `).join('');
        } catch(e){ console.error(e); }
    }

    async adminGrantPremium() {
        const idInput = document.getElementById('adm-user-tgid').value.trim();
        const nameInput = document.getElementById('adm-user-name').value.trim() || 'Elite User Link';

        if (!idInput) return alert("Telegram reference account string blank.");
        const numID = parseInt(idInput);

        try {
            await supabase.from('premium_users').upsert({ telegram_id: numID, name: nameInput, added_at: new Date().toISOString() }, { onConflict: 'telegram_id' });
            alert(`Authorized subscription structural changes configuration maps to ID: ${numID}`);
            
            document.getElementById('adm-user-tgid').value = '';
            document.getElementById('adm-user-name').value = '';
            this.loadAdminUsersDirectory();
        } catch(e){ alert(e.message); }
    }

    async adminRevokePremium(targetID) {
        if (!confirm(`Revoke premium subscription clearances from tier holder ID: ${targetID}?`)) return;
        try {
            await supabase.from('premium_users').delete().eq('telegram_id', parseInt(targetID));
            alert("Clearances reset completed successfully.");
            this.loadAdminUsersDirectory();
        } catch(e){ alert(e.message); }
    }
}

// 4. Dom Content Tree Ready Initialization Loop Setup Hook Anchor
window.addEventListener('DOMContentLoaded', () => {
    window.app = new SSCMaxVocabEngine();
});