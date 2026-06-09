/* ==========================================================
   app.js
   Main Application Controller
========================================================== */

let currentResults = [];
let currentAnalytics = null;

/* ==========================================================
   STARTUP
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);

function initializeApp() {

    bindEvents();

    loadSettings();

    loadHistory();
}

/* ==========================================================
   EVENTS
========================================================== */

function bindEvents() {

    document
        .getElementById("settingsBtn")
        .addEventListener(
            "click",
            toggleSettings
        );

    document
        .getElementById("saveSettingsBtn")
        .addEventListener(
            "click",
            saveSettings
        );

    document
        .getElementById("runQueryBtn")
        .addEventListener(
            "click",
            runNaturalLanguageQuery
        );

    document
        .getElementById("queryInput")
        .addEventListener(
            "keydown",
            e => {

                if (e.key === "Enter") {

                    runNaturalLanguageQuery();
                }
            }
        );

    document
        .getElementById("exportCsvBtn")
        .addEventListener(
            "click",
            exportCurrentResults
        );

    document
        .querySelectorAll(".sample-chip")
        .forEach(btn => {

            btn.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "queryInput"
                        )
                        .value =
                        btn.textContent;

                    runNaturalLanguageQuery();
                }
            );
        });
}

/* ==========================================================
   SETTINGS
========================================================== */

function toggleSettings() {

    document
        .getElementById(
            "settingsPanel"
        )
        .classList.toggle(
            "hidden"
        );
}

function saveSettings() {

    const provider =
        document.getElementById(
            "providerSelect"
        ).value;

    const apiKey =
        document.getElementById(
            "apiKeyInput"
        ).value.trim();

    localStorage.setItem(
        "ai_provider",
        provider
    );

    if (apiKey) {

        localStorage.setItem(
            "ai_api_key",
            apiKey
        );
    }

    showStatus(
        "Settings saved."
    );

    setTimeout(
        hideStatus,
        1500
    );
}

function loadSettings() {

    const provider =
        localStorage.getItem(
            "ai_provider"
        );

    const apiKey =
        localStorage.getItem(
            "ai_api_key"
        );

    if (provider) {

        document
            .getElementById(
                "providerSelect"
            )
            .value =
            provider;
    }

    if (apiKey) {

        document
            .getElementById(
                "apiKeyInput"
            )
            .value =
            apiKey;
    }
}

/* ==========================================================
   MAIN QUERY
========================================================== */

async function runNaturalLanguageQuery() {

    const query =
        document
            .getElementById(
                "queryInput"
            )
            .value
            .trim();

    if (!query) {

        showError(
            "Please enter a query."
        );

        return;
    }

    clearError();

    hideResults();

    showStatus(
        "Analyzing request..."
    );

    try {

        const aiResponse =
            await AIProvider
                .processQuestion(
                    query
                );

        const validated =
            QueryValidator
                .validate(
                    aiResponse
                );

        renderInterpretation(
            validated
        );

        addHistory(
            query
        );

        if (
            validated.queryType ===
            "record"
        ) {

            await executeRecordQuery(
                validated
            );
        }
        else {

            await executeAnalyticsQuery(
                validated
            );
        }

        hideStatus();
    }
    catch (error) {

        console.error(
            error
        );

        hideStatus();

        showError(
            error.message
        );
    }
}

/* ==========================================================
   RECORD QUERY
========================================================== */

async function executeRecordQuery(
    query
) {

    showStatus(
        "Loading records..."
    );

    const result =
        await ArcGISService
            .runRecordQuery(
                query.where
            );

    currentResults =
        result.features;

    renderRecords(
        result.features
    );

    updateRecordStats(
        result.features
    );

    showResults();
}

/* ==========================================================
   ANALYTICS QUERY
========================================================== */

async function executeAnalyticsQuery(
    query
) {

    showStatus(
        "Generating analytics..."
    );

    const result =
        await ArcGISService
            .runAnalyticsQuery(
                query
            );

    currentAnalytics =
        result;

    AnalyticsEngine
        .renderAnalytics(
            result
        );

    AnalyticsEngine
        .renderAnalyticsTable(
            result
        );

    showResults();
}

/* ==========================================================
   RECORD TABLE
========================================================== */

function renderRecords(
    features
) {

    const tbody =
        document.getElementById(
            "resultsBody"
        );

    tbody.innerHTML = "";

    features.forEach(
        feature => {

            const a =
                feature.attributes;

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `
                <td>${formatDate(a.COLLISION_DATE)}</td>
                <td>${severityBadge(a.COLLISION_SEVERITY)}</td>
                <td>${safe(a.PRIMARY_RD)}</td>
                <td>${safe(a.SECONDARY_RD)}</td>
                <td>${safe(a.TYPE_OF_COLLISION)}</td>
                <td>${safe(a.NUMBER_KILLED)}</td>
                <td>${safe(a.NUMBER_INJURED)}</td>
                <td>${safe(a.ALCOHOL_INVOLVED)}</td>
                <td>${safe(a.LIGHTING)}</td>
            `;

            tbody.appendChild(
                row
            );
        }
    );

    document
        .getElementById(
            "recordCounter"
        )
        .textContent =
        `${features.length} Records`;
}

