> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 7: Unificación de Tabs e Integración de Content

## 1. Enfoque Actual (Deuda Técnica)

Actualmente, el sistema de navegación interna de la página de filtros (`pageFilters.svelte`) sufre de una fragmentación de la "fuente de la verdad":

- **Definiciones Duplicadas**: El tipo `FiltersTab` está declarado por separado en `pageFilters.svelte` y `navbarPages.svelte`.
- **Acoplamiento de UI**: El componente `navbarPages` contiene un Record interno con iconos y etiquetas hardcodeadas, lo que impide que sea un componente de navegación genérico.
- **Dificultad de Extensión**: Añadir una nueva funcionalidad (como el tab de **Content**) requiere modificar múltiples archivos y sincronizar strings literales manualmente, aumentando el riesgo de regresiones.

## 2. Misión: Unificación de Contratos

El objetivo de esta especificación es centralizar la definición de los Tabs en un objeto de configuración único y utilizarlo para inyectar dinámicamente tanto la interfaz de navegación como el contenido de las páginas.

### Objetivos Principales:

1.  **Single Source of Truth**: Crear un registro centralizado de Tabs con su ID, icono y clave de traducción.
2.  **Navbar Agnóstico**: Refactorizar `navbarPages.svelte` para que solo se encargue de la presentación, recibiendo la configuración por props.
3.  **Integración de Content**: Implementar el tab de **Find & Replace de Contenido** dentro del flujo de filtrado.

## 3. Arquitectura Propuesta (Svelte 5)

### A. Centralización de Configuración (`typeUI.ts`)

```typescript
export const FILTERS_TABS_CONFIG = [
	{ id: 'props', icon: 'lucide-book-plus', labelKey: 'filter.tab.props' },
	{ id: 'files', icon: 'lucide-files', labelKey: 'filter.tab.files' },
	{ id: 'tags', icon: 'lucide-tags', labelKey: 'filter.tab.tags' },
	{ id: 'content', icon: 'lucide-text-cursor-input', labelKey: 'filter.tab.content' },
] as const;

export type FiltersTab = (typeof FILTERS_TABS_CONFIG)[number]['id'];
```

### B. Navbar Genérico (`navbarPages.svelte`)

El componente dejará de tener lógica de negocio.

- **Props**: `activeTab`, `config`, `onTabChange`.
- **Renderizado**: Bucle sobre la config para generar los botones de navegación.

### C. Refactor de `pageFilters.svelte`

Se eliminan las definiciones locales y se utiliza el nuevo contrato para:

1.  Alimentar al `NavbarPages`.
2.  Gestionar los estados reactivos del nuevo tab de **Content** (Runes `$state`).
3.  Integrar el componente `tabContent.svelte` en el contenedor de wrappers.

## 4. Lógica de Negocio de "Content"

La integración del tab de contenido no es solo estética; debe integrarse con el motor de filtrado:

- **Scope Awareness**: El tab de contenido debe consultar al `filterService` para informar al usuario sobre cuántos archivos están siendo afectados por los filtros actuales antes de realizar el reemplazo.
- **Preview Handoff**: La previsualización de cambios de contenido debe ser accesible desde la interfaz de filtros para una revisión rápida.

## 5. Beneficios del Refactor

- **Escalabilidad**: Añadir un quinto o sexto tab será tan simple como añadir una línea al objeto de configuración.
- **Mantenibilidad**: Se elimina el "Prop Drilling" y la duplicidad de tipos TS.
- **Consistencia Visual**: Todos los tabs de navegación heredarán automáticamente el mismo comportamiento y estilos de selección.
