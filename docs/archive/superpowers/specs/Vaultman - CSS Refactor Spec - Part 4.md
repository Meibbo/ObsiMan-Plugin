> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - CSS Refactor Spec - Part 4
## Scope: Lines 3001-4000 of `styles-OLD.css`

Este bloque abarca el diseño principal de escritorio, las herramientas de edición de contenido (Find & Replace) y el sistema de Badges reactivos.

---

## 1. Módulo: `_main-layout.scss` (Líneas 3039-3134)
Define la estructura vertical para pantallas grandes.
- **Secciones (`.vm-main-section`)**:
  - Anidar estructuralmente `&-header`, `&-title`, `&-body`.
  - **Estado Colapsado**: Agrupar la lógica de ocultación de body bajo `&.is-collapsed`.
  - **Estrategia**: Usar Flexbox para que la sección central (`.vm-main-grid`) crezca mientras el header y footer se mantienen fijos.

---

## 2. Módulo: `_content-ops.scss` (Find & Replace: 3138-3227)
Estilos para la pestaña de búsqueda y reemplazo de contenido.
- **Find Row**: Anidar el input de búsqueda y los selectores de Regex/Case-sensitive.
- **Icon Toggle**: Crear un bloque `.vm-icon-toggle` con anidación de `:hover` y `.is-active`.
- **Preview Snippets**: 
  - Agrupar `.vm-content-preview-file` y `&-snippet`.
  - Anidar el tag `<mark>` para los resaltados de búsqueda dentro del snippet.

---

## 3. Módulo: `_prop-browser.scss` (Navegador de Reglas: 3230-3318)
El árbol de selección para crear reglas de filtrado complejas.
- **Estructura**: Anidar `.vm-prop-browser-row`, `&-name`, `&-count`.
- **Valores**: Agrupar la lista de valores subordinados bajo `&-values` y `&-value`.

---

## 4. Módulo: `_queue-island.scss` (Líneas 3381-3484)
La "isla" flotante que aparece sobre la barra de navegación.
- **Arquitectura de Isla**:
  - `vm-queue-island-wrap`: Contenedor absoluto de posición.
  - `vm-queue-island`: El cuerpo físico, anidando la animación de `transform` y `opacity` del estado `.is-open`.
  - `vm-queue-island-btns`: Los botones Squircle que flotan fuera del cuerpo (posicionamiento absoluto anidado).
  - `vm-queue-island-row`: Anidar los estados zebra (`:nth-child(odd)`) y los detalles del item.

---

## 5. Módulo: `_grid.scss` (Ampliación: 3488-3719)
Vistas alternativas de propiedades (Chips y Cards).
- **Values Chips**: Anidar `.vm-grid-value-chip`, con su texto, contador y estado `.is-active-filter`.
- **Cards View (`.vm-card`)**:
  - Anidar el icono, título y los stats.
  - **Card Drilldown**: Agrupar el botón "Back" y el título del detalle bajo una sola jerarquía.

---

## 6. Módulo: `_badges.scss` (Sistema de Colores: 3722-3800)
Este es el mejor ejemplo de optimización SASS.
- **Acción**: Reemplazar las reglas manuales `--blue`, `--red`, etc., con un bucle.
- **SASS Loop**:
  ```scss
  .vm-badge {
    display: inline-flex;
    // ... base styles
    $badge-colors: (
      "blue": #007aff,
      "red": #ff3b30,
      "purple": #af52de,
      "orange": #ff9500,
      "green": #34c759
    );

    @each $name, $hex in $badge-colors {
      &--#{$name} { color: $hex; }
    }

    &.is-undoable {
      &:hover { transform: scale(1.2); }
    }
  }
  ```

---

## Conclusión de la Parte 4
Al llegar a las 4000 líneas, hemos cubierto casi todo el flujo de trabajo del usuario. La introducción de **Límites de Secciones Flexibles** y el **Sistema de Badges Dinámico** en SASS permitirá que Vaultman crezca en funciones (como nuevos tipos de operaciones de contenido) sin que el CSS se vuelva inmanejable. La "Queue Island" es el componente UI más avanzado hasta ahora y su refactorización asegurará transiciones suaves en dispositivos móviles.
