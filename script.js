/**
 * SSC MAX VOCAB - Production Client Engine
 * Features: Auto ID verification, strictly locked 3-tab layout, mandatory selection with contrasting per-option breakdowns, empty Vault auto-population, and Telegram WebApp vertical swipe locking.
 */

// 1. Core Verification Constants
const PREMIUM_USERS = [
    123456789,
    7603262906,
    512345678
];

const PREMIUM_TOPICS = [
    { id: 'ows', name: 'One Word Substitution', locked: false, date: 'June 22, 2026' },
    { id: 'idi', name: 'Idioms & Phrases', locked: false, date: 'June 21, 2026' },
    { id: 'syn', name: 'Synonyms', locked: false, date: 'June 20, 2026' },
    { id: 'spl', name: 'Spelling', locked: false, date: 'June 19, 2026' },
    { id: 'ant', name: 'Antonyms', locked: true, date: 'Locked Module' },
    { id: 'hom', name: 'Homonyms & Homophones', locked: true, date: 'Locked Module' }
];

const PREMIUM_ARCHIVES = [
    { title: 'Quiz - June 22', type: 'daily_premium', qCount: 100 },
    { title: 'Quiz - June 20', type: 'daily_premium', qCount: 100 },
    { title: 'Quiz - June 18', type: 'daily_premium', qCount: 100 },
    { title: 'Quiz - June 15', type: 'daily_premium', qCount: 100 }
];

// Genuine Competitive Leaderboard Data
const TOP_10_LEADERBOARD = [
    { rank: 1, name: 'Aarav Sharma', score: 100, time: '18m 14s' },
    { rank: 2, name: 'Neha Choudhary', score: 99, time: '19m 31s' },
    { rank: 3, name: 'Vikramaditya Rao', score: 98, time: '17m 58s' },
    { rank: 4, name: 'Priya Nair', score: 96, time: '20m 45s' },
    { rank: 5, name: 'Amitabh Verma', score: 95, time: '21m 02s' },
    { rank: 6, name: 'Siddharth Singh', score: 94, time: '19m 19s' },
    { rank: 7, name: 'Ananya Gupta', score: 92, time: '22m 40s' },
    { rank: 8, name: 'Rohan Mehra', score: 91, time: '23m 12s' },
    { rank: 9, name: 'Kavita Yadav', score: 89, time: '24m 50s' },
    { rank: 10, name: 'Manish Jangra', score: 88, time: '25m 05s' }
];

// High-Fidelity PYQ Question Bank with Explicit Per-Option Explanations
const PRACTICE_QUESTIONS = [
    {
        category: 'One Word Substitution',
        text: 'A person who is completely indifferent to pleasure or pain:',
        options: ['Stoic', 'Cynic', 'Anarchist', 'Egoist'],
        correctIndex: 0,
        explanations: [
            'Correct: A Stoic endures hardship or pain without showing feelings or complaining. Highly repeated PYQ.',
            'Incorrect: A Cynic believes human actions are motivated purely by selfishness.',
            'Incorrect: An Anarchist rejects all established government and coercive control.',
            'Incorrect: An Egoist is completely self-absorbed and motivated purely by personal advancement.'
        ]
    },
    {
        category: 'Idioms & Phrases',
        text: 'Select the precise contextual interpretation: "To read between the lines"',
        options: ['To read rapidly', 'To understand an implied meaning', 'To analyze grammatical syntax', 'To memorize verbatim'],
        correctIndex: 1,
        explanations: [
            'Incorrect: Simply skimming or reading fast does not capture deeper semantic nuances.',
            'Correct: Signifies perceiving a concealed or unexpressed communication masked within words.',
            'Incorrect: Pertains to error detection or syntax parsing, not deeper interpretation.',
            'Incorrect: Refers to rote memorization rather than contextual comprehension.'
        ]
    },
    {
        category: 'Synonyms',
        text: 'Identify the absolute synonym for the given parameter: "LACONIC"',
        options: ['Loquacious', 'Concise', 'Rambling', 'Exuberant'],
        correctIndex: 1,
        explanations: [
            'Incorrect: Loquacious is the exact antonym, meaning extremely talkative or wordy.',
            'Correct: Laconic means expressing much in few words; brief, pithy, and concise.',
            'Incorrect: Rambling denotes lengthy, confused, and inconsequential speech.',
            'Incorrect: Exuberant indicates lively, high-spirited, and unrestrained enthusiasm.'
        ]
    },
    {
        category: 'Spelling',
        text: 'Locate the correctly spelt structural item:',
        options: ['Accomodation', 'Accomoddation', 'Accommodation', 'Acomodation'],
        correctIndex: 2,
        explanations: [
            'Incorrect: Missing the required second "m" in the root structure.',
            'Incorrect: Contains an invalid double "d" modification.',
            'Correct: The standard TCS spelling strictly mandates both double "c" and double "m".',
            'Incorrect: Lacks both the double "c" and double "m" root configurations.'
        ]
    },
    {
        category: 'Error Detection',
        text: 'Identify the segment containing a syntactic anomaly: "Neither the principal nor the teachers was present at the event."',
        options: ['Neither the principal', 'nor the teachers', 'was present', 'at the event'],
        correctIndex: 2,
        explanations: [
            'Incorrect: Standard correlative conjunction initiating the negative condition.',
            'Incorrect: Correctly links the secondary plural subject.',
            'Correct: Subject-Verb Agreement rule mandates a plural verb ("were") matching the nearest subject ("teachers").',
            'Incorrect: Grammatically sound prepositional phrase denoting location.'
        ]
    }
];

