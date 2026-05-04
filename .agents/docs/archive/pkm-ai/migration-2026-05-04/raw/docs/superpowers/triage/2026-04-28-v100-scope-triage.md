# Vaultman v1.0 scope — Triage para Hardening

> **Tipo**: Triage del backlog v1.0 contra el plan Vaultman Hardening.
> **Fecha**: 2026-04-28
> **Autor**: Meibbo (con asistencia Claude Code Opus 4.7).
> **Fuente backlog**: `docs/2026-04-15-1812 Vaultman v1.0 scope.md`.
> **Spec maestra**: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`.
> **Objetivo**: garantizar que ningún bug arquitectónico, regresión activa, o promesa de UX del backlog se arrastre tras el cierre del proyecto Hardening, asignando cada item a uno de los siguientes destinos: dentro del proyecto, adyacente, sucesor, o ya resuelto.

---

## 0. Metodología

### 0.1 Categorías

| Categoría | Definición |
|---|---|
| `in-hardening` | Output **directo** de un iter del proyecto. Se referencia el iter exacto. Si el item no se resuelve en ese iter, el iter no cierra. |
| `adjacent` | Fix **natural** que cae en el área del iter pero no es output principal. Se hace en passing porque el código tocado lo requiere. Si no se resuelve, se promueve a `out-hardening`. |
| `out-hardening` | Movido al proyecto sucesor `v1.0 Polish` con sub-bloque asignado. **No se trabajará durante Hardening.** |
| `already-fixed` | Verificado contra el código actual. No se reabre salvo regresión nueva. |
| `cancelled` | Usuario marcó `[-]` con `❌`. **No es deuda**, no se reactiva sin nuevo brainstorm. |
| `post-rc.1` | Diferido más allá de `v1.0 Polish` (ej. Templates, Linter, Outline avanzado). |

### 0.2 Sub-bloques de `v1.0 Polish` (proyecto sucesor)

| Sub-bloque | Depende de `serviceAPI`? | Resumen |
|---|---|---|
| **Bases Feature Parity** | No | Range filters, viewTable editable, "all files in folder", logical syntax (all/any/none + manual). |
| **Theming** | No | Variantes mínima (sin blur ni circulos) y default fancy; otras posibles. |
| **UX Features** | No | navKeyboard, serviceDnD, multi-select, auto-scroll/reveal, inline rename, explorerOutline, viewDiff snippet vs full, empty states, "coming soon" overlays. |
| **Programmable Interface** | Sí (consume `contracts.ts` de hardening) | `serviceAPI` (foundation), Bases I/O text (consumer), Agent Guardrail Skill (consumer). |

### 0.3 Vision statement (Annex B header del spec)

> **"Vaultman as supervised bulk-ops harness for AI agents."**
> Diferenciador vendible v1.1+. Los agentes IA hoy ejecutan bulk ops sin preview. Vaultman ya tiene queue + scope display + await confirm: justo el UX que les falta. La rama `Programmable Interface` cristaliza esto vía `serviceAPI` + Agent Guardrail Skill.

---

## 1. Pre-clasificaciones del usuario (no se replantean)

### 1.1 Ghost files (referencias en backlog a archivos que no existen como tales)

| Archivo ghost | Clasificación | Destino | Razón |
|---|---|---|---|
| `layoutNav.svelte` | `out-hardening` | UX Features | Common file para navbars sup/inf con setting "swap positions / FAB visibility / tab order". Customización avanzada de layout. |
| `navbarTabs` | `already-fixed` (alias) | — | Es el actual `navbarPages.svelte`. Sólo rename mental; no hay archivo a crear. |
| `serviceMarks.ts` | `post-rc.1` | v1.0+1 (Templates) | Módulo del servicio de templates. |
| `serviceViews.ts` | `in-hardening` | A.4.1 | Absorbido por `Virtualizer<T>` + `IExplorer` + view system genérico. |
| `serviceSorting.ts` | `in-hardening` | A.4.x | Sort logic en services + tests Sub-C. |

### 1.2 Pre-confirmado para borrar (Sub-B)

| Item | Estado |
|---|---|
| `src/services/BasesCheckboxInjector.ts` | **Ya borrado** del working tree. Verified `Glob` + `Grep` 2026-04-28. |
| Referencias en `src/` | Verified ninguna. |
| Referencia en `CONTRIBUTING.md` | **Pendiente** — Sub-B debe limpiarla en el commit `chore(audit): remove BasesCheckboxInjector references`. |
| Tipo `IBasesCheckboxInjector` | No existe; se previene su creación vía lint custom (Sub-A.1). |

### 1.3 Bugs urgentes (decisión usuario, NO pre-fix)

| Bug | Iter natural | Razón |
|---|---|---|
| Diff memory blow-up (cargar archivos completos por preview) | A.4.1 | DecorationManager + snippet preview reemplaza full-file preload. |
| Queue counter concurrency (200+4=204) | A.4.2 | `explorerQueue` real explorer + IOperationsIndex separa contadores por op. Era el origen de la rama `file-centric-queue`. |

---

## 2. Triage detallado — Beta 15 backlog

> **Convención**: ítem listado tal como aparece en el backlog (resumido). Iter = referencia al spec maestra (sec 5). Notas explican el "cómo" de la asignación.

### 2.1 `frameVaultman.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.1.1 | Todas las páginas se renderizan al mismo tiempo (perf) | `in-hardening` | A.4.2 | Frame reescrito con `$derived` offset; lazy mount opt-in vía `IRouter`. |
| 2.1.2 | Modales fuera del frame deberían ser containers inline | `adjacent` | A.4.2 | `OverlayState` reemplaza prop drilling; modales internos se vuelven layers en stack. |

