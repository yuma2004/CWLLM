# Frontend Refactor Plan (analysis only)

## Scope and constraints
- Frontend only: `frontend/`
- Preserve behavior and API usage
- No new runtime dependencies
- Keep diffs small; one task per commit
- Avoid repo-wide formatting and broad moves

## Current architecture map
- Build: Vite + React 18 + TypeScript + Tailwind
- Routing: `src/App.tsx` + `src/constants/routes.tsx` + `src/components/Layout.tsx`
- Auth: `src/contexts/AuthContext.tsx` + `src/hooks/usePermissions.ts`
- Data: `src/lib/apiClient.ts`, `src/lib/apiCache.ts`, `src/hooks/useApi.ts`
- UI: `src/components/ui/*`
- Pages: list pages (Companies, Projects, Tasks, Wholesales) + detail pages (CompanyDetail, ProjectDetail, TaskDetail, WholesaleDetail) + settings/exports

## High complexity hotspots (line counts)
- `src/pages/CompanyDetail.tsx` ~1514 lines
- `src/pages/Tasks.tsx` ~741 lines
- `src/pages/Companies.tsx` ~668 lines
- `src/pages/ProjectDetail.tsx` ~709 lines
- `src/pages/Projects.tsx` ~525 lines
- `src/pages/Wholesales.tsx` ~468 lines

## Key findings
- Repeated list page patterns: filters, pagination, create forms, tables, empty states
- Manual query string building in each page despite `useUrlSync` providing `queryString`
- Repeated error handling patterns and `useMutation`/`useFetch` wiring
- Duplicate status/label sources (`constants/labels.ts` and `components/ui/StatusBadge.tsx`)
- Mixed text encoding in several files (mojibake visible on read); fixing will change UI strings
- Some UI components are duplicated or bypassed (raw inputs instead of `FormInput`)

## Refactor goals
- Extract reusable list sections and hooks with no behavior change
- Reduce page component size and isolate data vs presentation
- Centralize label/status mappings and query helpers
- Standardize form/error handling patterns
- Defer encoding fixes until explicitly approved

## Non-goals
- No new features or UX changes
- No API contract changes
- No new dependencies
- No repo-wide formatting

## Phased plan
### Phase 0: baseline safety
- Confirm current behavior by running existing tests before refactor
- Capture any current failures without fixing them

### Phase 1: shared helpers (safe, minimal)
- Add `utils/queryString.ts` (or `hooks/useListQuery.ts`) to build query strings from filters/pagination
- Add a small error state helper if needed (optional, keep pages unchanged until applied)
- Add minimal tests for helpers

### Phase 2: list pages (repeatable pattern)
For each list page (Companies, Projects, Tasks, Wholesales):
- Extract filter form component
- Extract create form component (if present)
- Extract table/body component
- Replace manual query building with shared helper
- Keep URL params and behavior identical

### Phase 3: CompanyDetail split
- Move contacts, timeline, chatwork rooms, and header sections into separate components
- Move helper functions into local `utils` file
- Keep API calls and state behavior unchanged

### Phase 4: UI consistency
- Standardize on `FormInput/FormSelect/FormTextarea`
- Consolidate label/status mapping so `StatusBadge` uses `constants/labels.ts`
- Optional: extract common SVG icons if repeated

### Phase 5: encoding normalization (requires approval)
- Identify files with mojibake and determine actual encoding
- Convert to UTF-8 (no BOM), verify UI text
- Treat as behavior change and do only with approval

### Phase 6: validation
- Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` in `frontend`
- Optional: `npm run test:e2e` if credentials and external dependencies are available

## Test commands (for later)
- `cd frontend`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e` (optional)

## Risks and mitigations
- Behavior drift: keep refactor to one page or component per commit
- Encoding changes: isolate into a dedicated step with review
- URL param regressions: add tests around `useUrlSync` + new query helper
