---
in:
  - "[[ObsiMan]]"
type:
  - docs
  - design
author:
  - "[[Meibbo]]"
input: AI-gen
related:
  - "[[Obsiman - User Interface]]"
  - "[[ObsiMan - Plugin Architecture]]"
dateCreated: 2026-04-09
dateModified: 2026-04-09
cssclasses:
  - no-title
---
# ObsiMan — Wireframe

> [!abstract] Propósito de este documento
> Este es el **documento de diseño canónico** de ObsiMan. Todo agente de IA y todo desarrollador debe leerlo antes de implementar cualquier componente de UI.
> La imagen de referencia visual es `img/ObsiMan - Ui.png` (copia local del wireframe `ObsiMan - User Interface.png`). Las imágenes de detalle están en la carpeta de Screenshots del dev.
> Este documento está interconectado con [[Obsiman - User Interface]] (requisitos funcionales) y [[ObsiMan - Plugin Architecture]] (código y servicios).

---

## 1. Jerarquía de frames

El wireframe usa **4 niveles** que describen escalas distintas del diseño, no una jerarquía de anidamiento rígida.

| Nivel | Nombre | Qué describe |
|-------|--------|-------------|
| **1** | Layout | Componentes reutilizables y vistas de layout global — aparecen en múltiples páginas/tabs |
| **2** | Página | Una página completa del plugin — su contenido **siempre es visible** independientemente del tab activo |
| **3** | Pestaña (Tab) | Contenido intercambiable dentro de una página |
| **4** | Pop-up | Elemento que **reemplaza** o cubre parte del frame Level 2 al activarse (no un overlay flotante genérico) |

> [!important] Regla de reemplazo
> Un frame Level 4 no flota encima de todo: **reemplaza** una sección del Level 2. Por ejemplo, el sort popup de los tabs de Filters reemplaza el filters header con su propio container, con una animación de transición al abrir y al cerrar. Cuando se cierra, el filters header vuelve a su posición.

---

## 2. Páginas (Level 2)

El plugin sidebar tiene **3 páginas** navegables horizontalmente con el pill navbar.

```
Orden por defecto: [ Operations ] [ Statistics ] [ Filters ]
                       (izq)        (centro/1)      (der)
pageOrder default: ['ops', 'statistics', 'filters']
```

Cada página tiene contenido **persistente** (siempre visible en esa página), más sus tabs Level 3.

### 2.1 Estructura universal de una página

```
┌──────────────────────────────┐
│  CONTENIDO PERMANENTE DE     │  ← Level 2: siempre visible en esta página
│  LA PÁGINA                   │
│  ┌────────────────────────┐  │
│  │  CONTENIDO DEL TAB     │  │  ← Level 3: intercambiable
│  │  (tab content)         │  │
│  └────────────────────────┘  │
│                              │
│  ╔══════════════════════════╗ │  ← Bottom bar (glassmorphism, ver §6)
│  ║  [FAB]  [● ● ●]  [FAB] ║ │
│  ╚══════════════════════════╝ │
└──────────────────────────────┘
```

> [!note] Bottom bar
> El "bottom bar" es el **conjunto completo**: pill navbar (●●●) + botones FAB + fondo glassmorphism blur. No son componentes separados. El gradiente de fondo **no es negro sólido** — es un blur (glassmorphism) que permite ver difusamente los elementos de la página debajo.

---

### 2.2 Operations (página izquierda)

**FAB izquierdo (exterior):** Abrir Queue list (Level 4)

**Contenido permanente:** solo el tab bar con las pestañas de subtab.

**Tabs (Level 3) — ver §3.1:**
- Content (Find & Replace)
- File Ops (rename, delete, move)
- Importer
- Template
- File diff

**Anatomía del tab en Operations:** el tab muestra únicamente el nombre del tab como heading (sin header izquierdo/derecho). Cuando los tabs son menos de los disponibles (ej. el usuario eliminó uno desde el D&D modal), los elementos restantes se centran.

---

### 2.3 Statistics (página central — main)

**FAB izquierdo:** Add-ons (stub, futuras extensiones)
**FAB derecho:** Settings (abre `ObsiManSettingsTab`)

