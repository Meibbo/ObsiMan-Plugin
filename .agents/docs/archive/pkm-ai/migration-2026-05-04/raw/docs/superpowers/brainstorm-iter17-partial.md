# Iter 17 — Brainstorm parcial (continuar en siguiente sesión)

## Estado: Sort popup DISEÑADO ✅ · View Mode popup PENDIENTE ⬜

---

## Decisiones tomadas

### Arquitectura general
- **Approach B** (Svelte `{#if}` + `in:`/`out:` transitions)
- Estado en `FiltersPage.svelte`: `headerMode: 'header' | 'sort' | 'viewmode'` + `headerExitDir`
- Animación header-replacement: **horizontal wipe** 280ms `cubic-bezier(0.4, 0, 0.2, 1)` (mismo que page transitions)
  - Sort btn (derecha) → header sale a la DERECHA, popup entra desde la IZQUIERDA
  - ViewMode btn (izquierda) → header sale a la IZQUIERDA, popup entra desde la DERECHA
- Tab fade Filters: 180ms ease opacity — NO está implementado aún (FiltersPage usa `{#if}` instantáneo)
- Cleanup: `ViewModePopup.svelte` actual (en isla/overlay) debe eliminarse del sistema PopupOverlay

### Sort popup — layout APROBADO
Layout 2 filas, vert-col `position:absolute` izquierda:

```
[vert-col abs] | [ Scope dropdown    ] [ ⊞ template ] [ › close ]
               | [ sq1 ][ sq2 ][ sq3 ][ sq4 ]
```

**Vert-col** (`position:absolute`, `left:9px top:7px`, crece hacia abajo flotando sobre tab content, z-index alto):
- `vert-top btn` (circle): alterna a qué nivel del nodo aplica el sort del hub
- `vert-bot btn` (circle): abre/cierra el drawer de selection scope
- **Drawer**: items dentro del vert-col con bg distinto (`#12101a` + border `#4a3a6a`), separador visual. NO mueve squircles ni tab content — el vert-col crece y flota.

**Por tab:**

| Tab | vert-top | vert-bot drawer | squircle 1 | 2 | 3 | 4 |
|-----|----------|-----------------|-----------|---|---|---|
| Props | Props / Values toggle | Tipos de prop (text/num/date/toggle/etc) + selected | Aa (name) | # (count) | ≋ (date) | ⊏ (sub-elements) |
| Tags | Nivel de nodo (qué nivel afecta el orden) | All / Nested / Simple | Aa | # | ≋ | ⊏ (sub-tags) |
| Files | vacío | ◉ toggle directo (sin drawer) | Aa | # | ≋ | ⊞ (columns modal) |

**Squircles**: selección, re-presionar el activo alterna ↑/↓. Muestran: icono + dirección.
**Scope dropdown**: All vault / Filtered files / Selected files.
**Template btn** (⊞): entre scope y close — elegir plantilla de orden guardada.
**Wide frame**: grupo acotado/centrado, squircles no se dispersan.

---

## Pendiente para siguiente sesión

1. **View Mode popup** (Type D) — replaces header on LEFT btn click:
   - Wireframe dice: Nav btn `<` (izquierda) · Selection pills (Tree · D&D · Grid · Cards · Masonry) · Squircle multi-select hub (toggle columnas/elementos por tab)
   - Aún NO se ha diseñado en detalle

2. **Tab fade Filters** — 180ms ease, implementación pendiente

3. **Presenter design doc** completo y spec self-review

4. **Visual companion server**: reiniciar en port 9001 con bat method:
   ```
   C:/tmp/brainstorm-launch3.bat (ya existe)
   powershell Start-Process cmd '/c C:/tmp/brainstorm-launch3.bat' -WindowStyle Hidden
   ```
   Session dir: `obsiman-live2`, content ya tiene sort-popup-v8.html como referencia visual.

---

## Para el próximo agente

Leer: AGENTS.md + Agent Memory + este archivo. Continuar brainstorm con:
1. Diseñar View Mode popup (visual, usar companion en port 9001)
2. Confirmar tab fade approach
3. Escribir spec completa a `docs/superpowers/specs/2026-04-14-iter17-popups-transitions-design.md`
4. Invocar `writing-plans` skill

---

## View Mode popup — estado al cierre de sesión

Mockup enviado en `viewmode-popup-v3.html` (server port 9001, obsiman-live2).

Layout propuesto (pendiente confirmación):
```
[ ‹ close ] [ Tree ][ D&D ][ Grid ][ Cards ]
[ sq1 ][ sq2 ][ sq3 ][ sq4 ]   ← elementos visibles (multi-select)
```

**Sin vert-col** — layout más simple que Sort popup.

Por tab (pendiente confirmación del wireframe):
- Tags: pills Tree/D&D/Grid/Cards · squircles Count/Path/Files
- Props: pills Tree/D&D/Grid/Cards · squircles Count/Type/Values/Date  
- Files: pills Grid/Tree/D&D/Cards (default=Grid) · squircles Date/Cols/Tags/Path

**Próxima sesión — continuar aquí:**
1. Confirmar View Mode popup (pills + squircles por tab)
2. Confirmar tab fade approach (propuesta: Svelte transition:fade 180ms en FiltersPage {#if} blocks)
3. Escribir spec completa → `docs/superpowers/specs/2026-04-14-iter17-popups-transitions-design.md`
4. Invocar writing-plans skill

**Visual companion**: reiniciar server en port 9001 con bat:
`powershell Start-Process cmd '/c C:/tmp/brainstorm-launch3.bat' -WindowStyle Hidden`
