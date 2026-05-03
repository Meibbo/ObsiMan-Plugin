> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - CSS Refactor Spec - Part 3
## Scope: Lines 2001-3000 of `styles-OLD.css`

Este bloque contiene el núcleo estético de Vaultman: el sistema de navegación por píldoras, los efectos de Glassmorphism avanzados y las animaciones de deslizamiento lateral.

---

## 1. Módulo: `_glass.scss` (Líneas 2044-2125)
Este será un módulo central de "apariencia".
- **Estrategia**: Usar una clase base `.vm-glass` y modificadores BEM para las variantes.
- **Antes**: Reglas repetidas para `backdrop-filter`.
- **Después (SCSS)**:
  ```scss
  .vm-glass {
    backdrop-filter: blur(var(--vm-glass-blur, 12px));
    -webkit-backdrop-filter: blur(var(--vm-glass-blur, 12px));

    &--bottom {
      bottom: 0;
      &::before {
        // Lógica de gradiente y máscara anidada
        mask-image: linear-gradient(to bottom, transparent 0%, black 70%);
      }
    }
    &--top {
      top: 0;
      &::before {
        mask-image: linear-gradient(to top, transparent 0%, black 70%);
      }
    }
    &--full { inset: 0; z-index: 100; }
  }
  ```

---

## 2. Módulo: `_v3-nav.scss` (Bottom Nav y FABs: 2008-2246)
Este módulo maneja la navegación "flotante" del sidebar moderno.
- **Bottom Nav**:
  - Anidar estados `.is-bar-collapsed` e `.is-bar-expanding`.
  - Los hijos como `.vm-nav-pill`, `.vm-nav-fab` y `.vm-nav-fab-placeholder` deben anidarse dentro de los estados colapsados para manejar sus `opacity` y `transform` de forma centralizada.
- **Nav Icon & Badge**:
  - Agrupar `.vm-nav-icon` con sus estados `:hover`, `.is-active` y `.is-reordering`.
  - Anidar `.vm-nav-dot-badge` dentro del icono para una mejor referencia espacial.

---

## 3. Módulo: `_v3-layout.scss` (Tabs y Viewport: 2315-2412, 2654-2668)
Lógica de la arquitectura de pestañas unificadas.
- **Tab Bar**: Anidar el estado `.has-labels` y los estilos de `.vm-tab` (con sus estados `:hover`, `.is-active` e iconos internos).
- **Page Viewport**: Anidar `.vm-page-container` (el "carrete" de 300% de ancho) y las `.vm-page` individuales.
- **Tab Content**: Agrupar la lógica de visibilidad (`opacity: 0` -> `1`) bajo `.vm-tab-content`.

---

## 4. Módulo: `_v3-filters.scss` (UI de Filtros Moderna: 2417-2652)
Específicos para la página de Filtros.
- **Filters Header**: Anidar la "Search Pill" y el input interno (`vm-filters-search-input`).
- **Nesting de Search Pill**: Agrupar el estado `:focus-within` y los botones de Clear/Mode internos.
- **Card Layout (`.vm-prop-card`)**: 
  - Anidar el icono, el nombre y el contador.
  - Esto es diferente al Grid spreadsheet; es una vista de tarjetas que debe vivir en su propio archivo de componentes o partial de filtros.

---

## 5. Módulo: `_animations.scss` (Keyframes y Motion: 2555-2571)
- **Acción**: Mover `@keyframes vm-search-pulse` a este archivo central de animaciones para limpiar los archivos de componentes.

---

## 6. Módulo: `_v3-popups.scss` (Líneas 2714-2791)
El sistema de popups Level 4 que se desliza desde abajo.
- **Overlay & Content**:
  ```scss
  .vm-popup {
    &-overlay {
      background: rgba(0, 0, 0, 0.45);
      &.is-open { opacity: 1; }
    }
    &-content {
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  }
  ```
- **Squircles**: Anidar el comportamiento de hover de los botones Squircle.

---

## Conclusión de la Parte 3
Este bloque es el más "limpio" visualmente pero el más complejo técnicamente por el uso de **pseudo-elementos (`::before`)**, **máscaras de gradiente** y **curvas bezier** personalizadas. La refactorización SASS aquí permitirá que el "Glassmorphism" sea un mixin o una clase base extendible, lo que facilitará aplicar este estilo a nuevos elementos en el futuro sin repetir código de blur/mask.
