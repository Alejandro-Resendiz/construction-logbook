### Proposal: Adaptive Layout with Contextual Branding

**1. Goal**
Implement a design system that adapts brand visibility and positioning based on the user's authentication state and device, ensuring key elements (MVP Banner and Footer) are accessible in context.

**2. User Scenarios**

#### A. Unauthenticated Routes (Fixed Frame Model)
* **Layout**: "Public Layout".
* **Structure**: A fixed-height container (`h-screen`) where the Header (MVP Banner + Navbar) and Footer are **always visible** (fixed), and the central content is the only scrollable element.
* **UX Goal**: Ensure the brand and MVP notice are always present while the user navigates public pages.

#### B. Authenticated Routes (Dashboard Model)
* **Layout**: "App Layout".
* **Structure (Desktop)**: A 256px side sidebar (flex sibling) with navigation, branding, and account management (Role + Logout) grouped at the bottom. Main content uses natural page scroll (`min-h-screen`).
* **Structure (Mobile)**: Top header with hamburger. Sliding sidenav with navigation, account, and branding at the bottom.
* **UX Goal**: Provide a professional application experience with brand identity integrated into the navigation flow.

**3. Technical Requirements**

* **Authentication Detection**: Use a `useAuth` hook to determine state and toggle between `PublicLayout` and `AppLayout` via a `LayoutOrchestrator`.
* **Branding Component**: A versatile `Footer` component with variants (`page`, `sidebar`, `mobile-menu`) to adapt to each context. Displays `publisher` name from `NEXT_PUBLIC_BRAND_PUBLISHER`.
* **Sidebar**: Includes icons in navigation (via `useNavLinks` + `iconMap`), user role block, and logout button. Anchored to the bottom with `UserAccountBlock`.
* **MVP Banner**: Positioned at the top of each layout (`sticky`/natural flow), non-dismissible, with internationalized text.

**4. Acceptance Criteria**

* [x] On public routes, the MVP Banner and Footer are always visible (no scroll required to see them).
* [x] On authenticated routes (desktop), branding and logout are anchored to the bottom of the sidebar.
* [x] On mobile, branding appears at the end of the slide-out menu (sidenav).
* [x] The Navbar remains visible on public routes.
* [x] The desktop sidebar includes icons on each navigation link.
* [x] Authenticated users visiting `/` are redirected to `/app`.
* [x] The MVP banner is sticky (always visible when scrolling page content).
* [x] The sidebar is fixed at 100vh (never grows with page content).
* [x] The publisher name (`NEXT_PUBLIC_BRAND_PUBLISHER`) is displayed in all footer variants.
* [x] All E2E tests pass on Chromium, Firefox, and Mobile Chrome (Pixel 5).
