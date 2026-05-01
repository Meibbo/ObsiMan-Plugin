> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - CSS Refactor Spec - Part 2
## Scope: Lines 1001-2000 of `styles-OLD.css`

Este bloque se centra en los componentes estructurales avanzados, el sistema de Grid complejo y la integración con la UI de Obsidian Bases.

---

## 1. Módulo: `_layout.scss` (Continuación: 1001-1212)
Ampliación de los paneles laterales y la Navbar.
- **Operations Column (`.vm-ops-column`)**: 
  - **Estrategia**: Centralizar el control de ancho (`transition: width`) y anidar los estados `.is-collapsed`.
  - **Nesting**: Agrupar `.vm-ops-strip` (colapsado) y `.vm-ops-expanded` (expandido) como hijos directos.
- **Properties Panel (`.vm-properties-panel-right`)**:
  - Manejar el colapso mediante `&-collapsed`.
  - Anidar la "Toggle Strip" y el componente "Explorer Wrap".

---

## 2. Módulo: `_ops.scss` (Tabs y Layout: 1218-1354)
Refactorización del sistema de pestañas y el layout dividido.
- **Tabs System**:
  ```scss
  .vm-operations {
    &-tabs { display: flex; ... }
    &-tab {
      &:hover { ... }
      &.is-active { border-bottom-color: var(--vm-accent); }
      svg { width: 14px; }
    }
  }
  ```
- **Split Layout**: Agrupar `.vm-operations-top` y la sección `.vm-operations-pinned-queue` bajo una única jerarquía.

---

## 3. Módulo: `_shared.scss` (Toolbar y Popovers: 1356-1446)
Componentes genéricos reutilizables.
- **Toolbar**: Agrupar los botones y selectores bajo `.vm-toolbar`.
- **Sync Indicators**: Muy importante anidar los estados de color (`&-ok`, `&-external`, `&-conflict`) dentro de `.vm-sync-indicator`.
- **Popovers**: Crear una clase base `.vm-popover` que anide la cabecera y el estado oculto.

---

## 4. Módulo: `_grid.scss` (El "Peso Pesado": 1448-1672)
Este es el sistema más denso del plugin. La refactorización aquí reducirá cientos de líneas.
- **Estructura del Grid**:
  ```scss
  .vm-grid {
    &-wrapper { flex: 1; ... }
    &-header { display: flex; ... }
    &-table {
      border-collapse: collapse;
      thead { position: sticky; ... }
      &-wrapper { flex: 1; ... }
    }
    &-th {
      &-check { width: 30px; }
      &-sortable { 
        &:hover { ... }
        &.is-active { ... }
      }
    }
    &-row {
      &:hover { ... }
      &.is-selected { ... }
    }
    &-td {
      &-name { padding: 4px 8px; }
      &-prop { cursor: default; }
    }
  }
  ```
- **Inline Editing & Live Preview**: Anidar `.vm-grid-editing` y `.vm-grid-live-cell` para mantener la lógica de celdas agrupada.

---

## 5. Módulo: `_bases-integration.scss` (Arquitectura Sidebar: 1720-2000)
Lógica para la integración con el plugin Bases de Obsidian.
- **Toggle Bar**: Anidar el botón `&-btn` y sus estados de transición.
- **Sliding Panels**:
  - En lugar de repetir `left: 0`, `transform`, etc., usar anidación para los estados `.is-open`.
  - Archivo destinado a: `_bases-integration.scss`.
- **Media Queries (Touch Targets)**:
  - **Mejor práctica**: En lugar de tener una sección de media queries al final del archivo, anidaremos el `@media (pointer: coarse)` dentro de cada selector afectado (Navbar, Tabs, Grid) para mantener la coherencia.

---

## Conclusión de la Parte 2
Este bloque introduce el sistema de **Grid** y la **Bases Integration**, que son las partes más dinámicas del CSS. El paso de selectores planos a anidados nos permitirá ver visualmente la jerarquía de los componentes "Padre > Fila > Celda > Input", lo cual facilitará enormemente el debugging del rediseño Svelte.
