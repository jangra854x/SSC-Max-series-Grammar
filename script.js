/**
 * VOCAB MAX ELITE - Core System Engine Architecture Architecture
 * Explicit Single Page Application View Management Framework for Telegram Canvas
 */

// 1. Mock Database Matrix Initialization
const ARCHIVE_FOLDERS = [
    { id: 'f-may', name: 'May 2026 Batch', count: '31 Tests Available' },
    { id: 'f-apr', name: 'April 2026 Archive', count: '30 Tests Available' },
    { id: 'f-mar', name: 'March 2026 Archive', count: '28 Tests Available' },
    { id: 'f-feb', name: 'February 2026 Archive', count: '14 Tests Available' }
];

const PREMIUM_TOPICS = [
    { id: 'syn', name: 'Synonyms Spectrum', count: '45 Advanced Modules', icon: 'fa-arrow-up-a-z' },
    { id: 'ant', name: 'Antonyms Core Matrix', count: '40 High-Yield Modules', icon: 'fa-arrow-down-z-a' },
    { id: 'idi', name: 'Idioms & Phrases Blueprint', count: '60 TCS Target Sets', icon: 'fa-comments' },
    { id: 'phr', name: 'Phrasal Verbs Vector', count: '30 Absolute Standard Sets', icon: 'fa-link' },
    { id: 'ows', name: 'One Word Substitutions', count: '55 High-Frequency Sets', icon: 'fa-user-graduate' },
    { id: 'err', name: 'Error Detection Engine', count: '50 Syntax Splices', icon: 'fa-bug' },
    { id: 'spl', name: 'Spelling Precision Radar', count: '25 Vulnerable Sets', icon: 'fa-spell-check' },
    { id: 'fpx', name: 'Fixed Prepositions Absolute', count: '35 Crucial Vectors', icon: 'fa-anchor' }
];

const LEADERBOARD_DATA = [
    { rank: 1, name: 'Abhishek Sharma', score: 1192, time: '8.4s/q', isTop: true },
    { rank: 2, name: 'Ananya Iyer', score: 1140, time: '9.1s/q', isTop: true },
    { rank: 3, name: 'Vikram Singh', score: 1085, time: '9.8s/q', isTop: true },
    { rank: 4, name: 'Sneha Reddy', score: 998, time: '11.2s/q', isTop: false },
    { rank: 5, name: 'Rahul Verma', score: 965, time: '11.9s/q', isTop: false }
];

const MOCK_QUESTIONS = [
    {
        category: 'Synonyms',
        text: 'Select the most appropriate synonym of the given word: "PERSPICACIOUS"',
        options: ['Shrewd and discerning', 'Vague and ambiguous', 'Extremely fragile', 'Dull-witted'],
        correctIndex: 0
    },
    {
        category: 'Idioms',
        text: 'Identify the contextually correct meaning of the underlined idiom: "He threw down the gauntlet before his competitors."',
        options: ['To accept defeat quietly', 'To issue a formal challenge', 'To offer financial bribery', 'To escape from risk vectors'],
        correctIndex: 1
    },
    {
        category: 'Fixed Prepositions',
        text: 'Complete the sentence with precision: "The standard matrix is fully conducive _______ sustainable long-term yields."',
        options: ['with', 'for', 'to', 'at'],
        correctIndex: 2
    },
    {
        category: 'Error Detection',
        text: 'Locate the structural syntax anomaly: "Hardly had the invigilator distributed the elite evaluation matrices / when the system crashed / than the power failed."',
        options: ['Hardly had the invigilator distributed', 'when the system crashed', 'than the power failed', 'No Error Structure'],
        correctIndex: 2
    },
    {
        category: 'Antonyms',
        text: 'Select the absolute antonym of the parameter asset: "EVANESCENT"',
        options: ['Ephemeral and fleeting', 'Perpetual and enduring', 'Chemically unstable', 'Lacking explicit brilliance'],
        correctIndex: 1
    }
];

