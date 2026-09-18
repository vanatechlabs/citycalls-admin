# citycalls-admin-web

CityCalls admin panel — Next.js (App Router), TypeScript, Tailwind CSS. See [citycalls-docs](../docs) for architecture, API contracts, and UI specs. No shared code package exists between this repo and the backend or mobile apps — see `docs/manish/01-project-and-repository-setup.md` §2 for why.

## Setup

```bash
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your citycalls-api instance
npm run dev
```

## Structure

- `src/lib/api/` — Axios client (Manish's adapter layer, per `docs/coordination/03-code-ownership.md`)
- `src/lib/hooks/` — TanStack Query hooks Rohit's screens consume
- `src/lib/types/`, `src/lib/validation/` — local types/Zod schemas mirroring `citycalls-api`'s contract, regenerated from the synced OpenAPI spec (`scripts/sync-contracts.sh`) once it exists
- `src/tokens/` — this repo's own copy of design tokens/enum-label maps (`docs/rohit/02-design-system.md`)
- `mocks/` — local mock JSON per `docs/coordination/05-mock-data-contract.md`

## Status

Functional skeleton: QueryClient provider, Axios client with token interceptor, login form wired to `citycalls-api`'s real `/auth/login` endpoint. UI/UX is a functional placeholder — visual design is Rohit's pass per `docs/rohit/02-design-system.md`.
