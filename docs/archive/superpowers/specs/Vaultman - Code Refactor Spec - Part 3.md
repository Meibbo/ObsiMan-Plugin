> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 3: Exploradores y Virtualización

## 1. Enfoque Actual

Los datos pesados y largas listas se controlan mediante un gestor central `TreeVirtualizer` (`serviceVirtualizer.ts`).

- **El Modelo**: El servicio agarra una lista anidada (`TreeNode`) y un Set de configuraciones (`expandedIds`) para generar una matriz unidimensional plana: `FlatNode`. Calcula una ventana de render "VirtualWindow" (startIndex a endIndex) basándose en la posición actual de `scrollTop`.
- **Implementación visual**: En `viewTree.svelte`, el array achatado re-calcula las alturas de las filas usando propiedades dinámicas. En el DOM, un div padre con overflow inyecta scroll nativo y despacha un ResizeObserver sobre su contenedor en inmediatez con `$effect()`.
- **Integración de los Paneles**: Los módulos `explorerTags`, `explorerProps`, etc. son inyectados en la visual y atados fuertemente a `plugins.filterService`.

## 2. Deuda Técnica Identificada

1. **Recalculo Intenso en Main Thread**: Svelte llama continuamente la ventana del viewport tras cada evento de scroll `$derived(virtualizer.computeWindow(scrollTop...))`, sin embargo, este método llama a `flatten()` de la totalidad del árbol. Si los nodos llegan a miles, la rutina es inestable.
2. **Detección Ciclada de Altura (Heights)**: Existe una dependencia insegura sobre variables del servidor en `.vaultman-tree-row-h`. El `$effect` está forzando a calcular cada fila al inicio leyendo el CSSOM puro: `getComputedStyle(outerEl)`.

## 3. Estructura Ideal (Objetivo Refactor Svelte 5)

### Separador de Responsabilidades

- Desplegar la Virtualización Compleja fuera de Svelte y en una clase TypeScript de rendimiento independiente, que exponga eventos `state` de Runes en vez de realizar operaciones funcionales que colisionan con el Render. El aplanamiento (`flatten(...)`) debería manejarse vía memorización reactiva sólida para no repetirse ante un simple scroll.

### Refactorización Orientada a Svelte 5

- Delegar las dimensiones de Row al State central (`rowHeight=32` provisto por estado de Configuración, no leyendo un root element iterativamente).
- Migrar el manejo interno a una clase con `$state`:

```ts
export class TreeVirtualizerState {
	scrollTop = $state(0);
	flatData = $state<FlatNode[]>([]);
	rowHeight = $state(32);

	window = $derived.by(() => {
		// Calculo aislado
		return { start: idx, end: endIdx };
	});
}
```

Esto alivia a `viewTree.svelte` y retira la voluminosa lógica estructural de los componentes UI.
