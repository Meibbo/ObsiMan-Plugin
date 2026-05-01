> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 6: Overlays (Popups y Menús)

## 1. Enfoque Actual
La arquitectura de modales o sobrecapas es modularizada a nivel de Frame.

- **Renderer Nivel 4 (`layoutPopup.svelte`)**: Es un overlay de alto nivel activado bajo `activePopup` (puede ser 'scope', 'search', 'move', o 'active-filters'). Este layout se expone arriba del DOM con transiciones booleanas (`class:is-open`, `class:is-hidden`).
- **Context Menus (`serviceCMenu.ts`)**: Son delegados al plugin nativo Curator, el cual utiliza wrappers o instanciadores puros sobre la capa DOM natural de Obsidian para mostrar menús asíncronos en los eventos Right-click.

## 2. Deuda Técnica Identificada
1. **Complejidad del Controlador Raíz**: `layoutPopup.svelte` recibe un "Prop Drilling" aberrante: Necesita recibir cerca de 13 propiedades dispares vinculadas a todos los posibles popups en existencia (ej. `moveTargetFolder`, `scopeOptions`, `activeFilterRules`, etc.) inclusive cuando el popup de Move ni se está renderizando. 
2. **Lifecycle Acoplado**: El tiempo de cierre de popup usa timeouts estáticos de transición (`setTimeout(..., 320)`), lo que entorpece un sistema predecible y choca con fallas si una pestaña se cierra violentamente o hay lag en el framerate CSS nativo de Obsidian.

## 3. Estructura Ideal (Objetivo Refactor Svelte 5)

### Sistema de Portal Svelte / Stack Context
Extraer la lógica del Popups hacia una arquitectura inyectable con Promesas. Un State Manager abstracto.
En Svelte 5, es óptimo inyectar al Overlay el `Componente` directamente con uso de _Render Tags_:

```svelte
<!-- Frame Component -->
<script lang="ts">
  import { OverlayState } from "./services/overlay.svelte.ts";
</script>

{#if OverlayState.isOpen}
  <div class="overlay" out:fade={{duration: 300}}>
      <!-- Inyectar el Componente dinámicamente -->
      <OverlayState.Component {...OverlayState.props} />
  </div>
{/if}
```

### Orquestando Popups via Método Global
Cualquier archivo de la aplicación (e.g. Explorer Tab o Bottom Nav) podrá pedir un popup con una firma límpia sin afectar al contenedor central:
```ts
OverlayState.open(NavigationPopupComponent, { myprop: "value" });
```
Esto remueve de cuajo la necesidad de enviar 13 properties (Prop Drilling) a `layoutPopup.svelte` reduciéndolo a un mero Canvas genérico y logrando la profesionalización robusta exigida por la nueva arquitectura.
