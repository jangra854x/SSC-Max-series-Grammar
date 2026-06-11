/**
 * VOCAB ELITE ENGINE - CRIMSON VOID EDITION 3.0
 * Deep Integrated Telegram WebApp SPA Architecture
 */

// Global System Matrix
let engineState = {
    currentZone: 'Free',
    selectedMonth: '',
    selectedDate: '',
    selectedTopic: '',
    timerSetting: 15,
    negativeMarking: 0.50,
    
    // Runtime Execution Variables
    questionsPool: [],
    currentQIdx: 0,
    userScore: 0.0,
    userPenalty: 0.0,
    correctCount: 0,
    quizTimerRef: null,
    timeSpentSeconds: 0,
    sessionTimerInterval: null,
    isOptionLocked: false,
    
    // Memory Vault
    bookmarksVault: []
};

// 🧭 Advanced Routing Stack for Telegram Back Button Interaction
let viewHistoryStack = ['view-dashboard'];
const tg = window.Telegram.WebApp;

document.addEventListener('DOMContentLoaded', () => {
    initTelegramCore();
    executeEngineBootSequence();
});

/**
 * TELEGRAM SDK INTEGRATION CORE
 */
function initTelegramCore() {
    tg.ready();
    tg.expand(); // Forces full height, pushes content below safe areas
    tg.setHeaderColor('#050508');
    tg.setBackgroundColor('#050508');
    
    // Hook Native Hardware Back Button
    tg.BackButton.onClick(() => {
        executeBackNavigation();
    });
    
    fetchLiveUserProfile();
}

function fetchLiveUserProfile() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (user) {
            document.getElementById('user-name').innerText = `${user.first_name} ${user.last_name || ''}`.trim();
            document.getElementById('user-handle').innerText = user.username ? `@${user.username}` : `UID: ${user.id}`;
            if (user.photo_url) {
                document.getElementById('user-avatar').src = user.photo_url;
            }
        }
    } catch (e) {
        console.warn("Local env: Telegram profile spoofing active.");
    }
}

// Global Haptic Feedback Interface
function triggerHaptic(style = 'medium') {
    try {
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred(style);
        }
    } catch (err) {}
}

/**
 * 🧭 SPA VIEW ROUTING & HISTORY MANAGER
 */
function routeToView(targetViewId, direction = 'forward') {
    if (direction === 'forward') {
        triggerHaptic('heavy');
        viewHistoryStack.push(targetViewId);
    }
    
    // Toggle Native Telegram Back Button visibility
    if (viewHistoryStack.length > 1) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }

    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    loader.style.opacity = '1';

    setTimeout(() => {
        document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active-view'));
        const target = document.getElementById(targetViewId);
        if (target) {
            target.classList.add('active-view');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 250);
    }, 150);
}

function executeBackNavigation() {
    triggerHaptic('medium');
    if (viewHistoryStack.length > 1) {
        viewHistoryStack.pop(); // Remove current
        const previousView = viewHistoryStack[viewHistoryStack.length - 1];
        routeToView(previousView, 'backward');
    }
}

function routeBackToHome() {
    viewHistoryStack = ['view-dashboard'];
    routeToView('view-dashboard', 'backward');
}

/**
 * BOOT & LOADER
 */
function executeEngineBootSequence() {
    const loader = document.getElementById('loader');
    if (loader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => { loader.style.display = 'none'; }, 400);
            }, 600);
        });
    }
}

/**
 * 🗂️ LAYER 1: MONTHS DIRECTORY ENGINE
 */
function routeToMonths(zoneType) {
    engineState.currentZone = zoneType;
    document.getElementById('zone-indicator-month').innerText = zoneType === 'Free' ? 'FREE ARENA' : 'ELITE VAULT';
    
    const root = document.getElementById('months-dynamic-grid');
    root.innerHTML = '';
    
    const monthsData = ['June 2026', 'May 2026', 'April 2026', 'March 2026', 'February 2026', 'January 2026'];
    
    monthsData.forEach(month => {
        const card = document.createElement('div');
        card.className = 'grid-item-card fade-in';
        card.innerText = month.toUpperCase();
        card.onclick = () => openDatesDirectory(month);
        root.appendChild(card);
    });

    routeToView('view-months');
}

/**
 * 🗂️ LAYER 2: DATES DIRECTORY ENGINE (Replaced Accordions)
 */