### 2.2 `pageFilters.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.2.1 | Glitch blur sólido↔gradiente al abrir popupIsland | `adjacent` | A.4.2 | `popupIsland_WIP` → `popupIsland.svelte` finalizado; bg coherente con `navbarPillFab`. |

#### 2.2.A `layoutNav.svelte` → `navbarExplorer.svelte` (DESIGN)

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.2.A.1 | btnFab acento → grey + faint accent hover | `already-fixed` | — | ✅ 2026-04-18 (en backlog). |
| 2.2.A.2 | Container fixed scroll bg no es de navbarPillFab | `already-fixed` | — | Backlog: "he verificado y sí funciona". Visual ilusión por scroll insuficiente. |
| 2.2.A.3 | Cambio de menú empuja explorer; debería ser overlay con animación | `out-hardening` | UX Features | Animación arriba→abajo + glass coherente. No arquitectónico. |
| 2.2.A.4 | menuSort flecha invertida (A→Z apunta arriba) | `out-hardening` | UX Features | Bug visual aislado. |

#### 2.2.B `layoutNav.svelte` → `navbarExplorer.svelte` (LAYOUT)

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.2.B.1 | Closing button = mismo btnFab con icono `^` | `out-hardening` | UX Features | Decoraciones FAB; `OverlayState` lo facilita pero no es prerequisito. |
| 2.2.B.2 | Indecisión unificar menús (dos FAB confusos) | `out-hardening` | UX Features | Decisión de diseño pendiente del usuario. |
| 2.2.B.3 | navbarExplorer sin responsividad | `out-hardening` | UX Features | Ajustes CSS responsive. |

#### 2.2.C `boxSearch.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.2.C.1 | btnToggle tipo de búsqueda no funciona | `adjacent` | A.3 + A.4.1 | `Toggle` primitivo en A.3; reconexión vía `IExplorer` en A.4.1. |
| 2.2.C.2 | Input no filtra nodos como antes (regresión) | `in-hardening` | A.4.1 | Search vive en `logicExplorer`; rewrite restaura comportamiento. |

