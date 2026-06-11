/**
 * VOCABULARY MAX ELITE PLATINUM PLATFORM CORE ENGINE
 * Synchronization Baseline: June 11, 2026
 * Architecture Matrix: Unified Single Page Application (SPA)
 */

// Global System Configuration State Machine Matrix Tracker
let engineState = {
    currentZone: 'Free',         // Free or Premium
    selectedTopic: 'Mega Mix',   // Stores target key context
    selectedDate: '',            // Mapped on click trigger
    timerSetting: 15,            // Custom time allocation per question
    negativeMarking: 0.50,       // Strict standard penalty format
    
    // Test Arena Session Cache
    questionsPool: [],
    currentQIdx: 0,
    userScore: 0.0,
    userPenalty: 0.0,
    correctCount: 0,
    quizTimerRef: null,
    timeSpentSeconds: 0,
    sessionTimerInterval: null,
    isOptionLocked: false,
    
    // Global User Database Emulation Mappings
    bookmarksVault: [
        { word: "Ambiguous", definition: "Having a double meaning; unclear.", wrongCount: 3 },
        { word: "Ephemeral", definition: "Lasting for a very short time.", wrongCount: 1 }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    // Dissolve loader framing node loops on startup
    executeGlobalEngineBoot();
});

function executeGlobalEngineBoot() {
    const loaderNode = document.getElementById('loader');
    if (loaderNode) {
        window.addEventListener('load', () => { clearLoaderOverlay(loaderNode); });
        if (document.readyState === 'complete') { clearLoaderOverlay(loaderNode); }
    }
}

function clearLoaderOverlay(node) {
    setTimeout(() => {
        node.style.opacity = '0';
        setTimeout(() => { node.style.display = 'none'; }, 400);
    }, 450);
}

/**
 * SPA Route Switch Engine
 */
