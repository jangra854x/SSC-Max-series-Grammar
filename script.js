// script.js
"use strict";

const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Expecting configured build pipeline injection
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Expecting configured build pipeline injection

// Initialize client if constants are replaced in production setup
const supabaseClient = (SUPABASE_URL && !SUPABASE_URL.includes('YOUR_')) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

const appState = {
    currentView: 'dashboard',
    currentUser: { id: null, name: 'Guest Explorer', username: '', photo_url: '' },
    isPremium: false,
    quiz: {
        active: false,
        type: null,
        title: null,
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        correctCount: 0,
        wrongCount: 0,
        timeSeconds: 0,
        stopwatchInterval: null,
        isBookmarked: false
    },
    weakWords: [],
    bookmarkedWords: [],
    activeVaultTab: 'weak',
    searchQuery: '',
    cache: {
        questions: { free: [], topic: [], daily_premium: [] },
        topics: null,
        archives: null,
        leaderboard: null
    }
};

class SSCMaxVocabEngine {
    constructor() {
        this.initDOMSelectors();
        this.initTelegramContext();
        this.bindEvents();
    }

    initDOMSelectors() {
        // Core Layout
        this.viewContainer = document.getElementById('view-container');
        this.navTabs = document.querySelectorAll('.nav-tab');
        
        // Buttons
        this.btnStartQuizConfirm = document.getElementById('btn-start-quiz-confirm');
        this.btnBookmarkCurrent = document.getElementById('btn-bookmark-current');
        this.btnNextQ = document.getElementById('btn-next-q');
        
        // Quiz Containers
        this.quizFrame = document.getElementById('quiz-frame');
        this.optionsContainer = document.getElementById('question-options-container');
        
        // Data Containers
        this.vaultItemsContainer = document.getElementById('vault-items-container');
        this.leaderboardContainer = document.getElementById('leaderboard-container');
        this.premiumTopicsList = document.getElementById('premium-topics-list');
        this.premiumArchivesContainer = document.getElementById('premium-archives-container');
    }

    bindEvents() {
        // Static binds setup if needed. Dynamic binds handled inline via onclick.
    }

    // --- TELEGRAM & AUTHENTICATION ---
    async initTelegramContext() {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            try { tg.disableVerticalSwipes(); } catch(e){} // Method might not exist in older TG clients
            
            const user = tg.initDataUnsafe?.user;
            if (user) {
                appState.currentUser.id = user.id.toString();
                appState.currentUser.name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                appState.currentUser.username = user.username || '';
                appState.currentUser.photo_url = user.photo_url || '';
            }
        } else {
            // Dev Fallback for browser testing
            appState.currentUser.id = '7603262906';
            appState.currentUser.name = 'Dev Admin';
            appState.currentUser.username = 'devadmin';
        }

        // Setup Admin Nav if ID matches
        if (appState.currentUser.id === '7603262906') {
            document.getElementById('nav-tab-admin').classList.remove('hidden');
        }

