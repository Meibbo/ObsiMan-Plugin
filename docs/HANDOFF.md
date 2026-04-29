# HANDOFF — Vaultman Next Session

> Updated: 2026-04-29 | From: Claude Code (Sonnet 4.6) Sub-B Iter B.1 execution → To: next agent
> Branch: `hardening-audit` | Version: `1.0.0-beta.17` (taggeado, committed)
> **Paso 2 (plan Sub-B) DONE. Iter B.1 DONE. Esperando usuario marque dead-code-report → Iter B.2.**

---

## CONTEXTO INMEDIATO

Sesión 2026-04-28 (mañana): brainstorm produjo spec maestra del proyecto **Vaultman Hardening**: refactor + tests + audit + lock contra regresión, en 3 sub-proyectos secuenciales (B → C → A) sobre rama `hardening`. Sin merges a `main` durante el proyecto.

Sesión 2026-04-28 (tarde, ESTA): triage del v1.0 scope + Annex A (in-hardening por iter) + Annex B (v1.0 Polish + post-rc.1 + cancelled) appended al spec.

**Spec maestra**: [`docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`](superpowers/specs/2026-04-28-vaultman-hardening-master.md) (con Annex A + B)
**Triage**: [`docs/superpowers/triage/2026-04-28-v100-scope-triage.md`](superpowers/triage/2026-04-28-v100-scope-triage.md)
**Commits**: `17c89a8` (spec), siguiente commit (triage + adendum).

---

## PRÓXIMOS PASOS (en orden)

### Paso 1 — Triage del v1.0 scope + adendum a spec maestra ✅ DONE 2026-04-28

Resultados:

- **Triage doc**: `docs/superpowers/triage/2026-04-28-v100-scope-triage.md` con clasificación por item (`in-hardening`, `adjacent`, `out-hardening`, `already-fixed`, `cancelled`, `post-rc.1`).
- **Annex A** (v1.0 scope integration por iter) y **Annex B** (proyectos sucesores con vision statement + 4 sub-bloques) appended al spec maestra.
- Bugs urgentes confirmados (Diff memory blow-up → A.4.1; Queue counter concurrency → A.4.2). NO pre-fix.
- Commit: `docs(triage): integrate v1.0 scope with hardening plan`.

Verificaciones colaterales:

- `BasesCheckboxInjector.ts` ya borrado del working tree. Sólo queda referencia en `CONTRIBUTING.md` (Sub-B la limpia).
- Items `already-fixed` corroborados contra fechas del backlog.

### Paso 2 — Plan Sub-B + ejecución Iter B.1 ✅ DONE 2026-04-29

Resultados:

- **Plan**: `docs/superpowers/plans/2026-04-28-vaultman-hardening-sub-b.md` (36 tasks).
- **Branch**: `hardening` (integration) + `hardening-audit` (sub-rama activa). Flat naming — no slash (incompatible con git refs).
- **Versión**: `1.0.0-beta.17` taggeada y committed (`1db4afc`).
- **Iter B.1 completo**: Tasks 1-22 ejecutadas.
- **Outputs**:
  - `docs/superpowers/audits/2026-04-28-indexing-inventory.md` (8 tipos de nodo).
  - `docs/superpowers/audits/2026-04-28-dead-code-report.md` (11 secciones, ~47 items pendientes de decisión).
  - `docs/superpowers/audits/raw/` (ts-prune.txt, knip.txt, knip.json, depcheck.txt, depcheck.json, svelte-check.txt).
- **CHECKPOINT 1**: usuario marcando items en `dead-code-report.md`.
- **Commit log** (HEAD→`hardening-audit`): ver `git log --oneline hardening..HEAD`.

### Paso 3 — Iter B.2: limpieza confirmada 🔴 PRÓXIMO

**Pre-condición**: usuario terminó de marcar `dead-code-report.md` con `[x] keep/delete/defer`.

**Acción a tomar** (el agente lee el reporte y ejecuta):

