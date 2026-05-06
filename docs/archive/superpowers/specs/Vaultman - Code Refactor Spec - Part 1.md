> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 1: Primitivos y Consumo de Estilos

## 1. Enfoque Actual

La arquitectura visual y el consumo de estilos de la interfaz de Vaultman recae actualmente en una mezcla de clases de Obsidian nativas y clases de utilidad propias inyectadas a través de Svelte.

Componentes primitivos como `btnSelection.svelte`, inputs y modales muestran cómo el sistema aplica la lógica de diseño:

- Se utilizan clases estáticas repetitivas como `vaultman-squircle` o `vaultman-badge`.
- Las directivas de clase dinámicas en Svelte (`class:is-active={...}`, `class:is-disabled={...}`) gestionan los estados interactivos.
- Faltan componentes estrictamente funcionales sin dependencias "hardcodeadas", ya que en archivos como `viewTree.svelte`, los badges incluyen clases dinámicas como `vaultman-badge--red` derivadas directamente del string de color proveniente del estado.

## 2. Deuda Técnica Identificada

1. **Acoplamiento Fuerte del Estilo**: Los componentes de presentación mezclan clases funcionales (que manejan el display o la estructura) con clases de estado (`is-active`).
2. **Hardcoding de Variantes**: La definición de variantes en `viewTree.svelte` (`vaultman-badge--red`, `--blue`, etc.) expone la ausencia de un sistema de design tokens estandarizado o SASS robusto para estas primitivas.
3. **Escalabilidad Svelte 5 limitante**: En un esquema ideal para Runes (Svelte 5), los estados como `is-active` o variantes de color deberían delegarse a propiedades inferidas o _derived_ sin depender intrínsecamente de largas cadenas de clases condicionales.

## 3. Estructura Ideal (Objetivo Refactor Svelte 5)

### Consumo SASS Modular (Design Tokens)

- Centralizar clases genéricas como `vaultman-squircle` mediante `@use` o un SCSS mixin (`@include squircle()`), limpiando el DOM de largas listas de clases.
- Variables dinámicas de componente. En vez de inyectar clases para cada color (`class:vaultman-badge--red`), usar variables CSS en línea que apunten a tokens SASS: `style="--badge-accent: var(--vaultman-color-{color})"`.

### Implementación Svelte 5 (Runes)

Aislar primitivos en su propio bucket de manera pura.
Ejemplo simplificado de primitivo Bottom/Botonera con Runes:

```svelte
<script lang="ts">
  const {
    icon,
    label,
    variant = "default",
    isActive = false,
    isDisabled = false,
    onclick
  } = $props();

  const stateClass = $derived(isActive ? "is-active" : "");
</script>

<button
  class="vm-btn vm-btn--{variant} {stateClass}"
  disabled={isDisabled}
  aria-label={label}
  onclick={onclick}
>
  ...
</button>
```

Este enfoque limpiará los contenedores de lógica (como `viewTree.svelte`), los cuales dejarán de preocuparse por la semántica del estilo para delegarla a la capa primitiva.