#### 2.2.D `menuView.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.2.D.1 | Cerrar al click fuera (estándar popup) | `adjacent` | A.4.2 | `OverlayState` con click-outside dismiss en stack. |
| 2.2.D.2 | modeExplorer toggle posición (segunda fila izquierda) | `out-hardening` | UX Features | Reorden UI. |
| 2.2.D.3 | Toggle expand/collapse all (pill vertical, faint→accent) | `out-hardening` | UX Features | Nueva feature. |
| 2.2.D.4 | pillsX btnMultSelect sin efecto + decoración fuera de diseño | `out-hardening` | UX Features | Reactividad columnas. |
| 2.2.D.5 | Counter sub-elementos (columna) | `out-hardening` | UX Features | |
| 2.2.D.6 | Counter mtime (columna) | `out-hardening` | UX Features | |
| 2.2.D.7 | Ícono tipo prop desde `types.json` | `out-hardening` | UX Features | DecorationManager (lo expone) + UI consumer. |
| 2.2.D.8 | Reactividad btnMultSelect ↔ columnas | `out-hardening` | UX Features | |
| 2.2.D.9 | Hide/show badges | `out-hardening` | UX Features | |
| 2.2.D.10 | Toggles ícono / label / chevron por columna | `out-hardening` | UX Features | |

#### 2.2.E `menuSort.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.2.E.1 | dropDy desplazamiento al activar drawer | `cancelled` | — | ❌ 2026-04-18. |
| 2.2.E.2 | btnToggle/btnDrawer demasiado pequeños | `cancelled` | — | ❌ 2026-04-18. |
| 2.2.E.3 | dropDy → pillsY redesign | `out-hardening` | UX Features | Decisión de diseño. |
| 2.2.E.4 | Auto-scroll to current selection | `out-hardening` | UX Features | Solo claro en tabFiles. |
| 2.2.E.5 | Template button position | `out-hardening` | UX Features | |
| 2.2.E.6 | Default order alfabético | `out-hardening` | UX Features | Setting default. |
| 2.2.E.7 | Toggle categoría a ordenar (props/values, files/folders, tags simples/nested) | `adjacent` | A.4.1 (sort revival) | `serviceSorting` + `IExplorer.sortMode` runes. |
| 2.2.E.8 | btnDrawer grupos por categoría | `adjacent` | A.4.1 (sort revival) | Mismo módulo. |

### 2.3 `panelLists.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.3.1 | Performance >1000 nodos | `already-fixed` | — | ✅ 2026-04-17. |
| 2.3.2 | Rerender/scroll-back durante operación | `already-fixed` | — | ✅ 2026-04-17. |
| 2.3.3 | Views/sort se reinician al cambiar tabs | `already-fixed` | — | ✅ 2026-04-17. |
| 2.3.4 | Empty state "No se encontraron archivos" | `out-hardening` | UX Features | |
| 2.3.5 | Iconos no se actualizan a la par del workspace | `adjacent` | A.4.1 | DecorationManager unificado. Reactividad iconic. |
| 2.3.6 | Último nodo tapado por navigator | `out-hardening` | UX Features | CSS detail. |
| 2.3.7 | Primer nodo bajo navbar (cuando explorer pasa por debajo) | `out-hardening` | UX Features | CSS + scroll behavior. |

#### 2.3.A `navKeyboard`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.3.A.1 | Navegar con flechas | `out-hardening` | UX Features | navKeyboard module. |
| 2.3.A.2 | Multi-select con CMD/Shift/Ctrl | `out-hardening` | UX Features | Multi-select modifiers. |

#### 2.3.B `explorerFiles.ts`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.3.B.1 | Mostrar archivos no-notas | `out-hardening` | UX Features | Setting / filter type. |
| 2.3.B.2 | Ver archivos no existentes (broken links) | `out-hardening` | UX Features | |
| 2.3.B.3 | Vista por defecto = viewTree | `out-hardening` | UX Features | Setting default. |
| 2.3.B.4 | Auto-reveal current file | `out-hardening` | UX Features | |
| 2.3.B.5 | serviceSort no funciona en viewTree | `adjacent` | A.4.1 | sort revival. |
| 2.3.B.6 | Oculta carpetas dentro de carpetas (jerarquía rota) | `out-hardening` | UX Features | Verificar regresión post-Hardening. |
| 2.3.B.7 | modeExplorer=filter → folder/file selection behaviors | `out-hardening` | UX Features | Logic compleja, no arquitectónica. |
| 2.3.B.8 | viewGrid → tabla excel-like (Bases-style editable) | `out-hardening` | Bases Feature Parity | viewTable feature. |

