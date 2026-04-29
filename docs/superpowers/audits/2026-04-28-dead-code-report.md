# Dead Code Report — 2026-04-28

> **Tipo**: Reporte de dead code (Iter B.1).
> **Fecha**: 2026-04-28
> **Branch**: `hardening-audit`
> **Tools**: ts-prune 0.10.3, knip 6.8.0, depcheck 1.4.7, svelte-check 4.1.0.
> **Spec referencia**: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md` sec 3.

## Cómo confirmar items

Marca cada ítem con `[x] keep`, `[x] delete`, o `[x] defer (razón)` directamente en este archivo.
- `delete` requiere comentar si afecta a funcionalidad WIP o a roadmap (Annex A/B del spec).
- `defer` = mover a backlog sin borrar código.
- Tras marcar, devolver el archivo al agente que ejecuta Iter B.2.
- Items pre-confirmados (sec final) NO requieren marca; se borran de oficio.

## Estadísticas

| Categoría | Items detectados | Pre-confirmados | Pendientes confirmación |
|---|---|---|---|
| Dead exports | 14 | 0 | 14 |
| Archivos huérfanos | 8 | 0 | 8 |
| WIP files | 5 | 3 (keep) | 2 (consultar) |
| Transitive dead funcs | 3 | 0 | 3 |
| Props no leídos en `.svelte` | 3 | 0 | 3 |
| Imports no usados | ver sec 6 | 0 | auto-fix |
| Deps `package.json` no usadas | 3 | 0 | 3 |
| Tipos no referenciados | 9 | 0 | 9 |
| `TODO`/`FIXME` antiguos sin issue | — | — | (sólo lista) |
| Branches imposibles | 0 | 0 | 0 |
| Items derivados del triage v1.0 | 3 | 0 | 3 |
| **Total** | **~48** | 1 (ref CONTRIBUTING.md) | **~47** |

---

## 1. Dead exports (ts-prune + knip)

> Exports detectados por ts-prune y/o knip que no tienen consumidores externos.
> Items marcados `(used in module)` en ts-prune = exportados innecesariamente pero usados internamente.

| # | Archivo | Símbolo | Detección | Notas | Decisión |
|---|---|---|---|---|---|
| 1.1 | `src/components/componentStatusBar.ts:15` | `StatusBarComponent` | ts-prune | Archivo orphan (ver sec 2). Probablemente sin uso. | [ ] keep / [ ] delete / [ ] defer |
| 1.2 | `src/i18n/index.ts:41` | `setLanguage` | ts-prune + knip | Setter de idioma; puede que se consuma desde settings. Verificar. | [ ] keep / [ ] delete / [ ] defer |
| 1.3 | `src/i18n/index.ts:45` | `getLanguage` | ts-prune + knip | Getter de idioma. Mismo caso que 1.2. | [ ] keep / [ ] delete / [ ] defer |
| 1.4 | `src/logic/logicFilters.ts:14` | `ActiveFiltersIslandComponent` | ts-prune | Componente de isla de filtros activos. Puede ser referenciado desde Svelte sin import tipado. | [ ] keep / [ ] delete / [ ] defer |
| 1.5 | `src/logic/logicQueue.ts:20` | `QueueIslandComponent` | ts-prune | Componente de isla de cola. Mismo caso. | [ ] keep / [ ] delete / [ ] defer |
| 1.6 | `src/modals/modalAddFilter.ts:13` | `AddFilterModal` | ts-prune | Archivo orphan (ver sec 2). Modal sin registrar en main.ts. | [ ] keep / [ ] delete / [ ] defer |
| 1.7 | `src/modals/modalLinter.ts:13` | `LinterModal` | ts-prune | Archivo orphan (ver sec 2). Modal Linter. Ver sec 11 (triage post-rc.1). | [ ] keep / [ ] delete / [ ] defer |
| 1.8 | `src/modals/modalQueueDetails.ts:19` | `QueueDetailsModal` | ts-prune | Modal de detalles de cola. Verificar si se abre desde algún componente. | [ ] keep / [ ] delete / [ ] defer |
| 1.9 | `src/services/serviceDiff.ts:107` | `buildOperationDiff` | ts-prune + knip | Función de diff de operación. `diffFm` y `buildFileDiff` también en knip. | [ ] keep / [ ] delete / [ ] defer |
| 1.10 | `src/services/serviceVirtualizer.ts:37` | `TreeVirtualizer` | ts-prune | Virtualizer especializado para árbol. Puede estar planeado para uso. | [ ] keep / [ ] delete / [ ] defer |
| 1.11 | `src/types/typePrimitives.ts:3` | `PopupType` | ts-prune | Tipo de popup. Archivo nuevo (reemplaza typeUI.ts). Puede ser WIP. | [ ] keep / [ ] delete / [ ] defer |
| 1.12 | `src/types/typePrimitives.ts:11` | `defOpsTab` | ts-prune | Valor por defecto de tab. | [ ] keep / [ ] delete / [ ] defer |
| 1.13 | `src/types/typePrimitives.ts:33` | `FabDef` | ts-prune | Definición de FAB button. | [ ] keep / [ ] delete / [ ] defer |
| 1.14 | `src/components/containers/panelCurator.ts:14` | `MenuCuratorPanel` | ts-prune | Panel curador. Verificar si existe consumer Svelte. | [ ] keep / [ ] delete / [ ] defer |

**Knip también reporta como unused exports** (no en ts-prune como "no-module"):
- `src/services/serviceDiff.ts`: `diffFm`, `buildFileDiff` (knip unique — ts-prune los marca "used in module")
- `src/services/serviceQueue.ts`: `serializeFile` (knip unique)
- `src/services/serviceVirtualizer.ts`: `Virtualizer` (knip unique — ts-prune "used in module")

Estos 4 adicionales son candidatos a `defer` (usados internamente, export innecesario pero no dañino).

---

## 2. Archivos huérfanos (knip)

> Archivos sin ningún import desde el resto del proyecto (excluidos WIP files — ver sec 3).

| # | Archivo | Notas | Decisión |
|---|---|---|---|
| 2.1 | `src/components/componentStatusBar.ts` | Status bar component. No importado desde ningún archivo. Puede ser legado. | [ ] keep / [ ] delete / [ ] defer |
| 2.2 | `src/components/containers/panelContent.svelte` | Panel de contenido. Posiblemente desconectado tras refactor de Sessions 40-41. | [ ] keep / [ ] delete / [ ] defer |
| 2.3 | `src/components/pages/tabContent.svelte` | Tab de contenido (Find & Replace). In-hardening Sub-A.4.2 — debe migrar a IContentIndex. Marcar `defer`. | [ ] keep / [ ] delete / [ ] defer |
| 2.4 | `src/components/pages/tabLinter.svelte` | Tab Linter. Triage: `post-rc.1` (2.5.B.3). Ver sec 11. | [ ] keep / [ ] delete / [ ] defer |
| 2.5 | `src/modals/modalAddFilter.ts` | Modal para agregar filtros. Sin import desde componentes activos. | [ ] keep / [ ] delete / [ ] defer |
| 2.6 | `src/modals/modalLinter.ts` | Modal del Linter. Relacionado con tabLinter (sec 11). | [ ] keep / [ ] delete / [ ] defer |
| 2.7 | `src/svelte.d.ts` | Declaración de tipos para Svelte. Puede que no sea necesaria si svelte-check funciona vía tsconfig. | [ ] keep / [ ] delete / [ ] defer |
| 2.8 | `src/utils/dropDAutoSuggestionInput.ts` | Input de autosugerencia con dropdown. Sin consumer. | [ ] keep / [ ] delete / [ ] defer |

---

## 3. WIP files (glob `*-WIP*` / `*_WIP*`)

> Decisión sugerida tomada de spec sec 3.2. CHECKPOINT 2 confirma los marcados "consultar" antes de aplicar.

| # | Archivo | Decisión sugerida | Razón sugerida | Decisión final |
|---|---|---|---|---|
| 3.1 | `src/services/serviceNavigation-WIP.svelte.ts` | **keep** | Base del Router rune en Sub-A.2 | [x] keep |
| 3.2 | `src/services/serviceStats-WIP.svelte.ts` | consultar | Sin mención en specs | [ ] keep / [ ] rename / [ ] delete |
| 3.3 | `src/services/serviceLayout-WIP.svelte.ts` | consultar | Sin mención clara | [ ] keep / [ ] rename / [ ] delete |
| 3.4 | `src/services/serviceDecorate_WIP.ts` | **keep** | DecorationManager en Sub-A.4 | [x] keep |
| 3.5 | `src/components/layout/popupIsland_WIP.svelte` | **keep** | Unificación islas en Sub-A.4 | [x] keep |

> Items 3.1, 3.4, 3.5 ya marcados `keep` — pre-confirmados por spec sec 3.2.
> Items 3.2 y 3.3 requieren CHECKPOINT 2 con el usuario.

---

## 4. Transitive dead code (manual inference)

> Funciones/clases que sólo son usadas por archivos orphan (sec 2), formando una cadena muerta.

| # | Archivo | Símbolo | Depende de orphan | Notas | Decisión |
|---|---|---|---|---|---|
| 4.1 | `src/services/serviceDiff.ts` | `buildOperationDiff` (línea ~107) | N/A — servicio activo | Export muerto pero servicio usado. Considerar como dead export (sec 1.9). | [ ] keep / [ ] delete / [ ] defer |
| 4.2 | `src/types/typePrimitives.ts` | `ContentSnippet` (línea ~17) | Orphaned — planificado | Referenciado en settings shape pero sin consumer real. Candidato a cleanup. | [ ] keep / [ ] delete / [ ] defer |
| 4.3 | `src/utils/dropDAutoSuggestionInput.ts` | `attachDropDAutoSuggestionInput` + tipos | Archivo orphan (sec 2.8) | Si 2.8 se borra, esta función muere con él. Resolver junto con 2.8. | [ ] keep / [ ] delete / [ ] defer |

---

## 5. Props no leídos en `.svelte` (svelte-check)

> Variables declaradas en componentes Svelte que nunca se leen.

| # | Archivo | Variable | Línea | Notas | Decisión |
|---|---|---|---|---|---|
| 5.1 | `src/components/layout/navbarExplorer.svelte` | `currentViewMode` | 64 | Puede ser prop de entrada no consumida localmente. | [ ] keep / [ ] delete / [ ] defer |
| 5.2 | `src/components/frameVaultman.svelte` | `_setViewMode` | 559 | Prefijo `_` indica intención de "private/unused". | [ ] keep / [ ] delete / [ ] defer |
| 5.3 | `src/components/frameVaultman.svelte` | `_openMovePopup` | 663 | Mismo patrón `_` prefijo. | [ ] keep / [ ] delete / [ ] defer |

---

## 6. Imports no usados (eslint-plugin-unused-imports)

> Se aplica auto-fix en Iter B.2 Task 25. No requiere decisión manual.
> Listado informativo: los archivos con imports no usados son detectables via `npm run lint`.
> svelte-check no reportó warnings de imports; eslint los detectará al aplicar el plugin.

**Acción**: auto-fix en Task 25. Si fix rompe build → revert archivo afectado + anotar aquí.

---

## 7. Deps `package.json` no usadas

> De `depcheck.txt`. Filtradas para excluir wdio/test packages (conocidos falsos-positivos).
> esbuild-* son usados en `esbuild.config.mjs` — depcheck no parsea `.mjs` correctamente.

| # | Dep | Tipo | Detección | Notas | Decisión |
|---|---|---|---|---|---|
| 7.1 | `eslint-plugin-unused-imports` | devDep | depcheck + knip | Usado vía ESLint API, no via import directo. Falso positivo de depcheck. | [x] keep |
| 7.2 | `esbuild`, `esbuild-sass-plugin`, `esbuild-svelte` | devDep | depcheck | Usados en `esbuild.config.mjs` — depcheck no parsea `.mjs`. Falso positivo. | [x] keep |
| 7.3 | `eslint` | Missing dep | depcheck | Usado en `eslint.config.mts` como peer dep de typescript-eslint. No requiere dep explícita. | [x] keep (no acción) |

> **Resultado**: Sin deps genuinamente muertas. Todas las flags de depcheck son falsos positivos.
> Las wdio packages están en `knip.json ignoreDependencies` y se excluyen del análisis.

---

## 8. Tipos no referenciados (knip)

> Tipos exportados sin consumidores externos.

| # | Archivo | Tipo | Notas | Decisión |
|---|---|---|---|---|
| 8.1 | `src/components/componentQueueList.ts` | `QueueListCallbacks` | Interfaz de callbacks del queue list. | [ ] keep / [ ] delete / [ ] defer |
| 8.2 | `src/services/serviceCMenu.ts` | `ContextMenuPluginCtx` | Contexto del context menu. Puede ser usado internamente. | [ ] keep / [ ] delete / [ ] defer |
| 8.3 | `src/services/serviceDiff.ts` | `FmChangeKind`, `FmDelta`, `BodyHunkLine`, `BodyHunk` | Tipos del sistema de diff. Usados internamente (`used in module`) pero sin export externo. | [ ] keep / [ ] delete / [ ] defer |
| 8.4 | `src/services/serviceVirtualizer.ts` | `FlatNode`, `VirtualWindow` | Tipos del virtualizer. Candidatos a hacer internos (no exportar). | [ ] keep / [ ] delete / [ ] defer |
| 8.5 | `src/types/typeFilter.ts` | `FilterType`, `GroupLogic` | Tipos de filtros. Pueden ser usados en runtime sin import tipado. | [ ] keep / [ ] delete / [ ] defer |
| 8.6 | `src/types/typeOps.ts` | `BaseChange`, `ContentChange`, `FileChange`, `TagChange` | Tipos de operaciones. `used in module` — export probablemente innecesario pero tipos activos. | [ ] keep / [ ] delete / [ ] defer |
| 8.7 | `src/types/typePrimitives.ts` | `OpsTab`, `ContentSnippet`, `ContentPreviewResult` | Tipos nuevos (reemplaza typeUI.ts). Algunos pueden ser WIP. `ContentSnippet` candidato a borrar (ver sec 4.2). | [ ] keep / [ ] delete / [ ] defer |
| 8.8 | `src/types/typeTree.ts` | `NodeBadge` | Tipo de badge en nodo de árbol. Puede estar planeado para DecorationManager. | [ ] keep / [ ] delete / [ ] defer |
| 8.9 | `src/utils/filter-evaluator.ts` | `MetadataGetter` | Tipo interno del evaluador. `used in module`. | [ ] keep / [ ] delete / [ ] defer |

---

## 9. TODO/FIXME antiguos sin issue (grep)

> Sólo listado — no se borra.

*(Requiere grep post-Checkpoint — sección a rellenar en Iter B.2 si el agente lo ejecuta.)*

Comando para completar en Task 24:
```powershell
Select-String -Path "src/**/*.ts","src/**/*.svelte" -Pattern "TODO|FIXME|XXX" -Recurse
```

---

## 10. Branches imposibles

No se encontraron patrones `if (false)` o dead branches en búsqueda manual. Sección vacía.

---

## 11. Items derivados del triage v1.0

> Items de `docs/superpowers/triage/2026-04-28-v100-scope-triage.md` clasificados `out-hardening` o `post-rc.1` cuyo código asociado existe y puede ser dead code en `hardening-audit`.

| # | Item triage | Categoría triage | Archivo asociado | Estado verificado | Decisión |
|---|---|---|---|---|---|
| 11.1 | 2.5.B.3 — `tabLinter` (replacement "this file properties") | post-rc.1 | `src/components/pages/tabLinter.svelte` | **Existe + orphan** (knip sec 2.4) | [ ] keep / [ ] delete / [ ] defer |
| 11.2 | 2.5.B.3 related — `modalLinter.ts` | post-rc.1 | `src/modals/modalLinter.ts` | **Existe + orphan** (knip sec 2.6) | [ ] keep / [ ] delete / [ ] defer |
| 11.3 | ghost `serviceMarks.ts` — Templates module | post-rc.1 | (no existe en src/) | **No existe** — correctamente clasificado como ghost/post-rc.1 | N/A |

> Items `navKeyboard`, `serviceDnD`, `explorerOutline`, `layoutNav.svelte`, `serviceAPI`: NO existen en `src/`. Son trabajo futuro planeado, no dead code presente. No requieren acción en Sub-B.

---

## Items pre-confirmados (delete sin más confirmación)

> Aprobados por usuario en HANDOFF + spec sec 3.2.

- **Referencia a `BasesCheckboxInjector`** en `CONTRIBUTING.md`. El archivo `src/services/BasesCheckboxInjector.ts` ya está borrado del working tree (verificado 2026-04-28); sólo queda esta referencia en docs. Aplicar en commit `chore(audit): remove BasesCheckboxInjector references from CONTRIBUTING.md` (Task 26).

---

## Cross-references

- Spec maestra: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md` sec 3.
- Triage v1.0: `docs/superpowers/triage/2026-04-28-v100-scope-triage.md`.
- Indexing inventory hermano: `docs/superpowers/audits/2026-04-28-indexing-inventory.md`.
- Raw scans: `docs/superpowers/audits/raw/`.
