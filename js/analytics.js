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

        if (!result) {
            return;
        }

        showChartSection();

        switch (result.groupBy) {

            case "ACCIDENT_YEAR":
                renderYearChart(result);
                break;

            case "COLLISION_SEVERITY":
                renderSeverityChart(result);
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
       BAR CHART
    ===================================================== */

    function renderBarChart(result) {

        destroyChart();

        const labels = [];
        const values = [];

        result.rows.forEach(row => {

            const attr = row.attributes;

            labels.push(
                getGroupValue(
                    attr,
                    result.groupBy
                )
            );

            values.push(
                attr.metric || 0
            );
        });

        const ctx =
            document
                .getElementById(
                    "analyticsChart"
                )
                .getContext("2d");

        currentChart =
            new Chart(ctx, {

                type: "bar",

                data: {

                    labels,

                    datasets: [{

                        label:
                            result.title,

                        data:
                            values,

                        backgroundColor:
                            "rgba(59,158,221,0.75)",

                        borderColor:
                            "rgba(59,158,221,1)",

                        borderWidth:
                            1
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            display: false
                        },

                        title: {

                            display: true,

                            text:
                                result.title
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero: true
                        }
                    }
                }
            });
    }

    /* =====================================================
       LINE CHART
    ===================================================== */

    function renderYearChart(result) {

        destroyChart();

        const labels = [];
        const values = [];

        result.rows.forEach(row => {

            labels.push(
                row.attributes
                    .ACCIDENT_YEAR
            );

            values.push(
                row.attributes.metric
            );
        });

        const ctx =
            document
                .getElementById(
                    "analyticsChart"
                )
                .getContext("2d");

        currentChart =
            new Chart(ctx, {

                type: "line",

                data: {

                    labels,

                    datasets: [{

                        label:
                            result.title,

                        data:
                            values,

                        borderColor:
                            "#3b9edd",

                        backgroundColor:
                            "rgba(59,158,221,0.25)",

                        fill: true,

                        tension: 0.25
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        title: {

                            display: true,

                            text:
                                result.title
                        }
                    }
                }
            });
    }

    /* =====================================================
       PIE CHART
    ===================================================== */

    function renderSeverityChart(result) {

        destroyChart();

        const labels = [];
        const values = [];

        result.rows.forEach(row => {

            const sev =
                row.attributes
                    .COLLISION_SEVERITY;

            labels.push(
                getSeverityLabel(
                    sev
                )
            );

            values.push(
                row.attributes.metric
            );
        });

        const ctx =
            document
                .getElementById(
                    "analyticsChart"
                )
                .getContext("2d");

        currentChart =
            new Chart(ctx, {

                type: "pie",

                data: {

                    labels,

                    datasets: [{

                        data:
                            values,

                        backgroundColor: [

                            "#ef4444",
                            "#60a5fa",
                            "#fbbf24",
                            "#22c55e"
                        ]
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        title: {

                            display: true,

                            text:
                                result.title
                        }
                    }
                }
            });
    }

    /* =====================================================
       TABLE ANALYTICS
    ===================================================== */

    function renderAnalyticsTable(
        result
    ) {

        const tbody =
            document.getElementById(
                "resultsBody"
            );

        tbody.innerHTML = "";

        result.rows.forEach(row => {

            const attr =
                row.attributes;

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td colspan="8">
                    ${getGroupValue(attr,result.groupBy)}
                </td>
                <td>
                    ${attr.metric}
                </td>
            `;

            tbody.appendChild(
                tr
            );
        });

        document
            .getElementById(
                "recordCounter"
            )
            .textContent =
            `${result.rows.length} rows`;

        document
            .getElementById(
                "resultsSection"
            )
            .classList.remove(
                "hidden"
            );
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function showChartSection() {

        document
            .getElementById(
                "chartSection"
            )
            .classList.remove(
                "hidden"
            );
    }

    function getGroupValue(
        attr,
        field
    ) {

        if (
            attr[field] !== undefined
        ) {

            return attr[field];
        }

        if (
            field.includes(",")
        ) {

            const fields =
                field.split(",");

            return fields
                .map(
                    f =>
                        attr[f]
                )
                .join(" & ");
        }

        return "Unknown";
    }

    function getSeverityLabel(
        value
    ) {

        switch (
            Number(value)
        ) {

            case 1:
                return "Fatal";

            case 2:
                return "Severe Injury";

            case 3:
                return "Visible Injury";

            case 4:
                return "Complaint of Pain";

            default:
                return "Unknown";
        }
    }

    /* =====================================================
       EXPORTS
    ===================================================== */

    return {

        renderAnalytics,

        renderAnalyticsTable,

        destroyChart
    };

})();