function openDatesDirectory(monthStr) {
    engineState.selectedMonth = monthStr;
    document.getElementById('zone-indicator-date').innerText = monthStr.toUpperCase();
    
    const root = document.getElementById('dates-dynamic-stack');
    root.innerHTML = '';
    
    // Simulate 10 days for target month
    for (let i = 10; i >= 1; i--) {
        const dateStr = `${i < 10 ? '0'+i : i} ${monthStr}`;
        const row = document.createElement('div');
        row.className = 'date-row-ui fade-in';
        
        let subText = engineState.currentZone === 'Free' ? 'Daily Free Mix (20 Qs)' : 'Premium Topic Access';
        
        row.innerHTML = `
            <div>
                <span class="date-meta">${dateStr}</span>
                <span class="date-sub"><i class="fa-solid ${engineState.currentZone === 'Free' ? 'fa-bolt' : 'fa-crown text-orange'}"></i> ${subText}</span>
            </div>
            <i class="fa-solid fa-chevron-right text-slate"></i>
        `;
        
        row.onclick = () => {
            engineState.selectedDate = dateStr;
            if (engineState.currentZone === 'Free') {
                engineState.selectedTopic = 'Daily Free Mix';
                openQuizConfigSheet(dateStr, 'Daily Free Mix');
            } else {
                routeToView('view-premium-topics');
            }
        };
        
        root.appendChild(row);
    }
    
    routeToView('view-dates');
}

function triggerPremiumTargetConfig(displayTitle, internalKey) {
    triggerHaptic('light');
    engineState.selectedTopic = internalKey;
    openQuizConfigSheet(engineState.selectedDate, displayTitle);
}

/**
 * 🎫 BOTTOM SHEET CONTROLS
 */
function openQuizConfigSheet(dateStr, topicTitle) {
    document.getElementById('sheet-target-title').innerText = topicTitle;
    document.getElementById('sheet-target-subtitle').innerText = `${dateStr} Target Lock`;
    document.getElementById('bottom-sheet-modal').classList.add('display-active');
}

function closeQuizConfigSheet() {
    document.getElementById('bottom-sheet-modal').classList.remove('display-active');
}

function setTimerConfigState(secondsVal) {
    triggerHaptic('light');
    engineState.timerSetting = secondsVal;
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active-seg'));
    document.getElementById(`timer-opt-${secondsVal}`).classList.add('active-seg');
}

/**
 * 🎯 LIVE QUIZ ARENA IGNITION
 */
function igniteQuizArenaSession() {
    triggerHaptic('heavy');
    closeQuizConfigSheet();
    
    // Database payload mock inject
    engineState.questionsPool = [
        { type: "SYNONYM", q: "Synonym of 'FEROCIOUS'?", o: ["Gentle", "Fierce", "Timid", "Calm"], a: 1 },
        { type: "IDIOM", q: "Meaning of 'Bite the bullet'?", o: ["To eat fast", "To face a difficult situation", "To get injured", "To run away"], a: 1 },
        { type: "ONE WORD", q: "A person who hates mankind?", o: ["Philanthropist", "Misanthrope", "Cynic", "Optimist"], a: 1 }
    ];

    engineState.currentQIdx = 0;
    engineState.userScore = 0.0;
    engineState.userPenalty = 0.0;
    engineState.correctCount = 0;
    engineState.timeSpentSeconds = 0;
    
    clearInterval(engineState.sessionTimerInterval);
    engineState.sessionTimerInterval = setInterval(() => { engineState.timeSpentSeconds++; }, 1000);

    renderQuizQuestionLayerStep();
    routeToView('view-quiz-arena');
}

function renderQuizQuestionLayerStep() {
    engineState.isOptionLocked = false;
    clearInterval(engineState.quizTimerRef);

    const qData = engineState.questionsPool[engineState.currentQIdx];
    
    document.getElementById('quiz-progress-txt').innerText = `${engineState.currentQIdx + 1}/${engineState.questionsPool.length}`;
    document.getElementById('live-score-val').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-val').innerText = engineState.userPenalty.toFixed(2);
    document.getElementById('question-type-badge').innerText = qData.type;
    document.getElementById('live-question-text').innerText = qData.q;

    const optionsRoot = document.getElementById('live-quiz-options-root');
    optionsRoot.innerHTML = '';
    
    const alphas = ['A', 'B', 'C', 'D'];
    qData.o.forEach((txt, idx) => {
        const node = document.createElement('div');
        node.className = 'option-snap-node';
        node.onclick = () => evaluateOptionSnap(idx, node);
        node.innerHTML = `<div class="option-alpha-index">${alphas[idx]}</div><div class="option-text-payload">${txt}</div>`;
        optionsRoot.appendChild(node);
    });

    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.classList.remove('ready-trigger');
    nextBtn.innerHTML = `Skip <i class="fa-solid fa-angles-right"></i>`;

    if (engineState.timerSetting > 0) {
        startCountdownVector(engineState.timerSetting);
    } else {
        document.getElementById('timer-progress-fill').style.width = '100%';
    }
}

