# SE1020 implementation report

The Traveler platform includes a Java 21 Spring Boot backend and React/TypeScript frontend, with six management modules and shared notifications. Persistent storage and application HTTP communication now use a genuine plain-text format. No database was introduced.

The current report is [Text storage implementation and viva guide](../no-json/implementation-and-viva.md). It documents the file format, Java read/write classes, preserved CRUD behavior, authentication changes, build/tooling exceptions and limitations.

See [pre-change impact](../no-json/pre-change-impact.md), [migration verification](../no-json/migration-verification.md), [test results](test-results.md), [API reference](../api.md), [recovery](../recovery.md) and [class responsibilities](../oop-documentation/class-responsibilities.md).
