### Implementation Tasks

**1. App-Wide MVP Banner Implementation** ✅ _Completed_

* **1.1 Create `MVPBanner.tsx` component**:
  * Path: `components/ui/MVPBanner.tsx`
  * Content: React component with Tailwind CSS, internationalized text via `useTranslation`.
  * _Note_: Implemented as a `'use client'` component using `usePathname` for context.
  * Status: ✅ Completed (~19 lines)
* **1.2 Update internationalization dictionary (`es.json`)**:
  * Add key: `"banner.mvp.message": "..."`.
  * Status: ✅ Completed
* **1.3 Integrate `MVPBanner` into layouts**:
  * _Deviation from original design_: NOT integrated in `app/layout.tsx` as `fixed bottom-0`. Integrated directly in `PublicLayout` (inside header) and `AppLayout` (inside main content wrapper). No `pb-[height]` needed since it is not `fixed`.
  * Status: ✅ Completed

**2. Premium Export Disablement (XLSX + CSV) and Tooltip** ✅ _Completed_

* **2.1 Identify export elements**:
  * `AppDashboardClient.tsx` — XLSX and CSV buttons identified.
  * `MachineryCostDashboard.tsx` — CSV button identified.
  * Status: ✅ Completed
* **2.2 Update internationalization dictionary (`es.json`)**:
  * Keys: `feature.xlsx.premium.tooltip` and `feature.csv.premium.tooltip`.
  * Status: ✅ Completed
* **2.3 Modify components**:
  * Buttons disabled with `disabled` + `opacity-50 cursor-not-allowed`.
  * Tooltip with `relative group` + `absolute invisible group-hover:visible`.
  * Tooltip positioned at `top-full mt-2` (below the button).
  * _Deviation from original design_: CSV was also disabled (not only XLSX). Tooltip was positioned below (not above) to avoid overlap.
  * Status: ✅ Completed

**3. Tests** ✅ _Completed_

* **3.1 E2E Tests**:
  * `tests/mvp-banner-xlsx-disable.spec.ts` — Banner, XLSX, and CSV.
  * `tests/cost-dashboard.spec.ts` — Cost calculations and CSV on cost dashboard.
  * _Race condition_: Fixed with `waitUntil: 'networkidle'` on post-login navigation.
  * Status: ✅ 30/30 tests passing
