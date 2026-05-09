/**
 * @name TanStack virtualizer options missing getItemKey
 * @description TanStack virtualizer rows should use durable item keys instead of index keys.
 * @kind problem
 * @problem.severity warning
 * @precision high
 * @id vaultman/virtualizer-missing-item-key
 * @tags performance
 *       maintainability
 */

import javascript

private predicate hasOwnOption(ObjectExpr options, string name) {
  exists(Property prop | prop = options.getPropertyByName(name))
}

private predicate looksLikeVirtualizerOptions(ObjectExpr options) {
  hasOwnOption(options, "count") and
  hasOwnOption(options, "getScrollElement") and
  exists(string anchor |
    anchor = ["estimateSize", "overscan", "getItemKey"] and
    hasOwnOption(options, anchor)
  )
}

private predicate isCreateVirtualizerOptions(CallExpr call, ObjectExpr options) {
  call.getCallee().stripParens().(Identifier).getName() = "createVirtualizer" and
  options = call.getArgument(0).stripParens()
}

private predicate isSetOptionsVirtualizerOptions(MethodCallExpr call, ObjectExpr options) {
  call.getMethodName() = "setOptions" and
  options = call.getArgument(0).stripParens() and
  looksLikeVirtualizerOptions(options)
}

from ObjectExpr options
where
  looksLikeVirtualizerOptions(options) and
  not hasOwnOption(options, "getItemKey") and
  (
    exists(CallExpr call | isCreateVirtualizerOptions(call, options)) or
    exists(MethodCallExpr call | isSetOptionsVirtualizerOptions(call, options))
  )
select options,
  "TanStack virtualizer options should define getItemKey with a durable row or node id."
