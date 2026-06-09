/* ==========================================================
   app.js
   Main Application Controller
========================================================== */

let currentResults = [];
let currentAnalytics = null;

/* ==========================================================
   STARTUP
========================================================== */

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
    bindEvents();
    loadSettings();
    loadHistory();
}

/* ==========================================================
   EVENTS
========================================================== */

function bindEvents() {

    document.getElementById("settingsBtn")
        .addEventListener("click", toggleSettings);

    document.getElementById("saveSettingsBtn")
        .addEventListener("click", saveSettings);

    document.getElementById("runQueryBtn")
        .addEventListener("click", runNaturalLanguageQuery);

    document.getElementById("queryInput")
        .addEventListener("keydown", e => {
            if (e.key === "Enter") runNaturalLanguageQuery();
        });

    document.getElementById("exportCsvBtn")
        .addEventListener("click", exportCurrentResults);

    document.querySelectorAll(".sample-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            document.getElementById("queryInput").value = btn.textContent.trim();
            runNaturalLanguageQuery();
        });
    });
}

/* ==========================================================
   SETTINGS
========================================================== */

function toggleSettings() {
    document.getElementById("settingsPanel").classList.toggle("hidden");
}

function saveSettings() {

    const provider = document.getElementById("providerSelect").value;
    const apiKey = document.getElementById("apiKeyInput").value.trim();

    localStorage.setItem("ai_provider", provider);

    if (apiKey) {
        localStorage.setItem("ai_api_key", apiKey);
    }

    showStatus("Settings saved.");
    setTimeout(hideStatus, 1500);
}

function loadSettings() {

    const provider = localStorage.getItem("ai_provider");
    const apiKey = localStorage.getItem("ai_api_key");

    if (provider) {
        document.getElementById("providerSelect").value = provider;
    }

    if (apiKey) {
        document.getElementById("apiKeyInput").value = apiKey;
    }
}

/* ==========================================================
   MAIN QUERY
========================================================== */

async function runNaturalLanguageQuery() {

    const query = document.getElementById("queryInput").value.trim();

    if (!query) {
        showError("Please enter a query.");
        return;
    }

    clearError();
    hideResults();
    showStatus("Analyzing request...");

    try {
        const aiResponse = await AIProvider.processQuestion(query);
        const validated = QueryValidator.validate(aiResponse);

        renderInterpretation(validated);
        addHistory(query);

        if (validated.queryType === "record") {
            await executeRecordQuery(validated);
        } else {
            await executeAnalyticsQuery(validated);
        }

        hideStatus();
    } catch (error) {
        console.error(error);
        hideStatus();
        showError(error.message);
    }
}

/* ==========================================================
   RECORD QUERY
========================================================== */

async function executeRecordQuery(query) {

    showStatus("Loading records...");

    const result = await ArcGISService.runRecordQuery(query.where);

    currentResults = result.features;
    currentAnalytics = null;

    renderRecordTableHeader();
    renderRecords(result.features);
    updateRecordStats(result.features);
    showResults();
}

/* ==========================================================
   ANALYTICS QUERY
========================================================== */

async function executeAnalyticsQuery(query) {

    showStatus("Generating analytics...");

    const result = await ArcGISService.runAnalyticsQuery(query);

    currentAnalytics = result;
    currentResults = [];

    AnalyticsEngine.renderAnalytics(result);
    AnalyticsEngine.renderAnalyticsTable(result);
    showResults();
}

/* ==========================================================
   RECORD TABLE HEADER (all fields)
========================================================== */

function renderRecordTableHeader() {

    document.getElementById("resultsHead").innerHTML = `
        <tr>
            <th>Date</th>
            <th>Year</th>
            <th>Day</th>
            <th>Hour</th>
            <th>Severity</th>
            <th>Primary Road</th>
            <th>Secondary Road</th>
            <th>Collision Type</th>
            <th>Collision Factor</th>
            <th>Killed</th>
            <th>Injured</th>
            <th>Pedestrian</th>
            <th>Bicycle</th>
            <th>Motorcycle</th>
            <th>Truck</th>
            <th>Alcohol</th>
            <th>Hit &amp; Run</th>
            <th>Lighting</th>
            <th>Road Surface</th>
            <th>Weather</th>
            <th>HIN</th>
            <th>KSI</th>
            <th>School</th>
            <th>Park</th>
            <th>EPDO</th>
        </tr>
    `;
}

/* ==========================================================
   RECORD TABLE ROWS
========================================================== */

