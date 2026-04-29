# Vaultman Hardening — Spec Maestra

> **Tipo**: Spec maestra (meta-estrategia + contratos invariantes).
> **Fecha**: 2026-04-28
> **Autor**: Meibbo (con asistencia Claude Code Opus 4.7).
> **Branch base**: `file-centric-queue-handoff` → `hardening`.
> **Versión inicio**: `1.0.0-beta.17`. **Versión meta**: `1.0.0-rc.1` (al cierre).
> **Política de merge**: NINGUNA rama mergea a `main` durante este proyecto.

---

## 0. Propósito

Endurecer Vaultman antes de v1.0 estable mediante:

1. Auditoría de código muerto, inacabado y huérfano (Sub-B).
2. Suite de tests unitarios sobre lógica pura y servicios (Sub-C).
3. Refactor a Svelte 5 runes + interfaces TS estrictas (Sub-A).

Resultado esperado: red de seguridad activa que protege futuras iteraciones (incluyendo agentes IA) contra regresión arquitectónica y semántica.

Esta spec maestra define **qué** se hace, **en qué orden**, **bajo qué contratos**. Cada sub-proyecto tendrá su propio plan ejecutable redactado al inicio de su sub-rama. Esta spec NO contiene plan ejecutable.

---

## 1. Estrategia de entrega

### 1.1 Secuencia obligatoria

```
Sub-B (Audit)  →  Sub-C (Tests)  →  Sub-A (Refactor)
   2 iter           4 iter            7 iter (5 lógicos, A.2 y A.4 cada uno con 2 sub-iters)
```

La secuencia es **no ramificable**. No se inicia un sub-proyecto antes de cerrar el anterior con CI verde.

### 1.2 Estrategia de ramas

- Rama madre: `hardening` (creada desde `file-centric-queue-handoff`).
- Sub-ramas: `hardening/audit`, `hardening/tests`, `hardening/refactor`.
- Cada sub-rama merges de vuelta a `hardening` con PR.
- `main` permanece intacto durante todo el proyecto.
- Antes de iniciar cada sub-proyecto: rebase de `hardening` desde `main` (si `main` recibió cambios) + verify CI.

### 1.3 Versionado

| Hito | Version bump |
|---|---|
| Pre-Sub-B (commit pendientes actuales) | `1.0.0-beta.17` |
| Cierre Sub-B | `1.0.0-beta.18` |
| Cierre Sub-C | `1.0.0-beta.19` |
| Cierre Sub-A.1 (tipos) | `1.0.0-beta.20` |
| Cierre Sub-A.2 (servicios + indices) | `1.0.0-beta.21` |
| Cierre Sub-A.3 (primitivos) | `1.0.0-beta.22` |
| Cierre Sub-A.4 (componentes) | `1.0.0-beta.23` |
| Cierre Sub-A.5 (settings) | `1.0.0-rc.1` |

### 1.4 Estrategia BRAT

- Release BRAT inmediato: `1.0.0-beta.17` (cubre cambios actuales sin push aún).
- Releases BRAT posteriores: el usuario decide por hito. No hay liberación automática.
- Tags Git sin prefijo `v` (convención del proyecto).

### 1.5 Out of scope

- Specs CSS Part 1-5 (ya terminadas — se archivan en este proyecto, no se ejecutan).
- Specs Code Refactor Part 1-8 (su contenido se consolida aquí; los archivos originales se archivan).
- Iteraciones futuras: 21 (Health Check), 22 (Layout tab), 23+ (templates UI, CSS snippets UI).
- Tests E2E nuevos (`wdio` queda como está).
- Migración a otro framework.
- Cambios de feature.

---

## 2. Contratos invariantes (mecanismo de lock)

Cuatro capas de defensa contra regresión arquitectónica.

### 2.1 Capa 1 — Interfaces TypeScript estrictas

**Archivo nuevo**: `src/types/contracts.ts`.

Toda dependencia entre módulos pasa por interfaz, no por implementación. Cambiar una firma = compile error en todos los consumidores.

Interfaces obligatorias al cierre de Sub-A.1:

- `INodeIndex<TNode>` — abstracción común de indexing.
- `IFilesIndex extends INodeIndex<FileNode>`
- `ITagsIndex extends INodeIndex<TagNode>`
- `IPropsIndex extends INodeIndex<PropNode>`
- `IContentIndex extends INodeIndex<ContentMatch>`
- `ICSSSnippetsIndex extends INodeIndex<SnippetNode>` (placeholder v1.0+1)
- `IOperationsIndex extends INodeIndex<QueueChange>`
- `ITemplatesIndex extends INodeIndex<TemplateNode>` (placeholder v1.0+1)
- `IActiveFiltersIndex extends INodeIndex<FilterRule>`
- `IExplorer<TNode>` — orquestador de un index + estado de UI (selección, expansión, scroll).
- `IFilterService` — runtime del motor de filtros (consume múltiples indices).
- `IOperationQueue` — cola transaccional (no es index; es la fuente que IOperationsIndex envuelve).
- `ISessionFile` — lectura/escritura del archivo de sesión.
- `IDecorationManager` — provee snippets/badges/highlights a las views.
- `IRouter` — estado de página/tab activa, drag-and-drop de páginas.
- `IOverlayState` — pila de overlays/popups inyectables.

**Archivo nuevo**: `src/types/obsidian-extended.ts`.

Wrapper tipado para APIs internas de Obsidian (`app.plugins`, `app.commands`, `app.internalPlugins`). Reemplaza todo `(app as any)` del código actual.

