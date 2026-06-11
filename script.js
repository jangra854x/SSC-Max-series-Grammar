/**
 * VOCABULARY ELITE ENGINE - Single Page Application Core Architecture
 * Managed Target Date Line: June 11, 2026
 */

document.addEventListener('DOMContentLoaded', () => {
    // Engine Core Boot Handler
    executeEngineBootSequence();
    
    // Automatically pre-populate Free Zone Date Cards on startup
    populateFreeZoneDateList();
});

function executeEngineBootSequence() {
    const loader = document.getElementById('loader');
    if (loader) {
        window.addEventListener('load', () => {
            clearLoaderNode(loader);
        });
        
        // Safety lock check if window states already verified completion
        if (document.readyState === 'complete') {
            clearLoaderNode(loader);
        }
    }
}

function clearLoaderNode(loaderNode) {
    setTimeout(() => {
        loaderNode.style.opacity = '0';
        setTimeout(() => {
            loaderNode.style.display = 'none';
        }, 350);
    }, 400); // Artificial micro alignment sequence for visual smoothness
}

/**
 * SPA View Layer Routing Switcher Module
 */
function switchView(targetViewId) {
    // Force show dynamic loader overlay for premium feel
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    loader.style.opacity = '1';

    setTimeout(() => {
        // Collect all structural views mapping nodes
        const views = document.querySelectorAll('.app-view');
        views.forEach(view => {
            view.classList.remove('active-view');
        });

        // Resolve active element layout target
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.add('active-view');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Dissolve loading screening layer
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 300);
    }, 250); // Fluid native latency translation emulation
}

/**
 * Automate Date Range Mapping Vectors starting from June 11, 2026
 */
function generateAppDateSequence(totalDays) {
    const datesArray = [];
    // Anchor Date set explicitly to current server runtime reference: June 11, 2026
    const baseDate = new Date(2026, 5, 11); // Month indexing starts at 0 (June = 5)

    for (let i = 0; i < totalDays; i++) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() - i);
        
        // Humanize target layout string
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = targetDate.toLocaleDateString('en-US', options);
        datesArray.push(formattedDate);
    }
    return datesArray;
}

/**
 * Renders Free Arena List Cards Dynamic Pool
 */
function populateFreeZoneDateList() {
    const container = document.getElementById('free-date-container');
    if (!container) return;
    
    container.innerHTML = ''; // Sanitize framework
    const structuralDates = generateAppDateSequence(7); // Render past 7 days of live content

    structuralDates.forEach(dateStr => {
        const rowNode = document.createElement('div');
        rowNode.className = 'date-row-item fade-in';
        rowNode.innerHTML = `
            <div class="date-meta-info">
                <span class="date-txt-title">${dateStr}</span>
                <span class="date-subtitle-manifest"><i class="fa-solid fa-layer-group"></i> Daily Free Mix Quiz (20 Qs)</span>
            </div>
            <button class="item-action-btn-trigger" onclick="fireAppsScriptQuizLaunch('Daily Free Mix', '${dateStr}', false)">Start</button>
        `;
        container.appendChild(rowNode);
    });
}

/**
 * Renders Premium Elite Target Dynamic Sub-menus
 */
function openPremiumDateSelection(displayTitle, internalTopicKey) {
    const container = document.getElementById('premium-date-container');
    const titleNode = document.getElementById('dynamic-target-title');
    const navTitleNode = document.getElementById('date-selector-nav-title');
    
    if (!container || !titleNode) return;

    // Map structural headers context sets
    titleNode.innerText = displayTitle;
    navTitleNode.innerText = internalTopicKey === 'Mega Mix' ? 'Elite Mix' : 'Elite Drill';
    
    container.innerHTML = ''; // Reset container layout contents
    const structuralDates = generateAppDateSequence(10); // Generate up to 10 active previous session logs

    structuralDates.forEach(dateStr => {
        const totalQs = internalTopicKey === 'Mega Mix' ? 100 : 50;
        const rowNode = document.createElement('div');
        rowNode.className = 'date-row-item fade-in';
        rowNode.innerHTML = `
            <div class="date-meta-info">
                <span class="date-txt-title">${dateStr}</span>
                <span class="date-subtitle-manifest"><i class="fa-solid fa-bolt-lightning gold-txt"></i> Premium Practice (${totalQs} Qs)</span>
            </div>
            <button class="item-action-btn-trigger btn-premium-trigger" onclick="fireAppsScriptQuizLaunch('${internalTopicKey}', '${dateStr}', true)">Launch ⚡</button>
        `;
        container.appendChild(rowNode);
    });

    // Re-route framework layer mapping targets smoothly
    switchView('view-date-selector');
}

/**
 * CORE CONNECTOR: Launches structural pipelines into Google Apps Script Environment Engine
 */
function fireAppsScriptQuizLaunch(topicIdentifier, selectedDateValue, isPremiumRequest) {
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    loader.style.opacity = '1';

    console.log(`[CORE PIPELINE] Initiating parameters payload -> Topic: ${topicIdentifier} | Date: ${selectedDateValue} | Premium: ${isPremiumRequest}`);

    // Verify system execution context inside Google Web Interface Environment
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
            .withSuccessHandler(function(response) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 350);

                if (response.status === "success") {
                    console.log("[CORE ENGINE] Dataset payload compiled completely:", response.questions);
                    
                    if (response.questions.length === 0) {
                        alert(`इस तारीख (${selectedDateValue}) के लिए अभी शीट में कोई प्रश्न नहीं हैं!`);
                        return;
                    }
                    
                    // Future UI Rendering Hook Target Insertion Path Placeholders
                    alert(`सफलता! ${topicIdentifier} के ${response.questions.length} प्रश्न लोड हो गए।`);
                    
                } else if (response.status === "locked") {
                    alert(`🔒 एक्सेस लॉक: यह एक प्रीमियम क्विज़ है। कृपया ₹99/माह का एक्टिवेशन पूरा करें!`);
                } else {
                    alert("System Notice: " + response.message);
                }
            })
            .withFailureHandler(function(error) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 350);
                alert("Core Link Failure: " + error.toString());
            })
            // Calling the updated universal App Script method
            .getVocabQuestions(topicIdentifier, selectedDateValue, isPremiumRequest);
    } else {
        // Local Sandbox Dev Mode Emulation Trigger Fallback Trace Line
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 350);
            alert(`[Sandbox Mode] Request sent to Sheet backend:\nTopic: ${topicIdentifier}\nDate: ${selectedDateValue}\nPremium Level: ${isPremiumRequest}`);
        }, 1000);
    }
}