        await this.syncSupabaseUser();
    }

    async syncSupabaseUser() {
        if (!supabaseClient) {
            this.handleProfileLoadFallback();
            return;
        }

        // Loading fallback timeout (4 seconds)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 4000)
        );

        const fetchLogic = async () => {
            // Check existing profile to prevent premium overwrite bug
            const { data: existingUser } = await supabaseClient
                .from('users')
                .select('premium')
                .eq('telegram_id', appState.currentUser.id)
                .single();

            const isCurrentPremium = existingUser ? existingUser.premium : false;

            await supabaseClient.from('users').upsert({
                telegram_id: appState.currentUser.id,
                username: appState.currentUser.username,
                first_name: appState.currentUser.name,
                photo_url: appState.currentUser.photo_url,
                premium: isCurrentPremium,
                joined_at: existingUser ? undefined : new Date().toISOString()
            }, { onConflict: 'telegram_id' });

            // Verify explicit Premium Table grant
            const { data: premiumCheck } = await supabaseClient
                .from('premium_users')
                .select('telegram_id')
                .eq('telegram_id', appState.currentUser.id)
                .single();

            appState.isPremium = !!premiumCheck;

            // Fetch background data
            await Promise.all([
                this.fetchVaultData(),
                this.fetchPremiumMetadata()
            ]);
        };

        try {
            await Promise.race([fetchLogic(), timeoutPromise]);
            this.updateHeaderDisplay();
        } catch (e) {
            console.error("Profile Sync Network Error / Timeout:", e);
            this.handleProfileLoadFallback();
        }
    }

    handleProfileLoadFallback() {
        // Fallback to minimal data to avoid infinite load screen
        appState.isPremium = false;
        this.updateHeaderDisplay();
    }

    updateHeaderDisplay() {
        // Hide Skeleton, Show Content
        document.getElementById('profile-skeleton').classList.add('hidden');
        document.getElementById('profile-content').classList.remove('hidden');

        document.getElementById('tg-user-avatar').src = appState.currentUser.photo_url || 'https://via.placeholder.com/150/1c2128/00f0ff?text=U';
        document.getElementById('tg-user-name').innerText = appState.currentUser.name || 'Explorer';
        document.getElementById('tg-user-handle').innerText = appState.currentUser.username ? `@${appState.currentUser.username}` : `ID: ${appState.currentUser.id}`;

        const badge = document.getElementById('header-tier-indicator');
        if (appState.isPremium) {
            badge.innerHTML = `<i class="fa-solid fa-crown text-gold"></i> Elite Member`;
            badge.classList.add('elite');
            document.body.classList.add('premium-enhanced');
        } else {
            badge.innerHTML = `<i class="fa-solid fa-user"></i> Free User`;
            badge.classList.remove('elite');
            document.body.classList.remove('premium-enhanced');
        }
    }

    triggerHaptic(type) {
        if (!window.Telegram?.WebApp?.HapticFeedback) return;
        const haptic = window.Telegram.WebApp.HapticFeedback;
        if (type === 'select') haptic.selectionChanged();
        if (type === 'correct') haptic.notificationOccurred('success');
        if (type === 'wrong') haptic.notificationOccurred('error');
        if (type === 'result') haptic.notificationOccurred('warning');
    }

    // --- NAVIGATION FLOW ---
    switchView(viewId) {
        if (appState.currentView === viewId && viewId !== 'quiz-details') return;

        if (appState.quiz.active) {
            if (confirm("Abandoning the assessment will discard live progress. Exit immediately?")) {
                this.forceTerminateQuiz();
            } else {
                return;
            }
        }

        // Hide all views
        document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
        
        // Show target
        const targetView = document.getElementById(`view-${viewId}`);
        if(targetView) targetView.classList.add('active');

        // Update Nav Tabs visually
        this.navTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-target') === viewId) {
                tab.classList.add('active');
            }
        });

        appState.currentView = viewId;

        // Route specific logic based on navigation
        if (viewId === 'vault') this.renderVault();
        if (viewId === 'ranks') this.renderLeaderboard();
        if (viewId === 'admin') this.loadAdminPremiumUsers();

        this.triggerHaptic('select');
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
        // FREE USER PREMIUM LOCKOUT LOGIC
        if ((appState.quiz.type === 'daily_premium' || appState.quiz.type === 'topic') && !appState.isPremium) {
            this.btnStartQuizConfirm.innerHTML = `<i class="fa-solid fa-lock"></i> Redirecting to Admin...`;
            this.triggerHaptic('wrong');
            
            setTimeout(() => {
                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.openTelegramLink('https://t.me/jangra854x');
                } else {
                    window.open('https://t.me/jangra854x', '_blank');
                }
                this.btnStartQuizConfirm.innerHTML = `<i class="fa-solid fa-flag-checkered"></i> EXECUTE QUIZ NOW`;
            }, 500);
            return;
        }

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
        void this.quizFrame.offsetWidth; // Reflow reset
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
                this.triggerToast("Synchronized performance to Global Rankings!");
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

    // --- VAULT SUBSYSTEM ---
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

    switchVaultTab(tabKey, event) {
        appState.activeVaultTab = tabKey;
        document.querySelectorAll('.vault-tab-btn').forEach(btn => btn.classList.remove('active'));
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
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

    async deleteVaultWord(wordStr) {
        const categoryKey = appState.activeVaultTab;
        if (categoryKey === 'bookmarked') {
            appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== wordStr);
        } else {
            appState.weakWords = appState.weakWords.filter(w => w.word !== wordStr);
        }
        this.triggerHaptic('select');
        this.renderVault();
        this.triggerToast(`Removed "${wordStr}" from storage.`);

        if(supabaseClient && appState.currentUser.id) {
            await supabaseClient.from('vault').delete()
                .eq('telegram_id', appState.currentUser.id)
                .eq('word', wordStr)
                .eq('category', categoryKey);
        }
    }

    // --- LEADERBOARD ---
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
                        <button class="btn-primary-gradient mt-3" onclick="app.switchView('premium')">
                            View Premium Details
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        if (!supabaseClient) return;

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

    // --- PREMIUM METADATA ---
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
            console.error("Failed to load premium metadata", e);
        }
    }

    renderPremiumTopicsDeck(topicsDB) {
        if(!this.premiumTopicsList) return;
        if(!topicsDB || topicsDB.length === 0) {
            this.premiumTopicsList.innerHTML = `<div class="text-center text-muted p-3">No topics configured in database.</div>`;
            return;
        }

        this.premiumTopicsList.innerHTML = topicsDB.map(topic => `
            <div class="topic-card-item glass-card" onclick="app.showQuizBlueprint('topic', '${topic.title}')">
                <div class="topic-meta-left">
                    <span class="topic-title">${topic.title}</span>
                    <span class="topic-timestamp">Module Active</span>
                </div>
                <i class="fa-solid fa-arrow-right text-muted"></i>
            </div>
        `).join('');
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

    // --- ADMIN SYSTEM & PARSING ---
    switchAdminTab(secId, event) {
        document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
        
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        document.getElementById(`adm-sec-${secId}`).classList.remove('hidden');
        
        if(secId === 'users') {
            this.loadAdminPremiumUsers();
        }
    }

    parseAdminQuestions(rawText, quizType, categoryName) {
        if (!rawText.trim()) return [];
        const blocks = rawText.split(/\n(?=\d+[\.\)])/);
        const parsed = [];

        blocks.forEach(block => {
            const lines = block.split('\n').filter(l => l.trim() !== '');
            if (lines.length < 5) return;

            const textMatch = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
            const options = [];
            let correctIdx = 0;
            let explanations = ['', '', '', ''];

            let i = 1;
            while(i < lines.length && /^[A-D][\.\)]\s*/i.test(lines[i])) {
                options.push(lines[i].replace(/^[A-D][\.\)]\s*/i, '').trim());
                i++;
            }

            for(; i < lines.length; i++) {
                if (lines[i].toLowerCase().startsWith('answer:')) {
                    const ansLetter = lines[i].replace(/answer:/i, '').trim().toUpperCase();
                    correctIdx = ansLetter.charCodeAt(0) - 65;
                } else if (lines[i].toLowerCase().startsWith('explanation:')) {
                    const expText = lines[i].replace(/explanation:/i, '').trim();
                    explanations[correctIdx] = expText;
                }
            }

            if(options.length >= 2) {
                parsed.push({
                    type: quizType,
                    category: categoryName,
                    text: textMatch,
                    options: options,
                    correctIndex: correctIdx,
                    explanations: explanations
                });
            }
        });
        return parsed;
    }

    async publishAdminFreeQuiz() {
        if (!supabaseClient) return;
        const text = document.getElementById('adm-free-txt').value;
        const parsed = this.parseAdminQuestions(text, 'free', 'Daily General');
        if(parsed.length === 0) return this.triggerToast("No valid questions parsed.");

        try {
            await supabaseClient.from('quizzes').upsert({
                title: `Free Mix ${new Date().toLocaleDateString()}`,
                type: 'free',
                date: new Date().toISOString()
            }, { onConflict: 'title' });

            await supabaseClient.from('questions').insert(parsed);
            document.getElementById('adm-free-txt').value = '';
            this.triggerToast(`Successfully deployed ${parsed.length} free questions.`);
        } catch(e) {
            console.error(e);
            this.triggerToast("Deployment failed.");
        }
    }

    async publishAdminPremiumQuiz() {
        if (!supabaseClient) return;
        const text = document.getElementById('adm-prem-txt').value;
        const parsed = this.parseAdminQuestions(text, 'daily_premium', 'Elite Mix');
        if(parsed.length === 0) return this.triggerToast("No valid questions parsed.");

        try {
            const titleStr = `Premium Mix ${new Date().toLocaleDateString()}`;
            await supabaseClient.from('quizzes').upsert({
                title: titleStr,
                type: 'daily_premium',
                date: new Date().toISOString()
            }, { onConflict: 'title' });

            await supabaseClient.from('questions').insert(parsed);
            document.getElementById('adm-prem-txt').value = '';
            this.triggerToast(`Successfully deployed ${parsed.length} premium questions.`);
        } catch(e) {
            console.error(e);
            this.triggerToast("Deployment failed.");
        }
    }

    async publishAdminTopicDeck() {
        if (!supabaseClient) return;
        const topicTitle = document.getElementById('adm-topic-sel').value.trim();
        const text = document.getElementById('adm-topic-txt').value;
        if(!topicTitle) return this.triggerToast("Topic title required.");
        
        const parsed = this.parseAdminQuestions(text, 'topic', topicTitle);
        if(parsed.length === 0) return this.triggerToast("No valid questions parsed.");

        try {
            await supabaseClient.from('quizzes').upsert({
                title: topicTitle,
                type: 'topic',
                date: new Date().toISOString()
            }, { onConflict: 'title' });

            await supabaseClient.from('questions').insert(parsed);
            document.getElementById('adm-topic-txt').value = '';
            this.triggerToast(`Injected ${parsed.length} questions into ${topicTitle}.`);
        } catch(e) {
            console.error(e);
            this.triggerToast("Deployment failed.");
        }
    }

    async adminGrantPremium() {
        const targetId = document.getElementById('adm-user-tgid').value.trim();
        if (!targetId || !supabaseClient) return;
        try {
            await supabaseClient.from('premium_users').upsert({
                telegram_id: targetId,
                added_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });
            
            await supabaseClient.from('users').update({ premium: true }).eq('telegram_id', targetId);
            this.triggerToast(`Granted premium to ${targetId}`);
            document.getElementById('adm-user-tgid').value = '';
            this.loadAdminPremiumUsers();
        } catch(e) { console.error(e); }
    }

    async adminRevokePremium(overrideId = null) {
        const targetId = overrideId || document.getElementById('adm-user-tgid').value.trim();
        if (!targetId || !supabaseClient) return;
        try {
            await supabaseClient.from('premium_users').delete().eq('telegram_id', targetId);
            await supabaseClient.from('users').update({ premium: false }).eq('telegram_id', targetId);
            this.triggerToast(`Revoked premium from ${targetId}`);
            if(!overrideId) document.getElementById('adm-user-tgid').value = '';
            this.loadAdminPremiumUsers();
        } catch(e) { console.error(e); }
    }

    async loadAdminPremiumUsers() {
        if (!supabaseClient) return;
        const container = document.getElementById('admin-premium-list');
        if (!container) return;
        
        try {
            // Note: users table might not expose relational join depending on schema setup. 
            // Attempting join. If it fails, fallback to simple table view.
            const { data, error } = await supabaseClient.from('premium_users').select(`
                telegram_id,
                users (username, first_name)
            `);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                container.innerHTML = `<div class="text-center text-muted p-3">No elite members currently mapped.</div>`;
                return;
            }

            container.innerHTML = data.map(u => {
                const name = u.users?.first_name || 'Unknown User';
                const handle = u.users?.username ? `@${u.users.username}` : `ID: ${u.telegram_id}`;
                return `
                <div class="glass-card mb-2 p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-white">${name} <i class="fa-solid fa-crown text-gold font-size-sm"></i></div>
                        <div class="text-muted font-size-sm mt-1">${handle}</div>
                    </div>
                    <button class="btn-outline-danger" onclick="app.adminRevokePremium('${u.telegram_id}')">Remove</button>
                </div>
                `;
            }).join('');
        } catch (e) {
            console.error("Failed fetching premium users list", e);
            container.innerHTML = `<div class="text-center text-muted p-3">Failed to load live list.</div>`;
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

// Global Initialization
window.addEventListener('DOMContentLoaded', () => {
    window.app = new SSCMaxVocabEngine();
});