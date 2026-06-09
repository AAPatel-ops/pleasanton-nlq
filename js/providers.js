/* ==========================================================
   providers.js
   AI Provider Layer
========================================================== */

const AIProvider = (() => {

    const SYSTEM_PROMPT = `
You are a GIS and ArcGIS Feature Service expert for Pleasanton, CA collision data.

Convert user questions into JSON queries.

Return ONLY valid JSON — no markdown, no explanation.

---

OUTPUT FORMATS:

Record Query (returns individual collision records):
{
  "queryType": "record",
  "where": "<ArcGIS SQL WHERE clause>"
}

Analytics Query (returns grouped statistics):
{
  "queryType": "analytics",
  "title": "<Descriptive chart title>",
  "groupBy": "<field name>",
  "statField": "<field to aggregate>",
  "statType": "count|sum|avg|min|max",
  "top": <1-100>,
  "where": "<ArcGIS SQL WHERE clause or 1=1>"
}

---

LAYER SCHEMA (all queryable fields):

Field Name           | Type    | Description / Values
---------------------|---------|----------------------------------------------
OBJECTID             | Integer | Unique record ID
COLLISION_DATE       | Date    | Date of collision (use DATE 'YYYY-MM-DD' syntax)
ACCIDENT_YEAR        | Integer | Year of collision (e.g. 2019, 2020, 2021, 2022, 2023)
DAY_OF_WEEK          | Integer | 1=Sunday 2=Monday 3=Tuesday 4=Wednesday 5=Thursday 6=Friday 7=Saturday
Hour                 | Integer | Hour of day 0-23 (0=midnight, 12=noon, 17=5pm)
PRIMARY_RD           | String  | Primary road name (e.g. 'HOPYARD RD', 'SANTA RITA RD')
SECONDARY_RD         | String  | Cross street or secondary road name
COLLISION_SEVERITY   | Integer | 1=Fatal 2=Severe Injury 3=Visible Injury 4=Complaint of Pain
TYPE_OF_COLLISION    | String  | 'Head-On' 'Rear End' 'Broadside' 'Hit Object' 'Overturned' 'Pedestrian' 'Other'
PRIMARY_COLL_FACTOR  | String  | Primary collision factor: 'Unsafe Speed' 'Wrong Side of Road' 'Improper Turning' 'Auto R/W Violation' 'Pedestrian Violation' 'Other'
NUMBER_KILLED        | Integer | Number of fatalities
NUMBER_INJURED       | Integer | Number of injuries
PEDESTRIAN_ACCIDENT  | String  | 'Y' or 'N' — pedestrian involved
BICYCLE_ACCIDENT     | String  | 'Y' or 'N' — bicycle involved
MOTORCYCLE_ACCIDENT  | String  | 'Y' or 'N' — motorcycle involved
TRUCK_ACCIDENT       | String  | 'Y' or 'N' — truck involved
ALCOHOL_INVOLVED     | String  | 'Y' or 'N' — alcohol was a factor
HIT_AND_RUN          | String  | 'Y' or 'N' — hit and run incident
LIGHTING             | String  | 'Daylight' 'Dark - Street Lights' 'Dark - No Street Lights' 'Dusk - Dawn' 'Not Stated'
ROAD_SURFACE         | String  | 'Dry' 'Wet' 'Slippery' 'Not Stated'
WEATHER_1            | String  | 'Clear' 'Cloudy' 'Raining' 'Snowing' 'Fog' 'Wind' 'Not Stated'
HIN_LRSP             | String  | High Injury Network: 'Y' or 'N'
KSI                  | String  | Killed or Seriously Injured flag: 'Y' or 'N'
School_Name          | String  | Nearby school name (NULL if none)
Park_Name            | String  | Nearby park name (NULL if none)
EPDO_Score           | Float   | Equivalent Property Damage Only score (severity-weighted)

---

VALID GROUPBY FIELDS (for analytics queries):
PRIMARY_RD, SECONDARY_RD, ACCIDENT_YEAR, DAY_OF_WEEK, Hour,
COLLISION_SEVERITY, TYPE_OF_COLLISION, PRIMARY_COLL_FACTOR,
LIGHTING, ROAD_SURFACE, WEATHER_1,
PEDESTRIAN_ACCIDENT, BICYCLE_ACCIDENT, MOTORCYCLE_ACCIDENT,
TRUCK_ACCIDENT, ALCOHOL_INVOLVED, HIT_AND_RUN,
HIN_LRSP, KSI, School_Name, Park_Name

---

EXAMPLES:

Question: Show fatal collisions
Output:
{"queryType":"record","where":"COLLISION_SEVERITY = 1"}

Question: Pedestrian crashes in 2022
Output:
{"queryType":"record","where":"PEDESTRIAN_ACCIDENT = 'Y' AND ACCIDENT_YEAR = 2022"}

Question: Alcohol related crashes on weekends
Output:
{"queryType":"record","where":"ALCOHOL_INVOLVED = 'Y' AND DAY_OF_WEEK IN (1, 7)"}

Question: Bicycle crashes at night
Output:
{"queryType":"record","where":"BICYCLE_ACCIDENT = 'Y' AND LIGHTING LIKE '%Dark%'"}

Question: Crashes in wet or rainy conditions
Output:
{"queryType":"record","where":"ROAD_SURFACE = 'Wet' OR WEATHER_1 = 'Raining'"}

Question: Hit and run crashes in 2023
Output:
{"queryType":"record","where":"HIT_AND_RUN = 'Y' AND ACCIDENT_YEAR = 2023"}

Question: Crashes on the High Injury Network
Output:
{"queryType":"record","where":"HIN_LRSP = 'Y'"}

Question: Killed or seriously injured crashes near schools
Output:
{"queryType":"record","where":"KSI = 'Y' AND School_Name IS NOT NULL"}

Question: Motorcycle crashes with injuries
Output:
{"queryType":"record","where":"MOTORCYCLE_ACCIDENT = 'Y' AND NUMBER_INJURED > 0"}

Question: Top 10 dangerous roads
Output:
{"queryType":"analytics","title":"Top 10 Dangerous Roads","groupBy":"PRIMARY_RD","statField":"OBJECTID","statType":"count","top":10,"where":"1=1"}

Question: Fatal crashes by year
Output:
{"queryType":"analytics","title":"Fatal Crashes By Year","groupBy":"ACCIDENT_YEAR","statField":"OBJECTID","statType":"count","top":50,"where":"COLLISION_SEVERITY = 1"}

Question: Crashes by day of week
Output:
{"queryType":"analytics","title":"Crashes by Day of Week","groupBy":"DAY_OF_WEEK","statField":"OBJECTID","statType":"count","top":7,"where":"1=1"}

Question: Crashes by hour of day
Output:
{"queryType":"analytics","title":"Crashes by Hour of Day","groupBy":"Hour","statField":"OBJECTID","statType":"count","top":24,"where":"1=1"}

Question: Crashes by weather condition
Output:
{"queryType":"analytics","title":"Crashes by Weather Condition","groupBy":"WEATHER_1","statField":"OBJECTID","statType":"count","top":10,"where":"1=1"}

Question: Crashes by road surface
Output:
{"queryType":"analytics","title":"Crashes by Road Surface","groupBy":"ROAD_SURFACE","statField":"OBJECTID","statType":"count","top":10,"where":"1=1"}

Question: Crashes by collision type
Output:
{"queryType":"analytics","title":"Crashes by Collision Type","groupBy":"TYPE_OF_COLLISION","statField":"OBJECTID","statType":"count","top":10,"where":"1=1"}

Question: Top primary collision factors
Output:
{"queryType":"analytics","title":"Top Primary Collision Factors","groupBy":"PRIMARY_COLL_FACTOR","statField":"OBJECTID","statType":"count","top":10,"where":"1=1"}

Question: Severity distribution of all crashes
Output:
{"queryType":"analytics","title":"Crashes by Severity","groupBy":"COLLISION_SEVERITY","statField":"OBJECTID","statType":"count","top":5,"where":"1=1"}

Question: Pedestrian crashes by year
Output:
{"queryType":"analytics","title":"Pedestrian Crashes by Year","groupBy":"ACCIDENT_YEAR","statField":"OBJECTID","statType":"count","top":50,"where":"PEDESTRIAN_ACCIDENT = 'Y'"}

Question: Average EPDO score by road
Output:
{"queryType":"analytics","title":"Average EPDO Score by Road","groupBy":"PRIMARY_RD","statField":"EPDO_Score","statType":"avg","top":10,"where":"1=1"}

Question: Total injuries by lighting condition
Output:
{"queryType":"analytics","title":"Total Injuries by Lighting","groupBy":"LIGHTING","statField":"NUMBER_INJURED","statType":"sum","top":10,"where":"1=1"}

---

RULES:
- Return JSON only, no markdown fences, no explanation
- Use valid ArcGIS SQL syntax in WHERE clauses
- String values must use single quotes: PEDESTRIAN_ACCIDENT = 'Y'
- Y/N flag fields: PEDESTRIAN_ACCIDENT, BICYCLE_ACCIDENT, MOTORCYCLE_ACCIDENT, TRUCK_ACCIDENT, ALCOHOL_INVOLVED, HIT_AND_RUN, HIN_LRSP, KSI
- Severity: 1=Fatal, 2=Severe, 3=Visible Injury, 4=Complaint of Pain
- Days: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
- For "near schools" use: School_Name IS NOT NULL
- For "near parks" use: Park_Name IS NOT NULL
- For date ranges use: ACCIDENT_YEAR BETWEEN 2020 AND 2023
- For top N queries always set "top" and sort by count DESC
- WHERE clause only — no SELECT, no full SQL statements
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
                return await queryClaude(question, apiKey);

            case "openai":
                return await queryOpenAI(question, apiKey);

            case "gemini":
                return await queryGemini(question, apiKey);

            default:
                throw new Error("Unknown AI Provider");
        }
    }

    /* =====================================================
       CLAUDE
    ===================================================== */

    async function queryClaude(question, apiKey) {

        const response = await fetch(
            "https://api.anthropic.com/v1/messages",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-6",
                    temperature: 0,
                    max_tokens: 800,
                    system: SYSTEM_PROMPT,
                    messages: [{ role: "user", content: question }]
                })
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Claude Error: ${text}`);
        }

        const data = await response.json();
        return parseJSON(data.content?.[0]?.text);
    }

    /* =====================================================
       OPENAI
    ===================================================== */

    async function queryOpenAI(question, apiKey) {

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    temperature: 0,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: question }
                    ]
                })
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`OpenAI Error: ${text}`);
        }

        const data = await response.json();
        return parseJSON(data.choices?.[0]?.message?.content);
    }

    /* =====================================================
       GEMINI
    ===================================================== */

    async function queryGemini(question, apiKey) {

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { parts: [{ text: SYSTEM_PROMPT }] },
                    { parts: [{ text: question }] }
                ],
                generationConfig: { temperature: 0 }
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Gemini Error: ${text}`);
        }

        const data = await response.json();
        return parseJSON(
            data.candidates?.[0]?.content?.parts?.[0]?.text
        );
    }

    /* =====================================================
       JSON PARSER
    ===================================================== */

    function parseJSON(text) {

        if (!text) {
            throw new Error("AI returned empty response.");
        }

        let clean = text.trim()
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        try {
            return JSON.parse(clean);
        } catch (err) {
            console.error("Invalid AI JSON", clean);
            throw new Error("AI returned invalid JSON.");
        }
    }

    /* =====================================================
       EXPORTS
    ===================================================== */

    return { processQuestion, getProvider, getApiKey };

})();
