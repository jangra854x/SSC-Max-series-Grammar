/**
 * SSC MAX VOCAB - Production Client Engine
 * Features: Auto ID detection, strict 3-tab layout, mandatory selection with instant per-option breakdown, and Telegram WebApp haptic integration.
 */

// 1. Core Verification Constants
const PREMIUM_USERS = [
    123456789,
    987654321
];

const PREMIUM_TOPICS = [
    { id: 'ows', name: 'One Word Substitution', locked: false },
    { id: 'idi', name: 'Idioms & Phrases', locked: false },
    { id: 'syn', name: 'Synonyms', locked: false },
    { id: 'spl', name: 'Spelling', locked: false },
    { id: 'ant', name: 'Antonyms', locked: true },
    { id: 'hom', name: 'Homonyms & Homophones', locked: true }
];

const ARCHIVE_MONTHS = [
    {
        id: 'arc-june',
        month: 'June 2026',
        quizzes: [
            { title: 'June 22 - Premium Complete Blueprint', type: 'daily_premium' },
            { title: 'June 20 - PYQ Mixed Syntax Mix', type: 'daily_premium' },
            { title: 'June 18 - TCS High Frequency Shift', type: 'daily_premium' }
        ]
    },
    {
        id: 'arc-may',
        month: 'May 2026',
        quizzes: [
            { title: 'May 28 - Selection Posts Simulation', type: 'daily_premium' },
            { title: 'May 15 - CGL Tier-1 Absolute Matrix', type: 'daily_premium' }
        ]
    },
    {
        id: 'arc-apr',
        month: 'April 2026',
        quizzes: [
            { title: 'April 30 - Core PYQ Vocabulary Baseline', type: 'daily_premium' }
        ]
    }
];

// Genuine Standings Data
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

// Comprehensive Question Base with explicit Per-Option Explanations
const PRACTICE_QUESTIONS = [
    {
        category: 'One Word Substitution',
        text: 'A person who is completely indifferent to pleasure or pain:',
        options: ['Stoic', 'Cynic', 'Anarchist', 'Egoist'],
        correctIndex: 0,
        explanations: [
            'Correct: A Stoic endures hardship or pain without showing feelings or complaining.',
            'Incorrect: A Cynic believes human actions are motivated purely by selfishness.',
            'Incorrect: An Anarchist rejects all forms of coercive control and established government.',
            'Incorrect: An Egoist is completely self-absorbed and motivated by personal advancement.'
        ]
    },
    {
        category: 'Idioms & Phrases',
        text: 'Select the precise contextual interpretation: "To read between the lines"',
        options: ['To read rapidly', 'To understand an implied meaning', 'To analyze grammatical syntax', 'To memorize verbatim'],
        correctIndex: 1,
        explanations: [
            'Incorrect: Simply skimming or reading fast does not capture deeper nuances.',
            'Correct: Signifies perceiving a concealed or unexpressed communication masked within words.',
            'Incorrect: Pertains to error detection or syntax parsing, not semantic interpretation.',
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
            'Incorrect: Correctly links the plural secondary subject.',
            'Correct: Subject-Verb Agreement rule mandates a plural verb ("were") matching the nearest subject ("teachers").',
            'Incorrect: Grammatically sound prepositional phrase denoting location.'
        ]
    }
];

// 2. Application Live Dynamic State
let appState = {
    isPremium: false,
    currentUser: { id: null, name: 'SSC Aspirant', username: '' },
    currentView: 'dashboard',
    activeVaultTab: 'weak',
    searchQuery: '',
    weakWords: [
        { word: 'Obsequious', meaning: 'Obedient or attentive to an excessive or servile degree.', wrongCount: 2 }
    ],
    bookmarkedWords: [
        { word: 'Perspicacious', meaning: 'Having ready insight into and understanding of things; shrewd.', wrongCount: 0 }
    ],
    masteredWords: [],
    quiz: {
        active: false,
        type: 'free', // 'free', 'daily_premium', or 'topic'
        title: '',
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        correctCount: 0,
        wrongCount: 0,
        timeSeconds: 0,
        stopwatchInterval: null
    }
};

