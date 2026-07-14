# Tobolar Procurement

Web-based procurement and inventory software for requisitions, suppliers, RFQs,
purchase orders, invoices, goods receipt, budgets, contracts, and inventory.

The app is a Vite + React frontend using Supabase for data storage. Access is
open for now by design; security/auth can be added in a later pass.

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

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env` and fill in the project URL and anon key.
4. Add the same environment variables to the hosting service.
