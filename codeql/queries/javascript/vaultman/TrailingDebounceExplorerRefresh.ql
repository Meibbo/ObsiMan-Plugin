/**
 * @name Trailing debounce used for explorer refresh
 * @description Explorer index refresh paths should refresh immediately first and only coalesce trailing burst work.
 * @kind problem
 * @problem.severity warning
 * @precision high
 * @id vaultman/trailing-debounce-explorer-refresh
 * @tags performance
 *       maintainability
 */

import javascript

private predicate isExplorerIndexName(string name) {
  name = [
    "filesIndex",
    "propsIndex",
    "tagsIndex",
    "contentIndex",
    "operationsIndex",
    "activeFiltersIndex",
    "cssSnippetsIndex",
    "pluginsIndex",
    "templatesIndex"
  ]
}

private predicate isExplorerIndexReceiver(Expr receiver) {
  exists(string name |
    (
      name = receiver.getUnderlyingValue().(Identifier).getName() or
      name = receiver.getUnderlyingValue().(PropAccess).getPropertyName()
    ) and
    isExplorerIndexName(name)
  )
}

private predicate callbackContainsExplorerRefresh(Expr callback) {
  exists(Function fn, MethodCallExpr refresh |
    (
      fn = callback.stripParens().(FunctionExpr) or
      fn = callback.stripParens().(ArrowFunctionExpr)
    ) and
    refresh = fn.getBody().getAChild*() and
    refresh.getMethodName() = "refresh" and
    isExplorerIndexReceiver(refresh.getReceiver())
  )
}

private predicate isTrailingDebounce(CallExpr call, Expr callback) {
  call.getCalleeName() = "debounce" and
  callback = call.getArgument(0).stripParens()
}

private predicate isRawTimeout(CallExpr call, Expr callback) {
  call.getCalleeName() = "setTimeout" and
  callback = call.getArgument(0).stripParens()
}

from CallExpr call, Expr callback
where
  (
    isTrailingDebounce(call, callback) or
    isRawTimeout(call, callback)
  ) and
  callbackContainsExplorerRefresh(callback)
select call,
  "Explorer index refreshes should use leadingDebounce or an approved refresh scheduler so the UI refreshes immediately before trailing burst coalescing."
