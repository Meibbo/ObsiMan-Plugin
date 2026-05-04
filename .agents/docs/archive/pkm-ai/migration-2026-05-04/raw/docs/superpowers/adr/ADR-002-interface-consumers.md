# ADR-002: Consumers depend on interfaces, not concrete classes

- Date: 2026-04-30
- Status: Accepted

## Context
Sub-A defines 16 interfaces in `src/types/contracts.ts`. Without a rule, implementers would import concrete classes directly, coupling consumers to implementation details and making testing harder.

## Decision
Components and services consume `Ixxx` interfaces, not concrete classes. The concrete class is only referenced in `main.ts` for wiring. Constructor signatures may accept interfaces; return types are always the interface.

## Consequences
- `main.ts` is the only file allowed to `new ConcreteService(...)`.
- Tests can inject mock implementations of the interface without touching the real service.
- Changing a concrete class does not require updating consumers.

## Verification
`Grep` for `new serviceFilter` / `new serviceQueue` / etc. outside `main.ts` — should return 0.