1. **Task 24**: verify gate Iter B.1 (`npm run build ; npm run lint ; npm run check ; npm run test:integrity`).
2. **Task 25**: auto-fix imports no usados (`eslint-plugin-unused-imports --fix`).
3. **Task 26**: eliminar referencia a `BasesCheckboxInjector` en `CONTRIBUTING.md` (pre-confirmado).
4. **Tasks 27-30**: commits de cleanup por categoría según decisiones del reporte.
5. **CHECKPOINT 2** (Task 31): confirmar WIP files 3.2 (`serviceStats-WIP`) y 3.3 (`serviceLayout-WIP`).
6. **Task 32**: WIP files reorganizados según decisión del usuario.
7. **Tasks 33-36**: verify gate final → bump `1.0.0-beta.18` → Agent Memory + HANDOFF → push + PR.

**Reglas críticas Iter B.2**:
- Borrar SÓLO items marcados `[x] delete` en el reporte. Nunca asumir.
- Tras cada commit de cleanup: `npm run build ; npm run lint ; npm run check ; npm run test:integrity`. Si rojo → revert + flag.
- Commits firmados con `chore(audit):` para revert simple.
- NO mergear a `main` ni a `hardening`. PR lo aprueba el usuario.

**Subagent approach**: usar `superpowers:subagent-driven-development` task-por-task con two-stage review.

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

### Commits recientes añadidos por las sesiones 2026-04-28

```
17c89a8 docs(spec): add Vaultman Hardening master spec
<next>  docs(triage): integrate v1.0 scope with hardening plan
```

Sólo añaden documentación. No tocan código.

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

**Para Paso 2 (plan B Audit):**

1. **`AGENTS.md`** — sección 0 checklist + sección 11 integration APIs.
2. **`docs/Vaultman - Agent Memory.md`** — convenciones del proyecto, lecciones aprendidas.
3. **`docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`** — spec maestra (incluye Annex A + B).
4. **`docs/superpowers/triage/2026-04-28-v100-scope-triage.md`** — input para identificar items v1.0 que el audit debe surfacear.
5. **`docs/Vaultman - Linter Gotchas.md`** — soluciones recurrentes de tipado.

---

## NOTAS PARA EL AGENTE QUE TOME LOS SIGUIENTES PASOS

- **Caveman mode**: si está activo en la nueva sesión, mantenerlo. El spec/triage/adendum se escriben en formato normal.
- **Idioma de los docs**: español (consistente con specs antiguas y conversación del usuario).
- **No iniciar ejecución de Sub-B** hasta que el plan B esté escrito y aprobado por el usuario.
- **Branch**: NO crear `hardening` aún. Plan B debe incluir el step de creación al inicio (no antes).
- **Dead Code Protocol**: AGENTS.md y Agent Memory exigen consultar al usuario antes de borrar nada que parezca muerto. Plan B debe respetar esto en cada gate.
- **Pre-confirmado**: `BasesCheckboxInjector.ts` + `IBasesCheckboxInjector` references → delete sin pedir confirmación adicional. Plan B puede asumirlo.

### Notas específicas para Paso 2 (plan B Audit)

- **Inputs del triage que Plan B debe absorber**:
  - Items `in-hardening` mapeados a Sub-B/C/A: ver Annex A del spec.
  - `BasesCheckboxInjector.ts` ya borrado; sólo queda limpieza de `CONTRIBUTING.md` (incluir como commit en Sub-B).
  - Items `out-hardening` cuyo código sea ya muerto: el reporte `dead-code-report.md` debe surfacearlos para confirmar borrado.
- **Pre-confirmado para borrar** (Sub-B asume sin confirmación adicional): referencia a `BasesCheckboxInjector` en CONTRIBUTING.md.
- **WIP files** (decisión sugerida en spec sec 3.2; usuario confirma en Iter B.2): `serviceNavigation-WIP`, `serviceDecorate_WIP`, `popupIsland_WIP` → keep. `serviceStats-WIP`, `serviceLayout-WIP` → consultar.

---

## PUNTO DE INTERRUPCIÓN

Triage completo, Annex A + B integrados al spec, commit listo. La sesión actual termina aquí esperando que el usuario reinicie con tokens frescos para `superpowers:writing-plans` (Sub-B Audit). Sub-B no ha empezado — sólo está diseñado y triageado contra el v1.0 backlog.
