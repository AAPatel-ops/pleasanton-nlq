/* ==========================================================
   arcgis.js
   ArcGIS Feature Service Engine
========================================================== */

const ArcGISService = (() => {

    const FEATURE_LAYER =
        "https://services7.arcgis.com/acUiOt0qxC8BlCCx/arcgis/rest/services/Pleasanton_Collisions_Dashboard_WFL1/FeatureServer/0";

    const DEFAULT_FIELDS = [

        "OBJECTID",
        "COLLISION_DATE",

        "COLLISION_SEVERITY",

        "PRIMARY_RD",
        "SECONDARY_RD",

        "TYPE_OF_COLLISION",

        "NUMBER_KILLED",
        "NUMBER_INJURED",

        "ALCOHOL_INVOLVED",

        "LIGHTING",

        "PEDESTRIAN_ACCIDENT",

        "ACCIDENT_YEAR",

        "School_Name",
        "Park_Name",

        "HIN_LRSP"

    ].join(",");

    /* =====================================================
       RECORD QUERY
    ===================================================== */

    async function runRecordQuery(
        whereClause
    ) {

        const totalCount =
            await getCount(
                whereClause
            );

        const params =
            new URLSearchParams({

                where:
                    whereClause,

                outFields:
                    DEFAULT_FIELDS,

                orderByFields:
                    "COLLISION_DATE DESC",

                returnGeometry:
                    false,

                resultRecordCount:
                    1000,

                f:
                    "json"
            });

        const response =
            await fetch(
                `${FEATURE_LAYER}/query?${params}`
            );

        if (!response.ok) {

            throw new Error(
                "ArcGIS query failed."
            );
        }

        const data =
            await response.json();

        if (data.error) {

            throw new Error(
                data.error.message
            );
        }

        return {

            type: "record",

            totalCount,

            features:
                data.features || []
        };
    }

    /* =====================================================
       ANALYTICS QUERY
    ===================================================== */

    async function runAnalyticsQuery(
        config
    ) {

        const statField =
            config.statField ||
            "OBJECTID";

        const statType =
            config.statType ||
            "count";

        const statisticType =
            mapStatisticType(
                statType
            );

        const outStatistics =
            JSON.stringify([{

                statisticType,

                onStatisticField:
                    statField,

                outStatisticFieldName:
                    "metric"

            }]);

        const params =
            new URLSearchParams({

                where:
                    config.where || "1=1",

                groupByFieldsForStatistics:
                    config.groupBy,

                outStatistics,

                orderByFields:
                    "metric DESC",

                returnGeometry:
                    false,

                f:
                    "json"
            });

        const response =
            await fetch(
                `${FEATURE_LAYER}/query?${params}`
            );

        if (!response.ok) {

            throw new Error(
                "Analytics query failed."
            );
        }

        const data =
            await response.json();

        if (data.error) {

            throw new Error(
                data.error.message
            );
        }

        let rows =
            data.features || [];

        rows = rows
            .sort((a,b)=>
                b.attributes.metric -
                a.attributes.metric
            );

        if (config.top) {

            rows =
                rows.slice(
                    0,
                    config.top
                );
        }

        return {

            type: "analytics",

            title:
                config.title,

            groupBy:
                config.groupBy,

            rows
        };
    }

    /* =====================================================
       COUNT QUERY
    ===================================================== */

    async function getCount(
        whereClause
    ) {

        const params =
            new URLSearchParams({

                where:
                    whereClause,

                returnCountOnly:
                    true,

                f:
                    "json"
            });

        const response =
            await fetch(
                `${FEATURE_LAYER}/query?${params}`
            );

        if (!response.ok) {

            throw new Error(
                "Count query failed."
            );
        }

        const data =
            await response.json();

        return data.count || 0;
    }

    /* =====================================================
       DASHBOARD STATS
    ===================================================== */

    async function getDashboardStats(
        whereClause
    ) {

        const stats = [

            {
                statisticType: "count",
                onStatisticField:
                    "OBJECTID",
                outStatisticFieldName:
                    "TOTAL"
            },

            {
                statisticType: "sum",
                onStatisticField:
                    "NUMBER_KILLED",
                outStatisticFieldName:
                    "KILLED"
            },

            {
                statisticType: "sum",
                onStatisticField:
                    "NUMBER_INJURED",
                outStatisticFieldName:
                    "INJURED"
            }
        ];

        const params =
            new URLSearchParams({

                where:
                    whereClause,

                outStatistics:
                    JSON.stringify(stats),

                f:
                    "json"
            });

        const response =
            await fetch(
                `${FEATURE_LAYER}/query?${params}`
            );

        const data =
            await response.json();

        return data.features?.[0]
            ?.attributes || {};
    }

    /* =====================================================
       YEARLY TREND
    ===================================================== */

    async function getYearTrend(
        whereClause = "1=1"
    ) {

        const params =
            new URLSearchParams({

                where:
                    whereClause,

                groupByFieldsForStatistics:
                    "ACCIDENT_YEAR",

                outStatistics:
                    JSON.stringify([{

                        statisticType:
                            "count",

                        onStatisticField:
                            "OBJECTID",

                        outStatisticFieldName:
                            "metric"

                    }]),

                orderByFields:
                    "ACCIDENT_YEAR ASC",

                returnGeometry:
                    false,

                f:
                    "json"
            });

        const response =
            await fetch(
                `${FEATURE_LAYER}/query?${params}`
            );

        const data =
            await response.json();

        return (
            data.features || []
        );
    }

    /* =====================================================
       TOP INTERSECTIONS
    ===================================================== */

    async function getTopIntersections(
        whereClause = "1=1",
        top = 10
    ) {

        const params =
            new URLSearchParams({

                where:
                    whereClause,

                groupByFieldsForStatistics:
                    "PRIMARY_RD,SECONDARY_RD",

                outStatistics:
                    JSON.stringify([{

                        statisticType:
                            "count",

                        onStatisticField:
                            "OBJECTID",

                        outStatisticFieldName:
                            "metric"

                    }]),

                orderByFields:
                    "metric DESC",

                returnGeometry:
                    false,

                f:
                    "json"
            });

        const response =
            await fetch(
                `${FEATURE_LAYER}/query?${params}`
            );

        const data =
            await response.json();

        return (
            data.features || []
        ).slice(0, top);
    }

    /* =====================================================
       CSV EXPORT
    ===================================================== */

    function exportCSV(
        features,
        filename =
            "collision_results.csv"
    ) {

        if (
            !features ||
            features.length === 0
        ) {

            alert(
                "No records available."
            );

            return;
        }

        const headers = [

            "Date",
            "Severity",
            "Primary Road",
            "Secondary Road",
            "Collision Type",
            "Killed",
            "Injured",
            "Alcohol",
            "Lighting"
        ];

        let csv =
            headers.join(",") +
            "\n";

        features.forEach(f => {

            const a =
                f.attributes;

            const row = [

                formatDate(
                    a.COLLISION_DATE
                ),

                a.COLLISION_SEVERITY,

                escapeCSV(
                    a.PRIMARY_RD
                ),

                escapeCSV(
                    a.SECONDARY_RD
                ),

                escapeCSV(
                    a.TYPE_OF_COLLISION
                ),

                a.NUMBER_KILLED,

                a.NUMBER_INJURED,

                a.ALCOHOL_INVOLVED,

                a.LIGHTING
            ];

            csv +=
                row.join(",") +
                "\n";
        });

        const blob =
            new Blob(
                [csv],
                {
                    type:
                    "text/csv;charset=utf-8;"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            filename;

        document.body
            .appendChild(link);

        link.click();

        document.body
            .removeChild(link);

        URL.revokeObjectURL(
            url
        );
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function mapStatisticType(
        type
    ) {

        switch(type) {

            case "sum":
                return "sum";

            case "avg":
                return "avg";

            case "min":
                return "min";

            case "max":
                return "max";

            default:
                return "count";
        }
    }

    function escapeCSV(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return `"${String(value)
            .replace(/"/g,'""')}"`;
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
