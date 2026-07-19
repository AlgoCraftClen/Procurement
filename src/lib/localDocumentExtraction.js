import { recognize } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import * as XLSX from "xlsx";
import { normalizeLineItemsForDocument, toNumber } from "@/lib/procurementData";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const OCR_MAX_PDF_PAGES = 3;

const normalizeText = (value = "") => String(value).replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
const compact = (value = "") => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const cleanLine = (line = "") => line.replace(/\s+/g, " ").trim();

const parseMoney = (value) => toNumber(String(value || "").replace(/[^\d.-]/g, ""), 0);

const normalizeDate = (value) => {
  if (!value) return "";
  const input = String(value).replace(/,/g, "").trim();

  const numeric = input.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (numeric) {
    const [, month, day, year] = numeric;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
};

const matchAfterLabel = (text, labels, valuePattern = "([^\\n]+)") => {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:#-]?\\s*${valuePattern}`, "i");
    const match = text.match(pattern);
    if (match?.[1]) return cleanLine(match[1]);
  }
  return "";
};

const findDate = (text, labels) => {
  const datePattern = "([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})";
  return normalizeDate(matchAfterLabel(text, labels, datePattern));
};

const findTotal = (text, labels) => {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:#-]?\\s*\\$?\\s*([\\d,]+(?:\\.\\d{2})?)`, "gi");
    const matches = [...text.matchAll(pattern)].map((match) => parseMoney(match[1])).filter((value) => value > 0);
    if (matches.length) return matches[matches.length - 1];
  }

  const amounts = [...text.matchAll(/\$?\s*([\d,]+\.\d{2})/g)]
    .map((match) => parseMoney(match[1]))
    .filter((value) => value > 0);
  return amounts.length ? Math.max(...amounts) : 0;
};

const findKnownSupplier = (text, suppliers = []) => {
  const haystack = compact(text);
  return suppliers.find((supplier) => {
    const name = supplier.company_name || supplier.name || supplier.supplier_name || "";
    return name && haystack.includes(compact(name));
  });
};

const findSupplierName = (text, suppliers = []) => {
  const knownSupplier = findKnownSupplier(text, suppliers);
  if (knownSupplier) return knownSupplier.company_name || knownSupplier.name || knownSupplier.supplier_name || "";

  const lines = normalizeText(text).split("\n").map(cleanLine).filter(Boolean);
  const labeled = matchAfterLabel(text, ["vendor", "supplier", "from", "remit to", "bill from", "to"]);
  if (labeled && labeled.length <= 80 && !/\d{2,}/.test(labeled)) return labeled;

  return lines.find((line) =>
    line.length > 2 &&
    line.length < 80 &&
    !/^(invoice|purchase order|goods receipt|packing slip|delivery note|date|page)\b/i.test(line) &&
    /[a-z]/i.test(line)
  ) || "";
};

const scoreDocumentType = (text) => {
  const value = text.toLowerCase();
  const scores = {
    invoice: 0,
    purchase_order: 0,
    goods_receipt: 0,
  };

  [
    ["invoice", 5],
    ["invoice #", 4],
    ["invoice no", 4],
    ["amount due", 4],
    ["balance due", 3],
    ["bill to", 2],
    ["subtotal", 1],
  ].forEach(([term, score]) => {
    if (value.includes(term)) scores.invoice += score;
  });

  [
    ["purchase order", 6],
    ["po number", 4],
    ["po #", 4],
    ["p.o.", 4],
    ["ship to", 3],
    ["date required", 2],
    ["requisition", 2],
    ["vendor", 1],
  ].forEach(([term, score]) => {
    if (value.includes(term)) scores.purchase_order += score;
  });

  [
    ["goods receipt", 6],
    ["delivery note", 5],
    ["packing slip", 5],
    ["receiving report", 5],
    ["received by", 4],
    ["received qty", 3],
    ["received quantity", 3],
    ["condition", 1],
  ].forEach(([term, score]) => {
    if (value.includes(term)) scores.goods_receipt += score;
  });

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [documentType, score] = entries[0];
  const confidence = Math.min(95, Math.max(0, score * 10));

  return {
    document_type: score > 0 ? documentType : "unknown",
    confidence,
    reasoning: score > 0 ? `Matched local document keywords for ${documentType.replace("_", " ")}.` : "No clear procurement document keywords were found.",
  };
};

const extractLineItems = (text, documentType) => {
  const lines = normalizeText(text).split("\n").map(cleanLine).filter(Boolean);
  const items = [];

  for (const line of lines) {
    if (!/\d/.test(line) || !/(\$|\d+\.\d{2})/.test(line)) continue;
    if (/subtotal|total|tax|balance|amount due|payment/i.test(line)) continue;

    const amountMatches = [...line.matchAll(/\$?\s*([\d,]+\.\d{2})/g)];
    if (!amountMatches.length) continue;

    const total = parseMoney(amountMatches[amountMatches.length - 1][1]);
    const unitPrice = amountMatches.length > 1 ? parseMoney(amountMatches[amountMatches.length - 2][1]) : total;
    const beforeAmounts = cleanLine(line.slice(0, amountMatches[0].index));
    const quantityMatch = beforeAmounts.match(/\b(\d+(?:\.\d+)?)\b/);
    const quantity = quantityMatch ? toNumber(quantityMatch[1], 1) : 1;
    const description = cleanLine(beforeAmounts.replace(/^\d+\s*/, "").replace(/\b(EA|BOX|PK|SET|UNIT|PCS?)\b/gi, ""));

    if (!description || total <= 0) continue;

    items.push({
      description,
      quantity,
      quantity_ordered: quantity,
      ordered_quantity: quantity,
      received_quantity: documentType === "goods_receipt" ? quantity : 0,
      quantity_received: documentType === "goods_receipt" ? quantity : 0,
      unit: "EA",
      unit_of_measure: "EA",
      unit_price: unitPrice,
      total_price: total,
      condition: "good",
    });
  }

  return normalizeLineItemsForDocument(documentType, items.slice(0, 50));
};

