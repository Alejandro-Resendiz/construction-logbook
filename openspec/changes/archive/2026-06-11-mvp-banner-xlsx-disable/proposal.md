### Proposal: MVP Banner and Premium Export Disablement (XLSX + CSV)

**1. App-Wide MVP Banner**

* **Message content**: "Esta aplicación es un Producto Mínimo Viable (MVP). Tu feedback es crucial para su evolución y nos ayuda a construir un producto que realmente necesitas."
* **Position**: Top of each layout (`sticky` in PublicLayout, natural flow in AppLayout within the main content wrapper).
* **Design/Style**: Background `bg-gray-200`, text `text-gray-700`, centered, with `py-3` padding. Non-intrusive yet visible.
* **Behavior**: Non-dismissible. Remains visible at all times.
* **Internationalization**: Key `banner.mvp.message` in the `es.json` dictionary.

**2. Premium Export Disablement (XLSX + CSV) and Tooltip**

* **Location**:
  * XLSX: `app/components/AppDashboardClient.tsx` — Excel export button.
  * CSV: `app/components/AppDashboardClient.tsx` and `app/components/MachineryCostDashboard.tsx` — CSV export buttons.
* **State**: Buttons are disabled (`disabled`, `opacity-50`, `cursor-not-allowed`).
* **Tooltip content**: "La exportación a XLSX es una funcionalidad premium..." (XLSX) / same pattern for CSV.
* **Tooltip behavior**: Appears on hover. Positioned below the button (`top-full mt-2`).
* **Internationalization**: Keys `feature.xlsx.premium.tooltip` and `feature.csv.premium.tooltip` in `es.json`.

**Potential Risks:**

* **UX Impact**: The bottom-positioned tooltip may overlap with elements below the button if insufficient space. `top-full mt-2` was used instead of `bottom-full` to avoid overlap with elements above.
* **Banner Integration**: Being at the top (not `fixed bottom`), no additional body padding is required. It integrates naturally in the layout flow.
* **Mobile Test Race Condition**: Post-login navigation (`/app/logbook`) can fail if the session cookie hasn't been set before `goto`. Mitigated with `waitUntil: 'networkidle'`.
