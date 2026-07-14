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

```bash
npm install
npm run dev
```

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