**Contenido:**
- Nombre del vault (heading renameable — permite poner nombre del baúl del usuario, con icono de referencia y banner opcional)
- **Stat cards** en grid: `Folders` | `Files` | `Props` | `Values` | `Tags` — cada card tiene icono + label + número
- **Scope toggle** (selection pills estilo tags): `in vault` | `Filtered` | `selected`
  - Pills desactivados: color faint/accent al 67% transparente
  - Pill activo: color accent sólido
  - Cambia los números mostrados en las stat cards
- **Meta stats:** `Total links` + `Word count`

> [!note] Futuro
> Esta página está diseñada para alojar dashboards en versiones superiores a 1.0. Por ahora solo contiene las stat cards y meta stats.

---

### 2.4 Filters (página derecha)

**FAB derecho (exterior):** Abrir Active Filters popup (Level 4)
**FAB izquierdo:** ninguno (página en posición derecha)

**Contenido permanente:** filters header + tab bar

**Filters header** (presente siempre, excepto cuando un Level 4 lo reemplaza):
```
[ View mode ] [ Clear text ] [ Category/Subcategory toggle ] [ Sort mode ]
    (FAB)                                                        (FAB)
```
- Izquierda: botón de view mode (abre el view mode popup Level 4)
- Centro-izq: botón clear text
- Centro-der: toggle de Category/Subcategory
- Derecha: botón de sort mode (abre el sort popup Level 4)

**Tabs (Level 3) — ver §3.2:**
- Tags
- Props
- Files

---

## 3. Tabs (Level 3)

### 3.1 Tabs de Operations

Anatomía simple: solo heading con el nombre del tab.

| Tab | Contenido |
|-----|-----------|
| **Content** | Find input + toggles `Aa` (case) + `.*` (regex) · Replace input · Scope hint · Preview + Queue buttons |
| **File Ops** | Grupos: Rename (patrón `{{title}}` `{{date}}` `{{counter}}`), Delete, Move. Input + afected files count. Botón "send to queue" |
| **Importer** | Origin path · Destination path · crea archivos en destino desde origen |
| **Template** | Saved queue actions · Saved filter groups · Saved linter templates |
| **File diff** | Queue list como file selector · Vista before/after preview por archivo individual |

---

### 3.2 Tabs de Filters

Cada tab tiene el **filters header** como contenido permanente de la página más su propio contenido de tab.

#### Tags tab
- Árbol de tags con indentación ilimitada (tags anidados `parent/child/grandchild`)
- Sin toggle global (a diferencia de Props)
- Vista por defecto: **Tree list**
- Click en tag hoja → añade filtro `has_tag`
- Right-click → context menu: Rename · Delete · Send to (front)matter

#### Props tab
- Árbol de propiedades con expansión a valores
- Vista por defecto: **Tree list**
- Toggle global (select/deselect all)
- Frecuency number visible (opcional)
- Click en prop → filtro `has_property`; click en valor → filtro `specific_value`
- Right-click → context menu: Rename · Change type · Delete · Send to queue

#### Files tab
- Lista/grid de archivos del scope
- Vista por defecto: **Grid** (estilo tabla Bases sin líneas verticales visibles — similar al core plugin Bases table)
- Toggle checkboxes · Category/Subcategory grouping · Search
- Right-click → context menu: Rename · Delete · Move file · Send to queue

> [!important] Vistas disponibles para todos los tabs
> Tags, Props y Files comparten el mismo set de vistas:
> **Tree list** · **D&D list** · **Grid** · **Cards** · **Masonry**
> Cada una tiene su frame Level 1 propio (excepto Masonry que aún no tiene frame). La vista D&D list integra los botones de Linter en templates específicos de filtros (reemplazó al frame Linter dedicado que ya no existe).

---

## 4. Pop-ups (Level 4)

Los pop-ups Level 4 se activan desde botones en el header o desde FABs. Se dividen en dos tipos:

### Tipo A — Pop-up island (lista flotante)

Usado por: Queue list, Active Filters, y cualquier menú sin frame Level 4 propio.

