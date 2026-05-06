> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - CSS Refactor Spec - Part 1

## Scope: Lines 1-1000 of `styles-OLD.css`

Este documento detalla la lógica de refactorización para el primer bloque de estilos de Vaultman, transformando CSS plano en una arquitectura SASS modular y anidada.

---

## 1. Módulo: `_tokens.scss` (Líneas 3-16)

Este archivo contendrá el "Design System" de Vaultman.

- **Acción**: Extraer variables de las clases raíz `.vm-view` y `.vm-main-view`.
- **Estrategia SASS**: Crear una lista de variables (o un mapa) para que otros archivos puedan usarlas.
- **Antes (CSS)**: Repetición de selectores.
- **Después (SCSS)**:
  ```scss
  .vm-view,
  .vm-frame,
  .vm-main-view {
  	--vm-accent: var(--interactive-accent);
  	--vm-diff-added: #2ea04366;
  	// ... rest of tokens
  }
  ```

---

## 2. Módulo: `_global.scss` (Líneas 20-74)

Define los elementos base que no pertenecen a una página específica.

- **Secciones (`.vm-section`)**:
  - Anidar `.vm-section-header` como `&-header`.
- **Botones (`.vm-btn`)**:
  - **Nesting**: Agrupar `:hover`, `.mod-cta` y `.vm-btn-small` (que debería ser una variante).
  - **Lógica**:
    ```scss
    .vm-btn {
    	font-size: 0.8em;
    	// ... base styles
    	&:hover {
    		background: var(--vm-bg-hover);
    	}
    	&.mod-cta {
    		background: var(--vm-accent);
    		&:hover {
    			opacity: 0.9;
    		}
    	}
    	&-small {
    		// Refactor de .vm-btn-small a clase hija
    		@extend .vm-btn;
    		font-size: 0.75em;
    	}
    }
    ```

---

## 3. Módulo: `_filters.scss` (Líneas 75-165)

Refactorización del sistema de filtros mediante el uso intensivo del selector `&`.

- **Nesting Hierarchy**:
  ```scss
  .vm-filter {
  	&-actions {
  		margin-bottom: 6px;
  	}
  	&-tree {
  		overflow-y: auto;
  	}
  	&-group {
  		margin-left: 8px;
  		&-header {
  			display: flex;
  			align-items: center;
  		}
  	}
  	&-rule {
  		display: flex;
  		&-type {
  			font-weight: 500;
  		}
  		&-detail {
  			text-overflow: ellipsis;
  		}
  	}
  	&-remove-btn {
  		&:hover {
  			color: var(--text-error);
  		}
  	}
  }
  ```

---

## 4. Módulo: `_file-list.scss` (Líneas 166-271)

Lógica para la visualización de archivos en el sidebar.

- **Grid Optimization**: Colapsar reglas de columnas.
- **Nesting**:
  - `.vm-file-row` -> `.vm-file { &-row { ... } }`
  - `.vm-file-name` -> `&-name { ... }`
  - `.vm-file-checkbox` -> `&-checkbox { ... }`
- **Pseudo-clases**: Mover `:hover` y `.active` de los headers dentro de la regla base.

---

## 5. Módulo: `_queue.scss` (Líneas 272-583)

Este es el bloque más complejo (Cola de operaciones y Diff View).

- **Queue Components**:
  - `vm-queue-container`
  - `vm-queue-group` (Anidar `&-header`, `&-label`, `&-body`)
  - `vm-queue-item` (Anidar `.is-expanded`, `&-path`, `&-action`)
- **Diff View System (Líneas 442-583)**:
  - Crear un bloque `.vm-diff` y anidar todos los elementos:
    - `&-container`, `&-file`, `&-path`, `&-row`.
    - **Variantes de color**: `&-added` y `&-deleted` como estados internos.

---

## 6. Mónulo: `_tags.scss` (Líneas 584-652)

Estilos específicos para el explorador de etiquetas.

- **Estructura**:
  ```scss
  .vm-tags {
  	&-tree {
  		flex: 1;
  	}
  	&-row {
  		display: flex;
  		&.is-active-filter {
  			color: var(--text-accent);
  		}
  	}
  	&-icon,
  	&-label,
  	&-count {
  		// styles nested here
  	}
  }
  ```

---

## 7. Módulo: `_explorer.scss` (Líneas 654-891)

El explorador de propiedades es un árbol denso que se beneficia mucho del nesting.

- **Navegación**: Anidar todos los estados de `.vm-explorer-header` incluyendo `.is-expanded`.
- **Nodos**: Agrupar `&-node`, `&-badge`, `&-children`.
- **Highlights**: Mover `.is-active-filter` dentro de `&-node`.

---

## 8. Módulo: `_modals.scss` (Líneas 892-954)

Específicamente el Linter Modal (`.vm-linter`).

- Acciones: Agrupar `vm-linter-item`, `vm-linter-prop`, `vm-linter-add-row`.

---

## 9. Módulo: `_layout.scss` (Líneas 956-1000)

Contenedores estructurales y Navbar.

- **Navbar**:
  - Anidar `.is-horizontal`.
  - Anidar `.clickable-icon` y su estado `.is-active`.
  - Anidar `&-badge`.

---

## Conclusión de la Parte 1

Al migrar estas primeras 1000 líneas, eliminaremos aproximadamente un 30% de líneas de código redundantes mediante el uso de nesting y evitaremos la repetición manual del prefijo `.vm-`.