#### 2.3.C `explorerProps`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.3.C.1 | Cambios no se actualizan en lista virtual | `in-hardening` | A.4.1 | Reactividad central; `logicExplorer` rewrite. |
| 2.3.C.2 | Sistema de badges/highlighting | `in-hardening` | A.4.1 | DecorationManager output explícito. |

#### 2.3.D `explorerTags`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.3.D.1 | Tags operan inmediato sin pasar por queue | `in-hardening` | A.4.2 | `explorerTags` consume `IOperationQueue` (contrato). |

#### 2.3.E `viewGrid`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.3.E.1 | explorerProps no muestra íconos iconic | `adjacent` | A.4.1 | DecorationManager. |
| 2.3.E.2 | Nodos sin click event | `in-hardening` | A.4.1 | Wiring durante migración a `Virtualizer<T>`. |
| 2.3.E.3 | Recuperar/recrear viewGrid clásico | `in-hardening` | A.4.1 | Validación de la abstracción `Virtualizer<T>` (spike). |

#### 2.3.F `viewTree.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.3.F.1 | explorerFiles muestra carpetas paralelas en jerarquía | `out-hardening` | UX Features | Verificar regresión post-Hardening. |
| 2.3.F.2 | Rename inline input vs modal | `out-hardening` | UX Features | Inline rename feature. |

### 2.4 `tabContent`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.4.1 | Hacer visible en pageFilters | `in-hardening` | A.4.2 | tabContent migrado consumiendo `IContentIndex`. |
| 2.4.2 | Agrandar boxInput de panelFnR | `out-hardening` | UX Features | |
| 2.4.3 | Responsivo en diferentes pantallas | `out-hardening` | UX Features | |

### 2.5 `pageTools`

#### 2.5.A `tabMarks.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.5.A.1 | Panel control para serviceMarks | `post-rc.1` | v1.0+1 (Templates) | |
| 2.5.A.2 | Import/export bases via marks | `out-hardening` | Programmable Interface (Bases I/O text) | Consumer. |
| 2.5.A.3 | Default config marks | `post-rc.1` | v1.0+1 | |

#### 2.5.B `tabTemplates.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.5.B.1 | Glass overlay "WIP/Coming Soon" para módulos placeholder | `out-hardening` | UX Features | |
| 2.5.B.2 | `explorerSnippets`, `explorerTemplates` (estructura) | `in-hardening` | A.2.2 | Stubs válidos sin consumer en v1.0; estructura preservada. |
| 2.5.B.3 | `tabLinter` (replacement de "this file properties") | `post-rc.1` | v1.0+1 | |

### 2.6 `popupIsland.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.6.1 | div sin max-width | `out-hardening` | UX Features | CSS detail. |

#### 2.6.A `explorerQueue.ts`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.6.A.1 | Operaciones no se agrupan por tipo | `in-hardening` | A.4.2 | `explorerQueue` real explorer; grouping vía DecorationManager. |
| 2.6.A.2 | Botón borrar individual | `in-hardening` | A.4.2 | UX explorer estándar. |
| 2.6.A.3 | viewDiff no activo | `in-hardening` | A.4.2 | Wiring. |
| 2.6.A.4 | **Diff memory blow-up** (200 ops carga 80-90 archivos completos) | `in-hardening` | A.4.1 | Bug urgente. DecorationManager → snippet preview en lugar de full-file preload. |
| 2.6.A.5 | Click row para cambios especiales (filtrar viewDiff) | `out-hardening` | UX Features | |
| 2.6.A.6 | Queue details position en btnSelection | `out-hardening` | UX Features | |
| 2.6.A.7 | Texto no completo en mobile | `out-hardening` | UX Features | |
| 2.6.A.8 | Quitar verbos / palabra "files" del counter | `out-hardening` | UX Features | |
| 2.6.A.9 | Considerar 6 serviceOps disponibles en agrupación | `adjacent` | A.4.2 | Wiring durante explorerQueue rewrite. |
| 2.6.A.10 | **Queue counter concurrency** (200+4=204 en 2do thread) | `in-hardening` | A.4.2 | Bug urgente. `IOperationsIndex` separa contadores por op concurrent. |
| 2.6.A.11 | Comunicación panelLists ↔ explorerQueue (count mismatch) | `adjacent` | A.4.2 | explorerQueue real explorer fija el wire. |
| 2.6.A.12 | Operación falta archivos del nodo (205→202) | `in-hardening` | A.4.2 | Wiring durante explorerQueue rewrite. |