**Anti-eliminadas**: `IBasesCheckboxInjector` y todo lo asociado a `BasesCheckboxInjector` se borra en Sub-B.

### 2.2 Capa 2 — Reglas de lint

`eslint.config.js` se amplía con:

- Refuerzo `@typescript-eslint/no-explicit-any` (ya existe; subir a `error`).
- `@typescript-eslint/no-unsafe-*` activos.
- Plugin `eslint-plugin-unused-imports` para auto-fix de imports no usados.
- Regla custom o regex de CI que bloquee `(app as any)`. Implementación: pre-commit hook + step en GitHub Actions.
- Mantener todas las reglas `obsidianmd/*` activas.

Errores pre-existentes (citados en AGENTS.md sección 4) se resuelven al final de Sub-A.1, no antes.

### 2.3 Capa 3 — Architecture Decision Records (ADRs)

**Carpeta nueva**: `docs/superpowers/adr/`.

Plantilla:

```markdown
# ADR-NNN: <título>

- Date: YYYY-MM-DD
- Status: Accepted | Superseded by ADR-XXX
- Context: por qué se discutió.
- Decision: qué se decidió.
- Consequences: qué implica para código futuro.
- Verification: cómo un agente IA verifica que sigue válido.
```

ADRs base (escritos durante Sub-A.1):

- **ADR-001**: Servicios con estado reactivo viven en archivos `*.svelte.ts` y exponen `$state`/`$derived`. Componentes consumen runes vía import directo o context. No se usan observers manuales ni emitters.
- **ADR-002**: Componentes y otros servicios consumen interfaces (`Ixxx`), no clases concretas. La clase concreta sólo se referencia en `main.ts` para el wiring.
- **ADR-003**: Tests unitarios cubren `src/utils/`, `src/logic/`, `src/services/` (excepto WIP). Componentes Svelte se cubren con E2E (`wdio`), no con `@testing-library/svelte`. Esto no es una limitación del framework: es alcance v1.0.
- **ADR-004**: Toda interacción con APIs internas de Obsidian pasa por `src/types/obsidian-extended.ts`. `(app as any)` está prohibido y bloqueado por lint/CI.
- **ADR-005**: Archivos en progreso usan sufijo `-WIP` o `_WIP`. No mergeables a `main` ni a `hardening` sin renombrar (CI los bloquea con regla de path).
- **ADR-006**: Cambios a interfaces de `src/types/contracts.ts` requieren ADR nuevo justificando el cambio. Las interfaces son contrato público entre módulos.
- **ADR-007**: Coverage thresholds aplican al total del repo. Excepciones por archivo se documentan aquí en lugar de bajar el umbral global.
- **ADR-008**: Indexing usa la abstracción `INodeIndex<T>` con factory `createNodeIndex<T>()`. Cada tipo de nodo (files, tags, props, content, operations, filters, snippets, templates) tiene su propio servicio implementando el factory.

### 2.4 Capa 4 — CI gate

**Archivo nuevo**: `.github/workflows/ci.yml`.

```yaml
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run check
      - run: npm run build
      - run: npm run test:integrity
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: coverage, path: coverage/ }
```

Branch protection (configurada por el usuario tras el merge del workflow):

- `main`: requiere `verify` + 1 review.
- `hardening`: requiere `verify`.
- `hardening/*`: sin protección (autonomía durante desarrollo).

Script local equivalente: `npm run verify` (añadir a `package.json`):

```json
"verify": "npm run lint && npm run check && npm run build && npm run test:integrity"
```

---

## 3. Sub-proyecto B — Audit

### 3.1 Outputs

- `docs/superpowers/audits/2026-04-28-dead-code-report.md` — categorías + items revisables.
- `docs/superpowers/audits/2026-04-28-indexing-inventory.md` — mapa actual de indexing por tipo de nodo.
- PR `hardening/audit` con commits separados por categoría de limpieza.

### 3.2 Iter B.1 — Recolección automatizada + reconnaissance

**Stack**:

- `ts-prune` (devDep nueva).
- `knip` (devDep nueva).
- `depcheck` (devDep nueva).
- `eslint-plugin-unused-imports` (devDep nueva).
- `svelte-check` (ya existe).

**Categorías del reporte de dead code**:

| Categoría | Detección | Acción default |
|---|---|---|
| Dead exports | knip + ts-prune | confirmar |
| Archivos huérfanos | knip | confirmar |
| WIP files | glob `*-WIP*`/`*_WIP*` | evaluar caso-por-caso |
| Transitive dead funcs | manual + grep | confirmar grupo |
| Props no leídos en `.svelte` | svelte-check | borrar |
| Imports no usados | eslint | auto-fix |
| Deps `package.json` no usadas | depcheck | confirmar |
| Tipos no referenciados | ts-prune | borrar |
| `TODO`/`FIXME` antiguos sin issue | grep | listar, no borrar |
| Branches imposibles (`if (false)`) | manual | confirmar |

**Pre-poblado conocido (delete confirmed por usuario)**:
- `src/services/BasesCheckboxInjector.ts` y todas sus referencias.
- Tipo `IBasesCheckboxInjector` (no existe aún; se previene su creación).

**WIP files actuales (decisión sugerida; usuario confirma en B.2)**:

