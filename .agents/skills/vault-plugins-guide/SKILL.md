# Vault Plugins Guide

Use this skill when an agent needs to understand which Obsidian plugins are active and how they impact workflows.

## Read first

- `.obsidian/community-plugins.json`
- `.obsidian/core-plugins.json`
- `.obsidian/plugins/tasknotes/data.json` (read-only; contains sensitive tokens)

## Active community plugins (current vault)

- `tasknotes`: task management, calendar, pomodoro/time tracking, Bases views.
- `datacore`: dynamic code views and wrapper-based dashboards.
- `omnisearch`: advanced search.
- `editing-toolbar`: editor actions.
- `notebook-navigator`, `lazy-plugins`: navigation and lazy loading.

## Core plugins relevant to dashboards

- `bases`, `daily-notes`, `canvas`, `graph`, `command-palette`, `page-preview`, `properties`, `workspaces`.

## TaskNotes notes

- Docs: https://tasknotes.dev/
- Pomodoro docs: https://tasknotes.dev/views/pomodoro-view/
- Prefer opening Pomodoro via TaskNotes command ID lookup (`tasknotes` + `pomodoro`).
- If no command is found, guide user to TaskNotes View Commands settings.

## Security rule

- Never expose or commit secrets from plugin config files (OAuth tokens, API keys).