#### 2.6.B `listFilters` → `explorerActiveFilters`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.6.B.1 | Subtítulo: counter filtros activos + counter archivos restantes | `in-hardening` | A.4.2 | `explorerActiveFilters` real explorer. |
| 2.6.B.2 | Grupos lógicos faint accent (all/any/none) | `out-hardening` | Bases Feature Parity | logical syntax. |
| 2.6.B.3 | Toggle row group/auto/manual | `out-hardening` | Bases Feature Parity | |
| 2.6.B.4 | Cambiar "aplicar" → "editar filtros" | `out-hardening` | UX Features | |
| 2.6.B.5 | Range filters (props tipo fechas) | `out-hardening` | Bases Feature Parity | range filters. |
| 2.6.B.6 | DnD entre grupos lógicos | `out-hardening` | UX Features | serviceDnD. |
| 2.6.B.7 | Manual filter input syntax (Bases-compatible) | `out-hardening` | Bases Feature Parity | |
| 2.6.B.8 | "All files in folder" filter | `out-hardening` | Bases Feature Parity | |

### 2.7 `layoutNav.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.7.1 | Barras y botones muy pequeños | `out-hardening` | UX Features | CSS sizing. |
| 2.7.2 | Swap pillFab ↔ navbarPages positions | `out-hardening` | UX Features | layoutNav.svelte common file con setting. |

#### 2.7.A `navbarPillFab.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.7.A.1 | FAB icon → X cuando popup abierto | `out-hardening` | UX Features | |
| 2.7.A.2 | Quitar gradientBlur | `out-hardening` | Theming | minimal theme. |
| 2.7.A.3 | Layout cuando narrow (FAB sobre dockPill) | `out-hardening` | UX Features | |

#### 2.7.B `navbarPages.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.7.B.1 | Fallback solo iconos (no labels) | `out-hardening` | UX Features | Responsivo. |
| 2.7.B.2 | DnD a otra parte del Workspace | `out-hardening` | UX Features | serviceDnD. |
| 2.7.B.3 | Pages como pestañas del Workspace | `out-hardening` | UX Features | layoutNav.svelte. |

### 2.8 `utilBtns.ts`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.8.1 | Centralizar registro de botones | `in-hardening` | A.3 | `src/components/primitives/` consolida BtnSquircle, etc. |

#### 2.8.A `btnSelection.svelte`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.8.A.1 | Color seleccionado → acento secundario (transparent accent) | `in-hardening` | A.3 | Design tokens en primitivos. |

### 2.9 `layoutTabs`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.9.1 | Separar lógica + unificar patrones repetitivos | `in-hardening` | A.4.2 | tabContent migration sienta el patrón; navbarPages agnóstico. |

### 2.10 `serviceSort` → `serviceSorting.ts`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.10.1 | Sort by date cuelga app (props/tags) | `adjacent` | A.4.1 | sort revival con tests Sub-C; perf fix obligatorio. |
| 2.10.2 | Agrupación/orden manual via marks | `post-rc.1` | v1.0+1 (Templates) | |

### 2.11 `explorerOutline`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.11.1 | Reemplazo del native outline con DnD + smart move | `out-hardening` | UX Features | explorerOutline feature completa. |
| 2.11.2 | boxSearch + auto-scroll + collapse all | `out-hardening` | UX Features | Sub-feature de explorerOutline. |

### 2.12 `serviceAPI`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.12.1 | API para que DataView y otros plugins usen los componentes | `out-hardening` | Programmable Interface (foundation) | Depende de `contracts.ts` de hardening (interfaces como API público). |

