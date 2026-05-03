> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 2: Arquitectura del Layout (Frame, Pages, Tabs)

## 1. Enfoque Actual
El marco principal (Layout) está gobernado por `frameVaultman.svelte`, que se encarga del enrutamiento superior y del contenedor principal (`vaultman-page-container`).

- **El Frame principal (`frameVaultman`)**: Controla un conjunto horizontal de páginas. Para el cambio entre páginas, usa una animación manual inyectada a través del estilo JS condicional (`applyPageTransform`), adaptándose al ResizeObserver para ajustar un offset en pixeles vía `translateX()`.
- **Estructura de Páginas**: El routing inyecta los subcomponentes `<OperationsPage>`, `<StatisticsPage>`, `<FiltersPage>` en bucle utilizando `#each` junto a llaves Reactivas (`#key pageRenderKey`).
- **Sistema de Tabs**: Centralizado visualmente pero disperso a nivel local. `pageFilters.svelte` implementa el sistema de pestañas "Tags | Props | Files" usando un sistema de wrappers con displays `is-hidden` a diferencia del slider principal de páginas.

## 2. Deuda Técnica Identificada
1. **Lógica de Transformación Impura**: El uso directo de referencias DOM y mutaciones CSS (`containerEl.style.transform = ...`) para animación de la vista atenta contra la inmutabilidad o la delegación reactiva predefinida en Svelte.
2. **Sobreingeniería en Páginas**: Uso masivo de condicionales con un array `pageOrder` local. Se genera rendering innecesario cuando lo que realmente busca es un enrutador dinámico.
3. **Incosistencia de Tab Routing**: Mientras las páginas se mutan a nivel de Slider Horizontal, las pestañas iteran el display `.is-hidden`, forzando al navegador a gestionar el footprint de renders redundantes permanentemente en memoria.

## 3. Estructura Ideal (Objetivo Refactor Svelte 5)

### State Management Simplificado (Runes)
- Migrar el manejo global a un Store o clase inyectable `$state` de Layout (`LayoutStore`). `activePage` y las páginas `pageOrder` pueden manejarse interconectadas globalmente. En vez de mutaciones manuales, el Offset puede venir como un valor derivado (Derivadions):
```svelte
<script>
  const offsetPx = $derived(-pageIndex * viewportH.width);
</script>
<div style="transform: translateX({offsetPx}px)">
```
### Sistema de Navegación Abstraido 
Las tabs anidadas en `Filters` o cualquier otro módulo deben tener `Snippets` en lugar de wrappers `is-hidden`. El uso de la destructuración de Svelte 5 o bloques `{#snippet}` proveen condicionales dinámicos eficientes: renderizan si existen, destruyen si no (ahorro masivo de RAM comparado al un `display: none` usado hoy).
