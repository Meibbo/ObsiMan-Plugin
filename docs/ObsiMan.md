---
Category:
  - "[[Projects]]"
in:
  - "[[Management|PKM]]"
  - "[[+/Obsidian|Obsidian]]"
up:
  - "[[Plugin ideas]]"
type:
  - task
  - index
status: in-progress
priority: normal
due: 2026-03-27
scheduled: 2026-03-25
start: 2026-03-07T13:30:00
projectStructure:
  - RoadMap
  - Development
  - Presentation
  - Versions
projectParticipants:
  - "[[Meibbo]]"
projectTools:
  - "[[ChatGPT]]"
  - "[[Claude Code]]"
  - "[[Gemini CLI]]"
  - "[[Google Antigravity]]"
  - "[[Cursor]]"
timeEntries:
  - startTime: 2026-03-16T06:01:35.958Z
    description: Work session
    endTime: 2026-03-16T06:30:50.460Z
  - startTime: 2026-03-16T11:04:51.200Z
    description: Work session
    endTime: 2026-03-16T11:32:45.222Z
  - startTime: 2026-03-16T11:52:42.356Z
    description: Work session
    endTime: 2026-03-16T13:32:41.914Z
  - startTime: 2026-03-17T10:24:29.000Z
    description: Work session
    endTime: 2026-03-17T11:25:34.000Z
  - startTime: 2026-03-17T11:26:57.853Z
    description: Work session
    endTime: 2026-03-17T11:42:02.301Z
  - startTime: 2026-03-17T11:53:40.207Z
    description: Work session
    endTime: 2026-03-17T12:23:40.223Z
  - startTime: 2026-03-17T12:28:16.647Z
    description: Work session
    endTime: 2026-03-17T12:50:16.740Z
  - startTime: 2026-03-17T12:50:37.000Z
    description: Work session
    endTime: 2026-03-17T14:00:46.000Z
  - startTime: 2026-03-17T14:11:34.000Z
    description: Work session
    endTime: 2026-03-17T16:11:36.000Z
  - startTime: 2026-03-17T16:32:34.466Z
    description: Work session
    endTime: 2026-03-17T17:09:36.505Z
  - startTime: 2026-03-18T06:54:35.801Z
    description: Work session
    endTime: 2026-03-18T07:19:35.813Z
  - startTime: 2026-03-24T18:35:51.609Z
    description: Work session
    endTime: 2026-03-24T19:05:56.118Z
  - startTime: 2026-03-24T20:58:55.667Z
    description: Work session
    endTime: 2026-03-24T21:31:50.840Z
  - startTime: 2026-03-24T22:56:49.644Z
    description: Work session
    endTime: 2026-03-25T06:53:51.417Z
  - startTime: 2026-03-25T18:46:55.162Z
    description: Work session
    endTime: 2026-03-25T19:16:56.336Z
  - startTime: 2026-03-25T19:49:48.000Z
    description: Work session
    endTime: 2026-03-25T20:49:49.000Z
  - startTime: 2026-03-25T21:30:26.000Z
    description: Work session
    endTime: 2026-03-26T01:01:12.000Z
aliases:
  - PKM Manager
cover: obsiman_red-transparent.png
on:
  - Workflow
projectEffort:
  - "[[Code]]"
  - Publish
  - Marketing Campaign
  - Network development
  - Design
projectTarget:
  - "[[Automation]]"
  - Wrapper
  - Interaction
  - "[[SpeedUp]]"
output:
  - "[[Reddit]]"
  - Discord
  - "[[Twitter]]"
  - Obsidian Forum
level:
  - "[[Addition]]"
  - Review
  - Transform
googleCalendarEventId: 9pr6hihfh2el2v46evq7poj58o
version: 1.2.2
appElements:
  - GUI
language:
  - "[[English]]"
  - Spanish
cssclasses:
dateCreated: 2026-03-06T00:43:00
dateModified: 2026-03-25T19:53:38.182-05:00
structure:
  - tasks
  - toc
  - outline
  - moc
  - query
  - images
  - callout
title: ObsiMan
---
# Roadmap
Qué pasos debo seguir para el desarrollo y publicación de este proyecto
## Development
Necessary steps to conclude this project efficiently
### Structure
- [[Obsiman - User Interface]]
- [[obsiman project drafts|Version control]]
	- Obsidian Plugin
	- Python Script
- [[Archived tasks#ObsiMan|Archived tasks]]
## Publishing
Debo compartir el proyecto para recibir opiniones, críticas y sugerencias.
[[ObsiMan - Marketing]]
# Presentation
De qué trata el proyecto y cómo se presentará a los participantes, herramientas IA y al público en general.
## Product
lo que le dará personalidad y lo hará distinguir del resto
### Review
vistas previas, capturas de pantalla mientras progresa el desarrollo para una futura vista de cómo evolucionó las fases del proyecto
### Design & Architecture
> [!note]+ Main structure
> ```base
> filters:
>   and:
>     - up.contains(link("ObsiMan"))
> views:
>   - type: list
>     name: View
>     order:
>       - file.name
>       - description
>     separator: " — "
>     indentProperties: true
>   - type: table
>     name: Edit
>     order:
>       - file.name
>       - description
>     separator: " — "
>     indentProperties: true
>     columnSize:
>       file.name: 256
> ```
#### Boilerplate Plugins
Plugins de referencia utilizados durante el desarrollo del plugin de Obsidian:
- % Direct Implication
	- **obsidian bases**
	- **obsidian properties view**
	- **linter**
	- **iconic**
	- **templater**
- % References
	- **notebook-navigator** 
		- inspiración para crear un plugin que abarcase las funciones de muchos otros
		- UI de árbol jerárquico con orden manual arrastrable para las property tree.
	- **obsidian-bases-cms** 
		- selección masiva
		- capas de caché
	- **obsidian-multi-properties** 
		- formularios reactivos
	- **file-diff** 
		- inspiración para visualización de diff en operaciones
	- **tasknotes**
		- implementación con archivos `.base`