---
up:
  - "[[ObsiMan]]"
type:
  - about
title: PKM Manager Manual
structure:
  - toc
  - callout
input:
  - AI-gen
description: manual de usuario e instrucciones para IA
---
# PKM Manager — Manual de Usuario e IA

> [!abstract] Resumen
> Guía completa para usar **PKM Manager**, una herramienta de escritorio Tkinter para edición masiva de metadatos en vaults de [[Obsidian]]. Cubre todas las funciones del menú principal, herramientas, filtros y sistema de cola.
>
> **Para IA**: Usa este manual como referencia para entender las capacidades del PKM Manager y guiar al usuario en operaciones masivas sobre su vault.
>
> **Nota (v1.2)**: PKM Manager ahora existe como **ObsiMan**, un plugin nativo de Obsidian (TypeScript). Ver [[obsiman_plugin_architecture]] para la arquitectura del plugin. La versión Python sigue disponible pero el plugin es la versión activa.

---

## 1. Inicio Rápido

1. Ejecuta `python Production/Code/pkm_manager.py`
2. Haz clic en **📂 Seleccionar Vault** y elige la carpeta raíz de tu vault
3. Espera el escaneo — se usa un caché para que los escaneos repetidos sean rápidos
4. Los archivos aparecen en el panel central, las propiedades y estadísticas en el panel derecho

> [!tip] Atajo
> Si el vault ya fue configurado antes, se carga automáticamente al abrir la aplicación.

---

## 2. Los Tres Paneles

### Panel Izquierdo: Filtros

| Componente | Función |
|---|---|
| **Plantillas de filtro** | Combobox para cargar filtros guardados. Botón **+** para guardar los filtros activos con un nombre. |
| **Árbol de filtros** | Estructura jerárquica AND/OR/NOT con reglas individuales. |
| **Cola de cambios** | Lista de operaciones pendientes. Botón **▶ Aplicar Cambios** ejecuta toda la cola. |

**Tipos de filtro disponibles:**
- `Tiene propiedad` / `Sin propiedad`
- `Valores Específicos` (coincidencia exacta)
- `Carpeta incluye/excluye`
- `Nombre de archivo contiene/excluye`

### Panel Central: Archivos

- Barra de búsqueda para filtrar por nombre
- TreeView con columnas: Nombre, # Props, Ubicación
- Checkboxes para seleccionar archivos individualmente
- Clic derecho o botón para seleccionar/deseleccionar todos

### Panel Derecho: Operaciones

