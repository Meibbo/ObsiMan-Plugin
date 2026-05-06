> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 5: El Sistema de Navbars

## 1. Enfoque Actual

Vaultman posee varias "Barras" interactuando en simultáneo (Toolbars, navbars globales y paginación).

- **Bottom Nav (`navbarPillFab.svelte`)**: Administra una pastilla-dock (pill) al inferior. Maneja Drag and Drop reactivo manual (`onpointerup`, `onpointerdown`) para ordenar las páginas de los iconos (Filters / Operations / Statistics) y el desborde (collapse behavior) con un Timer reactivo.
- **Header Filters Nav (`navbarExplorer` / `navbarPages`)**: Generan herramientas en la cabecera. Disponen tabs condicionales ("Tags / Props") y acogen controles de view mode o de search logic en botones discretos incrustados.

## 2. Deuda Técnica Identificada

1. **Fragmentación del Estado Router**: El drag-and-drop muta activamente localizaciones indexadas hacia el parent superior `frameVaultman.svelte`, generando la señal de re-dibujar la vista general (`pageRenderKey++`). Un manejo impuro y costoso a nivel de repintado DOM general.
2. **Manejo de Tiempos Manuales**: En `navbarPillFab` existen timeouts explícitos para el longPress (`setTimeout(..., 2000)`) y en los manejadores de colapso, resultando en flujos asíncronos que pueden desincronizarse fácilmente en el Unmount si los `destroy` fuesen imprecisos.

## 3. Estructura Ideal (Objetivo Refactor Svelte 5)

### Clases Navigator Globales

Crear `serviceNavigation.svelte.ts` (ya propuesto y en estado WIP en la app) que actúe como Svelte Rune Store para unificar todo:

```ts
export const Router = {
	activePage: $state('ops'),
	pageOrder: $state(['ops', 'statistics', 'filters']),

	navigate(page: string) {
		this.activePage = page;
	},

	reorder(sourceIdx: number, targetIdx: number) {
		// transmutación interna de pageOrder y plugin.settings en background
	},
};
```

### Abstracción de Componente Reusable

- Las barras inter-paginas (`navbarExplorer`, `navbarPages`) manejan variables flotantes pesadas (bindings extensos de estados). Todas estas Navbar secundarias deberían asimilar configuraciones globales extraídas con uso de `Context` (`setContext`/`getContext`) de los Explorers para que su lógica y UI queden encapsuladas sin llenar su componente Wrapper/padre con `let searchCategory = $state()`.