```
                    ┌──────────────────┐
                    │  squircle  sqr   │  ← Squircle buttons como islas
                    │  island    island │    SEPARADAS, flotando encima
                    └──────────────────┘    del pop-up body
         ┌──────────────────────────────┐
         │  pop-up body (island)        │  ← Isla flotante, scrollable
         │  (tree list / items)         │    un poco por encima del bottom bar
         └──────────────────────────────┘
╔══════════════════════════════════════════╗
║  bottom bar (pill navbar + FABs)         ║
╚══════════════════════════════════════════╝
```

- La isla del body flota **sobre** el bottom bar (el bottom bar permanece visible debajo)
- Los squircle buttons del header son **islas separadas** (no un header dentro del body), flotando un poco más arriba que el body
- Versiones: mini (colapsada) y expanded (expandida con tree list completa)
- Referencia visual: frame Level 1 "Pop-up island tree list mini/expanded"

**Active Filters popup:** Al abrirse, todo lo demás se difumina (blur backdrop) excepto el popup. Contiene:
- Squircles (islas): See Props · Go to ops · Enter filters tab
- Body: lista de filtros activos con toggle + delete por regla
- Squircles inferiores: Clear filters · [reservado] · Filter templates · Apply filters
- Close button (FAB derecho del bottom bar cambia a ✕)

**Queue list popup:** Similar estructura. Squircles: Add file · Clear queue · Actions template · Aplicar cambios · Eliminar acción. Body: lista de items con grupo específico (rename/delete/move/change prop). Click en elemento → expande en el grupo.

### Tipo B — Helping bubble

Para tooltips, hints contextuales y confirmaciones simples.
Burbuja pequeña flotante, posicionada relativa al elemento que la dispara. Referencia: frame Level 1 "Helping bubble".

### Tipo C — Sort popup (Filters tabs)

Se activa desde el botón Sort (derecha del filters header) y **reemplaza el filters header** con su propio container. Animación de transición al abrir y cerrar.

Contiene los siguientes componentes (todos descritos en wireframe Content y Templates):

**Drop pill** (scope by type of prop):
- Pill vertical con dos botones circulares: uno color accent (opción seleccionada) + uno drop-down
- Al hacer click en drop-down: expande debajo con animación deslizante mostrando un pill vertical con iconos de cada tipo de prop disponible

**Drop-down list** (scope: all vault / filtered files / selected files):
- Container color secondary con texto color primary
- Botón circular drop-down en el extremo derecho con `^`/`v` para expandir/colapsar
- Distinto del scope toggle de Statistics: este es una lista, no selection pills

**Squircle selection hub** (criterio de ordenamiento):
- 4 squircles en fila horizontal
- Con selection colors (accent para activo, faint para inactivo)

**Nav button** (cerrar popup):
- Botón circular con `<` o `>` según su posición (derecha del filters header → `>` porque está en la esquina derecha; izquierda → `<`)
- Al hacer click: cierra el sort popup y devuelve el filters header con animación de transición

### Tipo D — View mode popup (Filters tabs)

Se activa desde el botón View mode (izquierda del filters header) y **reemplaza el filters header** con su propio container. Más simple que el sort popup.

Contiene:
- **Nav button** `<` (esquina superior izquierda — está en la izquierda)
- **Selection pills** con iconos de las vistas disponibles (Tree · D&D · Grid · Cards · Masonry)
  - Estilo: color primary (activa) y secondary (inactiva)
- **Squircle multi-selection hub** para mostrar/ocultar elementos del contenido de la vista (toggle de columnas, propiedades visibles, etc.)

**Excepción — Prop columns (Files view modal):**
- Un squircle especial con un botón drop-down circular dentro
- Al activarse: pone blur en todo el frame y muestra debajo del hub un **D&D list** de las propiedades disponibles del scope (para reordenar columnas)

### Tipo E — Right-click context menu

Menú contextual posicionado relativo al elemento clickeado (no slide-up).
- Container pequeño, bordes redondeados
- Items: icon + label
- Tags: Rename · Delete · Send to (front)matter
- Props: Rename · Change type · Delete · Send to queue
- Files: Rename · Delete · Move file · Send to queue

