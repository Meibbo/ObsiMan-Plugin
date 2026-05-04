---
title: "Propuesta: Optimización del Sistema PKM-AI y Comportamiento de Agentes"
type: architecture-proposal
status: draft
initiative: hardening
parent: "[[.agents/docs/architecture/index|architecture]]"
created: 2026-05-04T16:50:00
updated: 2026-05-04T16:50:00
tags:
  - architecture/agent
  - system/improvement
---

# Propuesta de Mejora: Protocolo de Fidelidad Técnica

## 1. El Problema: El Sesgo Conversacional
Los agentes IA tienden por diseño a ser "útiles" en el chat, lo que provoca que el detalle técnico se quede en la ventana de conversación y se pierda para futuros agentes (fuga de contexto). El modo `caveman` actual mitiga el uso de tokens, pero no evita que el agente "se guarde" información para el chat en lugar de escribirla en el disco.

## 2. Nueva Directiva: "The File is the Truth" (FIT)
Se propone añadir a `AGENTS.md` las siguientes reglas de oro:

### A. Entregable Único para Scout/Research
En modo `scout` o `research`, el agente **no tiene permitido** reportar hallazgos técnicos en el chat.
- **Flujo Prohibido:** "Encontré que la línea 45 falla por X. [Reporte creado]".
- **Flujo Obligatorio:** "Reporte de error en línea 45 creado en `[path]`. Scout finalizado".
- **Razón:** Fuerza al usuario y al agente a interactuar con la base de conocimientos, no con la memoria volátil del chat.

### B. Prohibición de Resúmenes Técnicos (No-Summary Rule)
La documentación técnica NO debe contener resúmenes narrativos si existe código fuente disponible.
- **Obligatorio:** Incluir el snippet real + análisis de impacto.
- **Prohibido:** "La función X se encarga de gestionar la cola de forma asíncrona".

### C. Shunting Automático al Disco
Si una explicación técnica en el chat requiere más de 5 líneas o incluye un fragmento de código, el agente debe:
1. Crear/Actualizar un archivo de notas (`.agents/docs/work/research_notes.md`).
2. Referenciar el archivo en el chat.
3. Borrar la explicación del chat (o no escribirla).

## 3. Mejora en la Estructura de `AGENTS.md`

### Refuerzo de la Split Caveman Policy:
Añadir una cláusula de **"Hard Enforcement"**:
> "Si un agente detecta que ha proporcionado información técnica en el chat que NO está presente en la documentación persistente, debe pausar y sincronizar los archivos antes de continuar. El chat es para coordinación; el disco es para conocimiento."

## 4. Auditoría de Handoff
Implementar un archivo `HANDOFF_CHECKLIST.md` que el agente debe completar al final de cada sesión, marcando:
- [ ] ¿Toda la info del chat está en el doc?
- [ ] ¿Se incluyeron snippets reales?
- [ ] ¿Se evitaron generalizaciones narrativas?

---
**Firmado:** Antigravity (AI Agent)