const createDocumentData = (documentType, text, suppliers = []) => {
  const supplierName = findSupplierName(text, suppliers);
  const lineItems = extractLineItems(text, documentType);
  const today = new Date().toISOString().split("T")[0];

  if (documentType === "purchase_order") {
    return {
      po_number: matchAfterLabel(text, ["purchase order", "po number", "po #", "p\\.o\\.", "order number", "order #"]),
      supplier_name: supplierName,
      supplier_address: "",
      order_date: findDate(text, ["order date", "date"]) || today,
      date_required: findDate(text, ["date required", "required by", "delivery date", "expected delivery"]),
      payment_terms: matchAfterLabel(text, ["payment terms", "terms"]),
      requisition_no: matchAfterLabel(text, ["requisition no", "requisition #", "req no", "req #"]),
      purpose_project: matchAfterLabel(text, ["purpose", "project", "for"]),
      status: "draft",
      line_items: lineItems.length ? lineItems : normalizeLineItemsForDocument(documentType, [{ description: "", quantity_ordered: 1, unit_price: 0, total_price: 0 }]),
      total_amount: findTotal(text, ["grand total", "total amount", "total"]),
      notes: "Extracted locally without a paid AI API. Please verify before saving.",
    };
  }

  if (documentType === "invoice") {
    const subtotal = findTotal(text, ["subtotal"]);
    const taxAmount = findTotal(text, ["tax", "sales tax", "vat"]);
    return {
      invoice_number: matchAfterLabel(text, ["invoice number", "invoice no", "invoice #", "inv no", "inv #"]),
      purchase_order_number: matchAfterLabel(text, ["po number", "po #", "p\\.o\\.", "purchase order", "order number"]),
      supplier_name: supplierName,
      supplier_address: "",
      invoice_date: findDate(text, ["invoice date", "date"]) || today,
      due_date: findDate(text, ["due date", "payment due"]),
      payment_terms: matchAfterLabel(text, ["payment terms", "terms"]),
      status: "pending",
      line_items: lineItems.length ? lineItems : normalizeLineItemsForDocument(documentType, [{ description: "", quantity: 1, unit_price: 0, total_price: 0 }]),
      subtotal,
      tax_amount: taxAmount,
      total_amount: findTotal(text, ["amount due", "balance due", "grand total", "invoice total", "total"]),
      notes: "Extracted locally without a paid AI API. Please verify before saving.",
    };
  }

  return {
    receipt_number: matchAfterLabel(text, ["receipt number", "receipt #", "delivery note", "packing slip", "receiving report"]),
    purchase_order_number: matchAfterLabel(text, ["po number", "po #", "p\\.o\\.", "purchase order", "order number"]),
    supplier_name: supplierName,
    supplier_address: "",
    received_date: findDate(text, ["received date", "date received", "date"]) || today,
    received_by: matchAfterLabel(text, ["received by", "receiver"]),
    delivery_note: matchAfterLabel(text, ["delivery note", "delivery ref", "carrier reference"]),
    status: "received",
    line_items: lineItems.length ? lineItems : normalizeLineItemsForDocument(documentType, [{ description: "", ordered_quantity: 1, received_quantity: 1, condition: "good" }]),
    notes: "Extracted locally without a paid AI API. Please verify before saving.",
  };
};

const ocrImage = async (source, onProgress) => {
  const result = await recognize(source, "eng", {
    logger: (message) => {
      if (message.status) onProgress?.({ status: message.status, progress: message.progress || 0 });
    },
  });
  return result?.data?.text || "";
};

const extractPdfText = async (file, onProgress) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const textParts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    textParts.push(content.items.map((item) => item.str).join(" "));
  }

  const text = normalizeText(textParts.join("\n"));
  if (text.length >= 40) return text;

  const ocrParts = [];
  const pageLimit = Math.min(pdf.numPages, OCR_MAX_PDF_PAGES);
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    onProgress?.({ status: `OCR page ${pageNumber} of ${pageLimit}`, progress: pageNumber / pageLimit });
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    ocrParts.push(await ocrImage(canvas, onProgress));
  }

  return normalizeText(ocrParts.join("\n"));
};

const extractTextFromFile = async (file, onProgress) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (IMAGE_TYPES.has(file.type) || ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)) {
    return normalizeText(await ocrImage(file, onProgress));
  }

  if (file.type === "application/pdf" || extension === "pdf") {
    return extractPdfText(file, onProgress);
  }

  if (["docx"].includes(extension)) {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return normalizeText(result.value || "");
  }

  if (["xls", "xlsx", "csv"].includes(extension)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return normalizeText(workbook.SheetNames.map((sheetName) => XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])).join("\n"));
  }

  if (file.type.startsWith("text/") || ["txt"].includes(extension)) {
    return normalizeText(await file.text());
  }

  return "";
};

export async function extractProcurementDocumentLocally(file, { suppliers = [], onProgress } = {}) {
  const rawText = await extractTextFromFile(file, onProgress);
  if (!rawText || rawText.length < 12) {
    return {
      document_type: "unknown",
      confidence: 0,
      reasoning: "Local extraction could not read enough text from the document.",
      data: null,
      raw_text: rawText,
    };
  }

  const classification = scoreDocumentType(rawText);
  if (classification.document_type === "unknown") {
    return {
      ...classification,
      data: null,
      raw_text: rawText,
    };
  }

  return {
    ...classification,
    data: createDocumentData(classification.document_type, rawText, suppliers),
    raw_text: rawText,
  };
}