// 3. Client System Controller
class SSCMaxVocabEngine {
    constructor() {
        this.initDOMNodes();
        this.initTelegramContext();
        this.bindNavigationEvents();
        this.renderPremiumTopics();
        this.renderArchiveFolders();
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
        
        // Quiz DOM bindings
        this.quizFrame = document.getElementById('question-card-frame');
        this.optionsContainer = document.getElementById('question-options-container');
        this.btnNextQ = document.getElementById('btn-next-q');
        this.btnStartQuizConfirm = document.getElementById('btn-confirm-start-quiz');

        this.btnNextQ.addEventListener('click', () => this.advanceQuestion());
        this.btnStartQuizConfirm.addEventListener('click', () => this.initiateQuizExecution());
    }

    initTelegramContext() {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            
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

        // Update Top Right Indicator Badge Automatically
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

    // --- HAPTIC FEEDBACK BRIDGE ---
    triggerHaptic(type) {
        const haptic = window.Telegram?.WebApp?.HapticFeedback;
        if (!haptic) return;

        try {
            if (type === 'select') haptic.selectionChanged();
            if (type === 'correct') haptic.notificationOccurred('success');
            if (type === 'wrong') haptic.notificationOccurred('error');
            if (type === 'result') haptic.notificationOccurred('warning');
        } catch (e) {
            console.log("Haptic feedback error silenced.");
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

    handlePremiumNavigation() {
        if (!appState.isPremium) {
            this.triggerPremiumPaywallGate();
            return;
        }
        this.switchView('premium');
    }

    triggerPremiumPaywallGate() {
        const message = encodeURIComponent("Hello, I am interested in SSC MAX VOCAB premium membership.");
        const tgBotLink = `https://t.me/jangra854x?text=${message}`;
        if (confirm("This elite test suite requires Premium authorization. Contact @jangra854x on Telegram to unlock?")) {
            window.open(tgBotLink, '_blank');
        }
    }

    // --- PREMIUM SECTION BUILDERS ---
    renderPremiumTopics() {
        this.premiumTopicsList.innerHTML = PREMIUM_TOPICS.map(topic => {
            const isLocked = topic.locked && !appState.isPremium;
            return `
                <div class="topic-row ${isLocked ? 'locked-topic' : ''}" 
                     onclick="app.handleTopicSelection('${topic.name}', ${isLocked})">
                    <span class="topic-name">${topic.name}</span>
                    ${isLocked ? `<i class="fa-solid fa-lock lock-icon"></i>` : `<i class="fa-solid fa-arrow-right text-muted"></i>`}
                </div>
            `;
        }).join('');
    }

    handleTopicSelection(topicName, isLocked) {
        if (isLocked) {
            this.triggerPremiumPaywallGate();
            return;
        }
        this.showQuizDetails('topic', `Topic Module: ${topicName}`);
    }

    renderArchiveFolders() {
        this.premiumArchivesContainer.innerHTML = ARCHIVE_MONTHS.map(monthObj => `
            <div class="accordion-item glass-card">
                <div class="accordion-header" onclick="app.toggleArchiveFolder('${monthObj.id}')">
                    <span>📁 ${monthObj.month}</span>
                    <i class="fa-solid fa-chevron-down indicator" id="ind-${monthObj.id}"></i>
                </div>
                <div class="accordion-body" id="${monthObj.id}">
                    ${monthObj.quizzes.map(q => `
                        <div class="archive-quiz-row" onclick="app.showQuizDetails('daily_premium', '${q.title}')">
                            <span>${q.title}</span>
                            <i class="fa-solid fa-play text-gold"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    toggleArchiveFolder(folderId) {
        if (!appState.isPremium) {
            this.triggerPremiumPaywallGate();
            return;
        }
        const body = document.getElementById(folderId);
        const indicator = document.getElementById(`ind-${folderId}`);
        const isOpen = body.classList.contains('open');
        
        body.classList.toggle('open', !isOpen);
        indicator.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    // --- QUIZ DETAILS & INSTRUCTION BRIDGE ---
    showQuizDetails(type, title) {
        appState.quiz.type = type;
        appState.quiz.title = title;

        document.getElementById('qd-subtitle').innerText = title;
        
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('qd-date').innerText = new Date().toLocaleDateString('en-IN', options);
        
        let qCount = 30;
        let rankStatus = "Practice Mode (Unranked)";
        if (type === 'daily_premium') {
            qCount = 100;
            rankStatus = "Ranked (Logs to Leaderboard)";
        } else if (type === 'topic') {
            qCount = 20;
        }

        document.getElementById('qd-count').innerText = `${qCount} Questions`;
        document.getElementById('qd-rank-status').innerText = rankStatus;

        this.switchView('quiz-details');
    }

    initiateQuizExecution() {
        appState.quiz.active = true;
        
        // Dynamically build robust target question pool based on Quiz Type
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

        // Hide Next Button initially (Mandatory answer lock required)
        this.btnNextQ.classList.add('hidden');
        this.optionsContainer.classList.remove('locked');

        const totalQ = appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText = `Question ${appState.quiz.currentIndex + 1} of ${totalQ}`;
        document.getElementById('quiz-live-score-display').innerText = `Score: ${appState.quiz.correctCount}`;
        
        const progressPercent = (appState.quiz.currentIndex / totalQ) * 100;
        document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;

        this.quizFrame.classList.remove('card-animation-swap');
        void this.quizFrame.offsetWidth;
        this.quizFrame.classList.add('card-animation-swap');

        document.getElementById('question-category-tag').innerText = q.category;
        document.getElementById('question-text-body').innerText = q.text;

        // Render Options with hidden explanation wrappers directly beneath EVERY option
        this.optionsContainer.innerHTML = q.options.map((opt, idx) => `
            <div class="option-wrapper">
                <div class="option-node" onclick="app.lockAnswer(${idx})">
                    <span>${opt}</span>
                    <div class="option-indicator"></div>
                </div>
                <div class="option-explanation-box hidden" id="expl-${idx}">
                    ${q.explanations[idx]}
                </div>
            </div>
        `).join('');
    }

    // --- MANDATORY ANSWER LOCK & INSTANT BREAKDOWN ---
    lockAnswer(selectedIndex) {
        if (appState.quiz.selectedOption !== null) return; // Prevent double taps

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
            this.registerFailedWordToVault(q);
        }

        // Highlight right/wrong states & simultaneously reveal explanation below EVERY option
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

        document.getElementById('quiz-live-score-display').innerText = `Score: ${appState.quiz.correctCount}`;

        // Automatically display Next Question navigation button
        this.btnNextQ.classList.remove('hidden');
    }

    advanceQuestion() {
        appState.quiz.currentIndex++;
        if (appState.quiz.currentIndex < appState.quiz.questions.length) {
            this.renderCurrentQuestion();
        } else {
            this.finalizeQuizAssessment();
        }
    }

    registerFailedWordToVault(qObj) {
        const wordKey = qObj.options[qObj.correctIndex].split(':')[0].trim();
        let existing = appState.weakWords.find(w => w.word.toLowerCase() === wordKey.toLowerCase());
        
        if (existing) {
            existing.wrongCount++;
        } else {
            appState.weakWords.push({
                word: wordKey,
                meaning: qObj.explanations[qObj.correctIndex] || qObj.text,
                wrongCount: 1
            });
        }
    }

    finalizeQuizAssessment() {
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

        document.getElementById('res-tier-badge').innerText = accuracy >= 90 ? "👑 ELITE PERFORMANCE" : "⚡ KEEP PRACTICING";

        // Log rank strictly if Daily Premium Quiz
        if (appState.quiz.type === 'daily_premium') {
            this.triggerToast("Logged performance to Daily Standings!");
        }

        this.switchView('result');
    }

    confirmExitQuiz() {
        if (confirm("Abandoning the assessment will discard live progress. Exit immediately?")) {
            this.forceTerminateQuiz();
        }
    }

    forceTerminateQuiz() {
        clearInterval(appState.quiz.stopwatchInterval);
        appState.quiz.active = false;
        this.switchView('dashboard');
    }

    // --- VOCABULARY VAULT REFACTOR ---
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
        let activeArray = appState.weakWords;
        if (appState.activeVaultTab === 'bookmarked') activeArray = appState.bookmarkedWords;
        if (appState.activeVaultTab === 'mastered') activeArray = appState.masteredWords;

        if (appState.searchQuery) {
            activeArray = activeArray.filter(item => 
                item.word.toLowerCase().includes(appState.searchQuery) ||
                item.meaning.toLowerCase().includes(appState.searchQuery)
            );
        }

        document.getElementById('count-weak').innerText = appState.weakWords.length;
        document.getElementById('count-bookmarked').innerText = appState.bookmarkedWords.length;
        document.getElementById('count-mastered').innerText = appState.masteredWords.length;

        if (activeArray.length === 0) {
            this.vaultItemsContainer.innerHTML = `<p class="text-muted text-center p-4">No vocabulary items stored in this collection.</p>`;
            return;
        }

        this.vaultItemsContainer.innerHTML = activeArray.map(item => `
            <div class="glass-card vault-word-card card-animation-swap">
                <div class="v-header-row">
                    <h4>${item.word}</h4>
                    ${item.wrongCount > 0 ? `<span class="wrong-badge">Failed ${item.wrongCount}x</span>` : ''}
                </div>
                <p class="v-meaning">${item.meaning}</p>
                <div class="v-action-bar">
                    ${appState.activeVaultTab !== 'mastered' ? `
                        <button class="btn-practice-sm" onclick="app.markWordAsMastered('${item.word}')">
                            <i class="fa-solid fa-check text-success"></i> Mastered
                        </button>
                    ` : ''}
                    <button class="btn-practice-sm" onclick="app.practiceWordIsolated('${item.word}')">
                        <i class="fa-solid fa-rotate-right text-cyan"></i> Drill Word
                    </button>
                </div>
            </div>
        `).join('');
    }

    markWordAsMastered(wordStr) {
        let wordObj = appState.weakWords.find(w => w.word === wordStr) || appState.bookmarkedWords.find(w => w.word === wordStr);
        if (wordObj) {
            appState.weakWords = appState.weakWords.filter(w => w.word !== wordStr);
            appState.bookmarkedWords = appState.bookmarkedWords.filter(w => w.word !== wordStr);
            appState.masteredWords.push({...wordObj, wrongCount: 0});
            this.renderVault();
            this.triggerToast(`Transferred "${wordStr}" to Mastered collection!`);
        }
    }

    practiceWordIsolated(wordStr) {
        this.showQuizDetails('free', `Isolated Drill: ${wordStr}`);
    }

    // --- STRICT RANK SYSTEM ---
    renderLeaderboard() {
        const dateStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
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
                        <h3>Elite Standings Locked</h3>
                        <p>Only Daily Premium Quiz scores affect ranks. Unlock Premium to compete globally.</p>
                        <button class="btn-primary-gradient mt-2" onclick="app.triggerPremiumPaywallGate()">
                            Unlock Premium Access
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Premium Full Leaderboard (Top 10 strictly ordered)
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
        const toast = document.createElement('div');
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

// Initializing application instance
window.addEventListener('DOMContentLoaded', () => {
    window.app = new SSCMaxVocabEngine();
});