### Tipo F — D&D Top & bottom bar modal

Se activa desde long-press en el pill navbar o en el tab bar. Reemplaza el bar desde el que lo activaste con un modal de drag-and-drop para reordenar páginas o tabs respectivamente. Referencia: frame Level 1 "Drag and drop pill navbar modal y tab bar modal".

### Tipo G — Top & bottom bar switched

Layout alternativo donde la posición de la top bar y bottom bar se intercambian. Referencia: frame Level 1 "Top & bottom bar switched". Configurable por el usuario.

---

## 5. Componentes Level 1 (reutilizables)

Estos son los bloques de construcción que se combinan en pages y tabs. Están definidos en los wireframes de Templates y Content.

### Componentes de entrada/acción

| Componente | Descripción |
|------------|-------------|
| **Input** | Campo de texto estándar — color primary/secondary, pill shape |
| **Button** | Botón estándar — color accent |
| **Icon** | Botón icono solo (sin texto) — circular |
| **Number** | Input numérico con `00` placeholder |
| **Checkbox** | Checkbox estándar |
| **Toggle** | Toggle switch (on/off) |
| **Slider** | Slider horizontal |
| **Drop-down list** | Container secondary + texto primary + botón drop-down circular derecha |
| **Drop pill** | Pill vertical: botón accent + botón drop-down; expande hacia abajo con opciones en iconos |

### Componentes de selección

| Componente | Descripción |
|------------|-------------|
| **Pill** | Pill horizontal de selección — texto |
| **Selection pills** | Pills en fila: primary (activo) / secondary (inactivo). Para vistas y modos |
| **Tab** | Tab selector (circle dot) |
| **Page** | Indicador de página (dot con estado) |
| **Drop pill** | Ver arriba |

### Componentes de layout/contenido

| Componente | Descripción |
|------------|-------------|
| **Heading** | Título de sección — texto grande, color primary |
| **Text** | Texto de contenido estándar |
| **List** | Lista vertical con filas (texto + icono opcional) |
| **Icon grid** | Grid de iconos en matriz uniforme |
| **Card** | Card horizontal: thumbnail + texto + acción (toggle/badge) |
| **Box card** | Card rectangular con más contenido interno |
| **Heading box** | Fila con heading prominente + acción derecha |
| **Info box** | Fila con icono grande izquierda + texto + acción |
| **Draggable entry** | Fila arrastrable: handle + contenido + acciones |

### Componentes de agrupación/navegación

| Componente | Descripción |
|------------|-------------|
| **Tab hub** | Fila de 4 círculos (dots) para selección de tab |
| **Button Hub** | Fila de squircles (cuadrados redondeados) para acciones |
| **Selection hub** | Fila de squircles + colores de selección |
| **Multi-select hub** | Squircles con estado de selección múltiple |
| **Draggable list** | Lista con handles de drag + items |
| **Selection list** | Lista con radio/checkbox por item |
| **Draggable & selectable list** | Combinación de los dos anteriores |
| **Drop-down list** | Container colapsable con items |
| **Search box** | Input con icono lupa |
| **Nav button** | Botón circular `<` o `>` para cerrar popups / navegar |

### Vistas de contenido (Level 1)

| Vista | Descripción | Default en |
|-------|-------------|-----------|
| **Tree list** | Árbol expandible con indentación | Props, Tags |
| **D&D list** | Lista drag-and-drop con handles | — (todas) |
| **Cards view** | Grid de cards con icono grande + stats | — |
| **Grid view** | Tabla estilo Bases: sin líneas verticales | Files |
| **Masonry** | Grid masonry (aún sin frame propio) | — |

> [!note] D&D list y Linter
> La vista D&D list integra botones de Linter para aplicar templates específicos de filtros. No existe un frame Linter dedicado — la funcionalidad está embebida en esta vista.

---

## 6. Bottom bar — especificación detallada

El bottom bar es el **conjunto completo** que siempre aparece al fondo de cualquier página/tab.

