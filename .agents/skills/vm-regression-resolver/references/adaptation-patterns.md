# Patrones de adaptación conceptual

Cuando la reimplementación directa no es viable porque el codebase cambió estructuralmente, el agente debe **extraer la intención** de la versión funcional y reimplementarla adaptada al estado actual. Esta referencia cubre los patrones más comunes.

## Metodología general

Antes de adaptar, responde estas tres preguntas por escrito (como parte del plan que presentas al humano):

1. **Intención:** ¿Qué problema resolvía la versión buena? (descripción en lenguaje natural, sin referirse al código)
2. **Mecanismo:** ¿Cómo lo resolvía? (pasos lógicos, también en lenguaje natural)
3. **Contexto actual:** ¿Qué piezas del codebase actual corresponden a las que la versión buena usaba? ¿Cuáles ya no existen? ¿Cuáles son nuevas?

Con estas tres respuestas, la adaptación deja de ser "reescribir el código" y pasa a ser "resolver el mismo problema con las piezas disponibles ahora".

---

## Patrón 1: Función renombrada o movida de módulo

**Síntoma:** La versión buena llama a `utils.validate_token(t)`. En HEAD, `utils.py` ya no tiene esa función; fue movida a `auth/validators.py` y renombrada a `verify_jwt`.

**Cómo detectarlo:**
```bash
git log --diff-filter=D -S "def validate_token" --oneline
git log --diff-filter=A -S "def verify_jwt" --oneline
```

**Adaptación:**
- Localiza la nueva ubicación de la lógica.
- Verifica que la firma y el comportamiento sean equivalentes (no siempre lo son; a veces el rename vino con cambios de contrato).
- Actualiza la llamada, no copies la implementación vieja.

**Anti-patrón:** Reintroducir `validate_token` en `utils.py` "porque así funcionaba antes". Esto duplica lógica y rompe la convención nueva.

---

## Patrón 2: Cambio de firma de función

**Síntoma:** La versión buena llamaba `save_user(name, email)`. La firma actual es `save_user(user: UserDTO)`.

**Cómo detectarlo:**
```bash
git log -p -S "def save_user" -- path/to/users.py
```
Lee los commits que tocaron la firma para entender por qué cambió.

**Adaptación:**
- Construye el nuevo tipo (`UserDTO`) a partir de los datos que la versión buena pasaba individualmente.
- Si el `UserDTO` requiere campos que la versión buena no tenía, investiga si hay valores por defecto razonables o si la regresión requiere también actualizar el llamador río arriba.

**Señal de alarma:** Si adaptar a la nueva firma requiere inventar datos que no existen en el contexto, probablemente la regresión es más profunda y el problema no es solo el llamador —consulta con el humano antes de seguir.

---

## Patrón 3: Extracción a nueva capa de abstracción

**Síntoma:** La versión buena hacía validación + persistencia + notificación en una sola función. El codebase actual separó esas responsabilidades en tres clases distintas (pattern: Service + Repository + Notifier).

**Cómo detectarlo:**
- Diff muestra aparición de archivos nuevos con nombres como `*_service.py`, `*_repository.py`, interfaces/protocols nuevas.
- La función original ya no existe o quedó como un stub que delega.

**Adaptación:**
- No reintroduzcas la función monolítica. Identifica en cuál de las tres capas estaba la lógica que falta.
- Restaura la lógica **dentro** de la capa correspondiente, respetando el contrato de la interfaz.
- Si la lógica buena cruzaba capas (validación + persistencia juntas), pregúntate: ¿esa mezcla era la *intención* o era un accidente del diseño viejo? Consulta al humano si hay duda.

---

## Patrón 4: Cambio de estructura de datos

**Síntoma:** La versión buena trabajaba con un `dict` plano. El codebase actual introdujo un `dataclass` con validación. El bug aparece porque la lógica nueva no maneja un caso que el dict sí manejaba implícitamente.

