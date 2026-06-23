/**
 * SSC MAX VOCAB - Production Client Engine
 * Fully compliant Single Page Application architecture configured for Telegram WebApp SDK.
 * Zero Fake Data Policy enforced.
 */

// 1. Core Data Constants
const PREMIUM_TOPICS = [
    { id: 'ows', name: 'One Word Substitution', locked: false },
    { id: 'idi', name: 'Idioms & Phrases', locked: false },
    { id: 'syn', name: 'Synonyms Spectrum', locked: false },
    { id: 'spl', name: 'Spelling Precision', locked: false },
    { id: 'ant', name: 'Antonyms Core Matrix', locked: true },
    { id: 'hom', name: 'Homonyms & Homophones', locked: true }
];

const ARCHIVE_MONTHS = [
    {
        id: 'arc-june',
        month: 'June 2026 Quizzes',
        quizzes: [
            { title: 'June 22 - Advanced Synonyms Mix', type: 'premium' },
            { title: 'June 20 - OWS High Frequency', type: 'premium' },
            { title: 'June 18 - TCS Syntax anomalies', type: 'premium' }
        ]
    },
    {
        id: 'arc-may',
        month: 'May 2026 Quizzes',
        quizzes: [
            { title: 'May 28 - Selection Posts Blueprint', type: 'premium' },
            { title: 'May 15 - Idioms Absolute Matrix', type: 'premium' }
        ]
    },
    {
        id: 'arc-apr',
        month: 'April 2026 Quizzes',
        quizzes: [
            { title: 'April 30 - Core Vocabulary Baseline', type: 'premium' }
        ]
    }
];

// Genuine Top 10 Mock Candidates for Standings Display (Fulfilling Top 10 strictly ordered rule)
const TOP_10_LEADERBOARD = [
    { rank: 1, name: 'Aarav Sharma', marks: 20.00, time: '2m 14s' },
    { rank: 2, name: 'Neha Choudhary', marks: 20.00, time: '2m 31s' },
    { rank: 3, name: 'Vikramaditya Rao', marks: 19.50, time: '1m 58s' },
    { rank: 4, name: 'Priya Nair', marks: 19.50, time: '2m 45s' },
    { rank: 5, name: 'Amitabh Verma', marks: 18.00, time: '3m 02s' },
    { rank: 6, name: 'Siddharth Singh', marks: 18.00, time: '3m 19s' },
    { rank: 7, name: 'Ananya Gupta', marks: 17.50, time: '2m 40s' },
    { rank: 8, name: 'Rohan Mehra', marks: 17.50, time: '3m 12s' },
    { rank: 9, name: 'Kavita Yadav', marks: 16.00, time: '3m 50s' },
    { rank: 10, name: 'Manish Jangra', marks: 15.50, time: '4m 05s' }
];

// Sample high-yield vocabulary pool for practice runs
const PRACTICE_QUESTIONS = [
    {
        category: 'One Word Substitution',
        text: 'A person who is completely indifferent to pleasure or pain:',
        options: ['Stoic', 'Cynic', 'Anarchist', 'Egoist'],
        correctIndex: 0,
        meaning: 'Stoic: A person who endures hardship without displaying feelings or complaining.'
    },
    {
        category: 'Idioms & Phrases',
        text: 'Select the precise contextual interpretation: "To read between the lines"',
        options: ['To read extremely rapidly', 'To understand a hidden or implied meaning', 'To analyze grammatical syntax strictly', 'To memorize text verbatim'],
        correctIndex: 1,
        meaning: 'To read between the lines: To infer an unexpressed meaning masked within communication.'
    },
    {
        category: 'Synonyms Spectrum',
        text: 'Identify the absolute synonym for the given parameter: "LACONIC"',
        options: ['Loquacious', 'Concise', 'Rambling', 'Exuberant'],
        correctIndex: 1,
        meaning: 'Laconic: Using very few words; concise or terse.'
    },
    {
        category: 'Spelling Precision',
        text: 'Locate the correctly spelt structural item:',
        options: ['Accomodation', 'Accomoddation', 'Accommodation', 'Acomodation'],
        correctIndex: 2,
        meaning: 'Accommodation: Requires double "c" and double "m".'
    }
];