function startCountdownVector(duration) {
    const fill = document.getElementById('timer-progress-fill');
    let timeRem = duration;
    fill.style.width = '100%';

    engineState.quizTimerRef = setInterval(() => {
        timeRem -= 0.1;
        fill.style.width = `${(timeRem / duration) * 100}%`;

        if (timeRem <= 0) {
            clearInterval(engineState.quizTimerRef);
            enforceTimeoutInterception();
        }
    }, 100);
}

function evaluateOptionSnap(selectedIdx, uiNode) {
    if (engineState.isOptionLocked) return;
    engineState.isOptionLocked = true;
    clearInterval(engineState.quizTimerRef);

    const qData = engineState.questionsPool[engineState.currentQIdx];
    const allNodes = document.querySelectorAll('.option-snap-node');

    if (selectedIdx === qData.a) {
        triggerHaptic('light');
        uiNode.classList.add('state-correct');
        engineState.userScore += 2.0;
        engineState.correctCount++;
    } else {
        triggerHaptic('heavy'); // Error vibration
        uiNode.classList.add('state-wrong');
        allNodes[qData.a].classList.add('state-correct');
        engineState.userPenalty += engineState.negativeMarking;
        engineState.userScore -= engineState.negativeMarking;
    }

    document.getElementById('live-score-val').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-val').innerText = engineState.userPenalty.toFixed(2);

    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.classList.add('ready-trigger');
    nextBtn.innerHTML = `Next Sequence <i class="fa-solid fa-forward"></i>`;
}

function enforceTimeoutInterception() {
    engineState.isOptionLocked = true;
    triggerHaptic('heavy');
    const qData = engineState.questionsPool[engineState.currentQIdx];
    const allNodes = document.querySelectorAll('.option-snap-node');
    
    allNodes[qData.a].classList.add('state-correct');
    engineState.userPenalty += engineState.negativeMarking;
    engineState.userScore -= engineState.negativeMarking;

    document.getElementById('live-score-val').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-val').innerText = engineState.userPenalty.toFixed(2);

    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.classList.add('ready-trigger');
    nextBtn.innerHTML = `Timeout! Next <i class="fa-solid fa-forward"></i>`;
}

function advanceQuizArenaStep() {
    triggerHaptic('light');
    if (!engineState.isOptionLocked) clearInterval(engineState.quizTimerRef);

    engineState.currentQIdx++;
    if (engineState.currentQIdx < engineState.questionsPool.length) {
        renderQuizQuestionLayerStep();
    } else {
        compileFinalSessionMetricsAndReveal();
    }
}

/**
 * 👑 HOLOGRAPHIC RESULT COMPILATION
 */
function compileFinalSessionMetricsAndReveal() {
    clearInterval(engineState.sessionTimerInterval);
    clearInterval(engineState.quizTimerRef);

    const acc = Math.round((engineState.correctCount / engineState.questionsPool.length) * 100);
    
    document.getElementById('res-score').innerText = engineState.userScore.toFixed(2);
    document.getElementById('res-accuracy').innerText = `${acc}%`;

    const titleNode = document.getElementById('result-badge-title');
    const iconNode = document.getElementById('result-badge-icon');

    if (acc === 100) { titleNode.innerText = "VOCAB GOD"; iconNode.innerHTML = `<i class="fa-solid fa-crown"></i>`; }
    else if (acc >= 85) { titleNode.innerText = "ELITE SNIPER"; iconNode.innerHTML = `<i class="fa-solid fa-crosshairs"></i>`; }
    else if (acc >= 60) { titleNode.innerText = "WARRIOR"; iconNode.innerHTML = `<i class="fa-solid fa-shield"></i>`; }
    else { titleNode.innerText = "RECRUIT"; iconNode.innerHTML = `<i class="fa-solid fa-skull"></i>`; }

    routeToView('view-result-panel');
}

function abortQuizArenaSession() {
    triggerHaptic('heavy');
    if (confirm("Abandon Live Session? Unsaved telemetry will be lost.")) {
        clearInterval(engineState.quizTimerRef);
        clearInterval(engineState.sessionTimerInterval);
        executeBackNavigation();
    }
}