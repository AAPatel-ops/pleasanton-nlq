# Pleasanton Collision Intelligence Dashboard

AI-Powered Natural Language Query (NLQ) Application for ArcGIS Feature Services

---

## Overview

Pleasanton Collision Intelligence Dashboard is a lightweight web application that enables users to query ArcGIS collision data using natural language.

Users can ask questions such as:

* Show fatal collisions
* Pedestrian crashes in 2022
* Alcohol-related collisions
* Fatal crashes near schools
* Top 10 dangerous roads
* Top 10 intersections
* Bicycle crashes by year

The application uses Large Language Models (LLMs) to convert natural language into ArcGIS-compatible query definitions and analytics requests.

Supported AI providers:

* Anthropic Claude
* OpenAI GPT
* Google Gemini

The application is designed to run entirely on static hosting platforms such as GitHub Pages and can be embedded directly inside ArcGIS Dashboards using the Embedded Content widget.

---

## Features

### Natural Language Query

Convert plain English questions into ArcGIS queries.

Examples:

Show fatal crashes

Pedestrian collisions near schools

Alcohol-related crashes in 2023

Top 10 dangerous roads

Most dangerous intersections

---

### AI Provider Selection

Users may choose:

* Claude (Anthropic)
* OpenAI GPT
* Google Gemini

API keys are provided by the user and stored locally in the browser.

---

### ArcGIS Integration

Supports ArcGIS Feature Services through the ArcGIS REST API.

Configured Layer:

https://services7.arcgis.com/acUiOt0qxC8BlCCx/arcgis/rest/services/Pleasanton_Collisions_Dashboard_WFL1/FeatureServer/0

---

### Analytics

Supports:

* Top Roads
* Top Intersections
* Collisions by Year
* Fatal Crashes by Year
* Pedestrian Crashes by Year
* Alcohol-Related Crashes
* School Area Analysis
* Park Area Analysis
* High Injury Network Analysis

---

### Visualization

Built with Chart.js.

Supported chart types:

* Bar Charts
* Pie Charts
* Line Charts

---

### Export

Users can export query results to:

* CSV

---

## Project Structure

```text
ArcGIS-NLQ-Dashboard
│
├── index.html
│
├── css
│   └── styles.css
│
├── js
│   ├── app.js
│   ├── providers.js
│   ├── validator.js
│   ├── arcgis.js
│   └── analytics.js
│
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-org/ArcGIS-NLQ-Dashboard.git
```

### Open Project

Simply open:

```text
index.html
```

or deploy to GitHub Pages.

No build process is required.

No backend is required.

---

## GitHub Pages Deployment

### Step 1

Push repository to GitHub.

### Step 2

Navigate to:

Settings → Pages

### Step 3

Select:

Source: Deploy from Branch

Branch: main

Folder: /

### Step 4

Save configuration.

GitHub will publish the application.

Example URL:

```text
https://your-org.github.io/ArcGIS-NLQ-Dashboard/
```

---

## ArcGIS Dashboard Integration

Add an Embedded Content element.

Configure:

```text
Type:
URL
```

Enter:

```text
https://your-org.github.io/ArcGIS-NLQ-Dashboard/
```

Enable:

* Allow scrolling
* Open links in new window

Recommended minimum size:

```text
1200 x 800
```

---

## Security Notice

This application stores AI API keys inside the user's browser using Local Storage.

Because the application runs entirely in the browser:

* API keys are visible to the user.
* API keys should be considered user-managed.
* Public deployments should not contain organization-owned API keys.

For production deployments, consider using:

* Cloudflare Workers
* Azure Functions
* AWS Lambda
* Vercel Functions

to proxy AI requests.

---

## Supported Query Types

### Record Queries

Examples:

```text
Show fatal collisions

Pedestrian crashes

Alcohol related crashes

Fatal crashes near schools
```

Returns individual collision records.

---

### Analytics Queries

Examples:

```text
Top 10 dangerous roads

Top 10 intersections

Fatal crashes by year

Pedestrian crashes by year

Alcohol crashes by year
```

Returns charts and summarized analytics.

---

## Technology Stack

Frontend

* HTML5
* CSS3
* Vanilla JavaScript

AI Providers

* Anthropic Claude
* OpenAI GPT
* Google Gemini

Visualization

* Chart.js

GIS

* ArcGIS REST API

Hosting

* GitHub Pages

---

## Known Limitations

### Public API Keys

Browser-based AI requests expose API keys to the end user.

### Feature Layer Schema

The AI prompt assumes field names exist exactly as configured.

If field names change, update:

```text
providers.js
validator.js
arcgis.js
```

accordingly.

### Rate Limits

All AI providers enforce request limits and quotas.

---

## Recommended Production Architecture

Browser
↓
Cloudflare Worker
↓
Claude / GPT / Gemini
↓
ArcGIS Feature Service

This approach prevents exposing API keys and provides better monitoring, logging, and security.

---

## License

MIT License

---

## Author

Pleasanton Collision Intelligence Dashboard

Natural Language Query Application for ArcGIS Dashboards
