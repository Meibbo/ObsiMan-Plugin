> **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.

# Vaultman - Code Refactor Spec - Part 8: Panel de Configuraciones (Settings)

## 1. Enfoque Actual (Deuda Técnica)

Actualmente, el archivo `settingsVM.ts` (antes `settingsVaultman.ts`) construye el panel de ajustes íntegramente utilizando la API imperativa nativa de Obsidian (`new Setting(containerEl)...`).

- **Exceso de Boilerplate**: Cada ajuste requiere múltiples líneas de código repetitivo encadenado (`.setName()`, `.setDesc()`, `.addDropdown()`, etc.), resultando en un archivo extenso de casi 300 líneas.
- **Lógica Esparcida**: La llamada a `this.plugin.saveSettings()` está repetida en cada uno de los `onChange` de los más de 15 ajustes actuales. Esto rompe el principio DRY y facilita el olvido de guardar estados si se añaden nuevos ajustes.
- **Diseño Rígido**: Crear agrupaciones condicionales complejas o aplicar estilos modernos y reactividad en tiempo real (por ejemplo, ocultar configuraciones secundarias si una principal está apagada) es tedioso de lograr de manera puramente imperativa y requiere re-ejecutar `this.display()` manualmente, redibujando toda la vista.

## 2. Misión

El objetivo de este refactor es migrar la página de configuración desde el renderizado imperativo hacia un paradigma **declarativo y reactivo** usando Svelte 5, simplificando la mantenibilidad, escalabilidad y permitiendo un diseño UI más rico sin esfuerzo adicional.

## 3. Arquitectura Propuesta (Svelte 5)

### A. El "Puente" de Obsidian (`settingsVM.ts`)

El archivo de TypeScript se mantiene, pero se reduce a su mínima expresión. Su única responsabilidad será servir como ancla para montar y desmontar un componente de Svelte.

```typescript
// settingsVM.ts
import { PluginSettingTab, App } from 'obsidian';
import { mount, unmount } from 'svelte';
import SettingsUI from './components/settings/SettingsUI.svelte';

export class VaultmanSettingsTab extends PluginSettingTab {
	// ...
	private svelteComponent: Record<string, any> | null = null;

	display(): void {
		this.containerEl.empty();
		this.svelteComponent = mount(SettingsUI, {
			target: this.containerEl,
			props: { plugin: this.plugin },
		});
	}

	hide(): void {
		if (this.svelteComponent) {
			unmount(this.svelteComponent);
			this.svelteComponent = null;
		}
	}
}
```

### B. El Componente Declarativo (`SettingsUI.svelte`)

Toda la lógica visual se traslada aquí. En Svelte 5, podemos utilizar **Bindings bidireccionales** (`bind:value`) y centralizar el guardado con un `$effect` o simplemente delegando la acción.

**Ventajas del enfoque Svelte:**

1.  **Menos código**: En lugar de 10 líneas por cada ajuste, usaremos componentes reutilizables como `<SettingDropdown>` o `<SettingToggle>`.
2.  **Reactividad inmediata**: Condicionar visualmente (usando `{#if}`) opciones secundarias será trivial, sin necesidad de re-dibujar la vista completa.

### Ejemplo de Estructura Ideal

Para facilitar el uso de estilos consistentes con Obsidian sin reconstruir sus componentes nativos, se sugiere crear primitivos que imiten a `.setting-item`:

```svelte
<!-- SettingsUI.svelte -->
<script lang="ts">
  const { plugin } = $props();
  // Estado local sincronizado con el plugin
  let settings = $state(plugin.settings);

  // Guardado reactivo: cualquier cambio en `settings` dispara el guardado automático
  $effect(() => {
    plugin.settings = settings;
    plugin.saveSettings();
  });
</script>

<div class="vaultman-settings-container">

  <h2 class="setting-item-heading">General</h2>

  <SettingToggle
    name={translate('settings.ctrl_click_search')}
    desc={translate('settings.ctrl_click_search.desc')}
    bind:value={settings.explorerCtrlClickSearch}
  />

  <SettingDropdown
    name={translate('settings.open_mode')}
    options={[
      { value: 'sidebar', label: 'Sidebar' },
      { value: 'main', label: 'Main' }
    ]}
    bind:value={settings.openMode}
  />

  <!-- Fácilmente condicional -->
  {#if settings.openMode === 'sidebar'}
     <div class="setting-item-description">Note: Sidebar mode restricts width.</div>
  {/if}

</div>
```

## 4. Beneficios Esperados

- **Reducción masiva del tamaño del archivo base** (de ~300 líneas a ~30 líneas).
- **Adiós a los olvidos**: El `$effect` reactivo garantiza que todo cambio en la interfaz gráfica se guarde en disco al instante, evitando los repetitivos `.onChange(async (v) => {...})`.
- **Desarrollo Ágil**: Las nuevas opciones de configuración se podrán añadir en HTML Svelte directamente, siendo fácilmente traducibles e interpretables de un vistazo.