| Archivo | Decisión sugerida | Razón |
|---|---|---|
| `serviceNavigation-WIP.svelte.ts` | keep | base del Router rune en Sub-A.2 |
| `serviceStats-WIP.svelte.ts` | consultar | sin mención en specs |
| `serviceLayout-WIP.svelte.ts` | consultar | sin mención clara |
| `serviceDecorate_WIP.ts` | keep | DecorationManager en Sub-A.4 |
| `popupIsland_WIP.svelte` | keep | unificación islas en Sub-A.4 |

**Indexing inventory** (output paralelo, mismo iter):

Por cada tipo de nodo:

- **Files**: dónde se itera vault, dónde se filtra, quién consume.
- **Tags**: pipeline desde `metadataCache.getAllTags` hasta UI.
- **Properties**: estado actual de `PropertyIndexService`, consumidores.
- **Content**: ¿existe indexing? (probablemente no, sólo búsqueda ad-hoc en `tabContent`).
- **CSS Snippets**: probablemente no indexed.
- **Operations**: cómo `serviceQueue.pending` se expone a UI.
- **Templates**: estado del hook Templater.
- **ActiveFilters**: cómo `filterService.activeRules` se consume.

Output: tabla con columnas `[tipo de nodo] [archivo origen] [transformación] [consumidores] [shape de datos]`.

### 3.3 Iter B.2 — Confirmación + limpieza

1. Usuario revisa reporte de dead code, marca cada item: `keep` / `delete` / `defer`.
2. Agente ejecuta deletes en commits separados por categoría:
   - `chore(audit): remove unused exports`
   - `chore(audit): remove orphan files`
   - `chore(audit): remove unused deps`
   - `chore(audit): clean transitive dead code`
   - `chore(audit): remove BasesCheckboxInjector`
   - `chore(audit): WIP files reorganized` (si aplica)
3. Build + lint + test verde tras cada commit. Si rompe → revert + flag en reporte.
4. PR `hardening/audit` → merge a `hardening`.
5. Bump versión a `1.0.0-beta.18`.

### 3.4 Gates de confirmación

- Borrado en bloque ≥10 archivos = pausa, pide confirmación adicional.
- Cualquier WIP file = no se borra sin "DELETE confirmed" explícito.
- Commits firmados con `chore(audit):` para revert simple.

---

## 4. Sub-proyecto C — Tests

### 4.1 Outputs

- `vitest.config.ts` ampliado para `src/**/*.test.ts` (proyecto unit).
- `test/unit/` con mirror de estructura `src/`.
- `test/helpers/obsidian-mocks.ts` — mocks reusables.
- `.github/workflows/ci.yml` — CI gate activo.
- Coverage report HTML en `coverage/`.

### 4.2 Iter C.1 — Infrastructure

**Vitest config dual**:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/logic/**', 'src/services/**'],
      exclude: ['**/*-WIP*', '**/*_WIP*', '**/svelte.d.ts'],
      thresholds: { lines: 70, functions: 70, branches: 60 }
    },
    projects: [
      { test: { include: ['test/unit/**/*.test.ts'] } },
      { test: { include: ['test/integration/**/*.test.ts'] } }
    ]
  }
});
```

**Mocks Obsidian** (`test/helpers/obsidian-mocks.ts`):

- `mockApp(overrides?: Partial<App>): App`
- `mockTFile(path: string, frontmatter?: Record<string, unknown>): TFile`
- `mockVault(files: TFile[]): Vault`
- `mockMetadataCache(map: Map<string, CachedMetadata>): MetadataCache`
- `mockFileManager(): FileManager` con `processFrontMatter` funcional

Cada helper retorna mock mínimo viable + permite overrides. Documentado en JSDoc.

### 4.3 Iter C.2 — Tests `utils/`

Cubrir: `autocomplete.ts`, `filter-evaluator.ts`, `utilPropIndex.ts`, `utilPropType.ts`, `dropDAutoSuggestionInput.ts`, `inputModal.ts`.

Estructura mirror:

```
test/unit/utils/
  filter-evaluator.test.ts
  utilPropIndex.test.ts
  ...
