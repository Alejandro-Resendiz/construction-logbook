### Technical Design: Adaptive Layout Architecture

**1. State Management and Orchestration**

A `LayoutOrchestrator` (Client Component) wraps the entire app in an `AuthProvider` (React context). Depending on `isAuthenticated`, it renders either `PublicLayout` or `AppLayout`. While `isLoading` is `true`, it shows a spinner.

**Auth state flow:**

- `AuthProvider` (in `LayoutOrchestrator`) → single `onAuthStateChange` subscription, single source of truth.
- Consumers call `useAuth()` (context consumer) → `{ user, role, isAuthenticated, isLoading }`.
- A `resolvedRef` guard prevents `getSession()` from re-firing on navigation after initial resolution.
- `onAuthStateChange` only clears user on explicit `SIGNED_OUT` event — transient null events are ignored.

**2. Branding Component: `Footer.tsx` (Versatile)**

The `Footer` component changes its style based on the `variant` prop:

* **`variant="page"`**: Public routes. Standard page footer (full width, contact links).
* **`variant="sidebar"`**: Desktop sidebar. Minimalist, integrated into the bottom block.
* **`variant="mobile-menu"`**: Mobile menu. Ultra-minimalist, copyright text only.

**3. Navigation Hook: `useNavLinks`**

Centralizes navigation link construction based on authentication and role. Memoized with `useMemo` for stable reference across renders:

```typescript
export function useNavLinks(dict, isAdminRoute) {
  const { user, role } = useAuth()
  return useMemo(() => {
    // Authenticated: 4 base links (Dashboard, Logbook, Correction, Maintenance)
    // Admin: +3 links (Projects, Machinery, Depreciation)
    // Unauthenticated: 3 public links (Home, Update Log, Login)
    // Each authenticated link includes `iconName` (string) for resolution in AppLayout
  }, [user, role, dict])
}
```

**4. Layout Architecture**

#### A. `PublicLayout` (Fixed Frame Model)
For unauthenticated routes. Always-visible branding.
* **Main Container**: `flex flex-col h-screen overflow-hidden`.
* **Header (Fixed)**: `shrink-0 z-50`. Contains `MVPBanner` + `Navbar`.
* **Main (Scrollable)**: `flex-1 overflow-y-auto`. Contains page content.
* **Footer (Fixed)**: `shrink-0 z-50`. Contains `Footer (variant="page")`.

#### B. `AppLayout` (Dashboard Model)
For authenticated routes (`/app/*`). Professional application experience.

* **Main Container**: `min-h-screen bg-gray-50 flex flex-col lg:flex-row`.
* **Desktop**:
  * **Sidebar (Fixed)**: `fixed left-0 top-0 w-64 h-screen flex-col`. ALWAYS visible, NEVER scrolls with page. Contains:
    * Logo + app name (top, `h-16 shrink-0`)
    * Icon navigation (`flex-1 overflow-y-auto` — scrolls internally when future menus exceed space)
    * `UserAccountBlock` (role + logout) — always visible at bottom (`shrink-0`)
    * `Footer (variant="sidebar")` — always visible at bottom
  * **Main Content Wrapper**: `flex-1 flex flex-col min-w-0 lg:ml-64`. The `lg:ml-64` offsets the fixed sidebar. `min-w-0` prevents flex overflow. Contains:
    * `MVPBanner` (sticky: `sticky top-0 z-10`)
    * `<main className="flex-1">` (natural page scroll, NO `overflow-y: auto`)
* **Mobile**:
  * Desktop sidebar hidden (`hidden lg:flex`).
  * Mobile header with hamburger button.
  * Sidenav overlay (`fixed inset-y-0 left-0`) with navigation, account, and `Footer (variant="mobile-menu")`.
  * Semi-transparent overlay when sidenav is open.

**Key CSS decisions:**

| Element | Classes | Rationale |
|---------|---------|-----------|
| Main container | `min-h-screen flex flex-col lg:flex-row` | Natural page scroll, no `overflow-y: auto` |
| Sidebar | `fixed left-0 top-0 w-64 h-screen` | Fixed at viewport height, never grows |
| Nav area | `flex-1 overflow-y-auto` | Internal scroll for future menu items |
| User block | `shrink-0 border-t` | Always at bottom, separated by border |
| Main content | `flex-1 flex flex-col min-w-0 lg:ml-64` | Offset for fixed sidebar |
| MVP Banner | `sticky top-0 z-10` | Always visible on scroll |
| `<main>` | `flex-1` | Natural scroll, NO `overflow-y: auto` |

**5. Root Redirect**

The root page (`app/page.tsx`) is a Server Component. On request, it checks `getUser()` via the server Supabase client. If the user is authenticated, it calls `redirect('/app')` before rendering. Unauthenticated users see the public log form.

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (user) redirect('/app')
```

**6. Icon Resolution**

`AppLayout` maintains an `iconMap` that associates strings (`'LayoutDashboard'`, `'FileText'`, etc.) with `lucide-react` components. This keeps `useNavLinks` free of imports and centralizes visual resolution.

```typescript
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, FileText, History, Wrench, Briefcase, Truck, Hammer
}
```

**7. Scroll Constraint**

`overflow-y: auto` is NOT used on `<main>` in AppLayout. Scrolling is handled at the page level via `min-h-screen` on the main container. This avoids interference with React state-driven conditional renders (such as calculated table columns in the cost dashboard). PublicLayout DOES use `overflow-y: auto` on `<main>` because its parent container has `h-screen overflow-hidden`.

**8. Key Components**

* **`AuthProvider`**: React context provider wrapping auth state. Single `onAuthStateChange` subscription. Guards against transient null events.
* **`useAuth`**: Context consumer hook. Returns `{ user, role, isAuthenticated, isLoading }`.
* **`useNavLinks`**: Hook that builds navigation links based on context and role. Memoized.
* **`UserAccountBlock`**: Presentational component for role + logout in sidebar. Wrapped in `React.memo`.
* **`Navbar`**: Navigation for public routes. No `sticky` class, uses `useAuth`. Includes `Footer (variant="mobile-menu")` in mobile menu.
* **`MVPBanner`**: Non-dismissible banner at the top of each layout. Sticky in AppLayout.

**9. Environment Variables**

* `NEXT_PUBLIC_BRAND_NAME`
* `NEXT_PUBLIC_BRAND_PUBLISHER`
* `NEXT_PUBLIC_BRAND_EMAIL`
* `NEXT_PUBLIC_BRAND_LINKEDIN`

**10. File Structure**

```
app/
  layout.tsx                          # Root layout: imports LayoutOrchestrator
  page.tsx                            # Root page: redirect authenticated to /app
  components/
    layouts/
      LayoutOrchestrator.tsx          # AuthProvider + toggle PublicLayout/AppLayout
      PublicLayout.tsx                 # Fixed frame for public routes
      AppLayout.tsx                   # Dashboard with fixed sidebar + sticky banner
    ui/
      MVPBanner.tsx                   # MVP Banner (sticky top in AppLayout)
      Footer.tsx                      # Footer with variants
    Navbar.tsx                        # Responsive navigation
    UserAccountBlock.tsx              # Role + Logout (React.memo)
    LogoutButton.tsx                  # Sign out button
    AppDashboardClient.tsx            # Dashboard with XLSX/CSV export
    MachineryCostDashboard.tsx        # Cost dashboard
hooks/
  useAuth.tsx                         # AuthProvider context + useAuth consumer
  useNavLinks.ts                      # Contextual navigation hook (memoized)
```