/* ==========================================================
   STATS
========================================================== */

function updateRecordStats(
    features
) {

    let fatal = 0;
    let severe = 0;
    let pedestrian = 0;

    features.forEach(
        f => {

            const a =
                f.attributes;

            if (
                Number(
                    a.COLLISION_SEVERITY
                ) === 1
            ) fatal++;

            if (
                Number(
                    a.COLLISION_SEVERITY
                ) === 2
            ) severe++;

            if (
                a.PEDESTRIAN_ACCIDENT ===
                "Y"
            ) pedestrian++;
        }
    );

    document
        .getElementById(
            "totalCount"
        )
        .textContent =
        features.length;

    document
        .getElementById(
            "fatalCount"
        )
        .textContent =
        fatal;

    document
        .getElementById(
            "severeCount"
        )
        .textContent =
        severe;

    document
        .getElementById(
            "pedCount"
        )
        .textContent =
        pedestrian;

    document
        .getElementById(
            "statsSection"
        )
        .classList.remove(
            "hidden"
        );
}

/* ==========================================================
   AI INTERPRETATION
========================================================== */

function renderInterpretation(
    query
) {

    document
        .getElementById(
            "aiInterpretation"
        )
        .classList.remove(
            "hidden"
        );

    document
        .getElementById(
            "interpretationContent"
        )
        .innerHTML =
        `<pre>${JSON.stringify(query,null,2)}</pre>`;
}

/* ==========================================================
   HISTORY
========================================================== */

function addHistory(
    query
) {

    let history =
        JSON.parse(
            localStorage.getItem(
                "query_history"
            ) || "[]"
        );

    history.unshift(query);

    history =
        history.slice(
            0,
            20
        );

    localStorage.setItem(
        "query_history",
        JSON.stringify(
            history
        )
    );

    loadHistory();
}

function loadHistory() {

    const history =
        JSON.parse(
            localStorage.getItem(
                "query_history"
            ) || "[]"
        );

    const container =
        document.getElementById(
            "historyList"
        );

    container.innerHTML = "";

    if (
        history.length === 0
    ) {

        container.innerHTML =
            `<div class="empty-history">
                No queries yet
             </div>`;

        return;
    }

    history.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "history-item";

            div.textContent =
                item;

            div.onclick =
                () => {

                    document
                        .getElementById(
                            "queryInput"
                        )
                        .value =
                        item;
                };

            container
                .appendChild(
                    div
                );
        }
    );
}

/* ==========================================================
   CSV EXPORT
========================================================== */

function exportCurrentResults() {

    if (
        !currentResults ||
        currentResults.length === 0
    ) {

        alert(
            "No records available."
        );

        return;
    }

    ArcGISService
        .exportCSV(
            currentResults
        );
}

/* ==========================================================
   UI HELPERS
========================================================== */

function showResults() {

    document
        .getElementById(
            "resultsSection"
        )
        .classList.remove(
            "hidden"
        );
}

function hideResults() {

    document
        .getElementById(
            "resultsSection"
        )
        .classList.add(
            "hidden"
        );

    document
        .getElementById(
            "chartSection"
        )
        .classList.add(
            "hidden"
        );

    document
        .getElementById(
            "statsSection"
        )
        .classList.add(
            "hidden"
        );

    AnalyticsEngine
        .destroyChart();
}

function showStatus(
    message
) {

    document
        .getElementById(
            "statusMessage"
        )
        .textContent =
        message;

    document
        .getElementById(
            "statusContainer"
        )
        .classList.remove(
            "hidden"
        );
}

function hideStatus() {

    document
        .getElementById(
            "statusContainer"
        )
        .classList.add(
            "hidden"
        );
}

function showError(
    message
) {

    document
        .getElementById(
            "errorMessage"
        )
        .textContent =
        message;

    document
        .getElementById(
            "errorContainer"
        )
        .classList.remove(
            "hidden"
        );
}

function clearError() {

    document
        .getElementById(
            "errorContainer"
        )
        .classList.add(
            "hidden"
        );
}

/* ==========================================================
   FORMATTERS
========================================================== */

function safe(v) {

    return v ?? "";
}

function formatDate(
    value
) {

    if (!value) {
        return "";
    }

    return new Date(
        value
    ).toLocaleDateString();
}

function severityBadge(
    value
) {

    switch (
        Number(value)
    ) {

        case 1:
            return '<span class="badge badge-fatal">Fatal</span>';

        case 2:
            return '<span class="badge badge-severe">Severe</span>';

        case 3:
            return '<span class="badge badge-visible">Visible Injury</span>';

        default:
            return value ?? "";
    }
}
