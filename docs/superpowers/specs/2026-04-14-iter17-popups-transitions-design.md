# Iter 17 — Filters Popups & Transitions Design
**Date:** 2026-04-14  
**Status:** APPROVED — ready for implementation planning  
**Branch:** `add-functions`

---

## 1. Architecture

**Approach B (Svelte `{#if}` + `in:`/`out:` transitions)**

State in `FiltersPage.svelte`:
```ts
headerMode: 'header' | 'sort' | 'viewmode'
headerExitDir: 'left' | 'right'
```

Header replacement animation: **horizontal wipe** 280ms `cubic-bezier(0.4, 0, 0.2, 1)`  
- Sort btn (right) → header exits RIGHT, sort popup enters from LEFT  
- ViewMode btn (left) → header exits LEFT, viewmode popup enters from RIGHT

Cleanup required: existing `ViewModePopup.svelte` (PopupOverlay island) must be removed from the popup overlay system — it will be replaced by the header-replacement popup.

---

## 2. Sort Popup (Type D — designed session 16)

Layout: **2 rows + vert-col absolute left**

```
[vert-col abs left] | [ Scope dropdown ] [ ⊞ template ] [ › close ]
                    | [ sq1 ] [ sq2 ] [ sq3 ] [ sq4 ]
```

**Vert-col** (`position:absolute`, `left:9px top:7px`, floats over tab content, high z-index):
- `vert-top btn` (circle): toggles which node level the hub sort applies to
- `vert-bot btn` (circle): opens/closes drawer for selection scope
- **Drawer**: items inside vert-col with distinct bg (`#12101a` + border `#4a3a6a`), visual separator. Does NOT move squircles or tab content — vert-col grows and floats.

**Per tab:**

| Tab | vert-top | vert-bot drawer | sq1 | sq2 | sq3 | sq4 |
|-----|----------|-----------------|-----|-----|-----|-----|
| Props | Props / Values toggle | Prop types (text/num/date/toggle/etc) + selected | Aa (name) | # (count) | ≋ (date) | ⊏ (sub-elements) |
| Tags | Node level (which level the sort affects) | All / Nested / Simple | Aa | # | ≋ | ⊏ (sub-tags) |
| Files | empty | ◉ direct toggle (no drawer) | Aa | # | ≋ | ⊞ (columns modal) |

**Squircles**: selection, re-pressing active one toggles ↑/↓. Show: icon + direction.  
**Scope dropdown**: All vault / Filtered files / Selected files.  
**Template btn** (⊞): between scope and close — choose saved sort template.  
**Wide frame**: bounded/centered group, squircles do not spread.

---

## 3. View Mode Popup (Type D — designed session 28/iter17)

Triggered by LEFT btn in Filters header. Replaces header with 2-row popup entering from RIGHT.

### Layout: Option B — Two fixed rows

**Row 1:**
```
[‹ close] [divider] [Tree] [D&D] [Grid] [Cards] [Masonry]
```
- `‹` is a chevron-left icon button (not ×)
- Pills: single-select, one active at a time
- Active pill: `background: #3d2d6e; color: #c4aeff`

**Row 2 — Hub toggles** (always visible except when Masonry is active):
Content adapts to the **active tab** (not the active view mode):

| Active tab | Hub toggles |
|------------|-------------|
| Props | Nombre ✓ · Tipo ✓ · Conteo ✓ · Fecha · Sub-items |
| Tags | Conteo ✓ · Sub-tags ✓ · Anidado · Solo simples |
| Files | Nombre ✓ · Fecha ✓ · Ruta · Tamaño · Tags |

- `✓` = enabled by default
- Toggles are multi-selectable chips
- Hub label (e.g. "Props:") muted left of chips

**Row 2 — Masonry exception:**  
When the active pill is **Masonry**, row 2 collapses to `height: 0` with animated transition (CSS height + opacity). No content shown. Restores when any other pill is selected.

### Animation spec
- Enter: slides in from RIGHT (translateX from +100% to 0), 280ms `cubic-bezier(0.4, 0, 0.2, 1)`
- Exit: slides out to LEFT (translateX 0 to -100%), same easing
- Row 2 height collapse: 150ms `ease` height + opacity

---

## 4. Filters Tab Fade

**Approach B** — `{#key activeTab}` + Svelte `fade` transition

```svelte
{#key activeTab}
  <div in:fade={{ duration: 180 }} out:fade={{ duration: 180 }}>
    {#if activeTab === 'tags'}<TagsTabContent />
    {:else if activeTab === 'props'}<PropsTabContent />
    {:else}<FilesTabContent />
    {/if}
  </div>
{/key}
```

Duration: **180ms ease opacity**  
Note: Currently `FiltersPage.svelte` uses `{#if}` with no transition — this is the upgrade.

---

## 5. Files affected

| File | Change |
|------|--------|
| `src/views/FiltersPage.svelte` | Add `headerMode` state, horizontal wipe transitions, `{#key}` tab fade |
| `src/components/popups/SortPopup.svelte` | New component — sort popup layout (2 rows + vert-col) |
| `src/components/popups/ViewModePopup.svelte` | Replace existing overlay version — new header-replacement 2-row layout |
| `src/components/popups/PopupOverlay.svelte` | Remove ViewModePopup from overlay system |
| `styles.css` | Popup header-replacement animation classes, hub row, toggle chips, vert-col |

---

## 6. Out of scope (Iter 17)

- D&D list Linter button integration
- Cards / Masonry frame specs
- Sort template persistence
- Keyboard navigation for popups