- **⚙️ Propiedades** — abre [[#5. Gestión de Propiedades|PropertyManagerWindow]]
- **📄 Renombrar Archivos** — motor de 12 acciones tipo Ant Renamer
- **🛠️ Herramientas** — acceso a todas las herramientas adicionales
- **🔧 Ajustes** — configuración de journal, idioma, plantillas
- Estadísticas del vault y detalles del archivo seleccionado

---

## 3. Sistema de Cola (Queue)

> [!important] Filosofía
> **Ninguna operación escribe directamente a disco.** Todo se encola primero. Solo al presionar **▶ Aplicar Cambios** se ejecutan las operaciones. Puedes revisar los cambios con **🔍 Ver Detalles** antes de aplicar.

Cada operación en la cola muestra:
- Propiedad afectada
- Acción (Set, Delete, Rename, Reorder, Merge, etc.)
- Detalles de la operación
- Cantidad de archivos afectados

El visor de detalles simula el efecto acumulado de todas las operaciones, mostrando un diff antes/después con colores (verde = agregado, rojo = eliminado).

---

## 4. Plantillas de Filtro

Las plantillas permiten guardar combinaciones de filtros para reutilizarlas:

1. **Cargar**: Selecciona una plantilla del combobox → se aplica automáticamente
2. **Guardar**: Configura tus filtros → presiona **+** → escribe un nombre
3. **Gestionar**: En **🔧 Ajustes**, cada plantilla muestra:
   - Nombre y descripción (N reglas, M grupos, lógica)
   - Botón 🔄 para actualizar desde los filtros activos
   - Botón ✕ para eliminar

---

## 5. Gestión de Propiedades

El **PropertyManagerWindow** opera sobre los archivos seleccionados con cinco acciones:

| Acción | Descripción |
|---|---|
| **Set / Create** | Crea o sobreescribe el valor de una propiedad |
| **Rename** | Renombra la clave de una propiedad (borra vieja + escribe nueva) |
| **Delete** | Elimina una propiedad completamente |
| **Clean Empty** | Elimina propiedades vacías o nulas |
| **Change Type** | Convierte a texto/número/checkbox/lista/fecha |

**Opciones avanzadas:**
- Operar sobre la clave de la propiedad o sobre valores individuales de una lista
- Formato como `[[wikilink]]`, incluir hora exacta, reemplazar listas vs. agregar
- Autocompletado con propiedades y valores existentes
- Ámbito: global, filtrado o solo seleccionados

---

## 6. Herramientas

### 📐 Linter de Propiedades
Reordena las claves del frontmatter de tus archivos:
- Pestaña **Default** para todos los archivos
- Pestañas adicionales por plantilla de filtro (aplica solo a archivos coincidentes)
- Arrastra las propiedades para definir el orden deseado
- Autocompletado al agregar propiedades
- Los cambios se encolan para revisión antes de aplicar

### 🔀 Mezclador de Archivos
Combina múltiples archivos en uno:
- Arrastra para reordenar los archivos fuente
- Resolución de conflictos: combinar listas / mantener primero / mantener último
- Separador de contenido configurable
- **Transformaciones de datos:**
  - *Propiedad → Valor en lista*: mueve una propiedad a una lista en otra propiedad
  - *Valor → Nueva propiedad*: extrae un valor como nueva propiedad independiente
  - *Nombre de archivo → Propiedad*: crea una lista con los nombres de archivos fuente como `[[wikilinks]]`
- Vista previa en tiempo real
- Opción de archivar los archivos restantes en `x/Archived/`

### 👤 Importar Contactos
Importa contactos de Google (CSV o vCard) como notas de Obsidian:
- Mapeo de campos: cada columna/campo se asigna como nombre de archivo, propiedad o se omite
- Autocompletado con propiedades existentes del vault
- Vista previa del primer contacto
- Carpeta de salida configurable

### 📊 Habitkit Sync
Sincronización entre Habitkit JSON y notas diarias de Obsidian:
- Carga un export JSON de Habitkit
- Mapea cada hábito a una propiedad en las notas diarias
- Dirección: Habitkit → Obsidian, Obsidian → Habitkit, o bidireccional
- Los cambios pasan por el sistema de cola

### 📓 Unificación de Journal
Gestión de notas diarias:
- Escanea y sincroniza fechas
- Actualiza navegación (prev/next)
- Adjunta eventos huérfanos a su nota diaria

### 📄 Renombrar Archivos
Motor de 12 acciones inspirado en Ant Renamer:
1. Cambiar extensión
2. Reemplazo de cadena
3. Reemplazo múltiple
4. Inserción de cadena
5. Mover cadena
6. Eliminación de caracteres
7. Enumeración
8. Fecha y hora
9. Nombres aleatorios
10. Cambiar mayúsculas
11. Tomar de lista
12. Expresión regular

### 🔍 Buscar y Reemplazar
Búsqueda y reemplazo recursivo en el contenido de archivos (soporta regex).

### 📂 Refactorizar Rutas
Sustitución masiva de rutas en el vault (formato: `vieja_ruta | nueva_ruta`).

---

## 7. Configuración

Archivo: `Production/Code/pkm_manager_config.json`

| Clave | Descripción |
|---|---|
| `last_vault` | Ruta del último vault abierto |
| `journal_folder` | Subcarpeta de journal (ej. "Journal") |
| `journal_logtype` | Criterio para notas diarias (ej. "[[Day]]") |
| `journal_calc_nav` | Calcular navegación prev/next |
| `launchbox_out_dir` | Carpeta de salida para conversiones LaunchBox |
| `filter_templates` | Lista de plantillas de filtro guardadas |
| `rename_defaults` | Valores predeterminados por acción de renombrado |
| `language` | Idioma de la UI (`en` o `es`) |

---

## 8. Referencia para IA

> [!info] Patrón de cola
> Para agregar operaciones programáticamente, usa:
> ```python
> parent.add_to_queue({
>     "property": str,        # Nombre de propiedad o "[Tool Name]"
>     "action": str,          # Descripción de la acción
>     "details": str,         # Detalles adicionales
>     "files": [(path, meta)],# Archivos objetivo
>     "logic_func": callable, # fn(path, meta) → {updates}
>     "custom_logic": bool    # True si maneja señales especiales
> })
> ```

**Señales especiales en el dict de retorno:**
- `_DELETE_PROP: "key"` — elimina la propiedad después de escribir
- `_RENAME_FILE: "new_path"` — renombra el archivo
- `_REORDER_ALL: True` — reemplaza todo el frontmatter (para reordenar)
- `_MIXER_DONE: True` — señal de merge completado

**Para agregar una nueva ventana de herramienta:**
1. Crea `class NewToolWindow` con `__init__(self, parent)`
2. Accede a `parent.all_files`, `parent.filtered_files`, `parent.available_properties`
3. Usa `parent.add_to_queue()` para operaciones
4. Agrega i18n en `_TRANSLATIONS` (en + es)
5. Agrega botón en `ToolsWindow`
