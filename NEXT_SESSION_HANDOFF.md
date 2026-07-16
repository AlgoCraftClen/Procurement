# Tobolar Procurement Handoff

Last updated: 2026-07-17

## Current State

- Repository: `AlgoCraftClen/Procurement`
- Branch: `main`
- Latest implementation commit before this handoff: `a5c6e61 Improve procurement app UX and upload fallback`
- Local app URL used for validation: `http://127.0.0.1:5173`
- Production domain: `tobolarprocurement.com`

## Completed In The Latest Pass

- Fixed modal close button spacing so the close control no longer crowds Edit/Delete actions.
- Separated destructive actions from normal row/form actions in invoices, purchase orders, goods receipts, contracts, and issued inventory.
- Added sticky Save/Cancel footers to long forms and bottom padding so fields are not hidden.
- Fixed the purchase order modal loading title so it no longer shows `undefined`.
- Moved Lijakwe to the bottom-right, made it responsive, and hid the floating widget on the full chat page.
- Fixed Lijakwe full-page chat so the welcome message remains visible instead of opening blank.
- Turned the top search into a working page finder.
- Improved inventory tab hit areas and active states.
- Updated Upload Documents to save the source file first and fall back to manual record creation when automatic extraction is unavailable.
- Tested the upload fallback with a temporary PDF, then removed the test file from Supabase Storage.

## Verification Already Run

- `npm.cmd run build` passed.
- `npm.cmd run lint` passed with warnings only.
- Visual audit covered:
  - Invoice detail and edit modal spacing
  - Purchase order create form
  - Lijakwe floating and full chat page
  - Upload Documents fallback
  - Inventory tabs and issued-item actions
  - Header page finder

## Deferred Work

1. Smart document extraction is still not connected.
   - Current behavior is honest and usable: the app saves the document, then offers manual creation links.
   - Next likely step: build a Supabase Edge Function or another document parsing service for classification and extraction.

2. Build still warns about bundle size and stale browser baseline data.
   - Build succeeds.
   - Next likely step: code-split route/page bundles and refresh Browserslist/baseline data.

3. Lint still has pre-existing Fast Refresh warnings in shared UI files.
   - Lint succeeds.
   - Next likely step: move shared exported constants/helpers out of component files where ESLint reports `react-refresh/only-export-components`.

## Suggested Next Session Order

1. Decide how smart document extraction should work: Supabase Edge Function, external OCR/document AI, or manual-only for now.
2. If using Supabase Edge Function, add the function, environment variables, and a private server-side parser call.
3. Add route-level code splitting to reduce the large Vite bundle warning.
4. Clean up Fast Refresh warnings after functional work is stable.