```
╔════════════════════════════════════════╗
║  glassmorphism blur background         ║
║  [FAB izq]  [● ● ●  pill]  [FAB der]  ║
╚════════════════════════════════════════╝
```

- **Fondo:** glassmorphism blur (NO gradiente negro). Permite ver difusamente los elementos de la página detrás. En CSS: `backdrop-filter: blur(Xpx)` con `background: rgba(--background-primary, 0.7)` o similar.
- **Pill navbar:** muestra un dot por página, el activo resaltado. El dot activo tiene el ícono de la página o glow.
- **FABs:** posicionados a los lados. La página determina cuáles FABs aparecen (ver §2).
- **Long-press en pill:** activa el D&D modal (Level 1, Type F) para reordenar páginas.

---

## 7. Pop-up islands — especificación detallada

```
         ┌─────────┐   ┌─────────┐
         │ squircle│   │ squircle│   ← Islas separadas de squircles
         └─────────┘   └─────────┘     (no un header dentro del body)
    ┌──────────────────────────────┐
    │                              │
    │   island body                │   ← Isla principal (scrollable)
    │   (contenido del popup)      │     flotando sobre el bottom bar
    │                              │
    └──────────────────────────────┘
╔════════════════════════════════════╗
║  bottom bar (visible debajo)       ║
╚════════════════════════════════════╝
```

Los squircles del "header" del popup **no están dentro del body** — son islas flotantes independientes, posicionadas encima del body island. El bottom bar permanece visible y funcional (el FAB derecho puede cambiar a ✕ para cerrar).

---

## 8. Scope toggle — dos variantes

| Variante | Dónde aparece | Estilo |
|----------|---------------|--------|
| **Selection pills (tags style)** | Statistics page | Pills con color faint/accent 67% para inactivos · accent sólido para activo |
| **Drop-down list** | Sort popups de Filters tabs | Container secondary + texto primary + botón drop-down circular derecha |

No son el mismo componente aunque expresan el mismo concepto (all vault / filtered / selected).

---

## 9. Sistema de clases CSS propuesto

Basado en los patrones del wireframe, estas son las clases que deben cubrir todo el diseño de forma sistemática:

### Clases de estructura (ya existen, posiblemente renombrar)
```css
.obsiman-view                    /* contenedor raíz del plugin */
.obsiman-pages-viewport          /* viewport de scroll horizontal */
.obsiman-page-container          /* contenedor de las 3 páginas */
.obsiman-page                    /* página individual */
```

### Bottom bar (glassmorphism — REEMPLAZA el gradiente negro)
```css
.obsiman-bottom-bar              /* el conjunto completo */
.obsiman-bottom-bar::before      /* glassmorphism blur background */
.obsiman-pill-navbar             /* los dots de navegación */
.obsiman-fab                     /* botón FAB individual */
.obsiman-fab--left               /* FAB exterior izquierdo */
.obsiman-fab--right              /* FAB exterior derecho */
```

### Tab structure (Level 3)
```css
.obsiman-tab-dots                /* fila de dots/icons para seleccionar tab */
.obsiman-tab-content             /* zona scrollable del tab */

/* Solo Filters page tabs: */
.obsiman-filters-header          /* barra de acciones del Filters page */
.obsiman-filters-header-left     /* view mode FAB */
.obsiman-filters-header-center   /* clear text + category toggle */
.obsiman-filters-header-right    /* sort mode FAB */

/* Solo Operations page tabs: */
.obsiman-ops-tab-heading         /* nombre del tab (centrado si hay pocos tabs) */
```

### Pop-up islands
```css
.obsiman-popup-island            /* isla principal flotante */
.obsiman-popup-island--mini      /* versión colapsada */
.obsiman-popup-island--expanded  /* versión expandida */
.obsiman-popup-squircles         /* fila de squircles (island separada) */
.obsiman-popup-squircle          /* squircle individual */
.obsiman-popup-squircle.is-active
```

### Statistics page
```css
.obsiman-stat-cards-grid         /* grid wrapper */
.obsiman-stat-card               /* card individual */
.obsiman-stat-card-icon
.obsiman-stat-card-label
.obsiman-stat-card-value
.obsiman-stat-scope-pills        /* scope toggle (selection pills) */
.obsiman-stat-scope-pill         /* pill individual */
.obsiman-stat-scope-pill.is-active
.obsiman-stat-meta               /* total links + word count */
```

