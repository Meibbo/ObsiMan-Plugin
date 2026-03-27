---
in:
  - "[[ObsiMan]]"
type:
  - task
author:
  - "[[Meibbo]]"
input: AI-gen
related:
  - "[[ObsiMan - Marketing]]"
  - "[[ObsiMan - Structure]]"
---
# User Interface
The combination of elements in different spaces that gives control to the user
## Theme
- [ ] theme selector in settings
	- [ ] different decorations
- python specifics
	- [ ] dark contrast
	- [ ] dracula
	- [ ] make rename file window more stretched
## Windows (Sidebar & Main view)
pienso hacer que la única diferencia entre el sidebar y la main view es que las tres secciones principales se muestren en pestañas en el pequeño y todos en simultáneo en el grande
### File Section
posible integración de una base modelo
### Properties Section
- queue tree
- file operations tree
- navbar
	- para las operaciones de archivo
- valores
	- [ ] cuando el filtro de propiedades está en selected o filtered files, los valores con 0 ocurrencias siguen apareciendo aunque deberían dejar de mostrarse al igual que las propiedades.
### Operations Section
### status bar
## Widgets
- Auto-suggestion Combobox
	- text input
	- dropdown
	- text filtering
- Draggable list box
- expandable list
- Checkbox
- toggle function
- Tabs
- Buttons
- Slider
- Date & Time chooser
# Functionality
## search & filter
explain
## selection box
explain
## operations
- Set / Create property
	- Replace all values option
	- Append values option
		- only available when the property type is text or list
- Change type
- Rename
	- Properties option
	- values option
- Delete
	- Clean empty properties
# Files
## file mixer
## file renamer
## files to folder
# Tools
## función plantillas
- filtros y grupos lógicos
- queue changes
	- [ ] los cambios en la vista previa del archivo en la sección de operaciones muestra los cambios que se van a realizar según los pending changes, pero la ventana específica de diff hace lo mismo
- templater plugin support
## función linter
- ordenar según plantillas
## Importe de datos
- HabitKit `json`
- Dailyo `json`
- LaunchBox `xml`
- Contacts `csv`, `vcf`