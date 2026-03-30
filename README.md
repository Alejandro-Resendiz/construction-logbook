# HIV Logbook

Professional machinery logging, maintenance, and cost tracking platform built with Next.js 16 and Supabase.

## 🚀 Key Features & Modules

### 🚜 Operator Logging (Public)
- **Start Shift**: Capture machine, project, date, and initial fuel.
- **Secure Hashing**: Generates unique 6-character hex codes for private shift updates.
- **End Shift**: Verification view where operators confirm details and record end times/observations.

### 📊 Admin & Cost Dashboard (Protected)
- **Weekly Reporting**: Automated filtering for the current week or custom date ranges.
- **Cost Analysis**: Advanced tracking of fuel consumption, worked hours, and machinery depreciation.
- **Data Visualization**: Professional charting using **Visx** for machinery performance and project costs.
- **Administrative Correction**: Override and fix any shift record with an automated audit trail.

### 🛠️ Maintenance & Management
- **Maintenance Tracking**: Comprehensive request and approval workflow for machinery repairs and servicing.
- **Projects & Machinery**: Dedicated management interfaces with expanded row editing for high-density forms.
- **Collapsible UI**: Streamlined forms that hide behind interactive toggles to maximize screen real estate.

### 🔐 Security & Architecture
- **RBAC**: Multi-role system (Admin, Resident, Operator) powered by Supabase RLS and JWT metadata.
- **State Management**: Reactive UI powered by **Zustand** for instant, optimistic updates.
- **Auth SSR**: Full session synchronization between Next.js Server Components and the browser via `@supabase/ssr`.
- **Component Driven**: UI developed in isolation using **Storybook 8** and **Tailwind CSS 4**.
- **Internationalization**: Dictionary-based i18n system for multi-language support (ES default).

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database/Auth**: Supabase (`@supabase/ssr`)
- **State**: Zustand
- **Styling**: Tailwind CSS 4
- **Charts**: Visx
- **Reporting**: `jspdf` & `exceljs`
- **Component Lab**: Storybook 8

## 🏁 Getting Started

### 1. Local Development Setup
1.  **Install Dependencies**: `npm install`
2.  **Start Supabase Local**: `npx supabase start`
3.  **Environment Variables**: Copy `.env.local.example` to `.env.local` and use the local keys provided by the CLI.
4.  **Reporting Templates**: Ensure your master Excel template exists at `public/templates/logbook_template.xlsx`.
5.  **Run App**: `npm run dev`

### 2. Database Synchronization (Automated)
This project uses the Supabase CLI to manage database changes via migrations.
- **Local Reset**: `npx supabase db reset` (Wipes local DB and applies all migrations + seed).
- **Cloud Deployment**: `npx supabase db push` (Sends new migrations to your linked cloud project).

### 3. User Provisioning
Admin and Resident users are managed via the Supabase Dashboard or local `seed.sql`.
- Roles (`admin`, `resident`) must be stored in the user's `user_metadata`.

## 🚀 Deployment (Vercel)

### 1. Configure Environment
Add the following variables in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Secret - required for admin operations)

### 2. Update Auth Redirects
In your Cloud Supabase Dashboard (**Authentication > URL Configuration**):
1.  Set **Site URL** to your Vercel domain.
2.  Add `https://your-domain.vercel.app/**` to **Redirect URLs**.
