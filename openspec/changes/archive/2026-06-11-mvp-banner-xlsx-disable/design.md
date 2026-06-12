### Technical Design

**1. App-Wide MVP Banner**

* **Component**: `components/ui/MVPBanner.tsx` — 19 lines.
* **Content**: Banner text from `t('banner.mvp.message')` via `useTranslation`.
* **Rendering**: NOT in `app/layout.tsx`. Integrated directly in each layout:
  * `PublicLayout` → inside `<header>` (first child, before Navbar).
  * `AppLayout` → inside the main content wrapper (first child, before mobile header).
* **Positioning**: NOT `fixed`. In PublicLayout the header is `shrink-0 z-50` (fixed in the frame). In AppLayout it flows naturally.
* **Style**: `bg-gray-200 text-gray-700 py-3 text-center text-sm w-full`.

**2. Premium Export Disablement (XLSX + CSV) and Tooltip**

* **Target files**:
  * `app/components/AppDashboardClient.tsx` — XLSX and CSV buttons.
  * `app/components/MachineryCostDashboard.tsx` — additional CSV button.
* **Disable logic**: Buttons have `disabled` + `opacity-50 cursor-not-allowed` classes.
* **Tooltip**: Implemented with Tailwind CSS (`relative group` + `absolute invisible group-hover:visible`).
  * Position: `top-full mt-2` (below the button).
  * Changed from `bottom-full mb-2` (above the button) because the upward tooltip overlapped with other UI elements.
* **Internationalization**: Keys `feature.xlsx.premium.tooltip` and `feature.csv.premium.tooltip` in `es.json`.

**3. Tests**

* `tests/mvp-banner-xlsx-disable.spec.ts` — 5 tests:
  * Banner visible on public route.
  * Dashboard title rendered.
  * Excel export disabled with premium tooltip.
  * CSV export disabled with premium tooltip on main dashboard.
  * _(Additional)_ CSV export disabled on cost dashboard (covered by `tests/cost-dashboard.spec.ts`).
* `waitUntil: 'networkidle'` on `page.goto('/app/logbook')` to avoid race condition with session cookie on mobile Chrome.