function renderRecords(features) {

    const tbody = document.getElementById("resultsBody");
    tbody.innerHTML = "";

    features.forEach(feature => {
        const a = feature.attributes;
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatDate(a.COLLISION_DATE)}</td>
            <td>${safe(a.ACCIDENT_YEAR)}</td>
            <td>${formatDayOfWeek(a.DAY_OF_WEEK)}</td>
            <td>${formatHour(a.Hour)}</td>
            <td>${severityBadge(a.COLLISION_SEVERITY)}</td>
            <td>${safe(a.PRIMARY_RD)}</td>
            <td>${safe(a.SECONDARY_RD)}</td>
            <td>${safe(a.TYPE_OF_COLLISION)}</td>
            <td>${safe(a.PRIMARY_COLL_FACTOR)}</td>
            <td>${safe(a.NUMBER_KILLED)}</td>
            <td>${safe(a.NUMBER_INJURED)}</td>
            <td>${yesNoBadge(a.PEDESTRIAN_ACCIDENT)}</td>
            <td>${yesNoBadge(a.BICYCLE_ACCIDENT)}</td>
            <td>${yesNoBadge(a.MOTORCYCLE_ACCIDENT)}</td>
            <td>${yesNoBadge(a.TRUCK_ACCIDENT)}</td>
            <td>${yesNoBadge(a.ALCOHOL_INVOLVED)}</td>
            <td>${yesNoBadge(a.HIT_AND_RUN)}</td>
            <td>${safe(a.LIGHTING)}</td>
            <td>${safe(a.ROAD_SURFACE)}</td>
            <td>${safe(a.WEATHER_1)}</td>
            <td>${yesNoBadge(a.HIN_LRSP)}</td>
            <td>${yesNoBadge(a.KSI)}</td>
            <td>${safe(a.School_Name)}</td>
            <td>${safe(a.Park_Name)}</td>
            <td>${a.EPDO_Score != null ? Number(a.EPDO_Score).toFixed(1) : ""}</td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById("recordCounter").textContent =
        `${features.length} Records`;
}

/* ==========================================================
   STATS CARDS
========================================================== */

function updateRecordStats(features) {

    let fatal = 0, severe = 0, pedestrian = 0;

    features.forEach(f => {
        const a = f.attributes;
        const sev = Number(a.COLLISION_SEVERITY);
        if (sev === 1) fatal++;
        if (sev === 2) severe++;
        if (a.PEDESTRIAN_ACCIDENT === "Y") pedestrian++;
    });

    document.getElementById("totalCount").textContent = features.length;
    document.getElementById("fatalCount").textContent = fatal;
    document.getElementById("severeCount").textContent = severe;
    document.getElementById("pedCount").textContent = pedestrian;

    document.getElementById("statsSection").classList.remove("hidden");
}

/* ==========================================================
   AI INTERPRETATION
========================================================== */

function renderInterpretation(query) {

    document.getElementById("aiInterpretation").classList.remove("hidden");
    document.getElementById("interpretationContent").innerHTML =
        `<pre>${JSON.stringify(query, null, 2)}</pre>`;
}

/* ==========================================================
   HISTORY
========================================================== */

function addHistory(query) {

    let history = JSON.parse(
        localStorage.getItem("query_history") || "[]"
    );

    history = [query, ...history.filter(h => h !== query)].slice(0, 20);

    localStorage.setItem("query_history", JSON.stringify(history));
    loadHistory();
}

function loadHistory() {

    const history = JSON.parse(
        localStorage.getItem("query_history") || "[]"
    );

    const container = document.getElementById("historyList");
    container.innerHTML = "";

    if (history.length === 0) {
        container.innerHTML = `<div class="empty-history">No queries yet</div>`;
        return;
    }

    history.forEach(item => {

        const div = document.createElement("div");
        div.className = "history-item";
        div.textContent = item;
        div.title = "Click to run again";

        div.onclick = () => {
            document.getElementById("queryInput").value = item;
            runNaturalLanguageQuery();
        };

        container.appendChild(div);
    });
}

/* ==========================================================
   CSV EXPORT
========================================================== */

function exportCurrentResults() {

    if (currentResults && currentResults.length > 0) {
        ArcGISService.exportCSV(currentResults);
        return;
    }

    if (currentAnalytics && currentAnalytics.rows.length > 0) {
        exportAnalyticsCSV(currentAnalytics);
        return;
    }

    alert("No results available to export.");
}

function exportAnalyticsCSV(result) {

    const groupByLabel = result.groupBy;
    let csv = `"${groupByLabel}","Count"\n`;

    result.rows.forEach(row => {
        const attr = row.attributes;
        const group = attr[result.groupBy] ?? "";
        csv += `"${group}","${attr.metric}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "analytics_results.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* ==========================================================
   UI HELPERS
========================================================== */

function showResults() {
    document.getElementById("resultsSection").classList.remove("hidden");
}

function hideResults() {

    document.getElementById("resultsSection").classList.add("hidden");
    document.getElementById("chartSection").classList.add("hidden");
    document.getElementById("statsSection").classList.add("hidden");
    document.getElementById("aiInterpretation").classList.add("hidden");

    AnalyticsEngine.destroyChart();
}

function showStatus(message) {
    document.getElementById("statusMessage").textContent = message;
    document.getElementById("statusContainer").classList.remove("hidden");
}

function hideStatus() {
    document.getElementById("statusContainer").classList.add("hidden");
}

function showError(message) {
    document.getElementById("errorMessage").textContent = message;
    document.getElementById("errorContainer").classList.remove("hidden");
}

function clearError() {
    document.getElementById("errorContainer").classList.add("hidden");
}

/* ==========================================================
   FORMATTERS
========================================================== */

function safe(v) {
    return v != null ? v : "";
}

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString();
}

function formatDayOfWeek(value) {
    const days = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[Number(value)] || safe(value);
}

function formatHour(value) {
    if (value == null) return "";
    const h = Number(value);
    const period = h < 12 ? "AM" : "PM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}${period}`;
}

function severityBadge(value) {
    switch (Number(value)) {
        case 1: return '<span class="badge badge-fatal">Fatal</span>';
        case 2: return '<span class="badge badge-severe">Severe</span>';
        case 3: return '<span class="badge badge-visible">Visible</span>';
        case 4: return '<span class="badge badge-pain">Pain</span>';
        default: return value != null ? value : "";
    }
}

function yesNoBadge(value) {
    if (value === "Y") return '<span class="badge badge-yes">Y</span>';
    if (value === "N") return "";
    return value != null ? value : "";
}
