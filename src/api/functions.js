import { Budget, Invoice } from "./entities";

function ok(data = {}) {
  return Promise.resolve({ data: { success: true, ...data } });
}

function hashString(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createQrSvg(content = "") {
  const size = 120;
  const cells = 21;
  const cellSize = size / cells;
  const seed = hashString(content);
  const squares = [];

  const addFinder = (x, y) => {
    squares.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${7 * cellSize}" height="${7 * cellSize}" fill="#111827"/>`);
    squares.push(`<rect x="${(x + 1) * cellSize}" y="${(y + 1) * cellSize}" width="${5 * cellSize}" height="${5 * cellSize}" fill="#fff"/>`);
    squares.push(`<rect x="${(x + 2) * cellSize}" y="${(y + 2) * cellSize}" width="${3 * cellSize}" height="${3 * cellSize}" fill="#111827"/>`);
  };

  addFinder(0, 0);
  addFinder(14, 0);
  addFinder(0, 14);

  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const inFinder =
        (x < 7 && y < 7) ||
        (x >= 14 && y < 7) ||
        (x < 7 && y >= 14);
      if (inFinder) continue;
      const bit = (seed + x * 17 + y * 31 + x * y) % 5;
      if (bit === 0 || bit === 2) {
        squares.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#111827"/>`);
      }
    }
  }

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>${squares.join("")}</svg>`);
}

function createBarcodeSvg(content = "") {
  const safeContent = String(content || "");
  const width = 240;
  const height = 80;
  const seed = hashString(safeContent);
  let x = 10;
  const bars = [];

  for (let i = 0; i < Math.max(24, safeContent.length * 3); i += 1) {
    const barWidth = 1 + ((seed + i * 7) % 4);
    const gap = 1 + ((seed + i * 11) % 3);
    const barHeight = 44 + ((seed + i * 13) % 18);
    if (x + barWidth >= width - 10) break;
    bars.push(`<rect x="${x}" y="8" width="${barWidth}" height="${barHeight}" fill="#111827"/>`);
    x += barWidth + gap;
  }

  const label = safeContent
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/>${bars.join("")}<text x="${width / 2}" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#111827">${label}</text></svg>`);
}

export const generatePDF = async () => ok({ message: "PDF generation is not wired yet." });
export const sendNotification = async () => ok();
export const validateSupplier = async () => ok({ valid: true });
export const generateReport = async () => ok({ report: null });
export const autoReorder = async () => ok({ orders: [] });
export const sendWelcomeEmail = async () => ok();
export const validateInvitationCode = async () => ok({ valid: true });
export const updateBudgetOnPO = async () => ok();

function amountOf(invoice) {
  return Number(invoice?.total_amount || invoice?.amount || 0) || 0;
}

function invoiceAffectsBudget(invoice, targetInvoiceId, targetNewStatus) {
  if (invoice.id === targetInvoiceId && targetNewStatus === "deleted") return false;
  return Boolean(invoice.budget_id);
}

function isPaidInvoice(invoice) {
  return invoice.status === "paid";
}

function isCommittedInvoice(invoice) {
  return ["pending", "received", "approved", "overdue"].includes(invoice.status);
}

async function recalculateBudgetFromInvoices(budgetId, targetInvoiceId, targetNewStatus) {
  if (!budgetId) return null;

  const budget = await Budget.get(budgetId);
  const invoices = (await Invoice.filter({ budget_id: budgetId })) || [];
  const activeInvoices = invoices.filter((invoice) => invoiceAffectsBudget(invoice, targetInvoiceId, targetNewStatus));
  const spentAmount = activeInvoices
    .filter(isPaidInvoice)
    .reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const committedAmount = activeInvoices
    .filter(isCommittedInvoice)
    .reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const allocatedAmount = Number(budget.allocated_amount || 0) || 0;
  const availableAmount = allocatedAmount - spentAmount - committedAmount;
  const status = ["frozen", "closed"].includes(budget.status)
    ? budget.status
    : availableAmount < 0 ? "overspent" : "active";

  return Budget.update(budgetId, {
    spent_amount: spentAmount,
    committed_amount: committedAmount,
    available_amount: availableAmount,
    status
  });
}

export async function updateBudgetOnInvoice({ invoiceId, newStatus } = {}) {
  if (!invoiceId) return ok({ updated: false });

  const invoice = await Invoice.get(invoiceId);
  const updatedBudget = await recalculateBudgetFromInvoices(invoice.budget_id, invoiceId, newStatus);
  return ok({ updated: Boolean(updatedBudget), budget: updatedBudget });
}

function invoiceDuplicateKey(invoice) {
  const supplierPart = String(invoice.supplier_id || invoice.supplier_name || "").trim().toLowerCase();
  const numberPart = String(invoice.invoice_number || "").trim().toLowerCase();
  if (!numberPart) return null;
  return `${supplierPart}::${numberPart}`;
}

export async function identifyDuplicateInvoices() {
  const invoices = await Invoice.list("created_date");
  const groups = new Map();

  for (const invoice of invoices || []) {
    const key = invoiceDuplicateKey(invoice);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) || []), invoice]);
  }

  const duplicates = [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const sorted = [...group].sort((a, b) => String(a.created_date || "").localeCompare(String(b.created_date || "")));
      return {
        invoice_number: sorted[0].invoice_number,
        supplier_id: sorted[0].supplier_id || null,
        total_count: sorted.length,
        original: sorted[0],
        duplicates_to_delete: sorted.slice(1)
      };
    });

  return ok({ duplicates });
}

export async function cleanupDuplicateInvoices({ confirm_cleanup } = {}) {
  if (!confirm_cleanup) {
    throw new Error("Duplicate cleanup requires confirmation.");
  }

  const result = await identifyDuplicateInvoices();
  const duplicates = result.data.duplicates || [];
  let totalDeleted = 0;

  for (const duplicate of duplicates) {
    for (const invoice of duplicate.duplicates_to_delete || []) {
      await Invoice.delete(invoice.id);
      totalDeleted += 1;
    }
  }

  return ok({ total_deleted: totalDeleted, removed: totalDeleted });
}

export async function generateInvitationCode() {
  return ok({
    generated_codes: [
      {
        code: "PUBLIC-OPEN",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }
    ]
  });
}

export async function generateBarcode({ content, value, type = "1d" } = {}) {
  const barcodeContent = String(content || value || "");
  const barcodeUrl = type === "qr" ? createQrSvg(barcodeContent) : createBarcodeSvg(barcodeContent);
  return ok({ barcode: barcodeContent, barcode_url: barcodeUrl });
}