### 2.13 Performance / Operations (sección abierta del backlog)

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 2.13.1 | Aumentar 1-2 filas virtuales en `panelLists` | `out-hardening` | UX Features | Tuning, no arquitectura. |
| 2.13.2 | Aprender Notebook Navigator (cache/render) | `already-fixed` | — | ✅ 2026-04-17 (aprendizaje aplicado). |
| 2.13.3 | Settings: orden por defecto por explorer | `out-hardening` | UX Features | Setting nuevo. |
| 2.13.4 | Settings: conjunto por defecto desde templates | `post-rc.1` | v1.0+1 (Templates) | |

---

## 3. Triage detallado — Beta 17 (items adicionales no cubiertos en beta 15)

### 3.1 `frameVaultman`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 3.1.1 | z-index regression de Gemini 3 Flash | `already-fixed` | — | ✅ 2026-04-19. |

### 3.2 `panelLists`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 3.2.1 | Cambios no se actualizan en árbol virtual (solo refresca cambiando vista) | `in-hardening` | A.4.1 | `logicExplorer` + `Virtualizer<T>` con reactividad central via runes. Crítico. |

### 3.3 `popupIsland.explorerQueue`

| # | Item | Class. | Iter / Bloque | Notas |
|---|---|---|---|---|
| 3.3.1 | Agrupación mal diseñada (DELETE_PROP grupo sin contexto) | `in-hardening` | A.4.2 | Cubierto por 2.6.A.1. |
| 3.3.2 | Desactivar viewDiff cierra explorerQueue | `in-hardening` | A.4.2 | `OverlayState` corrige stack management. |
| 3.3.3 | Dejar viewDiff snippet, full = plugin integration (Git, File Diff) | `out-hardening` | UX Features | viewDiff snippet vs full. Aprovecha plugins existentes. |
| 3.3.4 | Comunicación count mismatch panelLists ↔ queue | `adjacent` | A.4.2 | (dup 2.6.A.11) |
| 3.3.5 | Counter group row faltan archivos (205 → 202) | `in-hardening` | A.4.2 | (dup 2.6.A.12) |
| 3.3.6 | viewDiff memory blow-up | `in-hardening` | A.4.1 | (dup 2.6.A.4) |

---

## 4. Triage Beta 18 (placeholder list)

El backlog beta 18 lista archivos sin items específicos (es un mapa estructural, no un set de bugs concretos). **No requiere triage adicional**: los archivos mencionados (panelLists, explorerQueue, listFilters, navbarPillFab, navbarTabs, btnSelection, layoutTabs, serviceSorting, explorerOutline, serviceAPI) ya están cubiertos arriba.

---

## 5. Resumen estadístico

| Categoría | Items |
|---|---|
| `in-hardening` | 19 |
| `adjacent` | 11 |
| `out-hardening` | 53 |
| `already-fixed` | 8 |
| `cancelled` | 2 |
| `post-rc.1` | 5 |

> Conteo aproximado — varios items son sub-bullets agrupables. La precisión exacta no es objetivo; el objetivo es no perder ítems.

---

## 6. Distribución `in-hardening` por iter (input para Annex A)

### 6.1 Sub-A.1 — Tipos
- Reconstrucción de `typeUI.ts` (FILTERS_TABS_CONFIG) — ya en spec sec 5.3.
- Limpiar `typePrimitives.ts` — ya en spec sec 5.3.
- Lint rule custom: bloquear `(app as any)` — ya en spec sec 5.3.
- ADRs 001-008 — ya en spec sec 2.3.

(No items v1.0 scope nuevos en A.1.)

### 6.2 Sub-A.2.1 — Factory + indices base
- ya cubierto por spec sec 5.4.

### 6.3 Sub-A.2.2 — Indices restantes
- 2.5.B.2: `explorerSnippets` + `explorerTemplates` como stubs válidos (`ICSSSnippetsIndex`, `ITemplatesIndex`).

### 6.4 Sub-A.3 — Primitivos
- 2.8.1: Centralización de botones en `src/components/primitives/`.
- 2.8.A.1: btnSelection color → design token (`--vaultman-accent-secondary`).
- 2.2.C.1 (parte primitiva): Toggle primitivo para boxSearch.