// 2. Global State Storage Node
let appState = {
    currentView: 'dashboard',
    vaultActiveTab: 'weak',
    weakWords: [
        { word: 'Perspicacious', mean: 'Having ready insight into things; shrewd.', context: 'SSC CGL Tier-II 2024' },
        { word: 'Evanescent', mean: 'Soon passing out of sight, memory, or existence.', context: 'SSC CHSL 2025' }
    ],
    bookmarks: [
        { word: 'Gauntlet', mean: 'An explicit functional challenge or structural dare.', context: 'Idioms Core Blueprint' }
    ],
    quiz: {
        active: false,
        title: '',
        type: '',
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        score: 0.0,
        correctCount: 0,
        incorrectCount: 0,
        timeStarted: null,
        timerInterval: null,
        durationSeconds: 900 // 15 Mins
    }
};

// 3. Application System Kernel Controller
class VocabMaxEliteEngine {
    constructor() {
        this.initDOM();
        this.bindGlobalEvents();
        this.renderStaticTemplates();
    }

    initDOM() {
        this.viewContainer = document.getElementById('view-container');
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.freeFoldersContainer = document.getElementById('free-folders-container');
        this.premiumTopicsContainer = document.getElementById('premium-topics-container');
        this.vaultItemsContainer = document.getElementById('vault-items-container');
        this.leaderboardItemsContainer = document.getElementById('leaderboard-items-container');
        
        // Quiz DOM linkages
        this.quizFrame = document.getElementById('question-card-frame');
        this.btnNextQ = document.getElementById('btn-next-q');
        this.btnSkipQ = document.getElementById('btn-skip-q');
    }

