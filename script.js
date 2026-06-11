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
    
    // History Stack for Physical Back Button Overrides
    navigationViewHistoryStack: ['view-dashboard'],
    
    // Global User Database Emulation Mappings
    bookmarksVault: [
        { word: "Ambiguous", definition: "Having a double meaning or unclear framework configuration." },
        { word: "Ephemeral", definition: "Lasting for a very short duration of chronological ticks." }
    ]
};

// Initialize Telegram WebApp Sandbox Binding
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

document.addEventListener('DOMContentLoaded', () => {
    // Android Boot Freeze Failsafe System Protection Launcher
    executeGlobalEngineBoot();
});

/**
 * 🛡️ ANDROID ENGINE SAFESHIELED BOOT
 * Prevents loader loop from turning forever if native events race or crash
 */
function executeGlobalEngineBoot() {
    const loaderNode = document.getElementById('loader');
    
    // Absolute Failsafe: Android WebViews often drop window.onload triggers. Force clear after 800ms max.
    const fallbackTimer = setTimeout(() => {
        if (loaderNode && loaderNode.style.display !== 'none') {
            clearLoaderOverlay(loaderNode);
        }
    }, 800);

    window.addEventListener('load', () => {
        clearTimeout(fallbackTimer);
        clearLoaderOverlay(loaderNode);
    });

    if (document.readyState === 'complete') {
        clearTimeout(fallbackTimer);
        clearLoaderOverlay(loaderNode);
    }

    // Bind Telegram App Configurations
    initTelegramProfileData();
    setupNativeHardwareBackButton();
}

function clearLoaderOverlay(node) {
    if (!node) return;
    node.style.opacity = '0';
    setTimeout(() => { 
        node.style.display = 'none'; 
    }, 400);
}

/**
 * 👥 NATIVE TELEGRAM PROFILE LINKER (iOS Fixed sizing fallback metrics)
 */
function initTelegramProfileData() {
    const avatarImg = document.getElementById('user-avatar-element');
    const nameField = document.getElementById('user-display-name');

    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const uData = tg.initDataUnsafe.user;
        nameField.innerText = `${uData.first_name} ${uData.last_name || ''}`.trim();
        if (uData.photo_url) {
            avatarImg.src = uData.photo_url;
        }
    } else {
        // Fallback for local sandbox testing environment logs
        nameField.innerText = "ELITE COMMANDER";
    }
}

/**
 * 🛜 NATIVE HARDWARE BACK BUTTON PROTOCOLS
 */
function setupNativeHardwareBackButton() {
    if (!tg || !tg.BackButton) return;

    tg.BackButton.onClick(() => {
        handleBackNavigation();
    });

    updateTelegramHardwareBackButtonVisibility();
}

