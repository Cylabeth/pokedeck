You are my senior full-stack teammate. We are building a technical challenge for BinPar using TypeScript and Next.js (App Router).

The goal is not just to “make it work”, but to demonstrate engineering judgment: clean architecture, performance awareness, good UX, and defendable technical decisions. Prefer clarity, robustness, and defendable trade-offs over over-engineering.

---

## Product requirements (must follow exactly)

### Pokémon list page

- Show a list of ALL Pokémon, ordered by id (default).
- For each Pokémon show at least:
  - id
  - name
  - generation
  - types
- Additional relevant info is allowed if it improves UX.
- The list must support:
  - filtering by type
  - filtering by generation
  - real-time text search by name

### Search behavior (important)

- Search must filter results in real time while the user types (debounced).
- Search must include evolutions:
  - If searching “Pikachu”, results must include Pikachu, Pichu and Raichu.
- Search must work across the full dataset (not only already visible items).

### Pokémon detail page

- Show:
  - name
  - image
  - generation
  - types
  - stats
  - evolutions (with images)
- Clicking an evolution navigates to that Pokémon.
- The current Pokémon must be visually highlighted in the evolution chain.

### Navigation

- When navigating back from detail to list:
  - preserve filters
  - preserve search text
  - preserve scroll position (if possible)
- State does NOT need to persist after a full page reload.

---

## Tech stack constraints

### Stack choice

- Use TypeScript everywhere (strict typing, no `any`).
- Use Next.js App Router.
- Use a T3-style “light” stack:
  - Next.js
  - TypeScript
  - tRPC (or route handlers if simpler)
  - Zod
  - TanStack Query
  - TailwindCSS

### Explicitly excluded

- Prisma
- NextAuth
- Database persistence

Reason: no authentication or persistence is required; adding them would be over-engineering for this challenge.

---

## Architecture & data strategy

### Backend For Frontend (mandatory)

- The client must NEVER call PokeAPI directly.
- All communication with PokeAPI goes through a BFF inside Next.js.
- The BFF is responsible for:
  - data aggregation
  - caching
  - concurrency limiting
  - error normalization

### PokeAPI usage principles

- Respect PokeAPI Fair Use:
  - cache locally
  - limit request frequency
- Avoid N+1 patterns.
- Prefer aggregator endpoints when available.

### Caching strategy

Implement server-side caching (in-memory is sufficient for the challenge):

- Generations index
  - built once from `/generation/*`
  - very long TTL (almost static)
- Pokémon basic detail (`pokemon/{id}`)
  - long TTL
- Species → evolution chain mapping
  - long TTL
- Evolution chain parsed results
  - long TTL

Explain in README that Redis/CDN would be used in production.
Note:
In-memory caching is acceptable for this challenge.
In real serverless environments or during HMR in development,
cache may be reset between executions.
This trade-off is intentional and must be documented in the README.

---

## Generation resolution (important)

- Pokémon generation is NOT resolved via per-Pokémon species calls.
- Build a generation index using `/generation/{id}` endpoints.
- Map generation by `species.name` (stable key shared across endpoints).
- Resolve generation via O(1) lookup when building list items.

---

## List loading strategy

- Do NOT fetch all Pokémon details in a single request.
- Use pagination or infinite scroll.
- For each page:
  - fetch Pokémon ids/names
  - hydrate types and basic info with concurrency-limited calls
  - resolve generation via the prebuilt index
- Cache all fetched data server-side.

This prioritizes fast TTFB, robustness, and UX.

---

## Search + evolutions strategy

- The client performs text filtering only.
- All data hydration and evolution resolution is done via the BFF.

### Global search index

- Fetch a lightweight global Pokémon index once:
  - `GET /pokemon?limit=large&offset=0`
  - name + url only
- Perform real-time filtering on this index in the client (debounced).

### Evolution expansion (on demand)

- For matching names, resolve evolution chains by:
  1. Fetch `/pokemon-species/{id or name}` to obtain `evolution_chain.url`
  2. Fetch `/evolution-chain/{id}` by following that URL
- The response includes a nested tree structure (`chain`, `evolves_to`, etc.).
- Parse the full tree into a flat list of Pokémon species
  (deduplicated and ordered by evolution order or Pokémon id).
- Cache resolved evolution chains server-side using the evolution-chain URL
  (or the id extracted from it) as the cache key.

- Do NOT precalculate evolution chains for all Pokémon.
- Evolution data must be resolved on demand, only for Pokémon that
  actually match a search query or are being viewed.
- Cache resolved evolution chains to avoid repeated calls and reduce latency.

## State management

- Preserve list state (filters, search, pagination, scroll) in memory only.
- Use a lightweight store (e.g. Zustand or equivalent).
- Do not persist to localStorage or query params.

---

## Concurrency & error handling

- Limit concurrent calls to PokeAPI (e.g. pool of 8–12).
- Retry only once for transient network errors.
- List endpoints tolerate partial failures:
  - return available items
  - log missing ones
- Detail page fails clearly if core data is unavailable.
- Images and secondary data must have graceful fallbacks.

---

## UI / UX expectations

- Fast initial render.
- Clear loading and empty states.
- Filters and search must feel instant.
- Evolution chains must clearly indicate the current Pokémon.
- Prefer accessibility and clarity over visual complexity.
- Use a static card-based grid layout for the Pokémon list.
- Avoid heavy animations or visual effects.
- Prioritize clarity, readability, and performance.

---

## Image strategy

- Prefer official artwork images from PokeAPI:
  - `sprites.other["official-artwork"].front_default`
- Fallback order:
  1. official-artwork
  2. other.home
  3. sprites.front_default
  4. local placeholder image
- Placeholder must be provided by the project.
- Images must fail gracefully and never break layout.

---

## Testing strategy (minimal but meaningful)

Focus tests where risk is real:

- Unit test: evolution-chain parser (handles branches, deduplication).
- Unit test: generation index builder.
- Integration test: Pokémon detail aggregation (mocked fetch).
- Optional: minimal E2E for navigation + state preservation.

---

## Code quality rules

- Small, composable functions.
- Explicit naming.
- Clear separation of concerns.
- Comments only where logic is non-obvious.
- Avoid clever shortcuts.

---

## Output expectations

- Generate production-quality code.
- Always include types and error handling.
- When adding files, specify full paths.
- Keep explanations concise and technical.

The final result should look like something a real product team would confidently evolve, not a throwaway demo.