```

Naming: `describe('functionName')` → `it('does X when Y')`.

Por función mínimo: happy path + 1 edge case + 1 input inválido.

Coverage target tras C.2: ≥80% líneas en `src/utils/`.

### 4.4 Iter C.3 — Tests `logic/`

Cubrir: `logicProps.ts`, `logicsFiles.ts`, `logicTags.ts`, `logicFilters.ts`, `logicQueue.ts`.

`logicQueue.ts` es prioridad alta (zona caliente de regresiones por la rama `file-centric-queue-handoff`).

Coverage target tras C.3: ≥80% líneas en `src/logic/`.

### 4.5 Iter C.4 — Tests `services/` + CI gate

Servicios con Obsidian mockeada:

- `serviceFilter.ts`
- `serviceQueue.ts`
- `serviceCMenu.ts`
- `serviceDiff.ts`
- `serviceVirtualizer.ts` (puro, sin Obsidian)

Servicios `*-WIP*` se omiten (se testean cuando Sub-A los promueva).

`logicExplorer.ts` y `serviceExplorer.svelte.ts` no existen aún — sus tests se escriben durante Sub-A.4.1.

Indices nuevos (Sub-A.2.x) no existen aún — sus tests se escriben durante Sub-A.2.

**CI gate** (workflow YAML de sección 2.4) se mergea en este iter.

Branch protection (configura usuario): `main` requiere `verify` + 1 review; `hardening` requiere `verify`.

Bump versión a `1.0.0-beta.19` al cierre.

### 4.6 Coverage final esperado tras Sub-C

| Path | Lines | Functions |
|---|---|---|
| `src/utils/` | ≥80% | ≥80% |
| `src/logic/` | ≥80% | ≥80% |
| `src/services/` (sin WIP, sin indices nuevos aún) | ≥70% | ≥70% |
| `src/components/` | 0% (intencional, ADR-003) | — |
| Total reporte | ≥60% | ≥65% |

### 4.7 Anti-patrones bloqueados en tests

- No `as any` (mismo lint que producción).
- No mocks ad-hoc inline (todo vía helpers reusables).
- No tests dependientes de orden.
- No timing real (`vi.useFakeTimers()` siempre).

---

## 5. Sub-proyecto A — Refactor

### 5.1 Outputs

- ADRs 001-008 escritos.
- `src/types/contracts.ts` poblado.
- `src/types/obsidian-extended.ts` poblado.
- 8 servicios de indexing operativos (6 reales: Files, Tags, Props, Content, Operations, ActiveFilters; 2 stubs: CSSSnippets, Templates).
- `viewTree.svelte` adelgazado; `Virtualizer<T>` genérico.
- `explorerQueue.svelte`, `explorerActiveFilters.svelte`, `tabContent` migrado.
- `settingsVM.ts` reducido a puente; `SettingsUI.svelte` declarativo.
- `docs/archive/` con Specs Part 1-8 (CSS + Code) marcadas como SUPERSEDED.

### 5.2 Consolidación de specs antiguas

| Spec antigua | Acción | Destino |
|---|---|---|
| Code Refactor Part 1 (Primitivos/SCSS) | parcial → archivar; reescribir parte Svelte 5 | Iter A.3 |
| Code Refactor Part 2 (Frame/Pages/Tabs) | obsoleto → archivar; reescribir | Iter A.4.2 |
| Code Refactor Part 3 (Virtualizer) | vigente → archivar tras consolidar | Iter A.4.1 |
| Code Refactor Part 4 (Decoración) | vigente → archivar tras consolidar | Iter A.4.1 |
| Code Refactor Part 5 (Navbars) | parcial → archivar; integrar `serviceNavigation-WIP` | Iter A.2 |
| Code Refactor Part 6 (Popups) | vigente → archivar tras consolidar | Iter A.4.2 |
| Code Refactor Part 7 (Tabs+Content) | parcial → archivar; reconstruir `typeUI` | Iter A.1 + A.4.2 |
| Code Refactor Part 8 (Settings) | vigente → archivar tras consolidar | Iter A.5 |
| CSS Refactor Part 1-5 | terminadas → archivar sin más acción | `docs/archive/` |

Archivado: añadir header en cada archivo:

```markdown
> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.
```

Mover a `docs/archive/superpowers/specs/`.

### 5.3 Iter A.1 — Tipos

**Outputs**:

- `src/types/contracts.ts` con todas las interfaces de sección 2.1.
- `src/types/obsidian-extended.ts` reemplaza `(app as any)`.
- Reconstrucción de `typeUI.ts` (borrado en working tree):
  ```typescript
  export const FILTERS_TABS_CONFIG = [
    { id: 'props', icon: 'lucide-book-plus', labelKey: 'filter.tab.props' },
    { id: 'files', icon: 'lucide-files', labelKey: 'filter.tab.files' },
    { id: 'tags', icon: 'lucide-tags', labelKey: 'filter.tab.tags' },
    { id: 'content', icon: 'lucide-text-cursor-input', labelKey: 'filter.tab.content' }
  ] as const;
  export type FiltersTab = typeof FILTERS_TABS_CONFIG[number]['id'];
  ```
- Limpiar `typePrimitives.ts` (incompleto), unificar tipos primitivos.
- Lint rule custom: bloquear `(app as any)`.
- ADRs 001-008 escritos.

**Verificación**: build + lint + test verde. 67-problem backlog (Session 40) cae a 0.

Bump a `1.0.0-beta.20`.

### 5.4 Iter A.2 — Servicios + Indices (split en 2 sub-iters)

#### A.2.1 — Factory + indices base

**Outputs**:

- `src/services/createNodeIndex.ts` — factory genérico que provee subscribe/refresh/cache compartido.
- `src/services/serviceFilesIndex.ts` (nuevo, extrae lógica actual de iteración de vault).
- `src/services/serviceTagsIndex.ts` (nuevo, usa `getAllTags`).
- `src/services/servicePropsIndex.ts` (rename + refactor de `PropertyIndexService`).
- `serviceNavigation-WIP.svelte.ts` → `serviceNavigation.svelte.ts` con `Router` rune store.
- `serviceFilter` reescrito como `IFilterService` con runes; consume múltiples indices.
- `serviceQueue.ts` expone `pending` y `size` como `$state`.

**Spike de validación**: antes de comprometerse a los 8 indices, implementar primero Files + Tags y validar que la abstracción `INodeIndex<T>` es ergonómica. Si no encaja, refactorizar la interfaz antes de continuar.

#### A.2.2 — Indices restantes

**Outputs**:

- `src/services/serviceContentIndex.ts` — alimenta `tabContent` find/replace.
- `src/services/serviceOperationsIndex.ts` — wraps `serviceQueue.pending` (read-only view).
- `src/services/serviceActiveFiltersIndex.ts` — wraps `filterService.activeRules`.
- `src/services/serviceCSSSnippetsIndex.ts` (stub válido — interfaz cumplida, sin consumidor en v1.0).
- `src/services/serviceTemplatesIndex.ts` (stub válido — interfaz cumplida, sin consumidor en v1.0).

Tests escritos en paralelo durante A.2.1 y A.2.2.

**Verificación**: tests Sub-C siguen verdes. Componentes consumidores siguen funcionando porque las interfaces son estables.

Bump a `1.0.0-beta.21`.

### 5.5 Iter A.3 — Primitivos

**Outputs**:

- Carpeta `src/components/primitives/`:
  - `BtnSquircle.svelte` (extrae lógica de `btnSelection.svelte`).
  - `Badge.svelte` con variantes via CSS vars (`--badge-accent`), no clases `--red/--blue`.
  - `Toggle.svelte`, `Dropdown.svelte`, `TextInput.svelte` (preparación para Iter A.5).
  - `HighlightText.svelte` (search highlight, prep Iter A.4).

Cada primitivo: `$props()`, `$derived` para clases de estado, sin lógica de negocio.

Bump a `1.0.0-beta.22`.

### 5.6 Iter A.4 — Componentes (split en 2 sub-iters)

#### A.4.1 — Explorer abstracto + Virtualizer genérico + Decoración

**Outputs**:

- `src/logic/logicExplorer.ts` (nuevo): estado del explorer (selección, expansión, scroll). Compartido por todas las views.
- `src/services/serviceExplorer.svelte.ts` (nuevo): orquesta filterService + index + decoración. Expone runes consumidas por views.
- `src/services/serviceVirtualizer.ts` refactor a `Virtualizer<T>` genérico:
  ```typescript
  export class Virtualizer<T> {
    scrollTop = $state(0);
    items = $state<T[]>([]);
    rowHeight = $state(32);
    window = $derived.by(() => ({ start, end }));
  }
  ```
- `src/components/views/viewTree.svelte` adelgazado: SOLO renderiza nodos planos. Recibe snippets `nodeContent` y `nodeDecorator`. Sin lógica de filters/badges/highlight.
- `serviceDecorate_WIP.ts` → `serviceDecorate.ts`, integrado.
- `viewGrid.svelte` migrado a usar `Virtualizer<T>` (validación de la abstracción).

**Tests nuevos**:
- `test/unit/logic/logicExplorer.test.ts` (≥80%).
- `test/unit/services/serviceExplorer.test.ts` (≥80%).
- `test/unit/services/serviceVirtualizer.test.ts` actualizado para genérico.

#### A.4.2 — Frame + Navbars + Popups + Tabs

**Outputs**:

- `frameVaultman.svelte` reescrito: `$derived` para offset de página, no manipulación DOM directa.
- `navbarPages.svelte` agnóstico, recibe `FILTERS_TABS_CONFIG` por props.
- `tabContent.svelte` migrado: consume `IContentIndex`, renderiza con view components compartidos.
- `layoutPopup.svelte` → `OverlayState.svelte.ts` con stack inyectable; eliminar prop drilling de 13 props.
- `popupIsland_WIP.svelte` → `popupIsland.svelte` finalizado.
- `explorerQueue.svelte` (nuevo): consume `IOperationsIndex`. Soporta tree/grid/cards/masonry. Reemplaza lista hardcoded del queue popup.
- `explorerActiveFilters.svelte` (nuevo): consume `IActiveFiltersIndex`. Reemplaza lista hardcoded del active-filters popup.

Bump a `1.0.0-beta.23`.

### 5.7 Iter A.5 — Settings

**Outputs**:

- `settingsVM.ts` reducido a `mount()`/`unmount()` puente.
- `src/components/settings/SettingsUI.svelte` con `bind:value` + `$effect` autoguardado.
- Primitivos `<SettingToggle>`, `<SettingDropdown>`, `<SettingText>` consumidos.
- Test de migración: settings.json existente se respeta tras montar la nueva UI.

Bump a `1.0.0-rc.1`.

### 5.8 Verificación post-A

- `npm run build` → 0 warnings 0 errors.
- `npm run lint` → 0 problems (incluyendo nueva rule `no-app-as-any`).
- `npm run check` → svelte-check 0 errors.
- `npm run test:integrity` → todos verdes.
- Coverage no baja vs Sub-C; sube en archivos nuevos (logic/services).
- ADRs 001-008 con `Status: Accepted` y consistentes con código.

---

## 6. Riesgos y mitigaciones

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | Cambio de scope mid-flight | alta | Out-of-scope explícito en sec 1.5. Cambios = nuevo brainstorm |
| 2 | Agente IA siguiente ignora ADRs | alta | `AGENTS.md` actualizado con sección obligatoria "lee ADRs antes de tocar `src/services/` o `src/types/`" |
| 3 | CI Linux pasa, Windows local falla | media | `npm run verify` local; gold standard es GitHub Actions |
| 4 | Refactor introduce bug runtime no detectado por unit tests | media | Cada Iter A.x cierra con session manual + reload del plugin (obsidian-cli) + checklist en `docs/Vaultman - Bugs.md` |
| 5 | Specs viejas se siguen consultando | media | Mover a `docs/archive/` con header SUPERSEDED |
| 6 | `hardening` divergente de `main` por meses → conflictos | alta | Rebase desde `main` al inicio de cada sub-proyecto + verify CI |
| 7 | Sub-B borra algo que Sub-A iba a reusar | media | Spec maestra escrita ANTES de B; audit consulta spec antes de borrar |
| 8 | Coverage thresholds bloquean iter pequeñas | baja | ADR-007 documenta excepciones |
| 9 | Reconnaissance revela 8 patrones de indexing inconciliables | media | A.2.1 spike con 2 indices reales antes de commit a abstracción |
| 10 | Operations-como-index cambia semántica de queue | media | `serviceOperationsIndex` es read-only view; `serviceQueue.execute()` intacto |
| 11 | Net new indices = scope creep | baja | ADR por cada uno justifica existencia; stubs válidos donde no hay consumer |
| 12 | `tabContent` rewrite rompe find/replace | media | E2E test antes de migrar congela comportamiento |

---

## 7. Success criteria

Al cierre del proyecto, todo verdadero:

- `main` intacto.
- `hardening` con `npm run verify` → 0 errors.
- Coverage `src/utils/` ≥80%, `src/logic/` ≥80%, `src/services/` (sin WIP) ≥70%.
- 0 archivos `*-WIP*` o `*_WIP*` en `src/`.
- 0 ocurrencias de `(app as any)` en `src/`.
- ADRs 001-008 escritos, todos `Status: Accepted`.
- CI gate corriendo en GitHub Actions.
- 8 indices implementados (6 reales + 2 stubs válidos para CSSSnippets/Templates).
- Queue + ActiveFilters + Content como explorers reales.
- Specs Part 1-8 (CSS + Code) archivadas en `docs/archive/`.
- `docs/Vaultman - Agent Memory.md` actualizada con cierre del proyecto.
- Versión `1.0.0-rc.1` taggeada.

---

## 8. Rollback strategy

Si un sub-proyecto se bloquea:

1. Branch `hardening/<sub>` se descarta (no merge).
2. Spec maestra documenta lo aprendido en sección "Lessons" (añadir aquí cuando aplique).
3. Brainstorm continúa desde último merge verde.
4. Si Sub-A bloquea pero B+C ya merged → B+C son value standalone (audit limpio + tests siguen sirviendo).

---

## 9. Lessons learned

(Sección viva — se actualiza al cierre de cada sub-proyecto si hay aprendizaje significativo).

---

## 10. Apéndice — Estimación temporal (orientativa, no commit)

| Sub-proyecto | Iters | Sesiones agente | Días calendario (1 sesión/día) |
|---|---|---|---|
| B (Audit) | 2 | 2-3 | 2-3 |
| C (Tests) | 4 | 4-6 | 4-6 |
| A (Refactor) | 7 (A.1, A.2.1, A.2.2, A.3, A.4.1, A.4.2, A.5) | 8-12 | 10-15 |
| **Total** | **13** | **14-21** | **16-24** |

El gate verde (build+lint+test+CI) es no-negociable. Si bloquea, el iter no termina.

---

## Annex A — Integración del v1.0 scope

> Tras brainstorm + triage del backlog `docs/2026-04-15-1812 Vaultman v1.0 scope.md`, los items se distribuyen como sigue. **Documento triage detallado**: `docs/superpowers/triage/2026-04-28-v100-scope-triage.md` (referencia obligatoria al planear cada sub-iter).
>
> Convenciones: `[in]` = output directo del iter, `[adj]` = fix natural en el área. Items `out-hardening`, `already-fixed`, `cancelled` y `post-rc.1` viven sólo en el triage doc.

### A.1 — Tipos

Sin items adicionales del v1.0 scope (los outputs ya están en sec 5.3).

### A.2.1 — Factory + indices base

Sin items adicionales del v1.0 scope (los outputs ya están en sec 5.4).

### A.2.2 — Indices restantes

- `[in]` 2.5.B.2 — `explorerSnippets` + `explorerTemplates` como **stubs válidos** (`ICSSSnippetsIndex`, `ITemplatesIndex`). Sin consumer en v1.0 pero estructura preservada para v1.0+1.

### A.3 — Primitivos

- `[in]` 2.8.1 — Centralización de botones en `src/components/primitives/`.
- `[in]` 2.8.A.1 — `BtnSelection` color seleccionado → token `--vaultman-accent-secondary` (transparent accent).
- `[adj]` 2.2.C.1 — `Toggle` primitivo con wiring inicial de `boxSearch` (continuación en A.4.1).
- `[adj]` 2.2.D.1 — `OverlayState` no existe aún en A.3, pero el primitivo `Toggle`/`Dropdown` se diseña **anticipando** click-outside dismiss (consumer final en A.4.2).

### A.4.1 — Explorer + Virtualizer + Decoración

- `[in]` 2.2.C.2 — `boxSearch` input filtra nodos (regresión) → `logicExplorer.search` rune.
- `[in]` 2.3.C.1 — `explorerProps` cambios reactivos → `logicExplorer` reactividad central.
- `[in]` 2.3.C.2 — Sistema de badges/highlighting → `DecorationManager` output explícito.
- `[in]` 2.3.E.2 — `viewGrid` nodos sin click event → wiring durante migración a `Virtualizer<T>`.
- `[in]` 2.3.E.3 — Recuperar `viewGrid` clásico (regresión) → spike de validación de la abstracción.
- `[in]` 2.6.A.4 — **Diff memory blow-up** (200 ops cargan 80-90 archivos completos) → `DecorationManager` provee snippet preview en lugar de full-file preload. Bug urgente del scope.
- `[in]` 3.2.1 — Cambios no se actualizan en árbol virtual → reactividad central.
- `[in]` Ghost `serviceViews.ts` — Absorbido por `Virtualizer<T>` + `IExplorer` + view system genérico.
- `[adj]` 2.3.5 — Iconos no se actualizan a la par del workspace → `DecorationManager` unifica reactividad iconic.
- `[adj]` 2.3.E.1 — `explorerProps` no muestra íconos iconic → mismo `DecorationManager`.
- `[adj]` 2.10.1 — Sort by date cuelga la app (props/tags) → `serviceSorting` revival con tests Sub-C; perf fix obligatorio.
- `[adj]` 2.2.E.7, 2.2.E.8 — Toggle categoría sort + btnDrawer grupos → mismo `serviceSorting` revival.
- `[adj]` 2.3.B.5 — `serviceSort` no funciona en `viewTree` → mismo módulo.
- `[adj]` Ghost `serviceSorting.ts` — Sort logic en services + tests Sub-C.

### A.4.2 — Frame + Navbars + Popups + Tabs

- `[in]` 2.1.1 — Todas las páginas se renderizan al mismo tiempo → frame rewrite con `$derived` offset + lazy mount opt-in vía `IRouter`.
- `[in]` 2.1.2 — Modales fuera del frame → containers inline vía `OverlayState`.
- `[in]` 2.2.1 — Glitch blur sólido↔gradiente al abrir popupIsland → `popupIsland.svelte` finalizado con bg coherente.
- `[in]` 2.2.D.1 — `menuView` cierre con click outside → `OverlayState` stack click-outside dismiss.
- `[in]` 2.3.D.1 — Tags operan sin pasar por queue → `explorerTags` consume `IOperationQueue` (contrato).
- `[in]` 2.4.1 — `tabContent` visible en `pageFilters` → consume `IContentIndex`, renderiza con view components compartidos.
- `[in]` 2.6.A.1 — `explorerQueue` operaciones no agrupadas por tipo → real explorer + grouping vía `DecorationManager`.
- `[in]` 2.6.A.2 — `explorerQueue` botón borrar individual → real explorer (UX estándar).
- `[in]` 2.6.A.3 — `viewDiff` no activo → wiring durante `explorerQueue` rewrite.
- `[in]` 2.6.A.10 — **Queue counter concurrency** (200+4=204) → `IOperationsIndex` separa contadores por op concurrent. Bug urgente del scope; origen de la rama `file-centric-queue`.
- `[in]` 2.6.A.12 — Operación falta archivos del nodo (205→202) → wiring fix durante `explorerQueue` rewrite.
- `[in]` 2.6.B.1 — `explorerActiveFilters` subtitle counter (filtros activos + archivos restantes) → real explorer.
- `[in]` 2.9.1 — `layoutTabs` separar lógica + unificar patrones → `tabContent` migration sienta el patrón; `navbarPages` agnóstico.
- `[in]` 3.3.1 — `explorerQueue` agrupación mal diseñada (DELETE_PROP) → cubierto por 2.6.A.1.
- `[in]` 3.3.2 — Desactivar `viewDiff` cierra `explorerQueue` → `OverlayState` corrige stack management.
- `[in]` Ghost `serviceMarks.ts` (subset) — sólo lo que el rewrite necesite tocar; resto a `post-rc.1`.
- `[adj]` 2.6.A.9 — Considerar 6 `serviceOps` disponibles en agrupación → wiring durante `explorerQueue` rewrite.
- `[adj]` 2.6.A.11 — Comunicación `panelLists` ↔ `explorerQueue` (count mismatch) → real explorer fija el wire.
- `[adj]` Ghost `navbarTabs` — alias mental, ya existe como `navbarPages.svelte`. Mention en commits/comentarios.

### A.5 — Settings

Sin items adicionales del v1.0 scope. Settings nuevos derivados del backlog (default order por explorer, default config marks) caen en `out-hardening` UX Features porque tras A.5 el shape del settings ya es declarativo y agregarlos no requiere arquitectura.

### A.6 — Sub-B Audit (efectos colaterales del triage)

- Limpiar referencia a `BasesCheckboxInjector` en `CONTRIBUTING.md` (única ocurrencia restante; archivo ya borrado del working tree).
- Reporte `dead-code-report.md` debe surfacear cualquier item del triage marcado `out-hardening` o `post-rc.1` cuyo código asociado sea ya muerto.

### A.7 — Sub-C Tests (nuevos tests obligatorios para `in-hardening` items)

- Tests para `serviceSorting` (cobertura sort by date + categorías sort) — Iter C.3.
- Tests para `logicExplorer` (search, expansion, selection runes) — Iter C.4 (después de A.4.1 lo crea, según ADR-003 + spec sec 4.5).
- Tests para `serviceExplorer` (orquestación filterService + index + decoración) — Iter C.4 misma condición.
- Tests para `Virtualizer<T>` actualizado a genérico — Iter C.4.

> Nota: la mayoría de los tests para archivos creados en Sub-A se escriben dentro de Sub-A junto al código, no antes (ver spec sec 4.5). Sub-C cubre lo existente al cierre de Sub-B.

---

## Annex B — Proyectos sucesores

### B.0 Vision statement

> **Vaultman as supervised bulk-ops harness for AI agents.**
>
> Diferenciador vendible para v1.1+. Los agentes IA hoy ejecutan bulk ops (rename, retag, frontmatter rewrite) sin preview ni confirmación. Vaultman ya tiene `OperationQueue` + scope display + await confirm: justo el UX que esos agentes carecen. La rama `Programmable Interface` (sub-bloque B.4) cristaliza esta tesis vía `serviceAPI` + Agent Guardrail Skill.
>
> Hardening prepara el terreno (`contracts.ts` como contrato público). Polish lo entrega.

### B.1 v1.0 Polish (proyecto sucesor inmediato de Hardening)

Estructura: 4 sub-bloques. Los 3 primeros son independientes de `serviceAPI`; el 4º depende de `contracts.ts` de hardening.

#### B.1.1 Bases Feature Parity (sin serviceAPI)

Cubre las gaps que Vaultman tiene vs Bases nativo o codeblock equivalente. Internal a Vaultman; no expone API pública.

| Feature | Origen triage |
|---|---|
| Range filters (props tipo fechas, "entre {v1} y {v2}") | 2.6.B.5 |
| `viewTable` excel-like grid (celdas editables, markdown rendering) | 2.3.B.8 |
| "All files in folder" filter | 2.6.B.8 |
| Logical filter syntax (all/any/none + manual) | 2.6.B.2, 2.6.B.7 |
| Toggle row group/auto/manual | 2.6.B.3 |

#### B.1.2 Theming (sin serviceAPI)

Variantes de presentación. No toca lógica.

| Variante | Origen triage |
|---|---|
| **Minimal** (sin blur overlays ni botones redondos) | 2.7.A.2 |
| **Default fancy** (estado actual congelado) | — |
| Variantes futuras (a definir cuando se entre al sub-bloque) | — |

#### B.1.3 UX Features (sin serviceAPI)

El sub-bloque más grande del Polish. Items que no son arquitectónicos pero sí pulido funcional importante.

| Bloque UX | Items triage |
|---|---|
| `navKeyboard` (flechas + multi-select Ctrl/Shift/CMD) | 2.3.A.1, 2.3.A.2 |
| `layoutNav.svelte` (common file con setting "swap navbar positions / FAB visibility / tab order") | 2.7.1, 2.7.2, 2.7.B.3 |
| `serviceDnD` (filtros, navbarPages, listFilters, navbarPages a Workspace) | 2.6.B.6, 2.7.B.2 |
| Multi-select modifiers | 2.3.A.2 |
| Auto-scroll / auto-reveal current file | 2.2.E.4, 2.3.B.4 |
| Inline rename (input encima del nodo) | 2.3.F.2 |
| `explorerOutline` (replacement de native outline + DnD smart move) | 2.11.1, 2.11.2 |
| `viewDiff` snippet vs full (full = integration con Git/File Diff plugins) | 3.3.3 |
| Empty states ("No se encontraron archivos") | 2.3.4 |
| "Coming Soon" overlays para módulos placeholder | 2.5.B.1 |
| `menuView` redesign completo (filas + columnas + toggles) | 2.2.D.2 a 2.2.D.10 |
| `menuSort` redesign (dropDy → pillsY, default order, position) | 2.2.E.3 a 2.2.E.6 |
| `navbarExplorer` design + layout pulido | 2.2.A.3, 2.2.A.4, 2.2.B.1 a 2.2.B.3 |
| `panelLists` CSS detalles (último/primer nodo bajo navbar) | 2.3.6, 2.3.7 |
| `navbarPillFab` icon swap a X + responsive | 2.7.A.1, 2.7.A.3 |
| `navbarPages` icon-only fallback | 2.7.B.1 |
| `popupIsland` max-width + UX queue (verbos, mobile) | 2.6.1, 2.6.A.5 a 2.6.A.8 |
| `listFilters` UX (apply→edit, range UI) | 2.6.B.4 |
| `tabContent` UX (boxInput grande, responsivo) | 2.4.2, 2.4.3 |
| `viewTree` jerarquía folders dentro de folders | 2.3.F.1 |
| `explorerFiles` features (no-notes, broken links, default view, modeExplorer behaviors) | 2.3.B.1 a 2.3.B.7 |
| Settings: orden por defecto por explorer | 2.13.3 |

#### B.1.4 Programmable Interface (DEPENDE de `contracts.ts`)

El sub-bloque vendible. Sólo se puede empezar después de cerrar Hardening.

| Componente | Tipo | Origen triage |
|---|---|---|
| **`serviceAPI`** (foundation) | Expone interfaces de hardening (`INodeIndex`, `IFilterService`, `IOperationQueue`, etc.) como API público. | 2.12.1 |
| **Bases I/O text** (consumer) | Parse/emit `.base` files vía texto, ya que API pública de Bases no existe. Usa skill `obsidian-bases` + docs oficiales como referencia. | 2.5.A.2 |
| **Agent Guardrail Skill** (consumer) | Skill via obsidian-cli que usa `serviceFilter`/`serviceQueue`/Ops como guardrail para AI agents. Ej: "tag todos files en drafts/" → Vaultman muestra changes + scope → user confirma → ejecuta cola. | (vision statement) |

### B.2 Post-rc.1 (más allá de Polish)

Items diferidos a v1.0+1 o más adelante. No se trabajan en Polish.

| Feature | Origen triage |
|---|---|
| `serviceMarks.ts` (Templates module) | ghost |
| `tabLinter` (replacement "this file properties") | 2.5.B.3 |
| `tabMarks` panel control + default config | 2.5.A.1, 2.5.A.3 |
| Manual sort via marks | 2.10.2 |
| Templates default config en settings | 2.13.4 |
| `explorerSnippets` / `explorerTemplates` con consumer real (tras setup de Templater) | (sólo stubs en v1.0) |

### B.3 Cancelled (referencia)

| Item | Fecha cancel | Razón |
|---|---|---|
| `dropDy` desplazamiento al activar drawer | 2026-04-18 | Usuario decidió no perseguir. |
| `btnToggle/btnDrawer` exageradamente pequeños | 2026-04-18 | Usuario decidió no perseguir. |

---