function updateTelegramHardwareBackButtonVisibility() {
    if (!tg || !tg.BackButton) return;
    
    if (engineState.navigationViewHistoryStack.length > 1) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

/**
 * SPA Route Switch Engine with History Trace
 */
function switchView(targetViewId) {
    triggerSystemPulse('medium');
    
    const views = document.querySelectorAll('.app-view');
    views.forEach(v => v.classList.remove('active-view'));

    const activeTarget = document.getElementById(targetViewId);
    if (activeTarget) {
        activeTarget.classList.add('active-view');
        window.scrollTo({ top: 0 });
    }

    updateTelegramHardwareBackButtonVisibility();
}

function navigateTo(targetViewId) {
    engineState.navigationViewHistoryStack.push(targetViewId);
    switchView(targetViewId);
}

function handleBackNavigation() {
    if (engineState.navigationViewHistoryStack.length > 1) {
        // Stop active interval systems if exiting quiz runtime arena
        if (engineState.navigationViewHistoryStack[engineState.navigationViewHistoryStack.length - 1] === 'view-quiz-arena') {
            clearInterval(engineState.quizTimerRef);
            clearInterval(engineState.sessionTimerInterval);
        }
        
        engineState.navigationViewHistoryStack.pop();
        const prevView = engineState.navigationViewHistoryStack[engineState.navigationViewHistoryStack.length - 1];
        switchView(prevView);
    }
}

/**
 * Generates Adaptive Date Directory Sequences without Dropdowns
 */
function compileEngineDateStructures() {
    return [
        { monthName: "JUNE 2026", isActive: true, dates: ["11 June 2026", "10 June 2026", "09 June 2026", "08 June 2026"] },
        { monthName: "MAY 2026", isActive: false, dates: ["31 May 2026", "25 May 2026", "18 May 2026", "12 May 2026"] },
        { monthName: "APRIL 2026", isActive: false, dates: ["30 April 2026", "20 April 2026", "10 April 2026", "01 April 2026"] }
    ];
}

/**
 * Populates Dynamic Folder Accordions for Month Screen Transitions
 */
function openMonthSelection(zoneType) {
    engineState.currentZone = zoneType;
    const rootContainer = document.getElementById('accordion-months-root');
    const headerTitle = document.getElementById('target-zone-title-tag');
    
    if (!rootContainer) return;
    rootContainer.innerHTML = ''; 

    headerTitle.innerText = zoneType === 'Free' ? 'FREE ARENA' : 'PREMIUM ARCHIVE';
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
                            <span class="secondary-d-text"><i class="fa-solid fa-layer-group text-cyan"></i> Free Daily Mix (20 Qs)</span>
                        </div>
                        <button class="launch-sprint-trigger-btn" onclick="openQuizConfigSheet('${dateStr}', 'Daily Free Mix')">Start</button>
                    </div>`;
            } else {
                datesHTML += `
                    <div class="date-drill-row">
                        <div class="date-drill-meta">
                            <span class="primary-d-text">${dateStr}</span>
                            <span class="secondary-d-text"><i class="fa-solid fa-crown text-gold"></i> Premium Study Segments Mapped</span>
                        </div>
                        <button class="launch-sprint-trigger-btn btn-premium-launch" onclick="navigateToPremiumTopicDashboard('${dateStr}')">Open ➔</button>
                    </div>`;
            }
        });

        itemShell.innerHTML = `
            <div class="accordion-month-header" onclick="toggleAccordionFolderNode(this)">
                <h3>${monthData.monthName}</h3>
                <div class="month-status-indicators">
                    ${monthData.isActive ? '<span class="active-month-dot-tag">ACTIVE</span>' : ''}
                    <i class="fa-solid fa-chevron-down chevron-rotate-icon"></i>
                </div>
            </div>
            <div class="accordion-dates-drawer">
                ${datesHTML}
            </div>
        `;
        rootContainer.appendChild(itemShell);
    });

    navigateTo('view-month-selector');
}

function toggleAccordionFolderNode(headerElement) {
    triggerSystemPulse('light');
    const parentNode = headerElement.parentElement;
    parentNode.classList.toggle('expanded');
}

function navigateToPremiumTopicDashboard(targetDate) {
    engineState.selectedDate = targetDate;
    document.getElementById('premium-topic-date-subtitle').innerText = `${targetDate} • ELITE VAULT MAP`;
    navigateTo('view-premium-topics');
}

function triggerPremiumTargetConfig(displayTitle, internalKey) {
    engineState.selectedTopic = internalKey;
    openQuizConfigSheet(engineState.selectedDate, displayTitle);
}

/**
 * 🎫 BOTTOM SHEET TIMING MODAL PROTOCOLS
 */
function openQuizConfigSheet(dateStr, topicTitle) {
    if (engineState.currentZone === 'Free') {
        engineState.selectedDate = dateStr;
        engineState.selectedTopic = 'Daily Free Mix';
    }
    
    document.getElementById('sheet-target-title').innerText = topicTitle;
    document.getElementById('sheet-target-subtitle').innerText = `${engineState.selectedDate} • System Configuration`;
    
    document.getElementById('bottom-sheet-modal').classList.add('display-active');
}

function closeQuizConfigSheet() {
    document.getElementById('bottom-sheet-modal').classList.remove('display-active');
}

function setTimerConfigState(secondsVal) {
    triggerSystemPulse('light');
    engineState.timerSetting = secondsVal;
    
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active-seg'));
    if(secondsVal === 10) document.getElementById('timer-opt-10').classList.add('active-seg');
    else if(secondsVal === 15) document.getElementById('timer-opt-15').classList.add('active-seg');
    else document.getElementById('timer-opt-0').classList.add('active-seg');
}

/**
 * 🎯 QUIZ RUNTIME CORE INTERACTION METHOD
 */
function igniteQuizArenaSession() {
    closeQuizConfigSheet();
    
    // Inject Target Topic Segment Pool Questions Data Emulations
    engineState.questionsPool = [
        { type: "SYNONYM", q: "Select the accurate synonym for 'ABERRATION':", o: ["Normalcy Trace", "Deviation Anomalies", "Conformity Sync", "Stability Metric"], a: 1 },
        { type: "CONTEXTUAL IDIOM", q: "What is the true mapping of the phrase 'To burn the midnight oil'?", o: ["To exhaust financial capital inputs", "To execute high-intensity operations late into the night", "To create system radiation hazards", "To trigger premature process termination"], a: 1 },
        { type: "ERROR DETECTION", q: "Identify the flawed syntax segment: 'The group of / elite students / were planning / an optimization sprint.'", o: ["The group of", "elite students", "were planning", "an optimization sprint."], a: 2 }
    ];

    engineState.currentQIdx = 0;
    engineState.userScore = 0.0;
    engineState.userPenalty = 0.0;
    engineState.correctCount = 0;
    engineState.timeSpentSeconds = 0;

    clearInterval(engineState.sessionTimerInterval);
    engineState.sessionTimerInterval = setInterval(() => {
        engineState.timeSpentSeconds++;
    }, 1000);

    renderActiveQuizQuestionLayer();
    navigateTo('view-quiz-arena');
}

/**
 * 🛠️ FIXES THE OPTION WORDS BLEEDING Glitch on iOS
 */
function renderActiveQuizQuestionLayer() {
    engineState.isOptionLocked = false;
    clearInterval(engineState.quizTimerRef);

    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    
    // Update HUD metrics view targets
    document.getElementById('quiz-progress-txt').innerText = `Q ${engineState.currentQIdx + 1}/${engineState.questionsPool.length}`;
    document.getElementById('question-type-badge').innerText = currentQ.type;
    document.getElementById('main-question-text-field').innerText = currentQ.q;
    
    // Sync current bookmark visual icon status flag
    updateBookmarkButtonUIStatus(currentQ.q);

    // Build options list programmatically to bypass any HTML character raw injection crash
    const container = document.getElementById('quiz-options-container');
    container.innerHTML = '';

    const indexes = ["A", "B", "C", "D"];
    currentQ.o.forEach((optionText, idx) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-node-item';
        
        // Text node structure setup securely
        optionDiv.innerHTML = `
            <span class="option-text-val">${optionText}</span>
            <div class="option-badge-index">${indexes[idx]}</div>
        `;
        
        optionDiv.onclick = () => {
            evaluateUserOptionSelection(idx, optionDiv);
        };
        
        container.appendChild(optionDiv);
    });

    // Reset next control locks
    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.className = 'next-step-btn-disabled';
    nextBtn.disabled = true;

    initKineticVectorTimerBar();
}

function initKineticVectorTimerBar() {
    const timerBar = document.getElementById('quiz-kinetic-timer-bar');
    if (engineState.timerSetting === 0) {
        timerBar.style.transform = 'scaleX(1)';
        return;
    }

    let durationMs = engineState.timerSetting * 1000;
    let elapsedMs = 0;
    timerBar.style.transform = 'scaleX(1)';

    engineState.quizTimerRef = setInterval(() => {
        elapsedMs += 100;
        let scale = 1 - (elapsedMs / durationMs);
        if (scale < 0) scale = 0;
        timerBar.style.transform = `scaleX(${scale})`;

        if (elapsedMs >= durationMs) {
            clearInterval(engineState.quizTimerRef);
            lockQuizArenaOptionsOnTimeout();
        }
    }, 100);
}

function evaluateUserOptionSelection(selectedIdx, targetElement) {
    if (engineState.isOptionLocked) return;
    engineState.isOptionLocked = true;
    clearInterval(engineState.quizTimerRef);

    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    const optionNodes = document.querySelectorAll('.option-node-item');

    if (selectedIdx === currentQ.a) {
        triggerSystemPulse('success');
        targetElement.classList.add('selected-correct');
        engineState.userScore += 2.00;
        engineState.correctCount++;
    } else {
        triggerSystemPulse('error');
        targetElement.classList.add('selected-wrong');
        engineState.userPenalty += engineState.negativeMarking;
        engineState.userScore -= engineState.negativeMarking;
        
        // Auto archive to bookmark vault lists on wrong entries
        silentlyInjectFailedQuestionToVault(currentQ);

        // Highlight correct option frame node
        optionNodes[currentQ.a].classList.add('reveal-correct-faded');
    }

    // Apply global locked states across all remaining nodes
    optionNodes.forEach(node => node.classList.add('locked-state'));

    // Enable navigation switch
    document.getElementById('quiz-live-score').innerText = engineState.userScore.toFixed(2);
    document.getElementById('quiz-live-penalty').innerText = engineState.userPenalty.toFixed(2);
    
    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.className = 'next-step-btn-active';
    nextBtn.disabled = false;
}

function lockQuizArenaOptionsOnTimeout() {
    engineState.isOptionLocked = true;
    triggerSystemPulse('heavy');
    
    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    const optionNodes = document.querySelectorAll('.option-node-item');
    
    optionNodes[currentQ.a].classList.add('selected-correct');
    optionNodes.forEach(node => node.classList.add('locked-state'));
    
    engineState.userPenalty += engineState.negativeMarking;
    engineState.userScore -= engineState.negativeMarking;
    
    document.getElementById('quiz-live-score').innerText = engineState.userScore.toFixed(2);
    document.getElementById('quiz-live-penalty').innerText = engineState.userPenalty.toFixed(2);
    
    const nextBtn = document.getElementById('next-q-trigger-btn');
    nextBtn.className = 'next-step-btn-active';
    nextBtn.disabled = false;
}

function advanceQuizArenaSequence() {
    engineState.currentQIdx++;
    if (engineState.currentQIdx < engineState.questionsPool.length) {
        renderActiveQuizQuestionLayer();
    } else {
        clearInterval(engineState.sessionTimerInterval);
        executeSessionTerminationSequence();
    }
}

function executeSessionTerminationSequence() {
    if (tg && tg.showAlert) {
        tg.showAlert(`Session Complete Matrix Verified!\nNet Points: ${engineState.userScore.toFixed(2)}\nErrors Logged: ${engineState.userPenalty.toFixed(2)}`);
    } else {
        alert(`Session Complete Matrix Verified!\nNet Points: ${engineState.userScore.toFixed(2)}`);
    }
    
    // Refresh main telemetry widgets
    document.getElementById('telemetry-net-score').innerText = engineState.userScore.toFixed(2);
    
    let totalQs = engineState.questionsPool.length;
    let acc = totalQs > 0 ? (engineState.correctCount / totalQs) * 100 : 100;
    document.getElementById('telemetry-accuracy-percentage').innerText = `${acc.toFixed(1)}%`;

    handleBackNavigation();
}

function abortQuizArenaSession() {
    clearInterval(engineState.quizTimerRef);
    clearInterval(engineState.sessionTimerInterval);
    handleBackNavigation();
}

/**
 * 🔖 WORD SECURITY CRYPT PERSISTENCE PROTOCOLS
 */
function toggleCurrentQuestionBookmark() {
    triggerSystemPulse('light');
    const currentQ = engineState.questionsPool[engineState.currentQIdx];
    const existsIdx = engineState.bookmarksVault.findIndex(b => b.word.toLowerCase() === currentQ.q.toLowerCase() || currentQ.q.includes(b.word));

    if (existsIdx > -1) {
        engineState.bookmarksVault.splice(existsIdx, 1);
    } else {
        engineState.bookmarksVault.push({
            word: currentQ.type + " Segment Question",
            definition: currentQ.q
        });
    }
    updateBookmarkButtonUIStatus(currentQ.q);
}

function updateBookmarkButtonUIStatus(questionText) {
    const btn = document.getElementById('bookmark-vault-icon-status-target');
    const exists = engineState.bookmarksVault.some(b => b.definition === questionText);
    if (exists) {
        btn.classList.add('saved');
        btn.innerHTML = `<i class="fa-solid fa-bookmark"></i>`;
    } else {
        btn.classList.remove('saved');
        btn.innerHTML = `<i class="fa-regular fa-bookmark"></i>`;
    }
}

function silentlyInjectFailedQuestionToVault(qObj) {
    const exists = engineState.bookmarksVault.some(b => b.definition === qObj.q);
    if (!exists) {
        engineState.bookmarksVault.push({
            word: "Incorrect-Hit Logs",
            definition: qObj.q
        });
    }
}

function openUniversalBookmarkedVault() {
    const root = document.getElementById('bookmarks-dynamic-list');
    if (!root) return;
    root.innerHTML = '';

    if (engineState.bookmarksVault.length === 0) {
        root.innerHTML = `<div class="empty-crypt-msg">Saved crypt is currently void.</div>`;
    } else {
        engineState.bookmarksVault.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'crypt-word-card fade-in';
            card.innerHTML = `
                <h4>${item.word.toUpperCase()}</h4>
                <p>${item.definition}</p>
                <button class="purge-word-btn" onclick="purgeCryptRecord(${idx})"><i class="fa-solid fa-trash-can"></i></button>
            `;
            root.appendChild(card);
        });
    }
    navigateTo('view-bookmarks');
}

function purgeCryptRecord(idx) {
    triggerSystemPulse('heavy');
    engineState.bookmarksVault.splice(idx, 1);
    openUniversalBookmarkedVault(); // Re-render sequence
}

/**
 * 🏆 CHRONO TIE-BREAKER LEADERBOARD MATRIX GENERATION
 */
function openLeaderboardHub() {
    const root = document.getElementById('leaderboard-dynamic-list');
    if (!root) return;
    root.innerHTML = '';

    // Mock dataset showing exact response tiebreaker maps
    const leaders = [
        { name: "Aman Sharma", date: "11 June 2026", score: 148.50, time: "1m 02.45s", rank: 1 },
        { name: "Rahul Kumar", date: "11 June 2026", score: 148.50, time: "1m 05.12s", rank: 2 }, // Same score, more time taken -> Rank 2!
        { name: "Priya Singh", date: "11 June 2026", score: 142.00, time: "1m 18.90s", rank: 3 }
    ];

    leaders.forEach(u => {
        const row = document.createElement('div');
        row.className = `rank-row-item fade-in ${u.rank === 1 ? 'gold-rank' : ''}`;
        row.innerHTML = `
            <div class="rank-num-badge">${u.rank}</div>
            <div class="user-identity-meta">
                <h4>${u.name}</h4>
                <p>${u.date} • Duration: ${u.time}</p>
            </div>
            <div class="rank-score-metric">
                <div class="points">${u.score.toFixed(2)}</div>
                <div class="duration">METRIC</div>
            </div>
        `;
        root.appendChild(row);
    });

    navigateTo('view-leaderboard');
}

/**
 * 🫨 REAL HARDWARE HAPTIC VIBRATION MANAGER
 */
function triggerSystemPulse(styleType) {
    if (!tg || !tg.HapticFeedback) return;
    
    switch(styleType) {
        case 'light':
            tg.HapticFeedback.impactOccurred('light');
            break;
        case 'medium':
            tg.HapticFeedback.impactOccurred('medium');
            break;
        case 'heavy':
            tg.HapticFeedback.impactOccurred('heavy');
            break;
        case 'success':
            tg.HapticFeedback.notificationOccurred('success');
            break;
        case 'error':
            tg.HapticFeedback.notificationOccurred('error');
            break;
    }
}