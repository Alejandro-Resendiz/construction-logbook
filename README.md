# HIV Logbook

Next.js application for machinery logging using Supabase.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Database/Auth:** Supabase (`@supabase/ssr`)
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **PDF Generation:** `jspdf` + `jspdf-autotable`

## Getting Started

### 1. Clone the repository
```bash
git clone <repo-url>
cd hiv-logbook
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Supabase
You need a Supabase project. Once created:
1. **Enable Extension**: Enable the `pg_hashids` extension in your Supabase database (SQL Editor: `CREATE EXTENSION IF NOT EXISTS pg_hashids;`).
2. **Environment Variables**: Copy `.env.local.example` to `.env.local` and fill in your credentials.
3. **Migrations**: Run the contents of `supabase/migrations/initial_schema.sql` in the Supabase SQL Editor.
4. **Seed Data**: Run the contents of `supabase/seed.sql` to populate initial machinery and projects.

### 4. Create Admin User
Go to **Authentication > Users** in the Supabase Dashboard and manually create an admin user. Enable **"Auto-confirm"** to skip email verification.

### 5. Run the development server
```bash
npm run dev
```

## Deployment to Vercel

### 1. Push to GitHub
Ensure your code is pushed to a GitHub repository (excluding `.env.local`).

### 2. Create Vercel Project
1. Log in to [Vercel](https://vercel.com).
2. Click **"New Project"** and import your repository.

### 3. Configure Environment Variables
Add the following variables in the Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon (public) key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role (secret) key.

### 4. Update Supabase Auth Settings
To ensure redirects work correctly after login/logout in production:
1. Go to **Authentication > URL Configuration** in Supabase.
2. Set **Site URL** to your Vercel deployment URL (e.g., `https://your-app.vercel.app`).
3. Add `https://your-app.vercel.app/**` to the **Redirect URLs** list.

## Features
- **Public Operator Logging**: Start and End shift forms without login.
- **Secure Hashed IDs**: 6-character hex codes for shift updates via `pg_hashids`.
- **Admin Dashboard**: Protected view to filter weekly logs by machinery.
- **PDF Export**: "Reporte de bitácora de obra" with operator and supervisor signature lines.
- **Mobile First**: Fully responsive design for field use.
- **Internationalization**: Full Spanish UI with English codebase abstractions.
