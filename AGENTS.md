<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HIV Logbook Developer Handbook

Welcome! This document serves as a guide for both human developers and agentic AI coders working on the **HIV Logbook** codebase. It outlines the project's architecture, database policies, testing strategies, i18n, and key design patterns.

---

## 1. Project Overview & Architecture

The **HIV Logbook** is a machinery logging, maintenance request, and cost tracking platform designed for construction operations. It is built using **Next.js 16 (App Router)** and **Supabase**.

### Client-Server Boundaries
*   **Server Components & Actions**: Handled primarily on the server to execute queries, execute mutations, and enforce security checks.
*   **Client Components**: Rendered with dynamic state. Heavy browser libraries (e.g. `jsPDF`, `exceljs`) must be excluded from server-side rendering to avoid Node.js environment crashes. This is solved by wrapping them in client wrappers loaded via `next/dynamic` with `{ ssr: false }` (e.g. [AppDashboardWrapper.tsx](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/app/components/AppDashboardWrapper.tsx)).
*   **Proxy Configuration**: Instead of the standard `middleware.ts` convention, Next.js warning compliance requires a named `proxy` function exported from [proxy.ts](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/proxy.ts) to manage and sync user sessions between browser cookies and server clients.

### Authentication Context
*   **`AuthProvider`** (React context) wraps the entire app in `LayoutOrchestrator`. Single `onAuthStateChange` subscription, single source of truth.
*   **`useAuth()`** is a context consumer, not a standalone hook. Returns `{ user, role, isAuthenticated, isLoading }`.
*   **Guards**: A `resolvedRef` prevents `getSession()` from re-firing on navigation. The `onAuthStateChange` callback only clears user on explicit `SIGNED_OUT` event — transient null events are ignored.
*   **Root redirect**: The root page (`app/page.tsx`) is a Server Component that checks `getUser()` and redirects authenticated users to `/app`.

### Layout Architecture
*   **`AppLayout`** (authenticated routes): Sidebar is `fixed left-0 top-0 w-64 h-screen` (fixed at viewport height, never grows). Main content offset with `lg:ml-64`. Parent uses `min-h-screen` for natural scroll.
*   **`PublicLayout`** (unauthenticated routes): Fixed frame model — `h-screen overflow-hidden` with `fixed` header and footer, only main content scrolls (`overflow-y: auto`).
*   **Scroll constraint**: `overflow-y: auto` on `<main>` in AppLayout interferes with React state-driven conditional renders (calculated cost dashboard columns) on Chromium. AppLayout uses natural page scroll via `min-h-screen` instead. PublicLayout is safe because its parent container is `h-screen overflow-hidden`.
*   **MVP Banner**: `sticky top-0 z-10` in AppLayout, always visible when scrolling page content.
*   **Performance**: `UserAccountBlock` is wrapped in `React.memo`, `useNavLinks` and `sidebarContent` are memoized with `useMemo`.

---

## 2. Supabase Integration & Database

The codebase is built on a "local-first" development cycle utilizing the **Supabase CLI**.

### Migrations & Seed
*   **Schema changes** are tracked in the [supabase/migrations/](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/supabase/migrations) folder.
*   **Seed data** (default machinery and projects) is provisioned via [supabase/seed.sql](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/supabase/seed.sql) during database resets (`npx supabase db reset`).

### Security & Row-Level Security (RLS)
*   **Policies**: Active RLS policies restrict operations. Read access to projects and machinery is public, but creation/deletion requires `admin` status.
*   **Role Identification**: Enforced at the database level by extracting user roles via `auth.jwt() -> 'user_metadata' ->> 'role'` (or `app_metadata` in production environments) using the SQL helper function `public.get_my_role()`.
*   **Bypassing RLS**: The `SUPABASE_SERVICE_ROLE_KEY` is used to instantiate `supabaseAdmin` clients strictly inside Server Actions (e.g. log correction and project deletes) to allow administrative overrides that bypass RLS.
*   **Locking Completed Logs**: To prevent users from modifying already completed logs while still allowing them to complete an active log, RLS is configured as:
    *   `USING (NOT is_completed)` (filters active logs)
    *   `WITH CHECK (true)` (allows updating to `is_completed = true`)

### Hashed Log IDs (`hash_id`)
*   Log records generate an automated, unique 6-character hashed ID (`hash_id`) for public access.
*   Uses the `pg_hashids` Postgres extension. Note that the hashing algorithm requires a **minimum of 16 unique characters** in the alphabet (hence the use of hexadecimal `0123456789abcdef` rather than decimal).

---

## 3. Internationalization (i18n)

The application features a strict non-hardcoded dictionary i18n system to support multi-language localizations (defaulting to Spanish).

*   **Dictionary File**: Located at [es.json](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/lib/dictionaries/es.json).
*   **Usage Pattern**: Load the dictionary in Server Components:
    ```typescript
    const dict = getDictionary('es');
    ```
    Pass down properties (e.g., `dict.admin`, `dict.common`) to Client Components. Never hardcode UI text strings directly in component files.

---

## 4. State Management (Zustand)

Client-side state management is handled using **Zustand** stores inside [lib/store/](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/lib/store) (e.g., `machineryStore`, `projectsStore`, `machineryDepreciationStore`).

*   Stores cache database records client-side to allow instant filtering, searching, and sorting.
*   Optimistic updates can be dispatched to the stores to achieve a highly responsive interface.

---

## 5. Testing Strategy

The project employs a dual-tier testing setup to prevent regressions.

### Tier 1: Unit & Action Testing (Jest)
*   **Scope**: Verifies Next.js Server Actions in isolation.
*   **Setup**: Configured in [jest.config.ts](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/jest.config.ts) and [jest.setup.ts](file:///home/alex/Desktop/DEV/Hivaco/hiv-logbook/jest.setup.ts).
*   **Mocking**: Supabase database clients are mocked in-memory using Jest mocks to simulate query results, preventing any network overhead.
*   **Execution**:
    ```bash
    npm run test
    ```

### Tier 2: End-to-End Testing (Playwright)
*   **Scope**: Validates auth and dashboard flows in real browser environments.
*   **Database Seeding**: Tests dynamically authenticate against the running local Supabase emulator.
*   **Concurrency Fix**: When running E2E tests in parallel, worker instances can conflict if they attempt to write records with identical unique codes. To avoid this, Playwright test suites append `process.env.TEST_WORKER_INDEX` to the seeded database fields (e.g. `TEST_MACHINE_CODE = 'EX-E2E-99-' + workerIndex`), maintaining isolated records for each browser process.
*   **Responsive Testing**: Tests run against desktop layouts (Chrome, Firefox) and mobile layouts (Mobile Chrome simulating a Pixel 5 viewport) to ensure full responsive layout coverage.
*   **Execution**:
    ```bash
    npx playwright test
    ```