### Sort popup (Filters)
```css
.obsiman-sort-popup              /* container que reemplaza filters header */
.obsiman-drop-pill               /* pill vertical: accent + dropdown */
.obsiman-drop-pill-expanded      /* versión expandida con opciones */
.obsiman-dropdown-list           /* container secondary con items */
.obsiman-sort-selection-hub      /* 4 squircles en fila */
.obsiman-nav-btn                 /* botón circular < o > */
```

### View mode popup (Filters)
```css
.obsiman-view-popup              /* container que reemplaza filters header */
.obsiman-view-selection-pills    /* pills con iconos de vista */
.obsiman-view-selection-pill
.obsiman-view-selection-pill.is-active
.obsiman-view-multihub           /* squircle multi-selection hub */
.obsiman-prop-columns-overlay    /* blur + D&D list para prop columns */
```

### Componentes genéricos reutilizables
```css
.obsiman-context-menu            /* right-click menu */
.obsiman-context-item
.obsiman-helping-bubble          /* tooltip/hint bubble */
.obsiman-selection-pills         /* selection pills genéricas (primary/secondary) */
.obsiman-selection-pill
.obsiman-selection-pill.is-active
```

---

## 10. FAB → popup mapping actualizado

| Página | FAB | Abre |
|--------|-----|------|
| Operations (izq) | FAB izquierdo | Queue list popup (Type A) |
| Statistics (centro) | FAB izquierdo | Add-ons (stub) |
| Statistics (centro) | FAB derecho | Settings |
| Filters (der) | FAB derecho | Active Filters popup (Type A) |
| Filters > filters header | Botón izquierdo | View mode popup (Type D) — reemplaza header |
| Filters > filters header | Botón derecho | Sort popup (Type C) — reemplaza header |

---

## 11. Conexiones con otros documentos

- **[[Obsiman - User Interface]]** — requisitos funcionales de cada sección (search, operaciones, importador, etc.)
- **[[ObsiMan - Plugin Architecture]]** — servicios que alimentan los datos mostrados en cada página/tab:
  - Statistics page ← `PropertyIndexService` + `FilterService` + `app.vault`
  - Filters > Props tab ← `PropertyIndexService` + `PropertyExplorerComponent`
  - Filters > Tags tab ← `metadataCache.getAllTags()` (nueva componente)
  - Filters > Files tab ← `FilterService.filteredFiles` + `FileListComponent`
  - Operations tabs ← `OperationQueueService` + `FilterService`
- **[[ObsiMan - Known Issues]]** — bugs abiertos que afectan la UI

---

## 12. Estado de implementación

| Elemento | Estado |
|----------|--------|
| Pill navbar (3 páginas, drag reorder, badges) | ✅ |
| Bottom bar glassmorphism blur | ❌ (actualmente gradiente negro) |
| Operations page + subtabs (Content, FileOps parcial) | ✅ parcial |
| Statistics page | ❌ no existe |
| Filters page con 3 tabs (Tags/Props/Files) | ❌ (actualmente tiene Search/Scope/Sort/View) |
| Filters > Tags tab (árbol de tags dedicado) | ❌ |
| Filters > Props tab (PropertyExplorer) | ✅ |
| Filters > Files tab (FileListComponent) | ❌ (era página central) |
| Sort popup con drop pill + dropdown list + hub + nav btn | ❌ |
| View mode popup con nav btn + pills + multi-hub | ❌ parcial |
| Active Filters popup (island) | ✅ parcial |
| Queue list popup (island) | ✅ parcial |
| Pop-up squircles como islas separadas | ❌ (actualmente están dentro del body) |
| Right-click context menu | ❌ stub |
| Scope toggle (Statistics) — selection pills estilo tags | ❌ |
| Grid view Files (estilo Bases, sin líneas vert.) | ❌ (actual es diferente) |
| D&D list view con botones Linter | ❌ |
