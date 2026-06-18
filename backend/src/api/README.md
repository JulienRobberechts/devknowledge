# api

HTTP entry layer. Exposes routes, handles auth, validation, and mapping to the `application` layer.

- `routes/` — endpoints (auth, documents, search, conversations, quizzes, config, admin)
- `middleware/` — `apiKeyAuth`, `errorHandler`
- `dto/` — transfer objects (e.g. `document.dto.ts`)

Contains no business logic: delegates to use cases in `../application`.
