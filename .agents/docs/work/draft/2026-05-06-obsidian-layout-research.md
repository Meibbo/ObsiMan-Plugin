# Research Report: Obsidian Layout Manager

## Overview
This report outlines the technical strategy for building a new Obsidian plugin that implements advanced workspace layouts, including a VS Code-style bottom panel, a secondary ribbon, and i3wm-inspired keyboard navigation.

## 1. Technical Stack
*   **Build Tool**: Vite + TypeScript (consistent with Vaultman).
*   **Framework**: Svelte 5 (utilizing runes for reactive layout state).
*   **Obsidian API**: `app.workspace` for leaf management, `ItemView` for custom components.

## 2. Component Implementation Strategies

### A. Bottom Panel (VS Code Style)
*   **Implementation**: A custom `ItemView` (e.g., `LAYOUT_BOTTOM_PANEL`).
*   **Logic**:
    *   Use `app.workspace.getLeaf('split', 'horizontal')` to create a horizontal split at the bottom.
    *   The Svelte component inside this view handles its own internal tabs (e.g., "Terminal", "Logs", "Search").
*   **Keyboard Commands**:
    *   `Toggle Bottom Panel`: Finds or creates the leaf.
    *   `Focus Bottom Panel`: Uses `app.workspace.revealLeaf()`.

### B. Secondary Ribbon (Activity Bar Style)
*   **Challenge**: Obsidian only has one native ribbon.
*   **Solution**: 
    1.  **Custom View**: Register an `ItemView` with a fixed narrow width (e.g., 48px).
    2.  **Docking**: Use `app.workspace.getRightLeaf(false)` or `getLeftLeaf(false)` and set the view.
    3.  **Styling**: Use CSS to remove borders and make it look like a secondary ribbon.
    4.  **Content**: A Svelte list of icons that trigger other commands or views.

### C. i3wm / VS Code Navigation
*   **Focus Management**:
    *   Native commands exist for `Focus on tab group to left/right/up/down`.
    *   New commands to implement: `Focus Next Leaf`, `Focus Previous Leaf`.
*   **Tab Movement**:
    *   `Move Tab to Group (Left/Right/Up/Down)`: Requires finding the adjacent leaf and using `app.workspace.moveLeafTo(targetGroup)`.
*   **Split Manipulation**:
    *   `Split Vertical/Horizontal`: Uses `app.workspace.getLeaf('split', direction)`.
*   **Resizing (Keyboard Driven)**:
    *   Obsidian doesn't expose a clean resize API.
    *   **Hack**: Manipulate `leaf.containerEl.style.width` or use `leaf.setDimension()` if available in internal API.
    *   **Alternative**: Use a Svelte layout library (`svelte-tiler`) *inside* a single large leaf to manage sub-panes if full workspace control is too restricted.

## 3. Recommended Libraries
*   **[Svelte-Tiler](https://x0k.dev/)**: Headless tiling layout library for Svelte. Perfect for internal panel management.
*   **[Tab Shifter](https://github.com/shmup/obsidian-tab-shifter)**: Reference for moving tabs between groups.
*   **[Smooth Navigator](https://github.com/Fevol/obsidian-smooth-navigator)**: Reference for focus cycling.
*   **[Commander](https://github.com/phibr0/obsidian-commander)**: Reference for custom ribbon/bar injection.

## 4. Proposed Command Set
| Category | Command | Action |
| :--- | :--- | :--- |
| **Panel** | `Toggle Bottom Panel` | Show/Hide the bottom Svelte view. |
| **Panel** | `Next Bottom Tab` | Cycle internal Svelte tabs. |
| **Ribbon** | `Toggle Secondary Ribbon` | Show/Hide the custom narrow sidebar. |
| **Nav** | `Move Leaf Left/Right` | Shift active tab to adjacent group. |
| **Nav** | `Focus Next Leaf` | Cycle through all open leaves. |
| **Layout** | `Resize Pane Wider/Narrower` | Adjust width/height of active leaf. |

## 5. Next Steps for Implementation
1.  Initialize project with `vite-plus` and Svelte 5.
2.  Register `BottomPanelView` and test horizontal split logic.
3.  Implement a "Layout Service" in Svelte to track pane focus and sizes.
4.  Expose keyboard commands via `this.addCommand`.
