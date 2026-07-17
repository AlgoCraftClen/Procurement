# Tobolar Procurement

Web-based procurement and inventory software for requisitions, suppliers, RFQs,
purchase orders, invoices, goods receipt, budgets, contracts, and inventory.

The app is a Vite + React frontend using Supabase for data storage. Access is
open for now by design; security/auth can be added in a later pass.

The checked-in frontend defaults point at the current Tobolar Supabase project
so the hosted app works even before host-side environment variables are set.
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` can still be supplied by the
hosting service to override those defaults.

## Running the app

From GitHub on a Windows computer:

```powershell
git clone https://github.com/AlgoCraftClen/Procurement.git
cd Procurement
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

Or double-click `start-local.bat` from the cloned folder.

The app will open locally at:

```text
http://127.0.0.1:5173
```

The local app connects to the Tobolar Supabase backend automatically.

Manual startup:

```bash
npm install
npm run dev
```

## GitHub Pages domain

This repo is set up to deploy from `main` to GitHub Pages.

Use these DNS records in IONOS for `tobolarprocurement.com`:

```text
A     @      185.199.108.153
A     @      185.199.109.153
A     @      185.199.110.153
A     @      185.199.111.153
CNAME www    AlgoCraftClen.github.io
```

Replace any existing `www` CNAME with the value shown above.

## Building the app

```bash
npm run build
```

## Supabase setup

1. Create a Supabase project or use the current Tobolar project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Optional: copy `.env.example` to `.env` and fill in a different project URL
   and publishable key.
4. Optional: add the same environment variables to the hosting service.

## Smart document extraction

Smart extraction is handled by the Supabase Edge Function in
`supabase/functions/procurement-ai`.

Required Supabase function secrets:

```text
OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
```

The frontend calls the function through `supabase.functions.invoke`. Uploaded
documents are saved to Supabase Storage first, then the function reads the
document URL and returns structured procurement data for review.
