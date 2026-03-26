---
up:
  - "[[ObsiMan]]"
type:
  - comment
date: 2026-03-21
aliases: Untitled 16
tags:
input: "[[WhatsApp]]"
description: explicación detallada del flujo de trabajo con el plugin, con ejemplos de uso cotidiano
---
Diseñé una interfaz con lenguaje Python que busca archivos .md (archivos de texto modernos), lee sus propiedades YAML y los enlista en una matriz.

De la cual puedes aplicar filtros de búsqueda o queries en base a propiedades, valores, carpeta en la que se encuentran o el nombre del archivo. Puedes agruparlos en operadores lógicos ANY/ALL/NONE. Y además, guardar plantillas para insertar rápidamente dichos filtros.

Ejemplo:
Todos los archivos "ALL"
de la carpeta "Universidad"
con la propiedad "Materia" 
y el valor "Matemáticas"
que empiecen con el nombre "101_"; 

pero que no tengan "NONE"
la propiedad "Tipo" 
con el valor "Examen"
y la propiedad "Archivado"
tenga un valor "falso"

contando que "ANY"
la propiedad "Fecha"
tenga un valor "Enero"
O uno "Abril"
O tal vez "Junio"
O que su "importancia"
sea mayor a "2"

Lo más importante, de esos archivos filtrados puedes seleccionar Manualmente/Todos/Ninguno para realizar operaciones tipo ARCHIVO:

- Cambiar el nombre de formas inteligentes (colocar al principio, final, reemplazar texto, enumerar, etc).

 _Ejemplo_ :
A todos los archivos seleccionados ("el continente europeo, evolución de la cultura, comercio y grupos sociales"), colocar al principio del nombre el texto "Historia_101-".

- Mover archivos a una carpeta específica.

 _Ejemplo_ ;
Todos los archivos con fechas en sus nombres ("DD/MM/AAAA"), mover a la carpeta "Calendario".

También operaciones tipo PROPIEDADES:

- Un filtro por nombre, número de apariones y tipo de propiedad.
- Establecer una propiedad "X" y un valor "Y" por si los archivos seleccionados no lo tienen o actualizar el valor si la propiedad ya existe.

 _Ejemplo_ :
Seleccionaste tus notas de tareas asignadas, filtras y haces click en la propiedad "entregada" que es tipo checkbox y le colocas a todos el valor "true", osea ✅

También, les agregas la propiedad "Participantes" que es tipo lista y le agregas o quitas los valores "Manuel", "Pepito" y "Yo"

Y a la propiedad "Nota" de tipo número le colocas el valor "20"

- Con una opción para convertir susodicho valor en un link de markdown [nombre a mostrar](página web y otro archivo de texto, imagen, audio, etc), o un Wikilink [[nombre de archivo]]

 _Ejemplo_ :
Quieres que en la propiedad de "Profesor" el valor "José Pancho" sea un link clickeable que este envié a la nota acerca del profesor.

Pasará el valor a ser "[[José Pancho]]"

- Cambiar el nombre de una propiedad o de un valor

 _Ejemplo_ :
Escribiste mal el nombre de Jorge Talón como José Talón,  pero ahora hay archivos que tienen un nombre y, otros que tienen el otro, pese a ser la misma persona.

Seleccionas la propiedad "Participantes" 
renombrar valor "José Talón" a "[[Jorge Talón]]", para que también haya una nota del muchacho.

O si cambias de idioma, cambiar nombre de la propiedad "Participantes" a "Participants"

- Borrar propiedades o valores

 _Ejemplo_ :
Habrá propiedades o valores de cualquier tipo que dejes de utilizar, o que tenerlas en ciertos archivos no sea adecuado. Por lo que decides hacer una limpieza.

- Y una última operación para cambiar el tipo de la propiedad.

 _Ejemplo_ :
Quieres "publicado" deje de ser una *checkbox* y pase a ser una *fecha* o viceversa.

Publicado: "true" ->
Publicado: "2026-03-21"

Y otras herramientas más complejas como ordenar automáticamente el cómo aparecen las propiedades o valores en gran cantidad de archivos por orden alfabético, orden manual, etc. 

 _Ejemplo_ :
Descripción: Indica de forma atractiva y en lenguaje sencillo de comprender (con ejemplos) cómo funciona tu última adición de código al proyecto.
Importancia: Muy alta
Proyecto: Redes Sociales
Tipo: Tarea
Categorías: Comunicación, Publicidad, Entretenimiento
Título: Publica tus avances después de la última actualización
Estado: En progreso

Pasaría a ser:

 *Categorías* : Comunicación, Publicidad, Entretenimiento
 *Proyecto* : Redes Sociales
 *Tipo* : Tarea
 *Título* : Publica tus avances después de la última actualización
 *Descripción* : Indica de forma atractiva y en lenguaje sencillo de comprender (con ejemplos) cómo funciona tu última adición de código al proyecto.
Importancia: Muy alta
Estado: En progreso

---

## Nuevas funciones del plugin de Obsidian (v1.2)

### Property Explorer
El panel izquierdo del plugin muestra un árbol jerárquico de todas las propiedades del vault:
- **Nivel 1**: nombre de propiedad + cantidad de archivos que la tienen
- **Nivel 2**: cada valor observado + frecuencia

_Ejemplo_:
Abres ObsiMan y ves que `type` tiene 1,204 archivos. Expandes y ves "about (340)", "event (200)", "task (150)"... Haces click en "task" y automáticamente se filtra la tabla para mostrar solo archivos con `type: task`.

### Renombrado por patrón
Selecciona archivos y usa patrones con placeholders:
- `{basename}` — nombre actual
- `{date}` — fecha de hoy (YYYY-MM-DD)
- `{counter}` — numeración automática (001, 002...)
- `{propiedad}` — valor de una propiedad YAML

_Ejemplo_:
Tienes 50 notas de recetas sin orden. Usas el patrón `{category}-{counter} {basename}` y se renombran a "Postres-001 Brownie.md", "Ensaladas-002 César.md", etc.

### Linter integrado
Ordena las propiedades YAML de tus archivos delegando al plugin obsidian-linter:
- Define el orden de prioridad arrastrando propiedades
- Aplica el orden a archivos filtrados o seleccionados

_Ejemplo_:
Quieres que en todas tus notas las propiedades aparezcan: `type`, `tags`, `Category`, `in`, `up`, `description`... y luego el resto alfabéticamente.

### Sesiones con detección de conflictos
Guarda tu selección de archivos y filtros en un archivo .md:
- El indicador verde (●) muestra sincronización correcta
- Amarillo (●) si el archivo fue modificado externamente
- Rojo (●) si hay un conflicto de Google Drive

### Autosuggest universal
Todos los campos de texto (filtros, propiedades, valores, nombres) tienen autocompletado instantáneo con las propiedades y valores existentes del vault.