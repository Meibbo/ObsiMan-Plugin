# HANDOFF — Vaultman Next Session

> Generated: 2026-04-28 | From: Claude Code (Opus 4.7) brainstorming session → To: next agent
> Branch: `file-centric-queue-handoff` | Version: `1.0.0-beta.16` (uncommitted changes still pending → bump to beta.17)
> **Brainstorm Vaultman Hardening complete. Next task: writing-plans for Sub-B Audit.**

---

## CONTEXTO INMEDIATO

Sesión de brainstorm produjo spec maestra para proyecto **Vaultman Hardening**: refactor + tests + audit + lock contra regresión, en 3 sub-proyectos secuenciales (B → C → A) sobre rama `hardening`. Sin merges a `main` durante el proyecto.

**Spec maestra**: [`docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`](superpowers/specs/2026-04-28-vaultman-hardening-master.md)
**Commit**: `17c89a8`

---

## PRÓXIMOS PASOS (en orden)

### Paso 1 — Triage del v1.0 scope + adendum a spec maestra

Después del brainstorm, el usuario pidió triagear el backlog `docs/2026-04-15-1812 Vaultman v1.0 scope.md` para asegurar que ningún bug architectural existente "se arrastre" tras el cierre de hardening.

**Acción a tomar:**

1. Crear `docs/superpowers/triage/2026-04-28-v100-scope-triage.md` mapeando CADA item del v1.0 scope a una de:
   - `in-hardening` + iter específico (ej: A.4.2)
   - `adjacent` + iter específico (fix pequeño naturalmente en el mismo área)
   - `out-hardening` (movido a proyecto sucesor v1.0 Polish con sub-bloque)
   - `already-fixed` (verificar antes contra código actual)
2. Añadir a spec maestra `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`:
   - **Annex A — v1.0 scope integration**: lista in-hardening por iter + adjacent fixes acordados
   - **Annex B — Successor projects**: declara `v1.0 Polish` como sucesor de hardening, con **4 sub-bloques** (revisado tras conversación):
     - **Bases Feature Parity** (interno, NO depende de serviceAPI): range filters, viewTable (excel-like grid), "all files in folder" filter, logical filter syntax (all/any/none + manual)
     - **Theming** (NO depende de serviceAPI): minimal (sin blur overlays ni botones redondos), default fancy, posibles otras variantes
     - **UX Features** (NO depende de serviceAPI): navKeyboard (incluye `layoutNav.svelte` para swap navbar positions/FAB visibility/tab order), serviceDnD, multi-select modifiers, auto-scroll/reveal, inline rename, explorerOutline, viewDiff snippet vs full, empty states, "coming soon" overlay
     - **Programmable Interface** (DEPENDE de `contracts.ts` from hardening): serviceAPI (foundation: expone interfaces de hardening como API público), Bases I/O text (consumer: parse/emit `.base` files vía texto, ya que API pública de Bases no existe — usa skill `obsidian-bases` + docs oficiales como referencia), Agent Guardrail Skill (consumer: skill que vía obsidian-cli usa serviceFilter/serviceQueue/Ops como guardrail para AI agents — ej. "tag todos files en drafts/" → Vaultman muestra changes + scope → user confirma → ejecuta cola)
   - **Vision statement (Annex B header)**: "Vaultman as supervised bulk-ops harness for AI agents" — vendible diferenciador de v1.1+. Agentes hoy hacen bulk ops sin preview; Vaultman ya tiene queue + scope display + await confirm = el UX que carecen.
3. Commit triage + adendum como `docs(triage): integrate v1.0 scope with hardening plan`.

**Bugs urgentes del scope (decisión usuario):** Diff memory blow-up + queue counter concurrency → quedan en sus iters naturales (A.4.1 y A.4.2 respectivamente). NO se hace pre-hardening fix iter.

**Tiempo estimado:** 45-60 min de la sesión.

### Paso 2 — `/superpowers:write-plan` para Sub-B (Audit)

Tras Paso 1, escribir el plan ejecutable del primer sub-proyecto: Audit (no los 3 — Enfoque 3 elegido: spec maestra + planes por sub-proyecto bajo demanda).

**Acción a tomar:**

1. Invocar skill `superpowers:writing-plans` con scope: **Sub-B Audit (Iter B.1 + B.2)**.
2. Output esperado: `docs/superpowers/plans/2026-04-28-vaultman-hardening-sub-b.md`.
3. El plan debe consultar el triage doc (Paso 1) para identificar items v1.0 que el audit deba surfacear.