function switchView(targetViewId) {
    const loaderNode = document.getElementById('loader');
    loaderNode.style.display = 'flex';
    loaderNode.style.opacity = '1';

    setTimeout(() => {
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active-view'));

        const activeTarget = document.getElementById(targetViewId);
        if (activeTarget) {
            activeTarget.classList.add('active-view');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        loaderNode.style.opacity = '0';
        setTimeout(() => { loaderNode.style.display = 'none'; }, 300);
    }, 200);
}

/**
 * Generates Adaptive Date Directory Sequences starting backwards from June 11, 2026
 */
function compileEngineDateStructures() {
    // Fixed reference point: June 11, 2026
    return [
        { monthName: "JUNE 2026", isActive: true, dates: ["11 June 2026", "10 June 2026", "09 June 2026", "08 June 2026"] },
        { monthName: "MAY 2026", isActive: false, dates: ["31 May 2026", "25 May 2026", "18 May 2026", "12 May 2026"] },
        { monthName: "APRIL 2026", isActive: false, dates: ["30 April 2026", "20 April 2026", "10 April 2026", "01 April 2026"] }
    ];
}

/**
 * Populates Dynamic Folder Accordions for Free / Premium view transitions
 */
function openMonthSelection(zoneType) {
    engineState.currentZone = zoneType;
    const rootContainer = document.getElementById('accordion-months-root');
    const headerTitle = document.getElementById('target-zone-title-tag');
    
    if (!rootContainer) return;
    rootContainer.innerHTML = ''; // Sanitize structure logs

    headerTitle.innerText = zoneType === 'Free' ? 'FREE ARENA' : 'ELITE ARCHIVE';
    headerTitle.className = zoneType === 'Free' ? 'zone-tag text-cyan' : 'zone-tag text-gold';

    const directoryDataset = compileEngineDateStructures();

    directoryDataset.forEach((monthData, index) => {
        const itemShell = document.createElement('div');
        itemShell.className = `accordion-month-item ${index === 0 ? 'expanded' : ''}`;
        
        let datesHTML = '';
        monthData.dates.forEach(dateStr => {
            if (zoneType === 'Free') {
                datesHTML += `
                    <div class="date-drill-row">
                        <div class="date-drill-meta">
                            <span class="primary-d-text">${dateStr}</span>
                            <span class="secondary-d-text"><i class="fa-solid fa-layer-group"></i> Daily Free Mix (20 Qs)</span>
                        </div>
                        <button class="launch-sprint-trigger-btn" onclick="openQuizConfigSheet('${dateStr}', 'Daily Free Mix')">Start</button>
                    </div>`;
            } else {
                datesHTML += `
                    <div class="date-drill-row">
                        <div class="date-drill-meta">
                            <span class="primary-d-text">${dateStr}</span>
                            <span class="secondary-d-text"><i class="fa-solid fa-crown text-gold"></i> Elite Vault Sessions Mapped</span>
                        </div>
                        <button class="launch-sprint-trigger-btn btn-premium-launch" onclick="navigateToPremiumTopicDashboard('${dateStr}')">Open ➔</button>
                    </div>`;
            }
        });

        itemShell.innerHTML = `
            <div class="accordion-month-header" onclick="toggleAccordionFolderNode(this)">
                <h3>${monthData.monthName}</h3>
                <div class="month-status-indicators">
                    ${monthData.isActive ? '<span class="active-month-dot-tag">ACTIVE MONTH</span>' : ''}
                    <i class="fa-solid fa-chevron-down chevron-rotate-icon"></i>
                </div>
            </div>
            <div class="accordion-dates-drawer">
                ${datesHTML}
            </div>
        `;
        rootContainer.appendChild(itemShell);
    });

    switchView('view-month-selector');
}

function toggleAccordionFolderNode(headerElement) {
    const parentNode = headerElement.parentElement;
    parentNode.classList.toggle('expanded');
}

function navigateToPremiumTopicDashboard(targetDate) {
    engineState.selectedDate = targetDate;
    switchView('view-premium-topics');
}

function triggerPremiumTargetConfig(displayTitle, internalKey) {
    engineState.selectedTopic = internalKey;
    openQuizConfigSheet(engineState.selectedDate, displayTitle);
}

/**
 * 🎫 BOTTOM SHEET CONTROLLER INTERFACES
 */
function openQuizConfigSheet(dateStr, topicTitle) {
    if (engineState.currentZone === 'Free') {
        engineState.selectedDate = dateStr;
        engineState.selectedTopic = 'Daily Free Mix';
    }
    
    document.getElementById('sheet-target-title').innerText = topicTitle;
    document.getElementById('sheet-target-subtitle').innerText = `${engineState.selectedDate} • Mapped Parameters`;
    
    document.getElementById('bottom-sheet-modal').classList.add('display-active');
}

function closeQuizConfigSheet() {
    document.getElementById('bottom-sheet-modal').classList.remove('display-active');
}

function setTimerConfigState(secondsVal) {
    engineState.timerSetting = secondsVal;
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active-seg'));
    
    if(secondsVal === 10) document.getElementById('timer-opt-10').classList.add('active-seg');
    else if(secondsVal === 15) document.getElementById('timer-opt-15').classList.add('active-seg');
    else document.getElementById('timer-opt-0').classList.add('active-seg');
}

/**
 * 🎯 QUIZ RUNTIME INTERACTION ENGINE MATRIX
 */
function igniteQuizArenaSession() {
    closeQuizConfigSheet();
    
    // Inject Mock Questions Matrix Pool for Sandbox Environment Execution Logs
    engineState.questionsPool = [
        { type: "SYNONYM", q: "What is the synonym of 'ABERRATION'?", o: ["Normalcy", "Deviation", "Conformity", "Stability"], a: 1 },
        { type: "IDIOM", q: "To 'burn the midnight oil' means?", o: ["To work late into the night", "To waste money", "To cook food", "To create a fire"], a: 0 },
        { type: "GRAMMER ERROR", q: "Identify the error segment: 'He do not / have any / money left / with him.'", o: ["He do not", "have any", "money left", "with him."], a: 0 }
    ];

    engineState.currentQIdx = 0;
    engineState.userScore = 0.0;
    engineState.userPenalty = 0.0;
    engineState.correctCount = 0;
    engineState.timeSpentSeconds = 0;
    
    // Start session timer tracking clock loop
    clearInterval(engineState.sessionTimerInterval);
    engineState.sessionTimerInterval = setInterval(() => { engineState.timeSpentSeconds++; }, 1000);

    renderQuizQuestionLayerStep();
    switchView('view-quiz-arena');
}

function renderQuizQuestionLayerStep() {
    engineState.isOptionLocked = false;
    clearInterval(engineState.quizTimerRef);

    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    
    // Setup HUD telemetry mappings
    document.getElementById('quiz-progress-txt').innerText = `${engineState.currentQIdx + 1}/${engineState.questionsPool.length}`;
    document.getElementById('live-score-val').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-val').innerText = engineState.userPenalty.toFixed(2);
    document.getElementById('question-type-badge').innerText = currentQ.type;
    document.getElementById('live-question-text').innerText = currentQ.q;

    // Verify bookmark indicator configurations
    updateBookmarkIconDisplay();

    // Render option stack blocks mapping grid arrays
    const optionsRoot = document.getElementById('live-quiz-options-root');
    optionsRoot.innerHTML = '';
    
    const indexAlphas = ['A', 'B', 'C', 'D'];
    currentQ.o.forEach((optionTxt, idx) => {
        const optionNode = document.createElement('div');
        optionNode.className = 'option-snap-node';
        optionNode.onclick = () => { evaluateSelectedOptionSnap(idx, optionNode); };
        optionNode.innerHTML = `
            <div class="option-alpha-index">${indexAlphas[idx]}</div>
            <div class="option-text-payload">${optionTxt}</div>
        `;
        optionsRoot.appendChild(optionNode);
    });

    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.classList.remove('ready-trigger');
    nextBtn.innerText = "Skip Question";

    // Launch AI Countdown Line Vector Throttle if selected
    if (engineState.timerSetting > 0) {
        initializeCountdownVectorLine(engineState.timerSetting);
    } else {
        document.getElementById('timer-progress-fill').style.width = '100%';
    }
}

function initializeCountdownVectorLine(duration) {
    const fillNode = document.getElementById('timer-progress-fill');
    let timeRemaining = duration;
    fillNode.style.width = '100%';

    engineState.quizTimerRef = setInterval(() => {
        timeRemaining -= 0.1;
        let percentage = (timeRemaining / duration) * 100;
        fillNode.style.width = `${percentage}%`;

        if (timeRemaining <= 0) {
            clearInterval(engineState.quizTimerRef);
            enforceTimeoutInterceptionFallback();
        }
    }, 100);
}

function evaluateSelectedOptionSnap(selectedIdx, uiNode) {
    if (engineState.isOptionLocked) return;
    engineState.isOptionLocked = true;
    clearInterval(engineState.quizTimerRef);

    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    const allOptionsNodes = document.querySelectorAll('.option-snap-node');

    if (selectedIdx === currentQ.a) {
        uiNode.classList.add('state-correct');
        engineState.userScore += 2.0;
        engineState.correctCount++;
    } else {
        uiNode.classList.add('state-wrong');
        allOptionsNodes[currentQ.a].classList.add('state-correct'); // Reveal map target correct location match
        engineState.userPenalty += engineState.negativeMarking;
        engineState.userScore -= engineState.negativeMarking;
    }

    document.getElementById('live-score-val').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-val').innerText = engineState.userPenalty.toFixed(2);

    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.classList.add('ready-trigger');
    nextBtn.innerHTML = `Next Sequence <i class="fa-solid fa-angles-right"></i>`;
}

function enforceTimeoutInterceptionFallback() {
    engineState.isOptionLocked = true;
    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    const allOptionsNodes = document.querySelectorAll('.option-snap-node');
    
    // Automatically flag correct option target, punish user score matrix logs
    allOptionsNodes[currentQ.a].classList.add('state-correct');
    engineState.userPenalty += engineState.negativeMarking;
    engineState.userScore -= engineState.negativeMarking;

    document.getElementById('live-score-val').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-val').innerText = engineState.userPenalty.toFixed(2);

    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.classList.add('ready-trigger');
    nextBtn.innerHTML = `Timeout! Next <i class="fa-solid fa-angles-right"></i>`;
}

function advanceQuizArenaStep() {
    if (!engineState.isOptionLocked) {
        // Skipped Question Route Execution Handler
        clearInterval(engineState.quizTimerRef);
    }

    engineState.currentQIdx++;
    if (engineState.currentQIdx < engineState.questionsPool.length) {
        renderQuizQuestionLayerStep();
    } else {
        compileFinalSessionMetricsAndReveal();
    }
}

/**
 * 👑 HOLOGRAPHIC REVEAL METRICS COMPILER
 */
function compileFinalSessionMetricsAndReveal() {
    clearInterval(engineState.sessionTimerInterval);
    clearInterval(engineState.quizTimerRef);

    // Build metric outputs parameters mapping rules
    const netScore = engineState.userScore;
    const totalQuestions = engineState.questionsPool.length;
    const rawAccuracy = Math.round((engineState.correctCount / totalQuestions) * 100);
    
    // Time formatter mapping
    const mins = Math.floor(engineState.timeSpentSeconds / 60);
    const secs = engineState.timeSpentSeconds % 60;

    document.getElementById('res-score').innerText = netScore.toFixed(2);
    document.getElementById('res-accuracy').innerText = `${rawAccuracy}%`;
    document.getElementById('res-time').innerText = `${mins}m ${secs}s`;
    document.getElementById('res-correct').innerText = `${engineState.correctCount}/${totalQuestions}`;

    // Evaluate badge level allocation thresholds logic mapping rules
    const titleNode = document.getElementById('result-badge-title');
    const iconNode = document.getElementById('result-badge-icon');

    if (rawAccuracy === 100) {
        titleNode.innerText = "VOCAB GOD";
        iconNode.innerHTML = `<i class="fa-solid fa-crown" style="color:var(--neon-gold)"></i>`;
    } else if (rawAccuracy >= 85) {
        titleNode.innerText = "SHARPSHOOTER";
        iconNode.innerHTML = `<i class="fa-solid fa-bolt-lightning" style="color:var(--neon-cyan)"></i>`;
    } else if (rawAccuracy >= 60) {
        titleNode.innerText = "WARRIOR";
        iconNode.innerHTML = `<i class="fa-solid fa-shield" style="color:#fff"></i>`;
    } else {
        titleNode.innerText = "RECRUIT";
        iconNode.innerHTML = `<i class="fa-solid fa-book-open" style="color:var(--text-slate)"></i>`;
    }

    switchView('view-result-panel');
}

function abortQuizArenaSession() {
    if (confirm("क्या आप सच में इस लाइव टेस्ट को छोड़ना चाहते हैं? आपकी प्रोग्रेस सेव नहीं होगी।")) {
        clearInterval(engineState.quizTimerRef);
        clearInterval(engineState.sessionTimerInterval);
        switchView('view-dashboard');
    }
}

/**
 * 🔖 SMART VAULT MEMORY SYSTEM CORE HANDLERS
 */
function toggleCurrentQuestionBookmark() {
    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    const existsIdx = engineState.bookmarksVault.findIndex(b => b.word === currentQ.type);

    if (existsIdx > -1) {
        engineState.bookmarksVault.splice(existsIdx, 1);
    } else {
        engineState.bookmarksVault.push({
            word: currentQ.type + " Sample Q",
            definition: currentQ.q,
            wrongCount: 1
        });
    }
    updateBookmarkIconDisplay();
}

function updateBookmarkIconDisplay() {
    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    const icon = document.getElementById('bookmark-icon-target');
    const exists = engineState.bookmarksVault.some(b => b.word.startsWith(currentQ.type));
    
    if (exists) {
        icon.className = 'fa-solid fa-bookmark';
    } else {
        icon.className = 'fa-regular fa-bookmark';
    }
}

function openUniversalVault() {
    const root = document.getElementById('vault-dynamic-stack');
    if (!root) return;
    root.innerHTML = '';

    if (engineState.bookmarksVault.length === 0) {
        root.innerHTML = `<p style="text-align:center;color:var(--text-slate);font-size:0.85rem;padding:20px;">Your Vault is empty.</p>`;
    }

    engineState.bookmarksVault.forEach((item, idx) => {
        const node = document.createElement('div');
        node.className = 'vault-card-node fade-in';
        node.innerHTML = `
            <div class="vault-word-block">
                <h4>${item.word}</h4>
                <p>${item.definition}</p>
                <span class="error-badge-count">Failed ${item.wrongCount} Times</span>
            </div>
            <button class="vault-action-clear-btn" onclick="clearVaultItem(${idx})">Mastered ✓</button>
        `;
        root.appendChild(node);
    });
    switchView('view-vault-hub');
}

function clearVaultItem(idx) {
    engineState.bookmarksVault.splice(idx, 1);
    openUniversalVault(); // Rerender
}

/**
 * 🏆 DATE-WISE DIVIDED LEADERBOARD GENERATION MATRICES
 */
function openLeaderboardHub() {
    const root = document.getElementById('leaderboard-dynamic-list');
    if (!root) return;
    root.innerHTML = '';

    // Mock Payload Arrays showing Date-wise split implementation with microsecond tie breakers
    const leaderboardMockData = [
        { name: "Rahul Kumar", date: "11 June 2026", score: 40.00, time: "1m 12s", rank: 1 },
        { name: "Aman Sharma", date: "11 June 2026", score: 38.50, time: "1m 05s", rank: 2 },
        { name: "Priya Singh", date: "11 June 2026", score: 38.50, time: "1m 45s", rank: 3 } // Priya has same score but more time taken, lower rank!
    ];

    leaderboardMockData.forEach(user => {
        const row = document.createElement('div');
        row.className = `rank-row-item fade-in ${user.rank === 1 ? 'gold-rank' : ''}`;
        row.innerHTML = `
            <div class="rank-num-badge">${user.rank}</div>
            <div class="user-identity-meta">
                <h4>${user.name}</h4>
                <p>Time Taken: ${user.time} • ${user.date}</p>
            </div>
            <div class="rank-score-metric">${user.score.toFixed(2)}</div>
        `;
        root.appendChild(row);
    });

    switchView('view-leaderboard-hub');
}

function triggerMicroHaptic() {
    console.log("[HAPTIC ENGINE] Simulated micro spark event on click interaction.");
}