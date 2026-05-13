# VaultMan
![](https://img.shields.io/github/v/release/Meibbo/vaultman)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.12.0-purple)
![](https://img.shields.io/github/license/Meibbo/vaultman/) 
![](https://img.shields.io/github/downloads/Meibbo/vaultman/total)

![](img/vaultman_icon.png)Vaultman is a Swiss Army Knife of Obsidian tools for managing the files of your vault at scale. Once you have hundreds of notes, the built-in properties view gets limiting fast: you can see your tags and properties listed, rename them one at a time, and that's about it.

This plugin gives you a **control panel for your vault**. It can filter your files, select what you care about, queue up a batch of operations, preview exactly what they will change and apply everything at once.

### Table of Content
- [Installation](#installation#via--brat)
- [Main Hub](#main-hub)
- [Filters](#filter-page)

## Installation
**Warning**: This project is in Pre-Release state! It is recommended to select the specific version (Beta.15 is the most stable) of your choice and NOT auto update if you want to preserve functionality and stability, I'm releasing experimental versions for multi-platform testing that could slow down your performance or move things from were they are.

### Via BRAT
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the community plugins store
2. In BRAT settings → **Add Beta Plugin**
3. Enter `Meibbo/VaultMan`
4. Enable **Vaultman** in Settings → Community Plugins

*Vaultman is not yet in the official Obsidian plugin store. I want to achieve a completely stable version before public v1.0 release. But you can give your community feedback now if this plugin has its plubic and is really helpful for others*

## Features

### Main Hub
The main interface is a compact and modular sidebar that lets you choose its content within the available options. With a bottom bar to navigate between pages and a top bar for their subpages, with reorganizing modals and llamative fab buttons for the most important options: Active filters and a Queue list.

### Filter page
Every page has a header for searching, scopes, sorts and different view that affects individually your contents and lets **filter** out the exact options you wanted to select for different kinds of operations. 

Also, they have with dynamic context menus for quick ops that you would love. Every selected element will apear in the *Active filters popup*, where you can strategically add logical groups (all/any/none), supress filters, **clear all** or even templates of filters for fast deploy.

**Properties tab**: a live scrollable list of every property and value in your vault, built from the frontmatter index.

**Files tab**: a list of the files and folders of your vault, affecting the amount of elements showed based on your active filters  

**Tags tab**: a tree list that gives you power to rearrenge your tags and set them in the frontmatter of your notes

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

## Built With

This project uses the following open-source technologies:

- Svelte
- TypeScript
- D3.js
- TanStack
- UnoCSS
- Bits UI
- PretextJS

All third-party libraries retain their respective licenses.

## License

[MIT](LICENSE) — [Meibbo](https://github.com/Meibbo)

## Acknowledgements

Built for the Obsidian community.
