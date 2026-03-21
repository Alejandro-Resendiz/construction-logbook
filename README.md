# HIV Logbook

Professional machinery logging and reporting platform built with Next.js 16 and Supabase.

## 🚀 Key Features

### 🚜 Operator Logging (Public)
- **Start Shift**: Capture machine, project, date, and initial fuel.
- **Secure Hashing**: Generates unique 6-character hex codes for private shift updates.
- **End Shift**: Simple verification view where operators confirm details and record end times/observations.

### 📊 Admin Dashboard (Protected)
- **Weekly Reporting**: Automated filtering for the current week or custom date ranges (max 7 days).
- **Professional PDF Export**: Signature-ready reports with centered branding and specialized column formatting.
- **Smart Excel Export**: Advanced `.xlsx` generation that clones styles from a master template (borders, fonts, logos).
- **Administrative Correction**: Override and fix any shift record with an automated audit trail.

### 🛠️ Management & CRUD
- **Projects & Machinery**: Dedicated management interfaces for Site Admins.
- **Expanded Row Editing**: High-density forms that expand within the data table to prevent horizontal overflow.
- **Collapsible Forms**: Streamlined UI that hides creation forms behind interactive toggles.

### 🔐 Security & Architecture
- **RBAC**: Multi-role system (Admin, Resident, Operator) powered by Supabase RLS and JWT metadata.
- **State Management**: Reactive UI powered by **Zustand** for instant, optimistic updates.
- **Auth SSR**: Full session synchronization between Next.js Server Components and the browser via `@supabase/ssr`.
- **Modern UX**: Professional notifications using **Sonner** and a mobile-first responsive design.

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database/Auth**: Supabase (`@supabase/ssr`)
- **State**: Zustand
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Notifications**: Sonner
- **Reporting**: `jspdf` & `exceljs`

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
- For production, manually create users in the Supabase Auth console and set the role metadata.

## 🚀 Deployment to Vercel

### 1. Configure Environment
Add the following variables in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Secret - required for admin operations)

### 2. Update Auth Redirects
In your Cloud Supabase Dashboard (**Authentication > URL Configuration**):
1.  Set **Site URL** to your Vercel domain.
2.  Add `https://your-domain.vercel.app/**` to **Redirect URLs**.
