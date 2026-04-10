---
name: vault-workflow
description: Guide for creating, routing, and formatting notes in this specific Obsidian PKM vault, including rules for image optimization and folder destinations. Use whenever creating new notes, linking images, or organizing the vault.
---

# Vault Workflow & Organization

This skill defines the specific folder structures, template locations, and routing rules for this Obsidian Personal Knowledge Management (PKM) vault. Always adhere to these rules when creating, moving, or updating notes.

## 1. Templates

All templates are located in: `x/Templates`
When the user asks to create a new note of a specific type (e.g., Daily Log, Event, Person), ALWAYS check this folder first to find the corresponding template and use its structure (including frontmatter and `type` properties). 

## 2. Note Routing (Where notes belong)

This vault is **folderless by design**. Notes are organized by YAML frontmatter properties (`in`, `up`, `type`, `structure`, `on`, `category`), not by folder hierarchy. Never create new folders.

- **Everything**: `+/` — the single workspace where all notes live
- **Journals / Daily Logs**: `Journal/` (type: log)
- **Templates**: `x/Templates/`

*Rule*: When in doubt, always place notes in `+/`. Organization happens through properties and wikilinks, not folder structure.

## 3. Picture & Media Optimization

The folder `x/Pictures` contains high-resolution backups of photos. These photos are **TOO HEAVY** to be loaded directly into the Obsidian vault.

**Rule for Media Links**:
If you need to link or embed a photo from the `x/Pictures` folder into a markdown note or canvas:
1. DO NOT link directly to the high-res image.
2. Instead, create a downscaled version of the image at **75% quality**.
3. Save this optimized image directly into the `x` folder (e.g., `x/optimized_image.jpg`).
4. Update the markdown note or canvas to link to this optimized image in `x` (e.g., `![[x/optimized_image.jpg]]`).
*(Use Python with Pillow (`PIL`) or ImageMagick via CLI tools to perform this optimization when automating tasks).*

## 4. Backups Folder

The folder `x/Backups` is strictly for Google Drive purposes and has nothing to do with the PKM vault. Do not reference, search, or modify files in `x/Backups` when working within the Obsidian vault.

## 5. Metadata Properties

The YAML frontmatter in this vault relies on specific metadata properties to categorize, route, and define the content of notes. Always use these properties correctly:

- **`type`**: Indicates the purpose of the note en general. Corresponds to templates in `x/Templates`.
  - `about`: Description of a category related note.
  - `event`: A specific occurrence or date-based note.
  - `attach`: Process for developing another note.
  - `clipping`: Extracted content from a source.
  - `task`: Metadata handling for task management with task-notes.
  - `log`: Used for journal entries and daily logs.
  - `index`: Structural navigation note.
- **`structure`**: Indicates what kind of content or views you can encounter in the actual note (e.g., `toc`, `tags`, `dataviewjs`).
- **`tags`**: Acts as a temporary container for note proper indicators (like `level`, `on`, `target`, `output`, `theme`) and won't have further development.
- **`categories`**: Proper categorization of a note to give it a place inside the system.
- **`target`**: A list of topics or categories the note is intended to develop without being actually part of it (`in`) or in a master-slave relation (`up`).
- **`output`**: Indicates in which platforms or results the user is looking to publish or convert the current note.

## 6. Content Formatting

- **Inline Tags**: Used to distinguish characteristics or implications of a specific paragraph/line, or to teleport directly to specific text inside a note when a header isn't sufficient. They are treated equally to property tags in search modules.