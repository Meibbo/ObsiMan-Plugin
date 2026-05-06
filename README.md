# VaultMan

![](https://img.shields.io/github/v/release/Meibbo/vaultman-Plugin)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.12.0-purple)
![](https://img.shields.io/github/license/Meibbo/vaultman-Plugin)
![](https://img.shields.io/github/downloads/Meibbo/vaultman-Plugin/total)

![](img/vaultman_icon.png)Vaultman is a Swiss Army Knife of Obsidian tools for managing the files of your vault at scale. Once you have hundreds of notes, the built-in properties view gets limiting fast: you can see your tags and properties listed, rename them one at a time, and that's about it.

This plugin gives you a **control panel for your vault**. It can filter your files, select what you care about, queue up a batch of operations, preview exactly what they will change and apply everything at once.

### Table of Content

- [Installation](#installation#installation--download-and-enable)
- [Main Hub](#main-hub)
- [Filters](#gallery-cards)
- [Operations](#support-me)
- [Context Modals](#multi-column)

## Installation

### Via BRAT

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the community plugins store
2. In BRAT settings → **Add Beta Plugin**
3. Enter `Meibbo/VaultMan`
4. Enable **Vaultman** in Settings → Community Plugins

_Vaultman is not yet in the official Obsidian plugin store. I want to receive community feedback to know if this plugin has its plubic and is really helpful for others_

## Features

### Main Hub

The main interface is a compact and modular sidebar that lets you choose its content within the available options. With a bottom bar to navigate between pages and a top bar for their subpages, with reorganizing modals and llamative fab buttons for the most important options: Active filters and a Queue list.

### Filter tabs

Every page has a header for searching, scopes, sorts and different view that affects individually your contents and lets **filter** out the exact options you wanted to select for different kinds of operations.

Also, they have with dynamic context menus for quick ops that you would love. Every selected element will apear in the _Active filters popup_, where you can strategically add logical groups (all/any/none), supress filters, **clear all** or even templates of filters for fast deploy.

**Property browser**: a live scrollable list of every property and value in your vault, built from the frontmatter index.

**Tag wrangler**: a hierarchical tree list

**Tag wrangler**: a tree list that gives you power to rearrenge your tags

%%Everything below is just a placeholder, I'm working on it%%

### Operations

Stage property operations on filtered/selected files:

---

## Development

```bash
git clone https://github.com/Meibbo/VaultMan
cd VaultMan
npm install
npm run dev    # watch mode with sourcemaps
npm run build  # tsc type-check + esbuild production bundle
npm run lint   # ESLint with obsidianmd rules
```

## License

[MIT](LICENSE) — [Meibbo](https://github.com/Meibbo)