### 6.5 Sub-A.4.1 — Explorer + Virtualizer + Decoración
- 2.2.C.2: boxSearch input no filtra → `logicExplorer` rewrite.
- 2.3.5: Iconos no actualizan con workspace → DecorationManager.
- 2.3.C.1: explorerProps cambios no se actualizan → reactividad central.
- 2.3.C.2: badges/highlighting → DecorationManager output explícito.
- 2.3.E.1: explorerProps no muestra íconos iconic → DecorationManager.
- 2.3.E.2: viewGrid sin click event → wiring durante migración Virtualizer.
- 2.3.E.3: Recuperar viewGrid clásico → spike de validación de la abstracción.
- 2.6.A.4: **Diff memory blow-up** → snippet preview vía DecorationManager.
- 2.10.1: Sort by date cuelga app → sort revival con tests.
- 3.2.1: Cambios no se actualizan en árbol virtual → reactividad central.
- ServiceViews absorbed (ghost): consolidación en `serviceVirtualizer<T>`.

### 6.6 Sub-A.4.2 — Frame + Navbars + Popups + Tabs
- 2.1.1: Todas las páginas se renderizan al mismo tiempo → frame rewrite + lazy mount.
- 2.1.2: Modales fuera del frame → containers inline vía `OverlayState`.
- 2.2.1: Glitch blur popupIsland → `popupIsland.svelte` finalizado.
- 2.2.D.1: menuView click outside dismiss → `OverlayState` stack.
- 2.3.D.1: Tags operan inmediato sin queue → `IOperationQueue` contrato.
- 2.4.1: tabContent visible en pageFilters → `IContentIndex`.
- 2.6.A.1: explorerQueue agrupación → real explorer + DecorationManager.
- 2.6.A.2: explorerQueue delete individual → real explorer.
- 2.6.A.3: viewDiff no activo → wiring.
- 2.6.A.10: **Queue counter concurrency** → `IOperationsIndex` separa contadores.
- 2.6.A.12: Operación falta archivos del nodo → wiring fix.
- 2.6.B.1: explorerActiveFilters subtitle counter → real explorer.
- 2.9.1: layoutTabs unificación → tabContent migration + navbarPages agnóstico.
- 3.3.1, 3.3.2, 3.3.5: cubiertos por 2.6.A.x respectivos.

### 6.7 Sub-A.5 — Settings
- ya cubierto por spec sec 5.7. Sin nuevos items v1.0 scope que requieran acción aquí (settings nuevos como "default order por explorer" caen en `out-hardening` UX Features porque el shape de los settings ya es declarativo tras A.5).

### 6.8 Adjacent fixes acordados
- A.3: btnToggle primitivo + boxSearch wiring (2.2.C.1).
- A.3: menuView click-outside (2.2.D.1) — adjacent porque OverlayState (A.4.2) lo facilita pero la mecánica del primitivo ya existe en A.3.
- A.4.1: serviceSort revival completo (2.2.E.7, 2.2.E.8, 2.3.B.5).
- A.4.1: Iconos workspace reactividad (2.3.5, 2.3.E.1).
- A.4.2: navbarTabs alias → navbarPages (rename mental).
- A.4.2: Comunicación queue ↔ panelLists (2.6.A.9, 2.6.A.11).

---

## 7. Distribución `out-hardening` por sub-bloque de v1.0 Polish (input para Annex B)

### 7.1 Bases Feature Parity
- 2.3.B.8: viewTable excel-like (Bases-style editable).
- 2.6.B.2: Logical groups faint accent (all/any/none).
- 2.6.B.3: Toggle row group/auto/manual.
- 2.6.B.5: Range filters (props tipo fechas).
- 2.6.B.7: Manual filter input syntax.
- 2.6.B.8: "All files in folder" filter.

### 7.2 Theming
- 2.7.A.2: Quitar gradientBlur → minimal theme.
- (otras variantes futuras a definir cuando se entre al sub-bloque).