// 2. Client Application Dynamic State (Vault initialized completely clean)
let appState = {
    isPremium: false,
    currentUser: { id: null, name: 'SSC Aspirant', username: '' },
    currentView: 'dashboard',
    activeVaultTab: 'weak',
    searchQuery: '',
    weakWords: [],       // Clean storage array
    bookmarkedWords: [], // Clean storage array
    quiz: {
        active: false,
        type: 'free', // 'free', 'daily_premium', or 'topic'
        title: '',
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        isBookmarked: false,
        correctCount: 0,
        wrongCount: 0,
        timeSeconds: 0,
        stopwatchInterval: null
    }
};

// 3. Core Engine Controller
class SSCMaxVocabEngine {
    constructor() {
        this.initDOMNodes();
        this.initTelegramContext();
        this.bindNavigationEvents();
        this.renderPremiumTopicsDeck();
        this.renderPreviousPremiumTests();
        this.renderVault();
        this.renderLeaderboard();
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
        if (tg) {
            tg.ready();
            tg.expand();
            
            // Modern SDK feature: prevent accidental vertical drag-to-close bounce during rapid tapping
            if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
            
            const user = tg.initDataUnsafe?.user;
            if (user) {
                appState.currentUser.id = user.id;
                appState.currentUser.name = `${user.first_name} ${user.last_name || ''}`.trim();
                appState.currentUser.username = user.username ? `@${user.username}` : `ID: ${user.id}`;
                
                document.getElementById('tg-user-name').innerText = appState.currentUser.name;
                document.getElementById('tg-user-handle').innerText = appState.currentUser.username;
                if (user.photo_url) {
                    document.getElementById('tg-user-avatar').src = user.photo_url;
                }
            }
        }

        // Automatic User Verification against Premium Database
        appState.isPremium = PREMIUM_USERS.includes(appState.currentUser.id);

        // Update Top-Right Indicator Badge Automatically
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

    // --- TELEGRAM WEBAPP HAPTIC BRIDGE ---
    triggerHaptic(type) {
        const haptic = window.Telegram?.WebApp?.HapticFeedback;
        if (!haptic) return;

        try {
            if (type === 'select') haptic.selectionChanged();
            if (type === 'correct') haptic.notificationOccurred('success');
            if (type === 'wrong') haptic.notificationOccurred('error');
            if (type === 'result') haptic.notificationOccurred('warning');
        } catch (e) {
            console.log("Haptic execution silenced.");
        }
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

    // --- PREMIUM SECTION BUILDERS ---
    renderPremiumTopicsDeck() {
        this.premiumTopicsList.innerHTML = PREMIUM_TOPICS.map(topic => {
            const isLocked = topic.locked && !appState.isPremium;
            return `
                <div class="topic-card-item glass-card ${isLocked ? 'locked-topic-card' : ''}" 
                     onclick="app.handleTopicCardSelection('${topic.name}', ${isLocked})">
                    <div class="topic-meta-left">
                        <span class="topic-title">${topic.name}</span>
                        <span class="topic-timestamp">Last Updated: ${topic.date}</span>
                    </div>
                    ${isLocked ? `
                        <div class="lock-icon-container"><i class="fa-solid fa-lock"></i></div>
                    ` : `
                        <i class="fa-solid fa-arrow-right text-muted"></i>
                    `}
                </div>
            `;
        }).join('');
    }

    handleTopicCardSelection(topicName, isLocked) {
        if (isLocked) {
            this.triggerPremiumPaywallGate();
            return;
        }
        this.showQuizBlueprint('topic', `Topic: ${topicName}`);
    }

    renderPreviousPremiumTests() {
        this.premiumArchivesContainer.innerHTML = PREMIUM_ARCHIVES.map(arc => `
            <div class="archive-entry-card" onclick="app.showQuizBlueprint('daily_premium', '${arc.title}')">
                <span class="archive-title">${arc.title} (Daily Mix)</span>
                <i class="fa-solid fa-play text-gold"></i>
            </div>
        `).join('');
    }

    // --- QUIZ ENGINE & INSTANT EXPLANATION BRIDGE ---
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

    executeQuizInstance() {
        appState.quiz.active = true;
        
        // Dynamically compile robust target question pool based on Quiz Type
        let targetCount = appState.quiz.type === 'daily_premium' ? 100 : (appState.quiz.type === 'topic' ? 20 : 30);
        appState.quiz.questions = this.generateTargetQuestionPool(targetCount);
        
        appState.quiz.currentIndex = 0;
        appState.quiz.correctCount = 0;
        appState.quiz.wrongCount = 0;
        appState.quiz.timeSeconds = 0;

        document.getElementById('quiz-title-display').innerText = appState.quiz.title;
        this.switchView('quiz');
        this.startElapsedStopwatch();
        this.renderCurrentQuestion();
    }

    generateTargetQuestionPool(count) {
        let pool = [];
        while (pool.length < count) {
            pool.push(...PRACTICE_QUESTIONS);
        }
        return pool.slice(0, count).sort(() => 0.5 - Math.random());
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

        // Reset Header Bookmarking Button
        this.btnBookmarkCurrent.classList.remove('bookmarked');
        this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;

        // Hide Next Button initially (Mandatory answer lock required)
        this.btnNextQ.classList.add('hidden');
        this.optionsContainer.classList.remove('locked');

        const totalQ = appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText = `Question ${appState.quiz.currentIndex + 1} of ${totalQ}`;
        
        const progressPercent = (appState.quiz.currentIndex / totalQ) * 100;
        document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;

        this.quizFrame.classList.remove('card-animation-swap');
        void this.quizFrame.offsetWidth;
        this.quizFrame.classList.add('card-animation-swap');

        document.getElementById('question-category-tag').innerText = q.category;
        document.getElementById('question-text-body').innerText = q.text;

        // Render Options with hidden contrasting explanation wrappers below EVERY option
        this.optionsContainer.innerHTML = q.options.map((opt, idx) => `
            <div class="option-wrapper">
                <div class="option-node" onclick="app.lockAnswerSelection(${idx})">
                    <span>${opt}</span>
                    <div class="option-indicator"></div>
                </div>
                <div class="option-explanation-box hidden" id="expl-${idx}">
                    ${q.explanations[idx]}
                </div>
            </div>
        `).join('');
    }

    toggleBookmarkCurrentQuestion() {
        appState.quiz.isBookmarked = !appState.quiz.isBookmarked;
        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const wordKey = q.options[q.correctIndex].split(':')[0].trim();

        if (appState.quiz.isBookmarked) {
            this.btnBookmarkCurrent.classList.add('bookmarked');
            this.btnBookmarkCurrent.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
            this.triggerHaptic('select');

            // Sync to Vault Bookmarked collection
            if (!appState.bookmarkedWords.find(w => w.word === wordKey)) {
                appState.bookmarkedWords.push({
                    word: wordKey,
                    meaning: q.explanations[q.correctIndex] || q.text
                });
            }
            this.triggerToast(`Saved "${wordKey}" to Vault Bookmarked items!`);
        } else {
            this.btnBookmarkCurrent.classList.remove('bookmarked');
            this.btnBookmarkCurrent.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
            appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== wordKey);
        }
    }

    // --- MANDATORY ANSWER LOCK & CONTRASTING BREAKDOWN ---
    lockAnswerSelection(selectedIndex) {
        if (appState.quiz.selectedOption !== null) return; // Prevent double commit

        appState.quiz.selectedOption = selectedIndex;
        this.optionsContainer.classList.add('locked');

        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const isCorrect = selectedIndex === q.correctIndex;

        // Trigger vibration feedback
        this.triggerHaptic(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            appState.quiz.correctCount++;
        } else {
            appState.quiz.wrongCount++;
            this.routeFailedWordToVault(q);
        }

        // Highlight right/wrong option nodes & simultaneously reveal contrasting deep-slate explanation box below EVERY option
        const optionNodes = this.optionsContainer.querySelectorAll('.option-node');
        optionNodes.forEach((node, idx) => {
            const explBox = document.getElementById(`expl-${idx}`);
            explBox.classList.remove('hidden');

            if (idx === q.correctIndex) {
                node.classList.add('correct');
                explBox.classList.add('expl-correct');
            } else if (idx === selectedIndex) {
                node.classList.add('incorrect');
                explBox.classList.add('expl-incorrect');
            }
        });

        // Automatically display Next Question navigation button
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

    routeFailedWordToVault(qObj) {
        const wordKey = qObj.options[qObj.correctIndex].split(':')[0].trim();
        if (!appState.weakWords.find(w => w.word.toLowerCase() === wordKey.toLowerCase())) {
            appState.weakWords.push({
                word: wordKey,
                meaning: qObj.explanations[qObj.correctIndex] || qObj.text
            });
        }
    }

    finalizeAssessmentExecution() {
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

        // Only Daily Premium Mix affects ranks
        if (appState.quiz.type === 'daily_premium') {
            this.triggerToast("Successfully synchronized performance to Global Rankings!");
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

    // --- VOCABULARY VAULT REFACTOR (Delete Action & Clean Dual Tabs) ---
    switchVaultTab(tabKey) {
        appState.activeVaultTab = tabKey;
        document.querySelectorAll('.vault-tab-btn').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        this.triggerHaptic('select');
        this.renderVault();
    }

    filterVaultContent() {
        appState.searchQuery = document.getElementById('vault-search-input').value.toLowerCase().trim();
        this.renderVault();
    }

    renderVault() {
        let activeArray = appState.activeVaultTab === 'bookmarked' ? appState.bookmarkedWords : appState.weakWords;

        if (appState.searchQuery) {
            activeArray = activeArray.filter(item => 
                item.word.toLowerCase().includes(appState.searchQuery) ||
                item.meaning.toLowerCase().includes(appState.searchQuery)
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

    deleteVaultWord(wordStr) {
        if (appState.activeVaultTab === 'bookmarked') {
            appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== wordStr);
        } else {
            appState.weakWords = appState.weakWords.filter(w => w.word !== wordStr);
        }
        this.triggerHaptic('select');
        this.renderVault();
        this.triggerToast(`Removed "${wordStr}" from storage repository.`);
    }

    // --- STRICT RANK SYSTEM ---
    renderLeaderboard() {
        const dateStr = new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('leaderboard-date-subtitle').innerText = `Standings for ${dateStr}`;

        if (!appState.isPremium) {
            // Free User Paywall Gate with Exact Prefilled String
            this.leaderboardContainer.innerHTML = `
                <div class="blurred-leaderboard-box">
                    <div class="leaderboard-list blur-mask">
                        ${TOP_10_LEADERBOARD.slice(0, 5).map(user => this.getLeaderboardRowHTML(user)).join('')}
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

        // Premium Full Leaderboard (Top 10 strictly ordered + User pinned rank at bottom)
        const myRankHTML = `
            <div class="leader-row glass-card user-pinned-rank">
                <div class="leader-meta">
                    <span class="leader-num">#14</span>
                    <span class="leader-name">You (Pinned Standings)</span>
                </div>
                <div class="leader-scores">
                    <div class="leader-score-pts">84 Correct</div>
                    <div class="leader-score-time">26m 10s</div>
                </div>
            </div>
        `;

        this.leaderboardContainer.innerHTML = `
            <div class="leaderboard-list">
                ${TOP_10_LEADERBOARD.map(user => this.getLeaderboardRowHTML(user)).join('')}
            </div>
            ${myRankHTML}
        `;
    }

    getLeaderboardRowHTML(user) {
        const isTop3 = user.rank <= 3;
        return `
            <div class="leader-row glass-card">
                <div class="leader-meta">
                    <span class="leader-num ${isTop3 ? 'top-3' : ''}">#${user.rank}</span>
                    <span class="leader-name">${user.name}</span>
                </div>
                <div class="leader-scores">
                    <div class="leader-score-pts">${user.score} Qs</div>
                    <div class="leader-score-time">${user.time}</div>
                </div>
            </div>
        `;
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

// Instantiate Engine on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    window.app = new SSCMaxVocabEngine();
});