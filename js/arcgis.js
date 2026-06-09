/* ==========================================================
   arcgis.js
   ArcGIS Feature Service Engine
========================================================== */

const ArcGISService = (() => {

    const FEATURE_LAYER =
        "https://services7.arcgis.com/acUiOt0qxC8BlCCx/arcgis/rest/services/Pleasanton_Collisions_Dashboard_WFL1/FeatureServer/0";

    /* All fields returned for record queries */
    const ALL_FIELDS = [
        "OBJECTID",
        "COLLISION_DATE",
        "ACCIDENT_YEAR",
        "DAY_OF_WEEK",
        "Hour",
        "COLLISION_SEVERITY",
        "PRIMARY_RD",
        "SECONDARY_RD",
        "TYPE_OF_COLLISION",
        "PRIMARY_COLL_FACTOR",
        "NUMBER_KILLED",
        "NUMBER_INJURED",
        "PEDESTRIAN_ACCIDENT",
        "BICYCLE_ACCIDENT",
        "MOTORCYCLE_ACCIDENT",
        "TRUCK_ACCIDENT",
        "ALCOHOL_INVOLVED",
        "HIT_AND_RUN",
        "LIGHTING",
        "ROAD_SURFACE",
        "WEATHER_1",
        "HIN_LRSP",
        "KSI",
        "School_Name",
        "Park_Name",
        "EPDO_Score"
    ].join(",");

    /* =====================================================
       RECORD QUERY
    ===================================================== */

    async function runRecordQuery(whereClause) {

        const totalCount = await getCount(whereClause);

        const params = new URLSearchParams({
            where: whereClause,
            outFields: ALL_FIELDS,
            orderByFields: "COLLISION_DATE DESC",
            returnGeometry: false,
            resultRecordCount: 1000,
            f: "json"
        });

        const response = await fetch(
            `${FEATURE_LAYER}/query?${params}`
        );

        if (!response.ok) {
            throw new Error("ArcGIS query failed.");
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(
                `ArcGIS Error: ${data.error.message} (code ${data.error.code})`
            );
        }

        return {
            type: "record",
            totalCount,
            features: data.features || []
        };
    }

    /* =====================================================
       ANALYTICS QUERY
    ===================================================== */

    async function runAnalyticsQuery(config) {

        const statField = config.statField || "OBJECTID";
        const statType = config.statType || "count";
        const statisticType = mapStatisticType(statType);

        const outStatistics = JSON.stringify([{
            statisticType,
            onStatisticField: statField,
            outStatisticFieldName: "metric"
        }]);

        const params = new URLSearchParams({
            where: config.where || "1=1",
            groupByFieldsForStatistics: config.groupBy,
            outStatistics,
            orderByFields: "metric DESC",
            returnGeometry: false,
            f: "json"
        });

        const response = await fetch(
            `${FEATURE_LAYER}/query?${params}`
        );

        if (!response.ok) {
            throw new Error("Analytics query failed.");
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(
                `ArcGIS Error: ${data.error.message} (code ${data.error.code})`
            );
        }

        let rows = (data.features || []).sort(
            (a, b) => b.attributes.metric - a.attributes.metric
        );

        if (config.top) {
            rows = rows.slice(0, config.top);
        }

        return {
            type: "analytics",
            title: config.title,
            groupBy: config.groupBy,
            statType,
            statField,
            rows
        };
    }

    /* =====================================================
       COUNT QUERY
    ===================================================== */

    async function getCount(whereClause) {

        const params = new URLSearchParams({
            where: whereClause,
            returnCountOnly: true,
            f: "json"
        });

        const response = await fetch(
            `${FEATURE_LAYER}/query?${params}`
        );

        if (!response.ok) {
            throw new Error("Count query failed.");
        }

        const data = await response.json();
        return data.count || 0;
    }

    /* =====================================================
       DASHBOARD STATS
    ===================================================== */

    async function getDashboardStats(whereClause) {

        const stats = [
            {
                statisticType: "count",
                onStatisticField: "OBJECTID",
                outStatisticFieldName: "TOTAL"
            },
            {
                statisticType: "sum",
                onStatisticField: "NUMBER_KILLED",
                outStatisticFieldName: "KILLED"
            },
            {
                statisticType: "sum",
                onStatisticField: "NUMBER_INJURED",
                outStatisticFieldName: "INJURED"
            }
        ];

        const params = new URLSearchParams({
            where: whereClause,
            outStatistics: JSON.stringify(stats),
            f: "json"
        });

        const response = await fetch(
            `${FEATURE_LAYER}/query?${params}`
        );

        const data = await response.json();
        return data.features?.[0]?.attributes || {};
    }

    /* =====================================================
       YEARLY TREND
    ===================================================== */

    async function getYearTrend(whereClause = "1=1") {

        const params = new URLSearchParams({
            where: whereClause,
            groupByFieldsForStatistics: "ACCIDENT_YEAR",
            outStatistics: JSON.stringify([{
                statisticType: "count",
                onStatisticField: "OBJECTID",
                outStatisticFieldName: "metric"
            }]),
            orderByFields: "ACCIDENT_YEAR ASC",
            returnGeometry: false,
            f: "json"
        });

        const response = await fetch(
            `${FEATURE_LAYER}/query?${params}`
        );

        const data = await response.json();
        return data.features || [];
    }

    /* =====================================================
       TOP INTERSECTIONS
    ===================================================== */

    async function getTopIntersections(
        whereClause = "1=1",
        top = 10
    ) {

        const params = new URLSearchParams({
            where: whereClause,
            groupByFieldsForStatistics: "PRIMARY_RD,SECONDARY_RD",
            outStatistics: JSON.stringify([{
                statisticType: "count",
                onStatisticField: "OBJECTID",
                outStatisticFieldName: "metric"
            }]),
            orderByFields: "metric DESC",
            returnGeometry: false,
            f: "json"
        });

        const response = await fetch(
            `${FEATURE_LAYER}/query?${params}`
        );

        const data = await response.json();
        return (data.features || []).slice(0, top);
    }

    /* =====================================================
       CSV EXPORT — all fields
    ===================================================== */

    function exportCSV(features, filename = "collision_results.csv") {

        if (!features || features.length === 0) {
            alert("No records available to export.");
            return;
        }

        const columns = [
            { header: "Date",               key: "COLLISION_DATE",     fmt: formatDate },
            { header: "Year",               key: "ACCIDENT_YEAR" },
            { header: "Day of Week",        key: "DAY_OF_WEEK",        fmt: formatDayOfWeek },
            { header: "Hour",               key: "Hour" },
            { header: "Severity",           key: "COLLISION_SEVERITY", fmt: formatSeverityLabel },
            { header: "Primary Road",       key: "PRIMARY_RD" },
            { header: "Secondary Road",     key: "SECONDARY_RD" },
            { header: "Collision Type",     key: "TYPE_OF_COLLISION" },
            { header: "Collision Factor",   key: "PRIMARY_COLL_FACTOR" },
            { header: "Killed",             key: "NUMBER_KILLED" },
            { header: "Injured",            key: "NUMBER_INJURED" },
            { header: "Pedestrian",         key: "PEDESTRIAN_ACCIDENT" },
            { header: "Bicycle",            key: "BICYCLE_ACCIDENT" },
            { header: "Motorcycle",         key: "MOTORCYCLE_ACCIDENT" },
            { header: "Truck",              key: "TRUCK_ACCIDENT" },
            { header: "Alcohol",            key: "ALCOHOL_INVOLVED" },
            { header: "Hit & Run",          key: "HIT_AND_RUN" },
            { header: "Lighting",           key: "LIGHTING" },
            { header: "Road Surface",       key: "ROAD_SURFACE" },
            { header: "Weather",            key: "WEATHER_1" },
            { header: "HIN",               key: "HIN_LRSP" },
            { header: "KSI",               key: "KSI" },
            { header: "School",            key: "School_Name" },
            { header: "Park",              key: "Park_Name" },
            { header: "EPDO Score",        key: "EPDO_Score" }
        ];

        let csv = columns.map(c => escapeCSV(c.header)).join(",") + "\n";

        features.forEach(f => {
            const a = f.attributes;
            const row = columns.map(c => {
                const raw = a[c.key];
                const val = c.fmt ? c.fmt(raw) : raw;
                return escapeCSV(val);
            });
            csv += row.join(",") + "\n";
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function mapStatisticType(type) {
        const map = { sum: "sum", avg: "avg", min: "min", max: "max" };
        return map[type] || "count";
    }

    function escapeCSV(value) {
        if (value === null || value === undefined) return "";
        return `"${String(value).replace(/"/g, '""')}"`;
    }

    function formatDate(value) {
        if (!value) return "";
        return new Date(value).toLocaleDateString();
    }

    function formatDayOfWeek(value) {
        const days = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[Number(value)] || value;
    }

    function formatSeverityLabel(value) {
        const labels = { 1: "Fatal", 2: "Severe Injury", 3: "Visible Injury", 4: "Complaint of Pain" };
        return labels[Number(value)] || value;
    }

    /* =====================================================
       EXPORTS
    ===================================================== */

    return {
        runRecordQuery,
        runAnalyticsQuery,
        getCount,
        getDashboardStats,
        getYearTrend,
        getTopIntersections,
        exportCSV
    };

})();
