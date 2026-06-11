/**
 * ==========================================================================
 * VOCAB ELITE CORE ENGINE - VOLCANIC CRIMSON STATE MACHINE v3.0.0
 * Architecture: High-Density Monolithic Single Page Engine Framework
 * Synchronization Mapping Baseline: June 11, 2026
 * ==========================================================================
 */

// Global Immutable System Tracker Matrix Configuration
let engineState = {
    currentZone: 'Free',            // State Key Tracking: Free | Premium
    selectedMonth: '',              // State Key Tracking: Explicit Month Record Bound
    selectedDate: '',               // State Key Tracking: Chronological Target Bound
    selectedTopic: '',              // State Key Tracking: Categorical Subject Key
    timerSetting: 15,               // Runtime Metric: Integer Seconds Max Time Allocation
    negativeMarking: 0.50,          // Penalization Constant Metric Format Rule
    
    // Test Arena Active Runtime Variable Cache Roll
    questionsPool: [],
    currentQIdx: 0,
    userScore: 0.0,
    userPenalty: 0.0,
    correctCount: 0,
    quizTimerRef: null,
    timeSpentSeconds: 0,
    sessionTimerInterval: null,
    isOptionLocked: false,
    
    // High-Persistence Smart Vault Emulated Array Cache Mappings
    bookmarksVault: [
        { word: "Ambiguous Element", definition: "Possessing multiple optional interpretations; functionally unclear context.", wrongCount: 3 },
        { word: "Ephemeral Variable", definition: "Sustaining initialization state logs for an extremely localized short duration.", wrongCount: 1 }
    ],

    // Comprehensive Native Leaderboard Data Arrays Mapped Meticulously
    leaderboardDataset: [
        { name: "Aman Sharma", location: "NEW DELHI", score: 9840.00, time: "1m 02s", date: "11 June 2026", rank: 1 },
        { name: "Rahul Kumar Verma", location: "UTTAR PRADESH", score: 8910.00, time: "1m 05s", date: "11 June 2026", rank: 2 },
        { name: "Priya Singh Chandel", location: "RAJASTHAN", score: 8855.00, time: "1m 45s", date: "11 June 2026", rank: 3 },
        { name: "Vikramaditya Rao", location: "MAHARASHTRA", score: 8210.00, time: "1m 12s", date: "10 June 2026", rank: 4 },
        { name: "Ananya Iyer", location: "TAMIL NADU", score: 7990.00, time: "1m 19s", date: "10 June 2026", rank: 5 }
    ]
};

// 🧭 Advanced Multi-Layer Navigation History Stack Array Tracker
let viewHistoryNavigationStack = ['view-dashboard'];
const tg = window.Telegram.WebApp;

/**
 * Global App Hook Initialization Event Sequence Trigger
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeTelegramHardwareIntegrationMatrix();
    executeGlobalEngineBootSequence();
    renderLocalizedSmartVaultTelemetryBadges();
});

/**
 * 🛠️ TELEGRAM NATIVE WEBAPP PLATFORM EXPANSION & HOOK ENGINES
 */
function initializeTelegramHardwareIntegrationMatrix() {
    try {
        tg.ready();
        tg.expand(); // Requests native application frame scaling expansion to full mobile view boundary
        
        // Impose Emissive Volcanic Color Directives to Native Telegram Header Anchors
        tg.setHeaderColor('#050508');
        tg.setBackgroundColor('#050508');
        
        // Register Native System Hardware Back Button Activation Mappings
        tg.BackButton.onClick(() => {
            executeHardwareBackNavigationSequence();
        });
        
        synchronizeUserTelegramProfileTelemetry();
    } catch (hardwareInitializationException) {
        console.error("[HARDWARE ERROR] Native Telegram Engine SDK link faulted or context missing.", hardwareInitializationException);
    }
}

/**
 * Extracts and Maps Native Telegram User Context Fields onto Live Profile Component View Blocks
 */