### 7.3 UX Features
- 2.2.A.3, 2.2.A.4, 2.2.B.1, 2.2.B.2, 2.2.B.3 (navbarExplorer design + layout).
- 2.2.D.2 a 2.2.D.10 (menuView entero salvo click-outside).
- 2.2.E.3, 2.2.E.4, 2.2.E.5, 2.2.E.6 (menuSort redesign).
- 2.3.4, 2.3.6, 2.3.7 (panelLists empty state + CSS).
- 2.3.A.1, 2.3.A.2 (navKeyboard).
- 2.3.B.1 a 2.3.B.7 (explorerFiles features sin Bases parity).
- 2.3.F.1, 2.3.F.2 (viewTree features).
- 2.4.2, 2.4.3 (tabContent UX).
- 2.5.B.1 (Coming Soon overlay).
- 2.6.1, 2.6.A.5 a 2.6.A.8 (popupIsland UX).
- 2.6.B.4, 2.6.B.6 (listFilters UX).
- 2.7.1, 2.7.2 (layoutNav.svelte common file).
- 2.7.A.1, 2.7.A.3 (navbarPillFab).
- 2.7.B.1 a 2.7.B.3 (navbarPages DnD + workspace tabs).
- 2.11.1, 2.11.2 (explorerOutline completo).
- 2.13.1, 2.13.3 (perf tuning + settings).
- 3.3.3 (viewDiff snippet vs full).

### 7.4 Programmable Interface (depende `contracts.ts`)
- 2.5.A.2: Bases I/O text (parse/emit `.base` files vía texto, ya que API pública de Bases no existe).
- 2.12.1: serviceAPI (foundation: expone interfaces hardening como API público).
- (consumer adicional): Agent Guardrail Skill — skill obsidian-cli que vía serviceFilter/serviceQueue/Ops actúa como guardrail para AI agents (preview + scope display + await confirm).

### 7.5 Post-rc.1 (v1.0+1, fuera de Polish)
- 2.5.A.1, 2.5.A.3 (tabMarks panel + default config).
- 2.5.B.3 (tabLinter).
- 2.10.2 (manual sort via marks).
- 2.13.4 (templates default config).
- ghost: `serviceMarks.ts`.

---

## 8. Lista `cancelled` (referencia, no se reactiva)

| Item | Fecha | Razón |
|---|---|---|
| 2.2.E.1 dropDy desplazamiento | 2026-04-18 | Usuario decidió no perseguir. |
| 2.2.E.2 btnToggle/btnDrawer pequeños | 2026-04-18 | Usuario decidió no perseguir. |

---

## 9. Lista `already-fixed` (verificada al 2026-04-28)

| # | Item | Verificación |
|---|---|---|
| 2.2.A.1 | btnFab acento → grey + faint accent | ✅ marcado en backlog 2026-04-18. Sub-B confirma con grep si necesario. |
| 2.2.A.2 | Container fixed scroll bg | Confirmado funcional en backlog (no es bug). |
| 2.3.1 | Performance >1000 nodos | ✅ 2026-04-17 (Iter 19.3 stabilization). |
| 2.3.2 | Rerender/scroll-back | ✅ 2026-04-17. |
| 2.3.3 | Views/sort restart on tab change | ✅ 2026-04-17. |
| 2.13.2 | Notebook Navigator learning | ✅ 2026-04-17 (no es feature, es aprendizaje aplicado). |
| 3.1.1 | Gemini z-index regression | ✅ 2026-04-19. |
| ghost `navbarTabs` | Alias mental de `navbarPages.svelte` | Existe en working tree. |
| pre-confirmado | `BasesCheckboxInjector.ts` | Verificado 2026-04-28: file ausente, sin referencias en `src/`. Sólo queda referencia en `CONTRIBUTING.md` (Sub-B la limpia). |

---

## 10. Próximo paso

Tras este triage:

1. **Aplicar adendum a spec maestra**: agregar Annex A (in-hardening por iter) + Annex B (v1.0 Polish con 4 sub-bloques + vision statement).
2. **Commit**: `docs(triage): integrate v1.0 scope with hardening plan`.
3. **Paso 2 del HANDOFF**: invocar `superpowers:writing-plans` para Sub-B Audit (puede ser próxima sesión si el contexto se acaba).

---