**Cómo detectarlo:**
```bash
git diff <COMMIT_BUENO> HEAD -- "**/models.py" "**/schemas.py" "**/types.py"
```

**Adaptación:**
- Identifica qué *caso de uso* manejaba el dict que el dataclass no maneja (campos opcionales, tipos unión, defaults).
- Extiende el dataclass para cubrir ese caso, o ajusta la lógica para construir el dataclass correctamente en el flujo roto.
- No vuelvas al dict; la migración es intencional.

---

## Patrón 5: Dependencia externa actualizada

**Síntoma:** La versión buena usaba una librería externa con una API que cambió en la versión actual del proyecto. El agente que subió la versión de la librería no actualizó todos los call-sites.

**Cómo detectarlo:**
```bash
git log --oneline -- requirements.txt package.json pyproject.toml Cargo.toml
git diff <COMMIT_BUENO> HEAD -- requirements.txt
```

**Adaptación:**
- Consulta la documentación de la nueva versión de la librería para el equivalente del método usado antes.
- Adapta el call-site roto a la nueva API.
- Verifica si hay otros call-sites en el mismo estado (grep por el método viejo) —la regresión puede ser más amplia que un solo punto.

---

## Patrón 6: Cambio en el modelo de concurrencia o async

**Síntoma:** La versión buena era síncrona. El codebase actual migró a async/await. La función llamadora ahora es `async def` pero llama a la versión buena sin `await`, o al revés.

**Cómo detectarlo:**
```bash
git diff <COMMIT_BUENO> HEAD -- path/to/archivo.py | grep -E "^\+.*async|^-.*def "
```

**Adaptación:**
- Adapta la versión buena al nuevo modelo: añade `async`/`await` donde corresponda, o envuelve con `asyncio.run` si el contexto es síncrono.
- Revisa que todo el *camino de llamada* esté coherente: un solo `await` faltante en la cadena causa errores sutiles.
- Si la librería interna no soporta async, puede necesitarse `asyncio.to_thread` o similar.

---

## Cuándo decir "no puedo adaptar esto, necesito ayuda humana"

Algunas situaciones escapan de adaptación automática y justifican detenerse y pedir guía humana explícita (más allá de la aprobación estándar de Fase 4B):

- **La versión buena dependía de código que ya no existe y no tiene reemplazo claro** en el codebase actual. Adaptar sería inventar arquitectura.
- **Hay evidencia de que la "versión buena" también tenía bugs**, solo que distintos a los actuales. Restaurarla reintroduce esos bugs. Necesitas decisión humana sobre qué hacer.
- **El commit bueno y el HEAD están tan alejados** (decenas de commits, múltiples refactors intermedios) que reconstruir la intención es especulativo.
- **Los tests del commit bueno ya no corren** en HEAD por cambios de infraestructura de testing. No puedes validar objetivamente que tu adaptación preserva el comportamiento.

En estos casos, presenta el análisis al humano con los hallazgos —no intentes resolver a ciegas.

---

## Plantilla de plan de adaptación (para Fase 4B)

Cuando presentes una adaptación para aprobación, usa esta estructura:

```
## Diagnóstico
- Test que falla: <nombre del test>
- Síntoma: <qué comportamiento está roto>
- Commit que introdujo la regresión: <hash> (<mensaje del commit>)
- Último commit funcional: <hash> (<mensaje del commit>)

## Intención original
<2-4 frases describiendo qué resolvía la versión buena y cómo, en lenguaje natural>

## Por qué no puedo copiar textualmente
<lista de cambios estructurales relevantes: renames, refactors, cambios de API, etc.>

## Plan de adaptación
- Archivo(s) a modificar: <lista>
- Cambios propuestos: <descripción; opcionalmente un diff preview>
- Cómo preserva la intención original: <explicación>

## Validación
- Test que confirmará la resolución: <nombre>
- Otros tests que corro para detectar regresiones colaterales: <suite completa o subset>

¿Apruebas aplicar este plan?
```