function synchronizeUserTelegramProfileTelemetry() {
    try {
        const nativeUserContext = tg.initDataUnsafe?.user;
        if (nativeUserContext) {
            const calculatedFullName = `${nativeUserContext.first_name || ''} ${nativeUserContext.last_name || ''}`.trim();
            document.getElementById('user-display-name-node').innerText = calculatedFullName ? calculatedFullName.toUpperCase() : "ELITE WARRIOR";
            document.getElementById('user-telegram-handle-node').innerText = nativeUserContext.username ? `@${nativeUserContext.username}` : `USER_ID: ${nativeUserContext.id}`;
            
            if (nativeUserContext.photo_url) {
                document.getElementById('user-avatar-node').src = nativeUserContext.photo_url;
            }
            document.getElementById('user-live-streak-counter').innerText = "STREAK: 14D";
        } else {
            // Emulated Fallback Data Mappings for External Local Browsing Environments
            document.getElementById('user-display-name-node').innerText = "VON CRON CORE";
            document.getElementById('user-telegram-handle-node').innerText = "@developer_sandbox";
            document.getElementById('user-live-streak-counter').innerText = "STREAK: 5D";
        }
    } catch (profileSyncException) {
        console.warn("[METADATA WARN] Failed to fetch native user records. Spoofing active.", profileSyncException);
    }
}

/**
 * High-Performance Native Physical Vibration Feedback Interface
 */
