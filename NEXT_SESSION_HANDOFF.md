# Tobolar Procurement Handoff

Last updated: 2026-07-20

## Current State

- Repository: `AlgoCraftClen/Procurement`
- Branch: `main`
- Local app URL used for validation: `http://127.0.0.1:5173`
- Production domain: `tobolarprocurement.com`
- Backend/storage: Supabase
- Document extraction: local/browser OCR and parsing, no paid AI API

## Completed In The Latest Pass

- Removed the active paid OpenAI/Supabase Edge Function extraction path from Upload Documents.
- Added free local extraction with:
  - Tesseract.js for image OCR.
  - PDF.js for text-native PDFs and scanned PDF page OCR fallback.
  - Mammoth for `.docx` raw text.
  - SheetJS for Excel/CSV text extraction.
- Updated Upload Documents to save the file, run local extraction, prefill data, and send the user to verification before saving.
- Kept manual verification and distribution available when local extraction is uncertain.
- Disabled remaining paid `InvokeLLM` paths:
  - Supplier validation now marks records for manual validation.
  - Procurement Analysis now generates local deterministic insights.
  - Executive Report now generates a local deterministic report.
  - RFQ requisition upload now uses local extraction and line-item parsing.
- Changed the `InvokeLLM` wrapper to fail closed before any network call.
- Removed the OpenAI Edge Function source from the repo.
- Removed OpenAI env vars from `.env.example`.

## Verification Already Run

- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- Build still warns about large chunks:
  - Main app chunk remains large.
  - `localDocumentExtraction` is large because OCR/PDF/Office parsers are shipped client-side to avoid paid APIs.
- npm install reported dependency vulnerabilities. They were not auto-fixed because `npm audit fix --force` can introduce breaking changes.

## Remaining Work

1. Test Upload Documents in the browser with real sample files:
   - JPG/PNG invoice or purchase order.
   - Text-native PDF.
   - Scanned PDF.
   - DOCX and XLSX.
2. Tune local extraction rules for Tobolar's real document layouts.
3. Consider moving OCR/parsing into a Web Worker if browser responsiveness is poor on large files.
4. Review dependency vulnerabilities separately with regression testing.
5. If the deployed Supabase project still has the old `procurement-ai` Edge Function, it is not called by the app anymore. Delete it from Supabase later if you want the dashboard cleaned up.

## Suggested Next Session Order

1. Open the deployed app and upload a real JPG invoice.
2. Verify extracted fields, line items, supplier matching, and inventory distribution.
3. Patch extraction rules based on the first real misses.
4. Repeat with one PDF and one Excel/Word document.
