# Comandos Git para resolución de regresiones

Referencia rápida con comandos útiles en cada fase del workflow. Agrupados por propósito.

## Búsqueda automática del commit culpable: `git bisect`

La herramienta más potente cuando hay un test reproducible. Vaultman tiene commits granulares → bisect converge rápido (log₂(N) pasos).

### Bisect manual

```bash
git bisect start
git bisect bad HEAD                # commit donde el test falla
git bisect good <hash-antiguo>     # commit donde sabes que funcionaba
# Git te pone en un commit intermedio. Corre el test y marca:
git bisect good     # si pasa
git bisect bad      # si falla
# Repetir hasta que git identifique el commit culpable
git bisect reset    # volver a HEAD cuando termines
```

### Bisect automatizado (preferido)

```bash
git bisect start HEAD <hash-antiguo>
git bisect run pytest tests/test_feature.py::test_especifico
# El script debe retornar 0 si el test pasa, non-zero si falla
git bisect reset
```

Para tests más complejos, envuelve el comando en un script:

```bash
# bisect_runner.sh
#!/bin/bash
pytest tests/test_feature.py::test_especifico -q
exit $?
```

```bash
chmod +x bisect_runner.sh
git bisect run ./bisect_runner.sh
```

## Inspección de historial

```bash
# Historial de un archivo (incluye renames con --follow)
git log --oneline --follow -- path/to/archivo.py

# Commits que añadieron o eliminaron un símbolo específico (pickaxe)
git log -S "nombre_funcion" --oneline
git log -S "nombre_funcion" --source --all   # incluye otras ramas

# Commits que modificaron líneas que matchean un regex
git log -G "patron.*regex" --oneline

# Commits por mensaje
git log --oneline --grep="autenticacion"
git log --oneline --grep="fix" --grep="auth" --all-match

# Commits por autor (útil para identificar qué agente tocó qué)
git log --author="agent-name" --oneline

# Commits en un rango de tiempo
git log --oneline --since="2 days ago" --until="1 hour ago"

# Ver qué commits están entre dos puntos
git log --oneline <COMMIT_BUENO>..HEAD
git log --oneline --stat <COMMIT_BUENO>..HEAD   # con resumen de archivos
```

## Atribución línea por línea: `git blame`

```bash
# Quién tocó cada línea de un archivo
git blame path/to/archivo.py

# Solo un rango de líneas (más legible)
git blame path/to/archivo.py -L 40,80

# Seguir movimientos de código (detecta líneas movidas desde otros archivos)
git blame -M -C path/to/archivo.py

# Blame en un commit específico del pasado
git blame <commit> -- path/to/archivo.py
```

## Extracción de versiones específicas

```bash
# Ver contenido de un archivo en un commit (sin checkout)
git show <commit>:path/to/archivo.py

# Guardar esa versión en un archivo temporal para comparar
git show <commit>:path/to/archivo.py > /tmp/version_buena.py

# Restaurar un archivo desde un commit específico al working directory
git checkout <commit> -- path/to/archivo.py
# (queda staged; revisa con git diff --cached antes de commit)

# Ver qué archivos existían en un commit (útil cuando hubo renames)
git ls-tree -r <commit> --name-only | grep "auth"
```

## Comparación entre versiones

```bash
# Diff de un archivo entre dos commits
git diff <COMMIT_BUENO> HEAD -- path/to/archivo.py

# Diff solo de un rango de líneas (usa -L, requiere git 2.25+)
git log -L 40,80:path/to/archivo.py

# Resumen estadístico de qué archivos cambiaron
git diff --stat <COMMIT_BUENO> HEAD

# Solo los nombres de archivos modificados
git diff --name-only <COMMIT_BUENO> HEAD

# Detectar renames y movimientos
git diff -M <COMMIT_BUENO> HEAD --name-status
# La columna muestra: A=añadido, M=modificado, D=eliminado, R=renombrado

# Diff de dos commits mostrando palabras en lugar de líneas
git diff --word-diff <COMMIT_BUENO> HEAD -- path/to/archivo.py
```

## Detección de cambios estructurales

Para decidir entre reimplementación directa (Fase 4A) vs. adaptación (Fase 4B):

```bash
# ¿Cuántos archivos cambiaron entre ambos commits?
git diff --name-only <COMMIT_BUENO> HEAD | wc -l

# ¿Hay archivos renombrados o movidos?
git diff -M --name-status <COMMIT_BUENO> HEAD | grep "^R"

# ¿Hay archivos eliminados?
git diff --name-status <COMMIT_BUENO> HEAD | grep "^D"

# Ver cambios en imports/dependencias (señal fuerte de refactor)
git diff <COMMIT_BUENO> HEAD -- "*.py" | grep "^[+-]import\|^[+-]from"
git diff <COMMIT_BUENO> HEAD -- "package.json" "requirements.txt" "Cargo.toml"
```

Regla práctica: si entre `COMMIT_BUENO` y HEAD cambiaron más de ~5 archivos relacionados con el área de la regresión, o hay renombres, o hay cambios de imports, asume **adaptación** (Fase 4B).

## Aplicar cambios de otro commit

```bash
# Traer un archivo completo desde un commit anterior
git checkout <commit> -- path/to/archivo.py

# Aplicar solo un commit específico como parche (si el commit bueno introdujo la lógica)
git cherry-pick <commit>
git cherry-pick --no-commit <commit>   # deja los cambios staged sin commit

# Generar un parche para revisar antes de aplicar
git format-patch -1 <commit> --stdout > /tmp/fix.patch
git apply --check /tmp/fix.patch       # verificar si aplica limpio
git apply /tmp/fix.patch               # aplicar si pasó el check
```

## Comandos PROHIBIDOS en este workflow

Estos reescriben historial y rompen la trazabilidad que otros agentes necesitan:

- `git reset --hard <commit>` sobre ramas compartidas
- `git push --force` / `git push -f`
- `git rebase -i` con operaciones `drop` o `squash` sobre commits ya publicados
- `git commit --amend` sobre commits ya publicados
- `git filter-branch` / `git filter-repo`

Si necesitas "deshacer" un commit, usa `git revert <commit>` que crea un nuevo commit que deshace los cambios, preservando el historial.
