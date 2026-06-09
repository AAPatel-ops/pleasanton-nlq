/* ==========================================================
   validator.js
   ArcGIS SQL Validation & Sanitization
========================================================== */

const QueryValidator = (() => {

    /* =====================================================
       ALLOWED FIELDS
    ===================================================== */

    const ALLOWED_FIELDS = [

        "COLLISION_SEVERITY",
        "COLLISION_DATE",
        "ACCIDENT_YEAR",

        "PRIMARY_RD",
        "SECONDARY_RD",

        "PEDESTRIAN_ACCIDENT",
        "BICYCLE_ACCIDENT",
        "MOTORCYCLE_ACCIDENT",
        "TRUCK_ACCIDENT",

        "ALCOHOL_INVOLVED",
        "HIT_AND_RUN",

        "NUMBER_KILLED",
        "NUMBER_INJURED",

        "TYPE_OF_COLLISION",

        "LIGHTING",
        "ROAD_SURFACE",
        "WEATHER_1",

        "PRIMARY_COLL_FACTOR",

        "HIN_LRSP",

        "DAY_OF_WEEK",

        "Hour",

        "KSI",

        "School_Name",
        "Park_Name",

        "EPDO_Score",

        "OBJECTID"
    ];

    /* =====================================================
       ALLOWED GROUP BY FIELDS
    ===================================================== */

    const ALLOWED_GROUPBY = [

        "PRIMARY_RD",
        "SECONDARY_RD",
        "ACCIDENT_YEAR",

        "COLLISION_SEVERITY",

        "TYPE_OF_COLLISION",

        "LIGHTING",

        "DAY_OF_WEEK",

        "School_Name",
        "Park_Name",

        "PRIMARY_COLL_FACTOR",

        "HIN_LRSP"
    ];

    /* =====================================================
       BLOCKED SQL TOKENS
    ===================================================== */

    const BLOCKED_KEYWORDS = [

        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "DROP",
        "ALTER",
        "TRUNCATE",
        "CREATE",

        "UNION",

        "EXEC",
        "EXECUTE",

        "--",
        "/*",
        "*/",

        ";"
    ];

    /* =====================================================
       MAIN VALIDATOR
    ===================================================== */

    function validate(aiResponse) {

        if (!aiResponse) {

            throw new Error(
                "Empty AI response."
            );
        }

        if (!aiResponse.queryType) {

            throw new Error(
                "Missing queryType."
            );
        }

        switch (aiResponse.queryType) {

            case "record":
                validateRecordQuery(
                    aiResponse
                );
                break;

            case "analytics":
                validateAnalyticsQuery(
                    aiResponse
                );
                break;

            default:

                throw new Error(
                    "Unsupported queryType."
                );
        }

        return aiResponse;
    }

    /* =====================================================
       RECORD QUERY
    ===================================================== */

    function validateRecordQuery(
        query
    ) {

        if (!query.where) {

            throw new Error(
                "Missing WHERE clause."
            );
        }

        query.where =
            sanitizeWhereClause(
                query.where
            );
    }

    /* =====================================================
       ANALYTICS QUERY
    ===================================================== */

    function validateAnalyticsQuery(
        query
    ) {

        if (!query.groupBy) {

            throw new Error(
                "Analytics query missing groupBy."
            );
        }

        if (
            !ALLOWED_GROUPBY.includes(
                query.groupBy
            )
        ) {

            throw new Error(
                `Invalid groupBy field: ${query.groupBy}`
            );
        }

        query.where =
            sanitizeWhereClause(
                query.where || "1=1"
            );

        query.top =
            Number(query.top || 10);

        if (
            query.top < 1 ||
            query.top > 100
        ) {

            query.top = 10;
        }

        const allowedStatTypes = [

            "count",
            "sum",
            "avg",
            "min",
            "max"

        ];

        if (
            !allowedStatTypes.includes(
                query.statType
            )
        ) {

            query.statType = "count";
        }

        if (
            query.statField &&
            !ALLOWED_FIELDS.includes(
                query.statField
            )
        ) {

            throw new Error(
                `Invalid statistic field: ${query.statField}`
            );
        }
    }

    /* =====================================================
       WHERE CLAUSE SANITIZER
    ===================================================== */

    function sanitizeWhereClause(
        whereClause
    ) {

        if (!whereClause) {

            return "1=1";
        }

        let clean =
            String(whereClause)
                .trim();

        clean = clean
            .replace(/^WHERE\s+/i, "")
            .replace(/`/g, "");

        const upper =
            clean.toUpperCase();

        for (const token of BLOCKED_KEYWORDS) {

            if (
                upper.includes(
                    token.toUpperCase()
                )
            ) {

                throw new Error(
                    `Blocked SQL keyword detected: ${token}`
                );
            }
        }

        validateFieldNames(
            clean
        );

        return clean;
    }

    /* =====================================================
       FIELD VALIDATION
    ===================================================== */

    function validateFieldNames(
        sql
    ) {

        const matches =
            sql.match(
                /\b[A-Za-z_][A-Za-z0-9_]*\b/g
            ) || [];

        const ignoreTokens = [

            "AND",
            "OR",
            "NOT",
            "LIKE",
            "IN",
            "IS",
            "NULL",

            "UPPER",
            "LOWER",

            "DATE",

            "TRUE",
            "FALSE",

            "Y",
            "N"
        ];

        for (const token of matches) {

            const upper =
                token.toUpperCase();

            if (
                ignoreTokens.includes(
                    upper
                )
            ) {
                continue;
            }

            const isField =
                ALLOWED_FIELDS.some(
                    f =>
                        f.toUpperCase() ===
                        upper
                );

            const isNumber =
                !isNaN(token);

            if (
                !isField &&
                !isNumber
            ) {

                if (
                    token.length > 2
                ) {

                    throw new Error(
                        `Unknown field detected: ${token}`
                    );
                }
            }
        }
    }

    /* =====================================================
       HELPER METHODS
    ===================================================== */

    function isAllowedField(
        fieldName
    ) {

        return ALLOWED_FIELDS.includes(
            fieldName
        );
    }

    function getAllowedFields() {

        return [
            ...ALLOWED_FIELDS
        ];
    }

    function getAllowedGroupBy() {

        return [
            ...ALLOWED_GROUPBY
        ];
    }

    /* =====================================================
       EXPORTS
    ===================================================== */

    return {

        validate,

        sanitizeWhereClause,

        isAllowedField,

        getAllowedFields,

        getAllowedGroupBy

    };

})();
