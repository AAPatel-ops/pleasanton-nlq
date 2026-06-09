/* ==========================================================
   providers.js
   AI Provider Layer
========================================================== */

const AIProvider = (() => {

    const SYSTEM_PROMPT = `
You are a GIS and ArcGIS Feature Service expert.

Convert user questions into JSON.

Return ONLY valid JSON.

Supported Output:

Record Query:

{
  "queryType":"record",
  "where":"COLLISION_SEVERITY = 1"
}

Analytics Query:

{
  "queryType":"analytics",
  "title":"Top 10 Dangerous Roads",
  "groupBy":"PRIMARY_RD",
  "statField":"OBJECTID",
  "statType":"count",
  "top":10,
  "where":"1=1"
}

Layer Schema:

COLLISION_SEVERITY
ACCIDENT_YEAR
PRIMARY_RD
SECONDARY_RD
PEDESTRIAN_ACCIDENT
BICYCLE_ACCIDENT
MOTORCYCLE_ACCIDENT
TRUCK_ACCIDENT
ALCOHOL_INVOLVED
HIT_AND_RUN
NUMBER_KILLED
NUMBER_INJURED
TYPE_OF_COLLISION
LIGHTING
ROAD_SURFACE
WEATHER_1
PRIMARY_COLL_FACTOR
HIN_LRSP
DAY_OF_WEEK
Hour
KSI
School_Name
Park_Name
EPDO_Score

Examples:

Question:
Show fatal collisions

Output:
{
  "queryType":"record",
  "where":"COLLISION_SEVERITY = 1"
}

Question:
Pedestrian crashes in 2022

Output:
{
  "queryType":"record",
  "where":"PEDESTRIAN_ACCIDENT = 'Y' AND ACCIDENT_YEAR = 2022"
}

Question:
Top 10 dangerous roads

Output:
{
  "queryType":"analytics",
  "title":"Top 10 Dangerous Roads",
  "groupBy":"PRIMARY_RD",
  "statField":"OBJECTID",
  "statType":"count",
  "top":10,
  "where":"1=1"
}

Question:
Fatal crashes by year

Output:
{
  "queryType":"analytics",
  "title":"Fatal Crashes By Year",
  "groupBy":"ACCIDENT_YEAR",
  "statField":"OBJECTID",
  "statType":"count",
  "top":50,
  "where":"COLLISION_SEVERITY = 1"
}

Rules:

- Return JSON only
- No markdown
- No explanations
- No SQL SELECT statements
- WHERE clause only
- Use valid ArcGIS SQL
`;

    /* =====================================================
       SETTINGS
    ===================================================== */

    function getProvider() {
        return localStorage.getItem("ai_provider") || "anthropic";
    }

    function getApiKey() {
        return localStorage.getItem("ai_api_key") || "";
    }

    /* =====================================================
       PUBLIC METHOD
    ===================================================== */

    async function processQuestion(question) {

        const provider = getProvider();
        const apiKey = getApiKey();

        if (!apiKey) {
            throw new Error(
                "No API Key configured."
            );
        }

        switch (provider) {

            case "anthropic":
                return await queryClaude(
                    question,
                    apiKey
                );

            case "openai":
                return await queryOpenAI(
                    question,
                    apiKey
                );

            case "gemini":
                return await queryGemini(
                    question,
                    apiKey
                );

            default:
                throw new Error(
                    "Unknown AI Provider"
                );
        }
    }

    /* =====================================================
       CLAUDE
    ===================================================== */

    async function queryClaude(
        question,
        apiKey
    ) {

        const response =
            await fetch(
                "https://api.anthropic.com/v1/messages",
                {
                    method: "POST",

                    headers: {
                        "content-type":
                            "application/json",

                        "x-api-key":
                            apiKey,

                        "anthropic-version":
                            "2023-06-01",

                        "anthropic-dangerous-direct-browser-access":
                            "true"
                    },

                    body: JSON.stringify({

                        model:
                            "claude-3-5-sonnet-latest",

                        temperature: 0,

                        max_tokens: 500,

                        system:
                            SYSTEM_PROMPT,

                        messages: [
                            {
                                role: "user",
                                content: question
                            }
                        ]
                    })
                }
            );

        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `Claude Error: ${text}`
            );
        }

        const data =
            await response.json();

        const content =
            data.content?.[0]?.text;

        return parseJSON(content);
    }

    /* =====================================================
       OPENAI
    ===================================================== */

    async function queryOpenAI(
        question,
        apiKey
    ) {

        const response =
            await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`
                    },

                    body: JSON.stringify({

                        model: "gpt-4o",

                        temperature: 0,

                        messages: [

                            {
                                role: "system",
                                content:
                                    SYSTEM_PROMPT
                            },

                            {
                                role: "user",
                                content:
                                    question
                            }
                        ]
                    })
                }
            );

        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `OpenAI Error: ${text}`
            );
        }

        const data =
            await response.json();

        const content =
            data.choices?.[0]
                ?.message?.content;

        return parseJSON(content);
    }

    /* =====================================================
       GEMINI
    ===================================================== */

    async function queryGemini(
        question,
        apiKey
    ) {

        const url =
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response =
            await fetch(url, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    contents: [

                        {
                            parts: [
                                {
                                    text:
                                        SYSTEM_PROMPT
                                }
                            ]
                        },

                        {
                            parts: [
                                {
                                    text:
                                        question
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        temperature: 0
                    }
                })
            });

        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `Gemini Error: ${text}`
            );
        }

        const data =
            await response.json();

        const content =
            data.candidates?.[0]
                ?.content?.parts?.[0]
                ?.text;

        return parseJSON(content);
    }

    /* =====================================================
       JSON PARSER
    ===================================================== */

    function parseJSON(text) {

        if (!text) {

            throw new Error(
                "AI returned empty response."
            );
        }

        let clean = text.trim();

        clean = clean
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        try {

            return JSON.parse(clean);

        } catch (err) {

            console.error(
                "Invalid AI JSON",
                clean
            );

            throw new Error(
                "AI returned invalid JSON."
            );
        }
    }

    /* =====================================================
       EXPORTS
    ===================================================== */

    return {

        processQuestion,

        getProvider,

        getApiKey

    };

})();
