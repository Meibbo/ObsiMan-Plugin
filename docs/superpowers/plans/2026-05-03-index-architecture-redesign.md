# Plan de Ejecución: Architecture Redesign - Index Consolidation (2026-05-03)

## Pre-requisitos y Referencias
- `docs/specs/index-architecture-redesign.md`: Especificación técnica.
- `docs/specs/filter-architecture-redesign.md`: Patrón de diseño para estado reactivo.

## Fase 1: Fortalecimiento del Índice Nuevo
- [ ] **1.1. Refinar Contratos**: Actualizar `PropNode` en `src/types/contracts.ts` para soportar metadatos completos (frecuencias de valores y tipos).
- [ ] **1.2. Implementar Lógica en `indexProps.ts`**: Migrar la lógica de conteo de `logicProps.ts` al índice reactivo para que se ejecute una sola vez.

## Fase 2: Reconexión de la Vista (Rising Glass Architecture)
- [ ] **2.1. Adaptar `PropsLogic.ts`**: Eliminar el escaneo interno del vault. Hacer que reciba un `IPropsIndex` y actúe como transformador para el árbol visual.
- [ ] **2.2. Inyectar Índice**: Asegurar que `explorerProps.ts` use el `plugin.propsIndex`.

## Fase 3: Demolición de Código Legado (Cleanup)
- [ ] **3.1. Eliminar Modals Obsoletos**:
    - `src/modals/modalPropertyManager.ts`
    - `src/modals/modalFileRename.ts`
- [ ] **3.2. Limpiar `main.ts`**: Quitar referencias a `PropertyIndexService` y su inicialización.
- [ ] **3.3. Borrar archivos físicos**: Eliminar `src/index/utilPropIndex.ts`.

## Fase 4: Verificación
- [ ] **4.1. CI Check**: Correr `pnpm run verify`.
- [ ] **4.2. Reactivity Check**: Verificar en Obsidian que al cambiar un frontmatter, la vista de propiedades se actualiza automáticamente a través del nuevo índice.