Plan B debe:
- Concretar comandos exactos de `ts-prune`, `knip`, `depcheck` para Iter B.1.
- Definir formato exacto del reporte `dead-code-report.md` y `indexing-inventory.md`.
- Listar checkpoints de revisión humana (Dead Code Protocol).
- Definir scripts exactos de commits por categoría en Iter B.2.
- Incluir gate de bump a `1.0.0-beta.18` al cierre.

**Nota:** Paso 1 + Paso 2 probablemente NO caben en una sola sesión. Si el contexto se acaba tras Paso 1, actualizar este HANDOFF apuntando a Paso 2 como próximo, y switchear agente.

---

## ESTADO ACTUAL DEL REPO

### Branch `file-centric-queue-handoff`

**Working tree con cambios sin commit (pre-existentes, no tocados por brainstorm)**:

```
M .gitignore
M src/components/btnSelection.svelte
M src/components/containers/panelContent.svelte
M src/components/frameVaultman.svelte
M src/components/layout/layoutPopup.svelte
M src/components/layout/menuView.svelte
M src/components/layout/navbarPages.svelte
M src/components/layout/navbarPillFab.svelte
D src/components/pages/pageStatistics.svelte    (reemplazado por pageStats.svelte)
M src/components/pages/pageTools.svelte
M src/components/pages/tabContent.svelte
M src/logic/logicFilters.ts
M src/logic/logicQueue.ts
M src/main.ts
D src/settingsVaultman.ts                       (reemplazado por settingsVM.ts)
D src/types/typeUI.ts                           (reemplazo `typePrimitives.ts` incompleto)
?? JavasScript.md
?? src/components/pages/pageStats.svelte
?? src/settingsVM.ts
?? src/types/typePrimitives.ts
```

Estos cambios pertenecen a Sessions 40-41 previas (SCSS migration + branch creation). El usuario indicó que la versión actual (post-commit de estos cambios) será `1.0.0-beta.17`.

### Commit reciente añadido por esta sesión

```
17c89a8 docs(spec): add Vaultman Hardening master spec
```

Sólo añade la spec. No toca código.

---

## RESUMEN DEL DISEÑO APROBADO

### Estrategia
- **Secuencia B → C → A** (no ramificable).
- **Branch `hardening`** desde `file-centric-queue-handoff`. Sub-ramas `hardening/audit`, `hardening/tests`, `hardening/refactor`. **Ninguna mergea a `main`**.
- **Versionado progresivo**: beta.17 (start) → beta.18 (B) → beta.19 (C) → beta.20-23 (A.x) → rc.1 (cierre).
- **BRAT release sólo para beta.17** ahora; el resto el usuario decide.

### Sub-B (Audit) — 2 iteraciones
- **Iter B.1**: Recolección con `ts-prune`/`knip`/`depcheck` + reconnaissance de indexing actual (8 tipos de nodos: files, tags, props, content, css-snippets, operations, templates, active-filters).
- **Iter B.2**: Confirmación humana + limpieza en commits separados.
- **Pre-confirmado para borrar**: `BasesCheckboxInjector.ts` y referencias.
- **WIP files**: cada uno requiere confirmación antes de borrar (Dead Code Protocol).

### Sub-C (Tests) — 4 iteraciones
- **Iter C.1**: Vitest config + mocks Obsidian (`test/helpers/obsidian-mocks.ts`).
- **Iter C.2**: Tests para `src/utils/` (≥80% coverage).
- **Iter C.3**: Tests para `src/logic/` (≥80% coverage; `logicQueue` prioridad).
- **Iter C.4**: Tests para `src/services/` (sin WIP, ≥70%) + CI gate (`.github/workflows/ci.yml`).
- **Stack ya disponible**: vitest 4.1.0, svelte-check 4.1.0, obsidian-integration-testing.

### Sub-A (Refactor) — 7 iteraciones (5 lógicas)
- **Iter A.1**: Tipos. `src/types/contracts.ts` con interfaces `INodeIndex<T>`, `IExplorer<T>`, `IFilterService`, `IOperationQueue`, `ISessionFile`, `IDecorationManager`, `IRouter`, `IOverlayState`. + `src/types/obsidian-extended.ts` reemplaza `(app as any)`. + ADRs 001-008 escritos.
- **Iter A.2.1**: Factory `createNodeIndex<T>` + 3 indices base (Files, Tags, Props). Spike de validación.
- **Iter A.2.2**: Indices restantes (Content, Operations, ActiveFilters reales; CSSSnippets, Templates como stubs válidos).
- **Iter A.3**: Primitivos Svelte 5 (`BtnSquircle`, `Badge`, `Toggle`, `Dropdown`, `TextInput`, `HighlightText`).
- **Iter A.4.1**: `Virtualizer<T>` genérico, `viewTree` adelgazado con snippets, nuevos `logicExplorer` + `serviceExplorer`. `viewGrid` migrado para validar abstracción.
- **Iter A.4.2**: Frame reescrito, `navbarPages` agnóstico, `tabContent` migrado, `OverlayState` reemplaza `layoutPopup`. **`explorerQueue` y `explorerActiveFilters` como explorers reales** (heredan tree/grid/cards/masonry, decoración, search, sort).
- **Iter A.5**: Settings declarativo (Spec 8 antigua aplicada).

