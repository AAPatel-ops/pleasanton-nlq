/* ==========================================================
   analytics.js
   Chart & Analytics Renderer
========================================================== */

const AnalyticsEngine = (() => {

    let currentChart = null;

    /* =====================================================
       PUBLIC
    ===================================================== */

    function renderAnalytics(result) {

        if (!result) return;

        showChartSection();

        switch (result.groupBy) {

            case "ACCIDENT_YEAR":
                renderYearChart(result);
                break;

            case "COLLISION_SEVERITY":
                renderSeverityChart(result);
                break;

            case "DAY_OF_WEEK":
                renderDayOfWeekChart(result);
                break;

            default:
                renderBarChart(result);
                break;
        }
    }

    function destroyChart() {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
    }

    /* =====================================================
       BAR CHART (default)
    ===================================================== */

    function renderBarChart(result) {

        destroyChart();

        const labels = [];
        const values = [];

        result.rows.forEach(row => {
            labels.push(getGroupLabel(row.attributes, result.groupBy));
            values.push(row.attributes.metric || 0);
        });

        const ctx = document.getElementById("analyticsChart").getContext("2d");

        currentChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: result.title,
                    data: values,
                    backgroundColor: "rgba(59,158,221,0.75)",
                    borderColor: "rgba(59,158,221,1)",
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: labels.length > 8 ? "y" : "x",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: result.title }
                },
                scales: {
                    x: { beginAtZero: true },
                    y: { beginAtZero: true }
                }
            }
        });
    }

    /* =====================================================
       LINE CHART (year trend)
    ===================================================== */

    function renderYearChart(result) {

        destroyChart();

        const sorted = [...result.rows].sort(
            (a, b) => a.attributes.ACCIDENT_YEAR - b.attributes.ACCIDENT_YEAR
        );

        const labels = sorted.map(r => r.attributes.ACCIDENT_YEAR);
        const values = sorted.map(r => r.attributes.metric);

        const ctx = document.getElementById("analyticsChart").getContext("2d");

        currentChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: result.title,
                    data: values,
                    borderColor: "#3b9edd",
                    backgroundColor: "rgba(59,158,221,0.2)",
                    fill: true,
                    tension: 0.25,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: result.title }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    /* =====================================================
       PIE CHART (severity distribution)
    ===================================================== */

    function renderSeverityChart(result) {

        destroyChart();

        const labels = [];
        const values = [];

        result.rows.forEach(row => {
            labels.push(getSeverityLabel(row.attributes.COLLISION_SEVERITY));
            values.push(row.attributes.metric);
        });

        const ctx = document.getElementById("analyticsChart").getContext("2d");

        currentChart = new Chart(ctx, {
            type: "pie",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: ["#ef4444", "#60a5fa", "#fbbf24", "#22c55e"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: result.title },
                    legend: { position: "right" }
                }
            }
        });
    }

    /* =====================================================
       BAR CHART (day of week — ordered Sun–Sat)
    ===================================================== */

    function renderDayOfWeekChart(result) {

        destroyChart();

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const buckets = Array(7).fill(0);

        result.rows.forEach(row => {
            const dow = Number(row.attributes.DAY_OF_WEEK);
            if (dow >= 1 && dow <= 7) {
                buckets[dow - 1] = row.attributes.metric || 0;
            }
        });

        const ctx = document.getElementById("analyticsChart").getContext("2d");

        currentChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: dayNames,
                datasets: [{
                    label: result.title,
                    data: buckets,
                    backgroundColor: "rgba(59,158,221,0.75)",
                    borderColor: "rgba(59,158,221,1)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: result.title }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    /* =====================================================
       ANALYTICS TABLE
    ===================================================== */

    function renderAnalyticsTable(result) {

        const section = document.getElementById("resultsSection");
        const thead = document.getElementById("resultsHead");
        const tbody = document.getElementById("resultsBody");

        thead.innerHTML = `
            <tr>
                <th>${getGroupByLabel(result.groupBy)}</th>
                <th>${getMetricLabel(result)}</th>
            </tr>
        `;

        tbody.innerHTML = "";

        result.rows.forEach(row => {
            const attr = row.attributes;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${getGroupLabel(attr, result.groupBy)}</td>
                <td>${(attr.metric ?? "").toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("recordCounter").textContent =
            `${result.rows.length} rows`;

        section.classList.remove("hidden");
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function showChartSection() {
        document.getElementById("chartSection").classList.remove("hidden");
    }

    function getGroupLabel(attr, field) {

        if (attr[field] !== undefined && attr[field] !== null) {

            if (field === "COLLISION_SEVERITY") {
                return getSeverityLabel(attr[field]);
            }
            if (field === "DAY_OF_WEEK") {
                const days = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                return days[Number(attr[field])] || attr[field];
            }
            if (field === "Hour") {
                return formatHour(attr[field]);
            }
            return attr[field];
        }

        if (field.includes(",")) {
            return field.split(",").map(f => attr[f] || "").join(" & ");
        }

        return "Unknown";
    }

    function getGroupByLabel(field) {
        const labels = {
            PRIMARY_RD: "Primary Road",
            SECONDARY_RD: "Secondary Road",
            ACCIDENT_YEAR: "Year",
            DAY_OF_WEEK: "Day of Week",
            Hour: "Hour",
            COLLISION_SEVERITY: "Severity",
            TYPE_OF_COLLISION: "Collision Type",
            PRIMARY_COLL_FACTOR: "Collision Factor",
            LIGHTING: "Lighting",
            ROAD_SURFACE: "Road Surface",
            WEATHER_1: "Weather",
            PEDESTRIAN_ACCIDENT: "Pedestrian",
            BICYCLE_ACCIDENT: "Bicycle",
            MOTORCYCLE_ACCIDENT: "Motorcycle",
            TRUCK_ACCIDENT: "Truck",
            ALCOHOL_INVOLVED: "Alcohol",
            HIT_AND_RUN: "Hit & Run",
            HIN_LRSP: "HIN",
            KSI: "KSI",
            School_Name: "School",
            Park_Name: "Park"
        };
        return labels[field] || field;
    }

    function getMetricLabel(result) {
        if (!result.statType || result.statType === "count") return "Count";
        const field = result.statField || "";
        const type = result.statType.toUpperCase();
        return `${type}(${field})`;
    }

    function getSeverityLabel(value) {
        const labels = {
            1: "Fatal",
            2: "Severe Injury",
            3: "Visible Injury",
            4: "Complaint of Pain"
        };
        return labels[Number(value)] || `Severity ${value}`;
    }

    function formatHour(value) {
        const h = Number(value);
        if (isNaN(h)) return value;
        const period = h < 12 ? "AM" : "PM";
        const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${display}:00 ${period}`;
    }

    /* =====================================================
       EXPORTS
    ===================================================== */

    return { renderAnalytics, renderAnalyticsTable, destroyChart };

})();