function triggerNativeHapticPulse(hapticStylePattern = 'medium') {
    try {
        if (tg.HapticFeedback) {
            switch (hapticStylePattern) {
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
        } else {
            console.log(`[SIMULATED HAPTIC] Pulse Pattern: ${hapticStylePattern.toUpperCase()}`);
        }
    } catch (hapticException) {
        // Silent catch to prevent script execution blockages inside generic desktop viewports
    }
}

/**
 * 🧭 SPA HIGH-SPEED STATE ROUTING ARCHITECTURE WITH TELEGRAM HISTORY TRACKER
 */
function transitionApplicationActiveViewFrame(targetViewIdString, stateRoutingDirection = 'forward') {
    if (stateRoutingDirection === 'forward') {
        triggerNativeHapticPulse('medium');
        viewHistoryNavigationStack.push(targetViewIdString);
    }
    
    // Dynamic Evaluation Layer Controlling Physical Hardware Back Action Display Toggles
    if (viewHistoryNavigationStack.length > 1) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }

    // Trigger Screen Transition Animation Loader Rings
    const overlayLoaderNode = document.getElementById('loader');
    overlayLoaderNode.style.display = 'flex';
    overlayLoaderNode.style.opacity = '1';

    setTimeout(() => {
        const operationalViewsList = document.querySelectorAll('.app-view-matrix');
        operationalViewsList.forEach(viewNode => viewNode.classList.remove('active-view'));

        const actualTargetNodeFrame = document.getElementById(targetViewIdString);
        if (actualTargetNodeFrame) {
            actualTargetNodeFrame.classList.add('active-view');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        overlayLoaderNode.style.opacity = '0';
        setTimeout(() => { overlayLoaderNode.style.display = 'none'; }, 200);
    }, 120);
}

/**
 * Intercepts Physical Back Swipes or Native Top Left Navigation Hits
 */
function executeHardwareBackNavigationSequence() {
    if (viewHistoryNavigationStack.length > 1) {
        triggerNativeHapticPulse('medium');
        viewHistoryNavigationStack.pop(); // Evacuate active frame reference from stack logs
        const scheduledTargetDestView = viewHistoryNavigationStack[viewHistoryNavigationStack.length - 1];
        transitionApplicationActiveViewFrame(scheduledTargetDestView, 'backward');
    }
}

/**
 * Flushes Active Routing State Records, Forcing Absolute Dashboard Jump Mechanics
 */
function forceResetToDashboardHomeState() {
    viewHistoryNavigationStack = ['view-dashboard'];
    transitionApplicationActiveViewFrame('view-dashboard', 'backward');
}

/**
 * Handles Global Engine Boot Execution Closures
 */
function executeGlobalEngineBootSequence() {
    const mainLoaderOverlayNode = document.getElementById('loader');
    if (mainLoaderOverlayNode) {
        if (document.readyState === 'complete') {
            clearInitialLoaderOverlayStructure(mainLoaderOverlayNode);
        } else {
            window.addEventListener('load', () => { clearInitialLoaderOverlayStructure(mainLoaderOverlayNode); });
        }
    }
}

function clearInitialLoaderOverlayStructure(loaderTargetElement) {
    setTimeout(() => {
        loaderTargetElement.style.opacity = '0';
        setTimeout(() => { loaderTargetElement.style.display = 'none'; }, 350);
    }, 550);
}

/**
 * 🗂️ NESTED LAYER ROUTING 1: INDEPENDENT MONTHS VIEW DIRECTORY GENERATION ENGINE
 */
function executeViewTransitionSequence(zoneTypeIdentifier) {
    engineState.currentZone = zoneTypeIdentifier;
    
    const contextIndicatorNode = document.getElementById('zone-indicator-tag-months-view');
    contextIndicatorNode.innerText = zoneTypeIdentifier === 'Free' ? 'CRIMSON FREE ARENA' : 'ELITE PLATINUM VAULT';
    contextIndicatorNode.className = zoneTypeIdentifier === 'Free' ? 'dynamic-zone-indicator-tag text-color-crimson' : 'dynamic-zone-indicator-tag text-color-orange';
    
    const operationalGridRootNode = document.getElementById('months-injection-root-grid');
    operationalGridRootNode.innerHTML = ''; // Sanitize framework nodes completely

    const calendarMonthsDataset = ['June 2026', 'May 2026', 'April 2026', 'March 2026', 'February 2026', 'January 2026'];

    calendarMonthsDataset.forEach(monthItemString => {
        const monthSelectionGridElement = document.createElement('div');
        monthSelectionGridElement.className = 'directory-grid-item-node-card fade-in';
        monthSelectionGridElement.innerText = monthItemString.toUpperCase();
        
        // Link Event Actions Bound to Dedicated Deeper Routing Steps
        monthSelectionGridElement.onclick = () => {
            triggerNativeHapticPulse('light');
            compileAndOpenDatesDirectoryViewScreen(monthItemString);
        };
        
        operationalGridRootNode.appendChild(monthSelectionGridElement);
    });

    transitionApplicationActiveViewFrame('view-months-directory');
}

/**
 * 🗂️ NESTED LAYER ROUTING 2: INDEPENDENT DATES VIEW LAYER STACK COMPILER
 */
function compileAndOpenDatesDirectoryViewScreen(targetSelectedMonthNameString) {
    engineState.selectedMonth = targetSelectedMonthNameString;
    
    const contextIndicatorNode = document.getElementById('zone-indicator-tag-dates-view');
    contextIndicatorNode.innerText = `${targetSelectedMonthNameString.toUpperCase()} DATA SECTORS`;
    
    const operationalStackRootNode = document.getElementById('dates-injection-root-stack');
    operationalStackRootNode.innerHTML = ''; // Absolute clean flush of existing elements

    // Set Loop Iteration Mappings to Synthesize Chronological Arrays Meticulously
    for (let dayIndex = 12; dayIndex >= 1; dayIndex--) {
        const paddedDayString = dayIndex < 10 ? `0${dayIndex}` : `${dayIndex}`;
        const unifiedCompiledDateString = `${paddedDayString} ${targetSelectedMonthNameString}`;
        
        const dateRowListUnitElement = document.createElement('div');
        dateRowListUnitElement.className = 'chronological-date-row-unit-card fade-in';
        
        let calculatedPayloadSubDescription = engineState.currentZone === 'Free' ? 
            '<i class="fa-solid fa-bolt-lightning text-color-crimson"></i> Core Mixed Verification Pack (20 Qs)' : 
            '<i class="fa-solid fa-crown text-color-orange"></i> High-Tier Premium Sector Core Mapped';

        dateRowListUnitElement.innerHTML = `
            <div>
                <span class="date-row-primary-text">${unifiedCompiledDateString}</span>
                <span class="date-row-secondary-text">${calculatedPayloadSubDescription}</span>
            </div>
            <i class="fa-solid fa-angle-right" style="color:var(--text-color-slate);"></i>
        `;
        
        // Operational Trigger Execution Bindings
        dateRowListUnitElement.onclick = () => {
            triggerNativeHapticPulse('medium');
            engineState.selectedDate = unifiedCompiledDateString;
            
            if (engineState.currentZone === 'Free') {
                engineState.selectedTopic = 'Daily Free Mix';
                openQuizConfigSheetDrawer(unifiedCompiledDateString, 'Daily Free Mix Blueprint');
            } else {
                transitionApplicationActiveViewFrame('view-premium-topics-dashboard');
            }
        };

        operationalStackRootNode.appendChild(dateRowListUnitElement);
    }

    transitionApplicationActiveViewFrame('view-dates-directory');
}

function triggerPremiumTargetSelectionConfiguration(displayLabelString, internalSectorMappingKey) {
    triggerNativeHapticPulse('light');
    engineState.selectedTopic = internalSectorMappingKey;
    openQuizConfigSheetDrawer(engineState.selectedDate, displayLabelString);
}

/**
 * 🎫 BOTTOM SHEET INTERACTION MODAL MANAGEMENT CORE
 */
function openQuizConfigSheetDrawer(targetDateContextString, targetedTopicDisplayString) {
    document.getElementById('sheet-target-parameter-main-title').innerText = targetedTopicDisplayString;
    document.getElementById('sheet-target-parameter-sub-subtitle').innerText = `${targetDateContextString} • Parameters Configuration`;
    document.getElementById('bottom-sheet-modal-container').classList.add('display-active');
}

function closeQuizConfigSheetDrawer() {
    document.getElementById('bottom-sheet-modal-container').classList.remove('display-active');
}

function setTimerConfigurationInternalState(numericalSecondsValue) {
    triggerNativeHapticPulse('light');
    engineState.timerSetting = numericalSecondsValue;
    
    document.querySelectorAll('.segmented-option-btn').forEach(buttonElement => buttonElement.classList.remove('active-segmented-option-state'));
    document.getElementById(`timer-opt-${numericalSecondsValue}`).classList.add('active-segmented-option-state');
}

/**
 * 🎯 LIVE QUIZ ARENA RUNTIME CORE ENGINE INTERFACES
 */
function igniteLiveQuizArenaSessionCore() {
    triggerNativeHapticPulse('heavy');
    closeQuizConfigSheetDrawer();
    
    // Inject Extensive Production Level High-Volume Mock Data Array Cache Logs
    engineState.questionsPool = [
        { type: "SYNONYM MATRIX", q: "Identify the absolute precise synonymous expression for 'ABERRATION':", o: ["Standard Conformance", "Anomalous Deviation", "Systemic Equilibrium", "Static Invariance"], a: 1 },
        { type: "IDIOMATIC VECTOR", q: "What semantic implication does the dynamic phrase 'To burn the midnight oil' entail?", o: ["To exhaust financial capital aggressively", "To execute high-intensity structural work deep into night cycles", "To generate combustible volcanic thermal energy", "To waste valuable fuel matrices unnecessarily"], a: 1 },
        { type: "ONE WORD CACHE", q: "A specialized individual who demonstrates systematic hatred, aversion, or distrust toward human kind:", o: ["Altruistic Philanthropist", "Volcanic Misanthrope Element", "Skeptical Dogmatic Cynic", "Utopian Teleological Optimist"], a: 1 },
        { type: "GRAMMAR COMPONENT", q: "Isolate the precise fragmented segment containing structural anomalies: 'He do not / have any / money left / with him.'", o: ["He do not segment", "have any segment", "money left segment", "with him compilation"], a: 0 }
    ];

    engineState.currentQIdx = 0;
    engineState.userScore = 0.0;
    engineState.userPenalty = 0.0;
    engineState.correctCount = 0;
    engineState.timeSpentSeconds = 0;
    
    // Clear Existing Active Timing Trackers and Relaunch Session Clock Loop
    clearInterval(engineState.sessionTimerInterval);
    engineState.sessionTimerInterval = setInterval(() => { engineState.timeSpentSeconds++; }, 1000);

    renderQuizQuestionLayerStep();
    transitionApplicationActiveViewFrame('view-quiz-arena-runtime');
}

function renderQuizQuestionLayerStep() {
    engineState.isOptionLocked = false;
    clearInterval(engineState.quizTimerRef);

    const individualQuestionDataStructure = engineState.questionsPool[engineState.currentQIdx];
    
    // Synchronize HUD Panel Telemetry Strings Meticulously
    document.getElementById('quiz-progress-counter-text-node').innerText = `${engineState.currentQIdx + 1}/${engineState.questionsPool.length}`;
    document.getElementById('live-score-value-node').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-value-node').innerText = engineState.userPenalty.toFixed(2);
    document.getElementById('question-type-classification-badge-node').innerText = individualQuestionDataStructure.type;
    document.getElementById('live-arena-question-text-payload-node').innerText = individualQuestionDataStructure.q;

    // Refresh Dynamic Bookmark State Indicators
    updateMemoryVaultBookmarkIconDisplayState();

    // Render Option Grid Items
    const operationalOptionsStackContainerNode = document.getElementById('live-quiz-options-injection-root-stack');
    operationalOptionsStackContainerNode.innerHTML = ''; // Erase completely

    const indexAlphabetArray = ['A', 'B', 'C', 'D'];
    individualQuestionDataStructure.o.forEach((optionTextPayloadString, structuralOptionIndex) => {
        const optionRowNodeElement = document.createElement('div');
        optionRowNodeElement.className = 'option-interactive-node-row';
        optionRowNodeElement.onclick = () => { evaluateInteractiveSelectedOptionSnap(structuralOptionIndex, optionRowNodeElement); };
        
        optionRowNodeElement.innerHTML = `
            <div class="option-structural-alpha-index-badge">${indexAlphabetArray[structuralOptionIndex]}</div>
            <div class="option-textual-payload-string">${optionTextPayloadString}</div>
        `;
        operationalOptionsStackContainerNode.appendChild(optionRowNodeElement);
    });

    const primaryNextActionBtnRef = document.getElementById('next-sequence-trigger-action-btn');
    primaryNextActionBtnRef.classList.remove('state-ready-trigger');
    primaryNextActionBtnRef.innerHTML = `SKIP RUNTIME SECTOR <i class="fa-solid fa-angles-right"></i>`;

    // Initialize Countdown Metrics
    if (engineState.timerSetting > 0) {
        launchAILineCountdownVectorTrack(engineState.timerSetting);
    } else {
        document.getElementById('quiz-countdown-timer-line-fill-node').style.width = '100%';
    }
}

function launchAILineCountdownVectorTrack(allocatedDurationLimitSeconds) {
    const horizontalTimerFillNodeElement = document.getElementById('quiz-countdown-timer-line-fill-node');
    let fractionalTimeRemainingValue = allocatedDurationLimitSeconds;
    horizontalTimerFillNodeElement.style.width = '100%';

    engineState.quizTimerRef = setInterval(() => {
        fractionalTimeRemainingValue -= 0.1;
        let calculatedPercentageWidth = (fractionalTimeRemainingValue / allocatedDurationLimitSeconds) * 100;
        horizontalTimerFillNodeElement.style.width = `${calculatedPercentageWidth}%`;

        if (fractionalTimeRemainingValue <= 0) {
            clearInterval(engineState.quizTimerRef);
            executeEnforcedTimeoutInterceptionSequence();
        }
    }, 100);
}

function evaluateInteractiveSelectedOptionSnap(userSelectedOptionIndex, targetOptionUiNodeElement) {
    if (engineState.isOptionLocked) return;
    engineState.isOptionLocked = true;
    clearInterval(engineState.quizTimerRef);

    const compiledActiveQuestionReference = engineState.questionsPool[engineState.currentQIdx];
    const extractedOptionNodesCollectionList = document.querySelectorAll('.option-interactive-node-row');

    if (userSelectedOptionIndex === compiledActiveQuestionReference.a) {
        triggerNativeHapticPulse('success');
        targetOptionUiNodeElement.classList.add('state-resolved-correct');
        engineState.userScore += 2.0;
        engineState.correctCount++;
    } else {
        triggerNativeHapticPulse('error');
        targetOptionUiNodeElement.classList.add('state-resolved-wrong');
        extractedOptionNodesCollectionList[compiledActiveQuestionReference.a].classList.add('state-resolved-correct');
        
        engineState.userPenalty += engineState.negativeMarking;
        engineState.userScore -= engineState.negativeMarking;
        
        // Push failing structure records natively inside vault tracking arrays
        appendFailingItemToMemoryVaultCacheLogs(compiledActiveQuestionReference.type, compiledActiveQuestionReference.q);
    }

    document.getElementById('live-score-value-node').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-value-node').innerText = engineState.userPenalty.toFixed(2);

    const primaryNextActionBtnRef = document.getElementById('next-sequence-trigger-action-btn');
    primaryNextActionBtnRef.classList.add('state-ready-to-trigger');
    primaryNextActionBtnRef.innerHTML = `ADVANCE SEQUENCE STEP <i class="fa-solid fa-circle-chevron-right"></i>`;
}

function executeEnforcedTimeoutInterceptionSequence() {
    engineState.isOptionLocked = true;
    triggerNativeHapticPulse('heavy');
    
    const compiledActiveQuestionReference = engineState.questionsPool[engineState.currentQIdx];
    const extractedOptionNodesCollectionList = document.querySelectorAll('.option-interactive-node-row');
    
    extractedOptionNodesCollectionList[compiledActiveQuestionReference.a].classList.add('state-resolved-correct');
    engineState.userPenalty += engineState.negativeMarking;
    engineState.userScore -= engineState.negativeMarking;

    document.getElementById('live-score-value-node').innerText = engineState.userScore.toFixed(2);
    document.getElementById('live-penalty-value-node').innerText = engineState.userPenalty.toFixed(2);

    const primaryNextActionBtnRef = document.getElementById('next-sequence-trigger-action-btn');
    primaryNextActionBtnRef.classList.add('state-ready-to-trigger');
    primaryNextActionBtnRef.innerHTML = `TIMEOUT! FORCE NEXT STEP <i class="fa-solid fa-circle-chevron-right"></i>`;
}

function advanceLiveQuizArenaSequenceStep() {
    triggerNativeHapticPulse('light');
    if (!engineState.isOptionLocked) {
        clearInterval(engineState.quizTimerRef);
    }

    engineState.currentQIdx++;
    if (engineState.currentQIdx < engineState.questionsPool.length) {
        renderQuizQuestionLayerStep();
    } else {
        compileFinalSessionMetricsAndRevealSummary();
    }
}

function abortLiveQuizArenaSessionSequence() {
    triggerNativeHapticPulse('heavy');
    if (confirm("CONFIRM ABSOLUTE TERMINATION? Unsaved session telemetry loops will be flushed permanently from register memory.")) {
        clearInterval(engineState.quizTimerRef);
        clearInterval(engineState.sessionTimerInterval);
        executeHardwareBackNavigationSequence();
    }
}

/**
 * 👑 PERFORMANCE SUMMARY METRIC ENGINES & BADGES METRIC FORMATS
 */
function compileFinalSessionMetricsAndRevealSummary() {
    clearInterval(engineState.sessionTimerInterval);
    clearInterval(engineState.quizTimerRef);

    const cumulativeQuestionsTotal = engineState.questionsPool.length;
    const computedAccuracyPercentageRaw = Math.round((engineState.correctCount / cumulativeQuestionsTotal) * 100);
    
    const calculatedMinutesSegmentValue = Math.floor(engineState.timeSpentSeconds / 60);
    const calculatedSecondsRemainderValue = engineState.timeSpentSeconds % 60;

    document.getElementById('res-summary-final-score-node').innerText = engineState.userScore.toFixed(2);
    document.getElementById('res-summary-raw-accuracy-node').innerText = `${computedAccuracyPercentageRaw}%`;
    document.getElementById('res-summary-time-duration-node').innerText = `${calculatedMinutesSegmentValue}m ${calculatedSecondsRemainderValue}s`;
    document.getElementById('res-summary-correct-count-node').innerText = `${engineState.correctCount}/${cumulativeQuestionsTotal}`;

    const structuralTitleBadgeNodeRef = document.getElementById('result-badge-allocation-title');
    const structuralIconBadgeNodeRef = document.getElementById('result-badge-allocation-vector-icon');

    // Dynamic Level Allocation Rule Evaluation Matrix
    if (computedAccuracyPercentageRaw === 100) {
        structuralTitleBadgeNodeRef.innerText = "VOCAB GOD CORE";
        structuralIconBadgeNodeRef.innerHTML = `<i class="fa-solid fa-crown" style="color:var(--neon-orange-core); filter:drop-shadow(0 0 10px var(--neon-orange-core));"></i>`;
    } else if (computedAccuracyPercentageRaw >= 85) {
        structuralTitleBadgeNodeRef.innerText = "ELITE SNIPER";
        structuralIconBadgeNodeRef.innerHTML = `<i class="fa-solid fa-crosshairs" style="color:var(--neon-crimson-core);"></i>`;
    } else if (computedAccuracyPercentageRaw >= 60) {
        structuralTitleBadgeNodeRef.innerText = "STEEL WARRIOR";
        structuralIconBadgeNodeRef.innerHTML = `<i class="fa-solid fa-shield-halved" style="color:#fff;"></i>`;
    } else {
        structuralTitleBadgeNodeRef.innerText = "RAW RECRUIT";
        structuralIconBadgeNodeRef.innerHTML = `<i class="fa-solid fa-skull-crossbones" style="color:var(--text-color-slate);"></i>`;
    }

    transitionApplicationActiveViewFrame('view-result-summary-panel');
}

/**
 * 🔖 SMART ENCRYPTED MEMORY VAULT SUBSYSTEM CONTROLLERS
 */
function toggleCurrentQuestionInsideMemoryVaultCache() {
    triggerNativeHapticPulse('light');
    const compiledActiveQuestionReference = engineState.questionsPool[engineState.currentQIdx];
    const verifiedTargetExistenceIndex = engineState.bookmarksVault.findIndex(bookmarkItem => bookmarkItem.word.startsWith(compiledActiveQuestionReference.type));

    if (verifiedTargetExistenceIndex > -1) {
        engineState.bookmarksVault.splice(verifiedTargetExistenceIndex, 1);
    } else {
        engineState.bookmarksVault.push({
            word: `${compiledActiveQuestionReference.type} Variable Element`,
            definition: compiledActiveQuestionReference.q,
            wrongCount: 1
        });
    }
    updateMemoryVaultBookmarkIconDisplayState();
    renderLocalizedSmartVaultTelemetryBadges();
}

function updateMemoryVaultBookmarkIconDisplayState() {
    const compiledActiveQuestionReference = engineState.questionsPool[engineState.currentQIdx];
    const structuralTargetIconReferenceNode = document.getElementById('bookmark-vault-icon-status-target');
    const booleanVerificationStateResult = engineState.bookmarksVault.some(bookmarkElement => bookmarkElement.word.startsWith(compiledActiveQuestionReference.type));

    if (booleanVerificationStateResult) {
        structuralTargetIconReferenceNode.className = 'fa-solid fa-bookmark text-color-crimson';
    } else {
        structuralTargetIconReferenceNode.className = 'fa-regular fa-bookmark';
    }
}

function appendFailingItemToMemoryVaultCacheLogs(failingClassificationTypeString, failingQuestionPayloadString) {
    const localizedMatchTargetIndex = engineState.bookmarksVault.findIndex(vaultItem => vaultItem.definition === failingQuestionPayloadString);
    if (localizedMatchTargetIndex > -1) {
        engineState.bookmarksVault[localizedMatchTargetIndex].wrongCount++;
    } else {
        engineState.bookmarksVault.push({
            word: `${failingClassificationTypeString} Slip Logs`,
            definition: failingQuestionPayloadString,
            wrongCount: 1
        });
    }
    renderLocalizedSmartVaultTelemetryBadges();
}

function renderLocalizedSmartVaultTelemetryBadges() {
    const dashboardBadgeNodeElement = document.getElementById('dashboard-vault-count-badge');
    if (dashboardBadgeNodeElement) {
        dashboardBadgeNodeElement.innerText = `${engineState.bookmarksVault.length} VARIABLES`;
    }
}

function openPersonalSmartVaultHub() {
    triggerNativeHapticPulse('medium');
    const genericInjectionRootContainerNode = document.getElementById('vault-dynamic-injection-stack-root');
    if (!genericInjectionRootContainerNode) return;
    genericInjectionRootContainerNode.innerHTML = ''; // System Purge

    if (engineState.bookmarksVault.length === 0) {
        genericInjectionRootContainerNode.innerHTML = `
            <p style="text-align:center; color:var(--text-color-slate); font-size:0.9rem; padding:30px; font-weight:700; letter-spacing:0.5px;">
                [SECURE VAULT CACHE EMPTY - ZERO VOLATILE LOGS DATA DETECTED]
            </p>
        `;
    } else {
        engineState.bookmarksVault.forEach((vaultObjectItem, structuralIndexKey) => {
            const structuralVaultCardElementNode = document.createElement('div');
            structuralVaultCardElementNode.className = 'vault-secure-card-node fade-in';
            
            structuralVaultCardElementNode.innerHTML = `
                <div class="vault-textual-payload-block">
                    <h4>${vaultObjectItem.word.toUpperCase()}</h4>
                    <p>${vaultObjectItem.definition}</p>
                    <span class="vault-error-tracking-badge">FAIL_COUNT STATE LOG: ${vaultObjectItem.wrongCount} TIMES</span>
                </div>
                <button class="vault-clear-mastery-action-btn" onclick="executeVaultItemMasteryPurgeSequence(${structuralIndexKey})">
                    RESOLVED ✓
                </button>
            `;
            genericInjectionRootContainerNode.appendChild(structuralVaultCardElementNode);
        });
    }

    transitionApplicationActiveViewFrame('view-vault-hub-detailed');
}

function executeVaultItemMasteryPurgeSequence(targetItemArrayCacheIndex) {
    triggerNativeHapticPulse('success');
    engineState.bookmarksVault.splice(targetItemArrayCacheIndex, 1);
    renderLocalizedSmartVaultTelemetryBadges();
    openPersonalSmartVaultHub(); // Recursive rebuild refresh
}

/**
 * 🏆 HIGH-DENSITY NATIONAL DETAILED LEADERBOARD HUB ENGINE
 */
function openNationalLeaderboardDetailedHub() {
    triggerNativeHapticPulse('medium');
    const detailedLeaderboardRootNode = document.getElementById('leaderboard-detailed-dynamic-injection-root');
    if (!detailedLeaderboardRootNode) return;
    detailedLeaderboardRootNode.innerHTML = ''; // Absolute cleanup strip

    // Map Dataset array lists directly on explicit list container cards
    engineState.leaderboardDataset.forEach(leaderboardUserObject => {
        const structuralRowListItemUnitElement = document.createElement('div');
        
        let calculatedRankClassTieModifier = '';
        if (leaderboardUserObject.rank === 1) calculatedRankClassTieModifier = 'tier-gold-glow';
        else if (leaderboardUserObject.rank === 2) calculatedRankClassTieModifier = 'tier-silver-glow';
        else if (leaderboardUserObject.rank === 3) calculatedRankClassTieModifier = 'tier-bronze-glow';

        structuralRowListItemUnitElement.className = `chronological-date-row-unit-card fade-in ${calculatedRankClassTieModifier}`;
        
        structuralRowListItemUnitElement.innerHTML = `
            <div style="display:flex; align-items:center; gap:14px; width:100%;">
                <div class="rank-index-badge" style="flex-shrink:0;">${leaderboardUserObject.rank}</div>
                <div style="flex-grow:1; min-width:0;">
                    <span class="date-row-primary-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">
                        ${leaderboardUserObject.name.toUpperCase()}
                    </span>
                    <span class="date-row-secondary-text">
                        REG: ${leaderboardUserObject.location} • SPEED DURATION LOG: ${leaderboardUserObject.time}
                    </span>
                </div>
                <div class="metric-value-string" style="flex-shrink:0; font-size:1.05rem;">
                    ${leaderboardUserObject.score.toFixed(2)}
                </div>
            </div>
        `;
        detailedLeaderboardRootNode.appendChild(structuralRowListItemUnitElement);
    });

    transitionApplicationActiveViewFrame('view-leaderboard-hub-detailed');
}