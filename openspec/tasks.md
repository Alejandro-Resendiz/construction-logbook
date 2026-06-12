### Implementation Tasks

**1. Authentication Infrastructure and Orchestration** ✅ _Completed_

* **1.1 Create `AuthProvider` context**: Convert `useAuth` from standalone hooks to a singleton React context.
  → `hooks/useAuth.tsx` — single `onAuthStateChange` subscription in `AuthProvider`, guarded against transient null events. `useAuth()` is a context consumer.
  * `resolvedRef` guard prevents `getSession()` re-fire on navigation.
  * `useMemo` on context value for stable references.
* **1.2 Create `LayoutOrchestrator`**: Implement toggle logic between `PublicLayout` and `AppLayout`.
  → `app/components/layouts/LayoutOrchestrator.tsx` — wraps content in `AuthProvider`, shows spinner during `isLoading`.
* **1.3 Implement `PublicLayout`**: Implement the Fixed Frame model (fixed Header and Footer, scrollable Main).
  → `app/components/layouts/PublicLayout.tsx` — `h-screen overflow-hidden`.
* **1.4 Implement `AppLayout`**: Implement the Dashboard model with fixed sidebar.
  → `app/components/layouts/AppLayout.tsx`.
  * Sidebar is `fixed left-0 top-0 w-64 h-screen flex-col` (fixed at viewport height).
  * Main content offset with `lg:ml-64`. Natural scroll via parent `min-h-screen`.
  * MVP Banner is `sticky top-0 z-10`.
  * `UserAccountBlock` wrapped in `React.memo`, nav links memoized via `useMemo`.
* **1.5 Root page redirect**: Server-side redirect for authenticated users at `/`.
  → `app/page.tsx` — checks `getUser()` via server client, calls `redirect('/app')`.
* **Task**: 5 units

**2. Navigation and Branding Component Refactor** ✅ _Completed_

* **2.1 Refactor `Footer.tsx`**: Add `page`, `sidebar`, and `mobile-menu` variants.
  → `app/components/ui/Footer.tsx` — 3 variants implemented. Displays `publisher` from `NEXT_PUBLIC_BRAND_PUBLISHER` (default `'RMA'`).
* **2.2 Create `UserAccountBlock.tsx`**: Sidebar component (Role + Logout).
  → `app/components/UserAccountBlock.tsx` — shows icon based on role + logout button. Wrapped in `React.memo`.
* **2.3 Refactor `Navbar.tsx`**:
  * Remove desktop user/logout logic. → Uses `useAuth` instead of direct `supabase.auth`.
  * Ensure mobile menu includes `Footer (variant="mobile-menu")`. → Implemented.
  * Remove `sticky` class so layout manages positioning. → `sticky top-0 z-50` removed.
* **Task**: 3 units

**2.4 Centralized Navigation Hook** ✅ _Completed_

* **2.4.1 Create `useNavLinks`**: Hook that builds links based on authentication and role.
  → `hooks/useNavLinks.ts` — 7 authenticated links (4 base + 3 admin), 3 public links. Each link includes `iconName` for icon resolution in AppLayout. Memoized with `useMemo`.
* **2.4.2 Implement `iconMap` in AppLayout**: Map of strings to `lucide-react` components.
  → Renders `<Icon size={18} />` alongside link text.
* **Task**: 2 units

**3. Verification and QA** ✅ _Completed_

* **3.1 E2E Tests**:
  * `tests/layout-branding.spec.ts` — Verifies banner on public routes, desktop sidebar with navigation/logout, mobile sidebar with hamburger.
  * `tests/mvp-banner-xlsx-disable.spec.ts` — Verifies app-wide banner, XLSX/CSV export disabled with premium tooltip.
  * `tests/cost-dashboard.spec.ts` — Verifies cost calculations (required fixing the scroll model in AppLayout).
  * _Note_: Fixed a race condition on mobile Chrome (cookie `Set-Cookie` vs navigation) using `waitUntil: 'networkidle'`.
  * _Note_: Layout uses `min-h-screen` with natural scroll (no `overflow-y: auto` on main content) to avoid interference with conditional renders.
  * _Note_: `LogoutButton` uses `flex items-center gap-2` for proper icon+text alignment.
* **Task**: 2 units

---

**Summary**: 12/12 units completed. 30/30 E2E tests passing on Chromium, Firefox, and Mobile Chrome (Pixel 5).