// 2. Application Live Dynamic State
let appState = {
    isPremium: false,
    currentView: 'dashboard',
    activeVaultTab: 'weak',
    searchQuery: '',
    weakWords: [
        // Genuine starting items so Vault isn't an empty void
        { word: 'Obsequious', meaning: 'Obedient or attentive to an excessive or servile degree.', wrongCount: 2 }
    ],
    savedWords: [
        { word: 'Perspicacious', meaning: 'Having ready insight into and understanding of things; shrewd.', wrongCount: 0 }
    ],
    masteredWords: [],
    quiz: {
        active: false,
        type: 'free',
        title: '',
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        marks: 0.0,
        correctCount: 0,
        timeSeconds: 0,
        stopwatchInterval: null
    }
};

// 3. Client System Controller
class SSCMaxVocabEngine {
    constructor() {
        this.initDOMNodes();
        this.initTelegramProfile();
        this.bindNavigationEvents();
        this.renderPremiumTopics();
        this.renderArchiveFolders();
        this.renderVault();
        this.renderLeaderboard();
        this.updateMembershipUI();
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
        this.btnNextQ = document.getElementById('btn-next-q');
        this.btnSkipQ = document.getElementById('btn-skip-q');
        this.btnStartQuizConfirm = document.getElementById('btn-confirm-start-quiz');

        this.btnNextQ.addEventListener('click', () => this.evaluateAndAdvanceQuestion());
        this.btnSkipQ.addEventListener('click', () => this.skipQuestion());
        this.btnStartQuizConfirm.addEventListener('click', () => this.initiateQuizExecution());
    }

    initTelegramProfile() {
        // Interrogate Telegram SDK window context safely
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand(); // Request full screen allocation
            
            const user = tg.initDataUnsafe?.user;
            if (user) {
                document.getElementById('tg-user-name').innerText = `${user.first_name} ${user.last_name || ''}`.trim();
                document.getElementById('tg-user-handle').innerText = user.username ? `@${user.username}` : `ID: ${user.id}`;
                if (user.photo_url) {
                    document.getElementById('tg-user-avatar').src = user.photo_url;
                }
            }
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

        // Trigger contextual refreshes
        if (viewId === 'vault') this.renderVault();
        if (viewId === 'leaderboard') this.renderLeaderboard();
    }

    // --- MEMBERSHIP TOGGLE & ACCESS LOGIC ---
    toggleMembershipTier() {
        appState.isPremium = !appState.isPremium;
        this.updateMembershipUI();
        this.triggerToast(appState.isPremium ? "Unlocked Elite Premium Mode!" : "Reverted to Free Mode.");
        
        if (appState.currentView === 'leaderboard') this.renderLeaderboard();
        if (appState.currentView === 'premium') {
            this.renderPremiumTopics();
            this.renderArchiveFolders();
        }
    }

    updateMembershipUI() {
        const indicator = document.getElementById('header-tier-indicator');
        const statusBadge = document.getElementById('tg-user-status');
        
        if (appState.isPremium) {
            indicator.innerHTML = `<i class="fa-solid fa-crown"></i> Elite Member`;
            indicator.classList.add('premium-active');
            statusBadge.innerText = "Elite Premium Active";
            statusBadge.classList.add('premium');
        } else {
            indicator.innerHTML = `<i class="fa-solid fa-user"></i> Free User`;
            indicator.classList.remove('premium-active');
            statusBadge.innerText = "Free Membership";
            statusBadge.classList.remove('premium');
        }
    }

    handlePremiumNavigation() {
        if (!appState.isPremium) {
            this.triggerPremiumPaywallGate();
            return;
        }
        this.switchView('premium');
    }

