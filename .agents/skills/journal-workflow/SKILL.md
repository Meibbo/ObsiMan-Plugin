---
name: journal-workflow
description: Guide for understanding and interacting with the Obsidian Journal module, specifically Daily, Event, Weekly, Monthly, and Quarterly logs. Use this skill when logging habits, events, or performing weekly/monthly reviews.
---

# Journal Module Workflow

This skill defines the structure and usage of the Journal module. A clear distinction is made between modifying **metadata** (YAML frontmatter properties) and **content** (Markdown body) for each template type.

## 1. Daily Logs (`type: log`, `logType: "[[Day]]"`)

The daily log is the core tracking unit of the journal, focused on granular data and chronological events.

**Metadata (Frontmatter):**
- **Function**: Tracking physical, emotional, and productivity metrics.
- **Agent Implementation**: When updating habits, focus *exclusively* on modifying these YAML values.
  - *Scores/Metrics*: `DayMoodMScore`, `DayMoodEScore`, `DayEnergyScore`, `sleep-quality`, `health-score`, `sleep-hours`, `water-ml`, `exercise-minutes`, `weight`, etc.
  - *Booleans (Meals)*: `DayBreakfast`, `DayLunch`, `DayDinner`, etc.
  - *Text summaries*: `description`, `challenge`, `gratitude`, `highlight`, `summary`.

**Content (Markdown Body):**
- **Function**: A chronological ledger of the day's events.
- **Agent Implementation**: When the user wants to log an occurrence during the day, *DO NOT* put it in the frontmatter. Instead, locate the `### Records` section in the body. Append a new timestamped header (e.g., `#### 14:30`) beneath it, followed by the content or a link to an event note.

---

## 2. Events (`type: event`)

Events capture specific occurrences or detailed thoughts that are too large or distinct to reside entirely inside a Daily Log.

**Metadata:**
- **Function**: Minimal. Primarily relies on `type: event` and `date`. Does not use heavy tracking properties.

**Content:**
- **Function**: Contains the actual details of the occurrence.
- **Agent Implementation**: When creating an event note, it *must* be linked back to the current day's Daily Log. Navigate to the Daily Log's `### Records` section, create a timestamp, and embed or link the new event note (`#### HH:mm \n ![[YYYY-MM-DD-HHmm Event Name]]`).

---

## 3. Weekly Logs (`tags: log/Weekly`)

Weekly logs aggregate daily data and provide a space for tactical reflection.

**Metadata:**
- **Function**: Primarily relational mapping (`up` to Month, `Prev`/`Next` to weeks). No daily tracking metrics are stored here.

**Content:**
- **Function**: Reviews habits and curates tasks.
- **Agent Implementation**: 
  - Do not try to update habits in the weekly metadata. The template handles this automatically via Obsidian Base embeds (`![[Journal.base#Habits]]`).
  - To assist in a weekly review, the agent should populate the `## Insight` section, specifically generating bullet points for `###### ***Observations***` and `###### ***Ideas***` based on the week's daily records.

---

## 4. Monthly Logs (`tags: log/Monthly`)

Monthly logs provide high-level strategic review and milestone tracking.

**Metadata:**
- **Function**: Relational link mapping to Year/Quarter.

**Content:**
- **Function**: Summarizing achievements and deep reflection.
- **Agent Implementation**: 
  - Like the week, metrics are handled heavily by embedded bases (`![[Journal.base#Planning]]`).
  - During a monthly review, the agent must extract data from the 4-5 weekly logs and populate the `## Review` section (`#### ***Personal***/***Social*** achievements`, `#### ***Student*** / ***Work*** milestones`).
  - The agent should then synthesize these findings to answer the prompts in `## Insight` (Progress, Difficulties, Improvements).

---

## 5. Quarterly Logs (`tags: log/Quarterly`)

Quarterly logs are for long-term foresight and structural alignment.

**Metadata:**
- **Function**: Relational mapping to the Year.

**Content:**
- **Function**: Planning the upcoming three months.
- **Agent Implementation**: The agent should help format the `## Months` list and draft high-level objectives in the `## Foresight` section, avoiding granular daily or weekly tasks.
