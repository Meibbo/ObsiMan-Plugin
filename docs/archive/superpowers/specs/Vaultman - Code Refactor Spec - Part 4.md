> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 4: Reactividad y Decoración (Nodes & View Modules)

## 1. Enfoque Actual

La renderización de listas transfiere directamente estados densos hacia cada fila o nodo del ViewTree.

- **Data Flow Directo**: En el interior de `<div class="vaultman-tree-virtual-row">` de `viewTree.svelte`, cada fila asimila condiciones múltiples en `class:is-active-filter=...`, `class:vaultman-badge-warning=...`, `class:vaultman-search-highlight=...`.
- **Badges y Modificaciones**: Los plugins inyectan propiedades `badges[]` dentro del mismo `TreeNode`, obligando al generador de árbol a recorrer el arreglo de `badges` y dibujar componentes interactivos para UndoOps o métricas internamente.
- No hay un "Modo de Vista" atómico ni módulos. Todo el modelo de presentación recae sobre el `TreeVirtualizer`.

## 2. Deuda Técnica Identificada

1. **Contaminación del DOM de Lista**: `viewTree.svelte` conoce excesivos detalles de negocio. Evalúa condiciones de _"active filters"_, _"warnings"_, _"search highlight"_ y hasta "renombres" de los campos. Es un módulo monolítico y no respeta el principio de "Presentación Únicamente".
2. **Coupling Estructural**: Modificar cómo funciona o luce un estado de destacador "Search", exige tocar la fuente directa del generador del árbol general, generando posibles colisiones de estilos o layouts frente al Scroll infinito.

## 3. Estructura Ideal (Objetivo Refactor Svelte 5)

### Arquitectura de View Modules o Context

- Extracción a un Patrón `Decorador` o Provider de Configuración.
- La celda virtual base (Node Renderer base) sólo asume datos abstractos o ranuras de inyección (`{#snippet nodeDecorator()}`). La responsabilidad analítica se externaliza a un `DecorationManager`.

### Implementación con Snippets (Svelte 5)

`viewTree.svelte` debe quedar abstracto y aceptar una directriz de Snippets inyectables provista por el que invoca (ej. `<FiltersPropsTab>` expone cómo dibujar los nodos o decoraciones).

```svelte
<!-- Implementación padre -->
<ViewTree
  {nodes}
  {expandedIds}
>
   {#snippet decorador(node)}
     <TreeBadges badges={node.badges} onDblClick={...} />
   {/snippet}
   {#snippet nodeContent(node)}
     <HighlightText text={node.label} term={$searchContext} />
   {/snippet}
</ViewTree>
```

Esto fragmenta la reactividad para que solo reaccione la decoración frente a cambios de badges, sin tener que mutar toda el ciclo vital de la fila expuesta por el virtualizador de Svelte.