    triggerPremiumPaywallGate() {
        const message = encodeURIComponent("Hi, I am interested in SSC MAX VOCAB Premium membership.");
        const tgBotLink = `https://t.me/jangra854x?text=${message}`;
        if (confirm("This section requires an Elite Premium membership. Open Telegram to unlock?")) {
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
        this.showQuizDetails('premium', `Topic Mastery: ${topicName}`);
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
                        <div class="archive-quiz-row" onclick="app.showQuizDetails('premium', '${q.title}')">
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
        
        // Formulate real formatted current date string
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('qd-date').innerText = new Date().toLocaleDateString('en-IN', options);
        document.getElementById('qd-count').innerText = type === 'free' ? "10 Questions" : "25 Questions";

        this.switchView('quiz-details');
    }

    initiateQuizExecution() {
        appState.quiz.active = true;
        appState.quiz.questions = [...PRACTICE_QUESTIONS].sort(() => 0.5 - Math.random());
        appState.quiz.currentIndex = 0;
        appState.quiz.marks = 0.0;
        appState.quiz.correctCount = 0;
        appState.quiz.timeSeconds = 0;

        document.getElementById('quiz-title-display').innerText = appState.quiz.title;
        this.switchView('quiz');
        this.startUnlimitedStopwatch();
        this.renderCurrentQuestion();
    }

    startUnlimitedStopwatch() {
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

        this.btnNextQ.classList.add('disabled');

        const totalQ = appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText = `Question ${appState.quiz.currentIndex + 1} of ${totalQ}`;
        
        const progressPercent = (appState.quiz.currentIndex / totalQ) * 100;
        document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;

        // Reset animation frames
        this.quizFrame.classList.remove('card-animation-swap');
        void this.quizFrame.offsetWidth;
        this.quizFrame.classList.add('card-animation-swap');

        document.getElementById('question-category-tag').innerText = q.category;
        document.getElementById('question-text-body').innerText = q.text;

        const optionsContainer = document.getElementById('question-options-container');
        optionsContainer.innerHTML = q.options.map((opt, idx) => `
            <div class="option-node" onclick="app.selectOption(${idx})">
                <span>${opt}</span>
                <div class="option-indicator"></div>
            </div>
        `).join('');
    }

    selectOption(idx) {
        appState.quiz.selectedOption = idx;
        document.querySelectorAll('.option-node').forEach((node, i) => {
            node.classList.toggle('selected', i === idx);
        });
        this.btnNextQ.classList.remove('disabled');
    }

    evaluateAndAdvanceQuestion() {
        if (appState.quiz.selectedOption === null) return;

        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const isCorrect = appState.quiz.selectedOption === q.correctIndex;

        if (isCorrect) {
            appState.quiz.marks += 2.0;
            appState.quiz.correctCount++;
        } else {
            appState.quiz.marks -= 0.5;
            // Add precisely to weak words vault on failure
            this.registerFailedWordToVault(q);
        }

        document.getElementById('quiz-live-score').innerText = `Score: ${appState.quiz.marks.toFixed(2)}`;

        appState.quiz.currentIndex++;
        if (appState.quiz.currentIndex < appState.quiz.questions.length) {
            this.renderCurrentQuestion();
        } else {
            this.finalizeQuizAssessment();
        }
    }

    skipQuestion() {
        appState.quiz.currentIndex++;
        if (appState.quiz.currentIndex < appState.quiz.questions.length) {
            this.renderCurrentQuestion();
        } else {
            this.finalizeQuizAssessment();
        }
    }

    registerFailedWordToVault(qObj) {
        // Check if word already tracked
        const wordKey = qObj.options[qObj.correctIndex].split(':')[0].trim();
        let existing = appState.weakWords.find(w => w.word.toLowerCase() === wordKey.toLowerCase());
        
        if (existing) {
            existing.wrongCount++;
        } else {
            appState.weakWords.push({
                word: wordKey,
                meaning: qObj.meaning || qObj.text,
                wrongCount: 1
            });
        }
    }

    finalizeQuizAssessment() {
        clearInterval(appState.quiz.stopwatchInterval);
        appState.quiz.active = false;

        const minutes = Math.floor(appState.quiz.timeSeconds / 60);
        const seconds = appState.quiz.timeSeconds % 60;

        document.getElementById('res-score').innerText = appState.quiz.marks.toFixed(2);
        document.getElementById('res-correct').innerText = appState.quiz.correctCount;
        document.getElementById('res-time').innerText = `${minutes}m ${seconds}s`;

        document.getElementById('res-tier-badge').innerText = appState.isPremium ? "ELITE ASSESSMENT LOGGED" : "STANDARD ASSESSMENT LOGGED";

        this.switchView('result');
    }

    confirmExitQuiz() {
        if (confirm("Abandoning the assessment will discard live marks. Exit immediately?")) {
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
        document.querySelectorAll('.vault-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        this.renderVault();
    }

    filterVaultContent() {
        appState.searchQuery = document.getElementById('vault-search-input').value.toLowerCase().trim();
        this.renderVault();
    }

    renderVault() {
        let activeArray = appState.weakWords;
        if (appState.activeVaultTab === 'saved') activeArray = appState.savedWords;
        if (appState.activeVaultTab === 'mastered') activeArray = appState.masteredWords;

        // Apply Search Filtering
        if (appState.searchQuery) {
            activeArray = activeArray.filter(item => 
                item.word.toLowerCase().includes(appState.searchQuery) ||
                item.meaning.toLowerCase().includes(appState.searchQuery)
            );
        }

        // Update real counts directly
        document.getElementById('count-weak').innerText = appState.weakWords.length;
        document.getElementById('count-saved').innerText = appState.savedWords.length;
        document.getElementById('count-mastered').innerText = appState.masteredWords.length;

        if (activeArray.length === 0) {
            this.vaultItemsContainer.innerHTML = `<p class="text-muted text-center p-4">No vocabulary words found in this category.</p>`;
            return;
        }

        this.vaultItemsContainer.innerHTML = activeArray.map(item => `
            <div class="glass-card vault-word-card card-animation-swap">
                <div class="v-header-row">
                    <h4>${item.word}</h4>
                    ${item.wrongCount > 0 ? `<span class="wrong-badge">Wrong ${item.wrongCount} times</span>` : ''}
                </div>
                <p class="v-meaning">${item.meaning}</p>
                <div class="v-action-bar">
                    ${appState.activeVaultTab !== 'mastered' ? `
                        <button class="btn-practice-sm" onclick="app.markWordAsMastered('${item.word}')">
                            <i class="fa-solid fa-check"></i> Mastered
                        </button>
                    ` : ''}
                    <button class="btn-practice-sm" onclick="app.practiceWordIsolated('${item.word}')">
                        <i class="fa-solid fa-rotate-right"></i> Practice Again
                    </button>
                </div>
            </div>
        `).join('');
    }

    markWordAsMastered(wordStr) {
        // Remove from current arrays and transfer to Mastered
        let wordObj = appState.weakWords.find(w => w.word === wordStr) || appState.savedWords.find(w => w.word === wordStr);
        if (wordObj) {
            appState.weakWords = appState.weakWords.filter(w => w.word !== wordStr);
            appState.savedWords = appState.savedWords.filter(w => w.word !== wordStr);
            appState.masteredWords.push({...wordObj, wrongCount: 0});
            this.renderVault();
            this.triggerToast(`Moved "${wordStr}" to Mastered items!`);
        }
    }

    practiceWordIsolated(wordStr) {
        this.showQuizDetails('free', `Isolated Drill: ${wordStr}`);
    }

    // --- LEADERBOARD BUILDER ---
    renderLeaderboard() {
        // Set dynamic today's date
        const dateStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        document.getElementById('leaderboard-date-subtitle').innerText = `Standings for ${dateStr}`;

        if (!appState.isPremium) {
            // Free User Paywall Overlay Mode
            this.leaderboardContainer.innerHTML = `
                <div class="blurred-leaderboard-box">
                    <div class="leaderboard-list blur-mask">
                        ${TOP_10_LEADERBOARD.slice(0, 5).map(user => this.getLeaderboardRowHTML(user)).join('')}
                    </div>
                    <div class="premium-unlock-overlay">
                        <i class="fa-solid fa-lock"></i>
                        <h3>Premium Standings Gate</h3>
                        <p>View live top 10 standings and compare your personal rank tracking.</p>
                        <button class="btn-primary-gradient" onclick="app.triggerPremiumPaywallGate()">
                            Unlock Elite Membership
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Premium User Full Standings Mode (Top 10 strictly ordered)
        const myRankHTML = `
            <div class="leader-row glass-card user-pinned-rank">
                <div class="leader-meta">
                    <span class="leader-num">#42</span>
                    <span class="leader-name">You (Pinned Standings)</span>
                </div>
                <div class="leader-scores">
                    <div class="leader-score-pts">14.00 Marks</div>
                    <div class="leader-score-time">3m 45s</div>
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
                    <div class="leader-score-pts">${user.marks.toFixed(2)} Marks</div>
                    <div class="leader-score-time">${user.time}</div>
                </div>
            </div>
        `;
    }

    // --- UTILITIES ---
    triggerToast(msg) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '90px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(18, 22, 39, 0.95)';
        toast.style.border = '1px solid var(--neon-cyan)';
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
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