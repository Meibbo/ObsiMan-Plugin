> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - CSS Refactor Spec - Part 5
## Scope: Lines 4001-4932 (End) of `styles-OLD.css`

Este bloque final contiene la lógica de visualización de datos masivos, el motor de virtualización y los paneles de curación de menús.

---

## 1. Módulo: `_tree.scss` (Árbol Unificado: 4002-4161)
Es el componente más usado en el plugin (Tags, Propiedades, Archivos).
- **Guías Jerárquicas**: Usar el pseudo-elemento `::before` con cálculo dinámico basado en `--depth`.
- **Estados de Fila**: 
  - Anidar `.is-active-filter` (usando `box-shadow: inset` para no alterar el layout).
  - Agrupar estados de eliminación (`.is-deleted-prop`, `&-value`, `&-tag`) bajo una sola lógica de `text-decoration: line-through`.
- **Edición Inline**: Centralizar `.vm-tree-input` y sus estados de focus con `box-shadow`.

---

## 2. Módulo: `_virtual-list.scss` (ViewTree Logic: 4200-4246)
Lógica específica para listas de alto rendimiento.
- **Estructura**:
  - `vm-tree-virtual-outer`: Contenedor con `contain: strict`.
  - `vm-tree-virtual-row`: Posicionamiento absoluto anidado que usa `will-change: transform`.
- **Estrategia**: Mantener este archivo separado ya que es pura lógica de rendimiento, no estética.

---

## 3. Módulo: `_curator.scss` (Panel de Contexto: 4248-4316)
UI para la gestión de reglas de menús.
- **Acción**: Agrupar `.vm-curator-rule`, `&-text` y los botones de borrado.
- **Formulario**: Anidar la lógica de `flex-wrap` para el formulario de añadido de reglas.

---

## 4. Módulo: `_diff-view.scss` (Ampliación: 4421-4586)
El visor de diferencias avanzado (Hunks y líneas).
- **Estructura de Diff**:
  - Anidar `.vm-viewdiff-line` con sus variantes `.is-add` y `.is-del`.
  - Usar fuentes monoespaciadas (`var(--font-monospace)`) heredadas de Obsidian.
  - Agrupar `.vm-viewdiff-delta` para los cambios a nivel de propiedad Frontmatter.

---

## 5. Módulo: `_v3-popups.scss` (Sort y Header Popups: 4648-4932)
La cúspide de la UI Nivel 4.
- **Sort Popup**:
  - `vm-sort-vertcol`: La tira vertical de botones de tipo de orden.
  - `vm-sort-vertcol-drawer`: Un menú oscuro especial (`background: #12101a`). Esto debe ser un bloque anidado muy específico.
- **Slide Animations**: Mover los `@keyframes` de `slide-in-from-left/right` a `_animations.scss`.
- **Slot System**: La clase `.vm-filters-popup-slot` para gestionar el intercambio de cabeceras.

---

## Conclusión Final del CSS Refactor Spec
Con la Parte 5 completada, tenemos el mapa total de Vaultman. Esta última sección es la que garantiza que el plugin sea **escalable** (gracias a la virtualización) y **preciso** (gracias al sistema de árboles y líneas de jerarquía). 

Al migrar esto a SASS, la lógica de las líneas de profundidad del árbol (`--depth`) se volverá mucho más legible y fácil de mantener.
