# Indexing Inventory — 2026-04-28

> **Tipo**: Reconnaissance del estado actual de indexing por tipo de nodo (Iter B.1).
> **Fecha**: 2026-04-28
> **Branch**: `hardening-audit`
> **Input para**: Sub-A.2 (factory + indices) en proyecto Vaultman Hardening.
> **Spec referencia**: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md` sec 3.2 + sec 5.4 + Annex A.6.

## Tipos de nodo cubiertos

1. Files
2. Tags
3. Properties
4. Content
5. CSS Snippets
6. Operations
7. Templates
8. ActiveFilters

## Tabla maestra

| Tipo de nodo | Archivo origen | Transformación | Consumidores principales | Shape de datos |
|---|---|---|---|---|
| Files | `src/services/serviceFilter.ts` | `vault.getMarkdownFiles()` → filter tree → `filteredFiles: TFile[]` | `explorerFiles.ts`, `serviceQueue.ts`, modals | `TFile[]` |
| Tags | `src/components/containers/explorerTags.ts` | Itera vault → frontmatter → árbol jerárquico | `logicTags.ts`, `filter-evaluator.ts`, `serviceFilter.ts` | `TreeNode<TagMeta>[]` |
| Properties | `src/utils/utilPropIndex.ts` | `metadataCache` events → `Map<string, Set<string>>` debounced 50ms | `explorerProps.ts`, modals, `logicProps.ts` | `Map<string, Set<string>>` |
| Content | (sin index dedicado) | `vault.read()` ad-hoc en `serviceQueue.ts` | `serviceQueue.ts`, `explorerProps.ts` | `{ fm, body }` inline |
| CSS Snippets | (sin index, sin consumer) | — | — | `ContentSnippet[]` (orphaned) |
| Operations | `src/services/serviceQueue.ts` | `.add()` → `Map<path, VirtualFileState>` → `.execute()` | `logicQueue.ts`, explorers (Files/Props/Tags), `componentQueueList.ts` | `Map<string, VirtualFileState>` |
| Templates | `src/services/serviceFilter.ts` | FilterGroup serializado a `FilterTemplate[]` en settings | `logicFilters.ts`, `modalSaveTemplate.ts` | `FilterTemplate[]` |
| ActiveFilters | `src/services/serviceFilter.ts` | `FilterGroup` tree → `applyFilters()` → `filteredFiles` | `logicFilters.ts`, explorers (Files/Tags/Props), `serviceCMenu.ts` | `FilterGroup` (tree) + `TFile[]` (materializado) |

## Notas por tipo

---

### Files

- **Archivo origen**: `src/services/serviceFilter.ts` (class `FilterService`, línea ~10-18)
- **API Obsidian usada**: `vault.getMarkdownFiles()` (línea ~247)
- **Transformación**: Filtra todos los archivos markdown a través del árbol de filtros activo y términos de búsqueda (nombre/carpeta). Emite eventos de cambio cuando el conjunto filtrado se actualiza.
- **Consumidores**:
  - `src/components/containers/explorerFiles.ts:80` — `getTree()` construye árbol jerárquico con sorting e íconos de carpeta
  - `src/components/containers/explorerFiles.ts:94` — `getFiles()` retorna lista plana de archivos filtrados
  - `src/services/serviceQueue.ts:280` — scope resolution de operaciones
  - `src/modals/modalFileRename.ts`, `modalFileMove.ts`, `modalLinter.ts` — operaciones batch sobre archivos seleccionados
- **Shape de datos**: `TFile[]` (Obsidian API), filtrado en `filteredFiles: TFile[]`
- **Notas**: No hay full-text content index; filtros operan sólo sobre frontmatter/tags. Propiedad `queue` (línea 63) retorna array vacío — shim de retrocompatibilidad. Sub-A.2.1 extrae lógica a `serviceFilesIndex.ts`.

---

### Tags

- **Archivo origen**: `src/components/containers/explorerTags.ts` (class `explorerTags`)
- **API Obsidian usada**: `getAllTags()` desde `obsidian` (vía `filter-evaluator.ts`); iteración de vault vía `vault.getMarkdownFiles()` (línea ~160)
- **Transformación**: Itera todos los archivos markdown, extrae valores de tags del frontmatter, construye árbol jerárquico con estructura parent/child.
- **Consumidores**:
  - `src/logic/logicTags.ts` — `TagsLogic` administra construcción y filtrado del árbol
  - `src/utils/filter-evaluator.ts:148` — evalúa reglas `has_tag` contra frontmatter
  - `src/components/containers/explorerTags.ts:160-167` — operación `bulkDelete` vía `processFrontMatter`
  - `src/services/serviceFilter.ts:106-126` — `removeNodeByTag()` para manipulación del árbol de filtros
- **Shape de datos**: `TreeNode<TagMeta>[]` donde `TagMeta = { tagPath: string }` (typeTree.ts:26-28)
- **Notas**: Sin cache dedicado de tags; computado on-demand por cada render del árbol. Eliminación de tags es destructiva (processFrontMatter). Sub-A.2.1 introduce `serviceTagsIndex.ts` con cache.

---

### Properties

- **Archivo origen**: `src/utils/utilPropIndex.ts` (class `PropertyIndexService`)
- **API Obsidian usada**: `metadataCache.getFileCache()` (línea ~79), `metadataCache.on('changed')` (línea ~43), `metadataCache.on('resolved')` (línea ~36), `vault.getMarkdownFiles()` (línea ~75)
- **Transformación**: Indexa todos los nombres y valores de frontmatter en el vault al cargar; mantiene `Map<string, Set<string>>` property→values. Actualización live debounced 50ms.
- **Consumidores**:
  - `src/main.ts:53,60` — instanciado y registrado como child en `VaultmanPlugin`
  - `src/components/containers/explorerProps.ts:98-106` — `PropsLogic` construye árbol de propiedades con valores
  - `src/modals/modalFileRename.ts:66` — autocomplete para nombres de propiedades
  - `src/modals/modalLinter.ts:74` — sugerencias de propiedades en filtros
  - `src/modals/modalPropertyManager.ts:83,176,219` — dropdown de valores de propiedades
  - `src/logic/logicProps.ts:78-80` — bridge a `getAllPropertyInfos()` de metadataCache
- **Shape de datos**: `{ index: Map<string, Set<string>>, fileCount: number }` (utilPropIndex.ts:8-12)
- **Notas**: Index es append-only entre rebuilds; valores borrados no se eliminan, sólo se elimina el tracking por archivo. `fileProperties` map habilita eliminación incremental al borrar archivos. Sub-A.2.1 renombra/refactoriza a `servicePropsIndex.ts` como implementación de `IPropsIndex`.

---

### Content

- **Archivo origen**: **Sin index dedicado.** Operaciones de contenido son explícitas por archivo.
- **API Obsidian usada**: `vault.read(file)` (async, `serviceQueue.ts` línea ~102)
- **Transformación**: Divide YAML frontmatter del body con regex (`splitYamlBody`, línea ~20 en serviceQueue.ts), aplica operaciones staged, reserializa con `stringifyYaml`.
- **Consumidores**:
  - `src/services/serviceQueue.ts:90-99` — `getOrCreateVFS()` hidrata body on-demand
  - `src/services/serviceQueue.ts:280+` — `execute()` procesa virtual file states y escribe de vuelta
  - `src/components/containers/explorerProps.ts:1` — `prepareSimpleSearch` importado pero no usado (posible dead code)
- **Shape de datos**: `{ fm: Record<string, unknown>, body: string }` de `splitYamlBody()`; estado completo en `VirtualFileState` (typeOps.ts:41-51)
- **Estado actual**: Sin index. Búsqueda ad-hoc por iteración de `TFile[]` + `vault.read()`. Sub-A.2.2 introduce `IContentIndex`.
- **Notas**: Find&Replace (FIND_REPLACE_CONTENT) es staged only; sin pre-computación. Hidratación del body es lazy (`bodyLoaded` flag, línea ~50).

---

### CSS Snippets

- **Archivo origen**: **Sin index, sin consumer.**
- **API Obsidian usada**: Ninguna encontrada en codebase. (`app.customCss.getSnippets()` no se usa.)
- **Transformación**: N/A
- **Consumidores**: `src/types/typePrimitives.ts:28` — campo `snippets: ContentSnippet[]` en settings, struct nunca usada.
- **Shape de datos**: `ContentSnippet[]` (tipo orphaned, probablemente de diseño previo)
- **Estado actual**: Sin index. Stub válido planeado en Sub-A.2.2 (`ICSSSnippetsIndex` cumple interfaz, sin consumer en v1.0).
- **Notas**: `ContentSnippet` en `typePrimitives.ts` es un tipo orphaned — candidato a dead code report.

---

### Operations

- **Archivo origen**: `src/services/serviceQueue.ts` (class `OperationQueueService`, línea ~50)
- **API Obsidian usada**: `vault.read()` (línea ~102), `fileManager.processFrontMatter()` (implícito en apply operations)
- **Transformación**: Acepta objetos `PendingChange` vía `.add()`, los stages en `VirtualFileState` transactions (`Map<path, VFS>`). Cada op staged se hidrata lazily y aplica atómicamente en `.execute()`.
- **Consumidores**:
  - `src/main.ts:41,55` — instanciado en `VaultmanPlugin`
  - `src/logic/logicQueue.ts:22,39,44` — `QueueIslandComponent` muestra y controla la cola
  - `src/components/containers/explorerFiles.ts:43,73,106` — `.add()` en acciones de usuario
  - `src/components/containers/explorerProps.ts:110,167,221+` — mutaciones de propiedades encoladas
  - `src/components/containers/explorerTags.ts:60,93` — operaciones de tags encoladas
  - `src/components/componentQueueList.ts:57` — `render()` para mostrar ops pendientes
- **Shape de datos**: `{ transactions: Map<string, VirtualFileState>, opCounter: number }` (serviceQueue.ts:54-55); `VirtualFileState` (typeOps.ts:41-51)
- **Notas**: Propiedad `queue` es shim de retrocompatibilidad retornando `[]` (línea 63-66); cola real en `transactions` Map. Sin event batching; cada `.add()` dispara evento 'changed' inmediatamente. Bug conocido: Queue counter concurrency (2.6.A.10) — `IOperationsIndex` lo resuelve en Sub-A.4.2.

---

### Templates

- **Archivo origen**: `src/services/serviceFilter.ts` (FilterService, líneas ~136-146)
- **API Obsidian usada**: Ninguna (serialización JSON pura de objetos JS)
- **Transformación**: Guarda árbol de filtros activo como JSON en settings (`filterTemplates: FilterTemplate[]`); carga por deep-clone asegurando IDs de nodo y flags `enabled`.
- **Consumidores**:
  - `src/main.ts` — parte de `VaultmanSettings` cargada/guardada vía `plugin.loadData()`
  - `src/logic/logicFilters.ts:55-59` — carga template desde menú al seleccionar
  - `src/modals/modalSaveTemplate.ts` — guarda filtro actual como template
  - `src/i18n/en.ts:34-38` — keys i18n para UI de templates
- **Shape de datos**: `FilterTemplate = { name: string, root: FilterGroup }` (typeFilter.ts:36-39)
- **Estado actual**: Templates = filter presets únicamente. Sin integración con Templater plugin ni expansión de variables. Stub de `ITemplatesIndex` planeado en Sub-A.2.2 (consumer real en v1.0+1).
- **Notas**: No confundir con "Templates" del backlog (Templater integration) — ese es `serviceMarks.ts` (post-rc.1).

---

### ActiveFilters

- **Archivo origen**: `src/services/serviceFilter.ts` (class `FilterService`, líneas ~14-15, ~149-170)
- **API Obsidian usada**: Ninguna (evaluación pura contra metadata vía `evalNode`)
- **Transformación**: Mantiene árbol `activeFilter: FilterGroup` y lo aplica a todos los archivos markdown vía `applyFilters()` (línea ~247+), evaluando reglas recursivamente con lógica AND/ANY/NONE. `getFlatRules()` lineariza el árbol para display en UI.
- **Consumidores**:
  - `src/logic/logicFilters.ts:14-110` — `ActiveFiltersIslandComponent` renderiza y muta árbol de filtros
  - `src/components/containers/explorerFiles.ts:80` — pasa resultado de `filteredFiles` al tree builder
  - `src/utils/filter-evaluator.ts` — `evalNode()` evalúa cada regla contra metadata del archivo
  - `src/services/serviceCMenu.ts:182-190` — filtrado de `activeRules` para context menu
  - Todos los explorer containers (Files, Tags, Props) consumen `plugin.filterService.filteredFiles`
- **Shape de datos**: `FilterGroup` (árbol) + `filteredFiles: TFile[]` (resultado materializado) (typeFilter.ts:17-23; serviceFilter.ts:18)
- **Notas**: Sin persistencia de archivos seleccionados entre sesiones (`selectedFiles` array es UI-only, línea ~20). Reglas se deshabilitan pero nunca se eliminan del árbol, sólo del DOM. Sin cache de resultados de evaluación; re-evaluación completa en cada cambio. Sub-A.4.2 introduce `explorerActiveFilters` como explorer real con `IActiveFiltersIndex`.

---

## Próximo uso

Este inventario es input directo de:
- **Sub-A.1** — `src/types/contracts.ts`: define `INodeIndex<T>` cubriendo el shape de cada tipo.
- **Sub-A.2.1** — Factory `createNodeIndex<T>` + indices base (Files, Tags, Props).
- **Sub-A.2.2** — Indices restantes (Content, Operations, ActiveFilters reales; CSSSnippets, Templates como stubs).

Cualquier discrepancia entre este inventario y la implementación de Sub-A debe disparar update del archivo.
