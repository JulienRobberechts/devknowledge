# [TECH DEBT] AppSettingsService imports concrete config

**Affected layer:** `app/admin/AppSettingsService.ts`

## Problem

`AppSettingsService` directly imports the `config` singleton (line 9):

```typescript
import config from "../../config";
```

`config.ts` reads `process.env` and calls `dotenv.config()` — that is infrastructure. The `app` layer must not depend on it.

The service uses `config` for four things:
1. Checking API key availability (`config.embeddings.voyage.apiKey`, `process.env.OPENAI_API_KEY`, `process.env.MISTRAL_API_KEY`)
2. Checking R2 credentials availability (`config.storage.r2.*`)
3. Fallback default for storage backend (`config.storage.backend`)
4. Fallback defaults for chunking (`config.rag.chunkingStrategy/Size/Overlap`)

## Impact

- Tests for `AppSettingsService` require real environment variables
- The `app` / infra boundary is invisible: you cannot tell without reading the code that this service depends on the environment
- Substituting the configuration (e.g. tests with a different config) is impossible without patching `process.env`

## Approaches

### A — Constructor injection *(minimal fix)*

`registry.ts` passes values at construction time; `AppSettingsService` never touches `config`:

```typescript
class AppSettingsService {
  constructor(
    repo: IAppSettingsRepository,
    defaults: { chunkingStrategy, chunkSize, chunkOverlap, storageBackend },
    availability: { voyageKey: boolean; r2: boolean; openaiKey: boolean; mistralKey: boolean }
  ) {}
}
```

**Pro:** small change, closes the debt.
**Con:** heavy constructor; `availability` flags remain an odd concern for the app layer.

---

### B — `IEnvCapabilities` port *(pure hexagonal)*

```typescript
// infra-ports/
interface IEnvCapabilities {
  isR2Available(): boolean;
  isVoyageConfigured(): boolean;
  // ...
}
// infra/
class EnvCapabilitiesAdapter implements IEnvCapabilities { /* reads config */ }
```

`AppSettingsService` depends on the port, not on `config` directly.

**Pro:** clean boundary, testable with a fake.
**Con:** abstraction over static booleans — likely over-engineered.

---

### C — Move `available` to the API adapter *(recommended)*

`available` is a presentation concern (which buttons are clickable in the UI). `AppSettingsService` only manages DB-stored preferences; the `configRouter` API adapter assembles the full view:

```typescript
// AppSettingsService returns only:
{ embedding: { provider, model }, storage: { provider } }

// Route handler assembles the API response:
const stored = await settingsService.getSettings();
const options = buildProviderOptions(config, stored); // inside the API adapter
```

`api/` is allowed to import `config` directly — this is legitimate.

**Pro:** `AppSettingsService` is pure app logic; clean separation.
**Con:** `configRouter` grows slightly; `available` is no longer available to other app consumers.

## Key Principles (decision guide)

### 1. Two separate concerns: static config vs dynamic settings

| | Static config (`config.ts`) | Dynamic settings (DB) |
|---|---|---|
| **Source** | Environment variables | Database rows |
| **Mutability** | Read once at startup | User-editable at runtime |
| **Layer** | Infrastructure | App / Domain |
| **Owner** | `infra/` or composition root | `AppSettingsService` + repo |

Never mix them. `AppSettingsService` owns the DB settings; it must not reach into `config.ts`.

### 2. `config.ts` is infrastructure

It calls `dotenv` and reads `process.env` — that is I/O. Only two places may import it:
- **Infra adapters** (e.g. `S3StorageAdapter`, `AnthropicLlmAdapter`)
- **The composition root** (`registry.ts`) to wire values into services

### 3. App services receive values, not config sources

If an app service needs an env-derived default (e.g. chunking strategy), the composition root resolves `config → value` and passes it as a constructor argument. The service never sees `config`.

```typescript
// registry.ts (composition root) — this is the ONLY place both worlds touch
new AppSettingsService(repo, { defaultChunkingStrategy: config.rag.chunkingStrategy })
```

### 4. `available` flags are a presentation concern

Whether an API key is set is not business logic — it only drives which options are enabled in the UI. This belongs in the API adapter, assembled when building the HTTP response.

### 5. The composition root is the seam

`registry.ts` is explicitly allowed to import `config.ts`. Its job is to wire infrastructure values into app-layer constructors. This is not a violation — it is the pattern.

---

## Expected fix

Apply **option C**: strip `available` from `AppSettings` (app-ports), move availability computation into the API route/adapter layer. Pass env-derived defaults via constructor injection from `registry.ts`. `AppSettingsService` then has zero imports from `config.ts` or `process.env`.