### Lock contra regresión (4 capas)
1. Interfaces TS estrictas en `contracts.ts`.
2. Lint reforzado (no `as any`, no `(app as any)`).
3. ADRs 001-008 cortos y verificables.
4. CI gate GitHub Actions (build+lint+check+test:integrity) + branch protection en `main` y `hardening`.

---

## OPEN QUESTIONS YA RESUELTAS POR EL USUARIO

| # | Pregunta | Resolución |
|---|---|---|
| OQ-1 | Versionado | beta.17 ahora (cambios pendientes); bump progresivo por hito |
| OQ-2 | BRAT release | Sólo beta.17 ahora; resto decide usuario por hito |
| OQ-3 | Specs CSS Part 1-5 | Terminadas, archivar en `docs/archive/` durante Sub-A |
| OQ-4 | Svelte 5 runes en services | Seguro, proceder |
| OQ-5 | Permisos GitHub | Usuario tiene admin en `Meibbo/Vaultman-Plugin` |
| OQ-6 | Templates/Snippets | Placeholders v1.0+1; indices como stubs por modularidad futura |

---

## ARCHIVOS A LEER ANTES DE EMPEZAR

**Para Paso 1 (triage + adendum):**

1. **`AGENTS.md`** — sección 0 checklist + sección 11 integration APIs.
2. **`docs/Vaultman - Agent Memory.md`** — convenciones del proyecto, lecciones aprendidas.
3. **`docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`** — spec maestra completa.
4. **`docs/2026-04-15-1812 Vaultman v1.0 scope.md`** — backlog del usuario a triagear.

**Para Paso 2 (plan B):**

5. Triage doc generado en Paso 1.
6. **`docs/Vaultman - Linter Gotchas.md`** — soluciones recurrentes de tipado.

---

## NOTAS PARA EL AGENTE QUE TOME LOS SIGUIENTES PASOS

- **Caveman mode**: si está activo en la nueva sesión, mantenerlo. El spec/triage/adendum se escriben en formato normal.
- **Idioma de los docs**: español (consistente con specs antiguas y conversación del usuario).
- **No iniciar ejecución de Sub-B** hasta que el plan B esté escrito y aprobado por el usuario.
- **Branch**: NO crear `hardening` aún. Plan B debe incluir el step de creación al inicio (no antes).
- **Dead Code Protocol**: AGENTS.md y Agent Memory exigen consultar al usuario antes de borrar nada que parezca muerto. Plan B debe respetar esto en cada gate.
- **Pre-confirmado**: `BasesCheckboxInjector.ts` + `IBasesCheckboxInjector` references → delete sin pedir confirmación adicional. Plan B puede asumirlo.

### Notas específicas para el triage (Paso 1)

- **Verificar antes de marcar `already-fixed`**: leer el archivo actual del codebase para confirmar.
- **Archivos ghost — clasificación final del usuario** (NO empezar de cero, usar esta tabla):

  | Archivo ghost | Clasificación | Destino |
  |---|---|---|
  | `layoutNav.svelte` | out-hardening | Polish UX Features (common file para navbars sup/inf con setting de "swap positions / FAB visibility / tab order" — advanced layout customization) |
  | `navbarTabs` | already-fixed (alias) | Es el actual `navbarPages.svelte` — solo rename mental |
  | `serviceMarks.ts` | out-hardening | post-rc.1 (módulo del servicio de templates, v1.0+1) |
  | `serviceViews.ts` | in-hardening | A.4.1 (absorbido por Virtualizer<T> + IExplorer + view system genérico) |
  | `serviceSorting.ts` | in-hardening | A.4.x (sort logic en services + tests) |

- **Pre-categorización conocida** (parte ya hecha en brainstorm — ver tabla con ~16 items in-hardening + adjacent fixes en spec sec 5 + Annex A planeado). Reutilizar como base.

---

## PUNTO DE INTERRUPCIÓN

Brainstorming completo, spec aprobado, commit hecho. La sesión actual termina aquí esperando que el usuario reinicie con tokens fresh para `writing-plans`. Sub-B no ha empezado — sólo está diseñado.