    bindGlobalEvents() {
        // Tab routing event allocation matrix
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                this.switchView(target);
            });
        });

        // Quiz control nodes binding mechanics
        this.btnNextQ.addEventListener('click', () => this.processNextQuestion());
        this.btnSkipQ.addEventListener('click', () => this.processSkipQuestion());
    }

    renderStaticTemplates() {
        // Build folders loop
        this.freeFoldersContainer.innerHTML = ARCHIVE_FOLDERS.map(f => `
            <div class="folder-card glass-card" onclick="app.triggerToast('Archived test folder requested. Loading parameters...')">
                <div class="folder-icon"><i class="fa-solid fa-folder-closed"></i></div>
                <div class="folder-details">
                    <h4>${f.name}</h4>
                    <p>${f.count}</p>
                </div>
            </div>
        `).join('');

        // Build premium topics matrix loop
        this.premiumTopicsContainer.innerHTML = PREMIUM_TOPICS.map(t => `
            <div class="topic-item-card glass-card" onclick="app.startQuiz('${t.name}', 'premium')">
                <div class="topic-meta-info">
                    <div class="topic-decor-box"><i class="fa-solid ${t.icon}"></i></div>
                    <div class="topic-headline">
                        <h4>${t.name}</h4>
                        <p>${t.count}</p>
                    </div>
                </div>
                <div class="topic-action-arrow"><i class="fa-solid fa-chevron-right"></i></div>
            </div>
        `).join('');

        this.renderVault();
        this.renderLeaderboard();
    }

    // SPA Core Router Switch Interface
    switchView(viewId) {
        // Invalidate active quiz state context safety block
        if (appState.quiz.active && viewId !== 'quiz' && viewId !== 'result') {
            if (!confirm('Active quiz matrix session in progress. Abandon parameters?')) return;
            this.exitQuiz();
        }

        const currentActiveView = document.querySelector('.app-view.active');
        if (currentActiveView) {
            currentActiveView.classList.remove('active');
        }

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            appState.currentView = viewId;
        }

        // Adjust Bottom tab navigation active states dynamically
        this.navTabs.forEach(tab => {
            if (tab.getAttribute('data-target') === viewId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Context-driven live rendering refreshes
        if (viewId === 'vault') this.renderVault();
        if (viewId === 'leaderboard') this.renderLeaderboard();
    }

    // Vault Data Renderer Allocation
    renderVault() {
        const sourceData = appState.vaultActiveTab === 'weak' ? appState.weakWords : appState.bookmarks;
        if (sourceData.length === 0) {
            this.vaultItemsContainer.innerHTML = `<p class="sub-text text-center p-4">No words loaded in this optimization vector.</p>`;
            return;
        }

        this.vaultItemsContainer.innerHTML = sourceData.map((item, index) => `
            <div class="vault-item-card glass-card card-animation-swap">
                <div class="v-card-main">
                    <h4>${item.word}</h4>
                    <p>${item.mean}</p>
                    <div class="v-card-details-sub"><i class="fa-solid fa-layer-group"></i> ${item.context}</div>
                </div>
                <div class="v-action-btn-group">
                    <button class="btn-icon-vault ${appState.vaultActiveTab === 'bookmarks' ? 'active-bookmark' : ''}" 
                            onclick="app.toggleBookmarkAction(${index})">
                        <i class="fa-solid fa-bookmark"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    toggleVaultTab(tabKey) {
        appState.vaultActiveTab = tabKey;
        const buttons = document.querySelectorAll('.vault-tab-btn');
        buttons[0].classList.toggle('active', tabKey === 'weak');
        buttons[1].classList.toggle('active', tabKey === 'bookmarks');
        this.renderVault();
    }

    toggleBookmarkAction(index) {
        this.triggerToast("Premium state sync action executed successfully.");
    }

    // Leaderboard Live Context Engine Populate
    renderLeaderboard() {
        this.leaderboardItemsContainer.innerHTML = LEADERBOARD_DATA.map(l => `
            <div class="leader-row glass-card">
                <div class="leader-meta">
                    <span class="leader-num ${l.isTop ? 'top-3' : ''}">#${l.rank}</span>
                    <div class="leader-name-block">
                        <h5>${l.name}</h5>
                        <p>Verified Candidate Tier</p>
                    </div>
                </div>
                <div class="leader-scores">
                    <div class="leader-score-pts">${l.score} XP</div>
                    <div class="leader-score-time">${l.time}</div>
                </div>
            </div>
        `).join('');
    }

    // Live High Fidelity Quiz Simulation Matrix Controls
    startQuiz(title, type) {
        appState.quiz.active = true;
        appState.quiz.title = title;
        appState.quiz.type = type;
        appState.quiz.questions = [...MOCK_QUESTIONS].sort(() => 0.5 - Math.random()); // Pure randomization pattern
        appState.quiz.currentIndex = 0;
        appState.quiz.selectedOption = null;
        appState.quiz.score = 0.0;
        appState.quiz.correctCount = 0;
        appState.quiz.incorrectCount = 0;
        appState.quiz.timeStarted = Date.now();
        appState.quiz.durationSeconds = type === 'free' ? 300 : 900;

        document.getElementById('quiz-title-display').innerText = title;
        this.switchView('quiz');
        this.startQuizTimer();
        this.loadQuestionIndex();
    }

    startQuizTimer() {
        clearInterval(appState.quiz.timerInterval);
        let timeRemaining = appState.quiz.durationSeconds;

        const updateClockDisplay = () => {
            const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
            const s = (timeRemaining % 60).toString().padStart(2, '0');
            document.getElementById('quiz-timer-clock').innerText = `${m}:${s}`;
        };

        updateClockDisplay();
        appState.quiz.timerInterval = setInterval(() => {
            timeRemaining--;
            updateClockDisplay();

            if (timeRemaining <= 0) {
                clearInterval(appState.quiz.timerInterval);
                this.computeAndRenderFinalResult();
            }
        }, 1000);
    }

    loadQuestionIndex() {
        const q = appState.quiz.questions[appState.quiz.currentIndex];
        appState.quiz.selectedOption = null;

        // Reset control elements state
        this.btnNextQ.classList.add('disabled');

        // Render Meta calculations
        const totalQ = appState.quiz.questions.length;
        document.getElementById('quiz-question-counter').innerText = `Question ${appState.quiz.currentIndex + 1} of ${totalQ}`;
        const fillPercent = ((appState.quiz.currentIndex) / totalQ) * 100;
        document.getElementById('quiz-progress-fill').style.width = `${fillPercent}%`;

        // Load card frames with visual keyframes refresh
        this.quizFrame.classList.remove('card-animation-swap');
        void this.quizFrame.offsetWidth; // Trigger DOM reflow calculation logic
        this.quizFrame.classList.add('card-animation-swap');

        document.getElementById('question-category-tag').innerText = q.category;
        document.getElementById('question-text-body').innerText = q.text;

        // Populate option array components
        const container = document.getElementById('question-options-container');
        container.innerHTML = q.options.map((opt, idx) => `
            <div class="option-node" id="opt-node-${idx}" onclick="app.selectQuizOption(${idx})">
                <span>${opt}</span>
                <div class="option-indicator"></div>
            </div>
        `).join('');
    }

    selectQuizOption(index) {
        appState.quiz.selectedOption = index;
        const allNodes = document.querySelectorAll('.option-node');
        allNodes.forEach((node, idx) => {
            node.classList.toggle('selected', idx === index);
        });
        this.btnNextQ.classList.remove('disabled');
    }

    processNextQuestion() {
        if (appState.quiz.selectedOption === null) return;

        const q = appState.quiz.questions[appState.quiz.currentIndex];
        const isCorrect = appState.quiz.selectedOption === q.correctIndex;

        // Apply negative structure metrics calculus formulas
        if (isCorrect) {
            appState.quiz.score += 2.0;
            appState.quiz.correctCount++;
        } else {
            appState.quiz.score -= 0.5;
            appState.quiz.incorrectCount++;
        }

        // Realtime sync updates to tracking badges
        document.getElementById('quiz-live-score').innerText = (appState.quiz.score >= 0 ? '+' : '') + appState.quiz.score.toFixed(2);

        this.proceedToNextSequence();
    }

    processSkipQuestion() {
        this.proceedToNextSequence();
    }

    proceedToNextSequence() {
        appState.quiz.currentIndex++;
        if (appState.quiz.currentIndex < appState.quiz.questions.length) {
            this.loadQuestionIndex();
        } else {
            this.computeAndRenderFinalResult();
        }
    }

    computeAndRenderFinalResult() {
        clearInterval(appState.quiz.timerInterval);
        appState.quiz.active = false;

        // Metric computations
        const totalQuestions = appState.quiz.questions.length;
        const accuracy = totalQuestions > 0 ? Math.round((appState.quiz.correctCount / totalQuestions) * 100) : 0;
        const timeElapsedSeconds = Math.floor((Date.now() - appState.quiz.timeStarted) / 1000);
        const elapsedMin = Math.floor(timeElapsedSeconds / 60);
        const elapsedSec = timeElapsedSeconds % 60;

        // Apply values to UI nodes
        document.getElementById('res-score').innerText = appState.quiz.score.toFixed(2);
        document.getElementById('res-accuracy').innerText = `${accuracy}%`;
        document.getElementById('res-time').innerText = `${elapsedMin}m ${elapsedSec}s`;

        // Dynamically compute Rank assignment based on accuracy scoring matrices
        let rankBadge = 'ELITE INITIATE';
        let feedback = 'Focus on processing weak core syntax frameworks to unlock higher algorithmic score distributions.';

        if (appState.quiz.score >= 7) {
            rankBadge = 'ALCHEMIST GOLD';
            feedback = 'Phenomenal precision velocity. Your contextual parsing vector is completely optimized for premium tier scaling.';
        } else if (appState.quiz.score >= 4) {
            rankBadge = 'STRATEGIST SILVER';
            feedback = 'Solid performance framework. Strengthen idioms precision parameters to solidify stability trends.';
        }

        document.getElementById('res-rank-badge').innerText = rankBadge;
        document.getElementById('res-feedback').innerText = feedback;

        this.switchView('result');
    }

    exitQuiz() {
        clearInterval(appState.quiz.timerInterval);
        appState.quiz.active = false;
        this.switchView('dashboard');
    }

    // High Fidelity Utility Component Bridge
    triggerToast(message) {
        // Fallback interface bridge for structural visual confirmations
        const alertToast = document.createElement('div');
        alertToast.style.position = 'fixed';
        alertToast.style.bottom = '90px';
        alertToast.style.left = '50%';
        alertToast.style.transform = 'translateX(-50%)';
        alertToast.style.background = 'rgba(18, 22, 39, 0.95)';
        alertToast.style.border = '1px solid var(--neon-cyan)';
        alertToast.style.color = 'var(--text-primary)';
        alertToast.style.padding = '10px 20px';
        alertToast.style.borderRadius = '30px';
        alertToast.style.fontSize = '0.8rem';
        alertToast.style.fontWeight = '600';
        alertToast.style.zIndex = '9999';
        alertToast.style.boxShadow = '0 0 15px var(--neon-cyan-glow)';
        alertToast.innerText = message;
        
        document.body.appendChild(alertToast);
        setTimeout(() => alertToast.remove(), 2500);
    }
}

// Instantiate engine onto window matrix frame
window.addEventListener('DOMContentLoaded', () => {
    window.app = new VocabMaxEliteEngine();
});