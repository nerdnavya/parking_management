# ParkMind Backend

This folder contains everything needed to run the ParkMind backend alongside the Lovable frontend.

## Architecture

The frontend (Lovable / TanStack Start) already contains the server-side route at
`src/routes/api/chat.ts` — it runs **inside** the same process as the frontend.
This backend folder provides:

1. `seed.ts` — populates Supabase with lots, spots, and events
2. `supabase-schema.sql` — full database schema (same as the migration in the repo)
3. `mock-sensor.ts` — optional: simulates IoT occupancy changes every 30s (demo mode)
4. `.env.example` — every env var the app needs

## Setup (5 steps)

### 1. Install deps (root of the Lovable project)
```bash
npm install
```

### 2. Create a Supabase project
Go to https://supabase.com → New project.
Copy **Project URL**, **anon/public key**, and **service_role key**.

### 3. Run the schema
In Supabase → SQL Editor, paste and run `supabase-schema.sql`.
This creates all tables and RLS policies.

### 4. Fill in .env
Copy `.env.example` → `.env` in the project root and fill in your keys:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
LOVABLE_API_KEY=your_lovable_api_key
```

> **LOVABLE_API_KEY** — get it from https://lovable.dev → Settings → API Keys.
> This is what routes AI calls through the Lovable AI Gateway (Gemini 3 Flash).

### 5. Seed the database
```bash
npx tsx backend/seed.ts
```

### 6. (Optional) Run the mock sensor simulator
Opens a loop that randomly flips spot statuses every 30s — makes the live
occupancy panel feel alive during a demo.
```bash
npx tsx backend/mock-sensor.ts
```

### 7. Start the app
```bash
npm run dev
```
