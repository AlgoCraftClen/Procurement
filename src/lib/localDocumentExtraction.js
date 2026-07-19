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
const getLines = (text) => normalizeText(text).split("\n").map(cleanLine).filter(Boolean);

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

const findAllDates = (text) => {
  const matches = [...String(text).matchAll(/\b(?:[A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g)]
    .map((match) => normalizeDate(match[0]))
    .filter(Boolean);
  return [...new Set(matches)];
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

const findSupplierName = (text, suppliers = [], documentType = "") => {
  const knownSupplier = findKnownSupplier(text, suppliers);
  if (knownSupplier) return knownSupplier.company_name || knownSupplier.name || knownSupplier.supplier_name || "";

  const lines = getLines(text);

  if (documentType === "purchase_order") {
    const toLine = lines.find((line) => /\bto\s*[:_-]/i.test(line) && !/ship\s*to/i.test(line));
    if (toLine) {
      const value = cleanLine(toLine.replace(/^.*?\bto\s*[:_-]\s*/i, "").replace(/\bship\s*to\b.*$/i, ""));
      if (value && value.length <= 80 && !/\d{3,}/.test(value)) return value;
    }

    const toIndex = lines.findIndex((line) => /^to\b/i.test(line) && !/ship\s*to/i.test(line));
    if (toIndex >= 0) {
      const candidate = lines.slice(toIndex + 1, toIndex + 4)
        .find((line) => /[a-z]/i.test(line) && !/\b(po|ship|date|majuro|marshall|islands|box)\b/i.test(line));
      if (candidate) return candidate;
    }
  }

  const labeled = matchAfterLabel(text, ["vendor", "supplier", "from", "remit to", "bill from", "to"]);
  if (labeled && labeled.length <= 80 && !/\d{2,}/.test(labeled)) return labeled;

  return lines.find((line) =>
    line.length > 2 &&
    line.length < 80 &&
    !/^(invoice|purchase order|goods receipt|packing slip|delivery note|date|page)\b/i.test(line) &&
    /[a-z]/i.test(line)
  ) || "";
};

const findPurchaseOrderNumber = (text) => {
  const patterns = [
    /\b(?:po|p\.o\.|purchase\s*order|order)\s*(?:number|no|#)?\s*[:#-]?\s*([A-Z0-9-]{3,})\b/i,
    /\b(?:no|n0)\s*[:#-]?\s*([A-Z0-9-]{3,})\b/i,
    /\bpo\s*#?\s*([A-Z0-9-]{3,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = String(text).match(pattern);
    if (match?.[1] && !/^purchase$/i.test(match[1])) return match[1].replace(/[^\w-]/g, "");
  }

  return "";
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
  const lines = getLines(text);
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

const findLikelyDescription = (lines, amountLineIndex) => {
  const ignored = /^(total|subtotal|tax|date|terms|routing|ship|ordered|received|unit|stock|description|for:|certified|requested|approved|purchase order|copra|p\.o\.|box)\b/i;
  const candidates = [];

  for (let index = Math.max(0, amountLineIndex - 5); index <= amountLineIndex; index += 1) {
    const line = lines[index] || "";
    if (!line || ignored.test(line)) continue;
    if (!/[a-z]/i.test(line)) continue;
    if (/^\$?\s*[\d,]+(?:\.\d{2})?$/.test(line)) continue;
    candidates.push(line);
  }

  return candidates.find((line) => /\b(rice|lb|lbs|cement|fuel|oil|parts|supply|material|water|paint|pipe|wire|tool|discount)\b/i.test(line))
    || candidates[candidates.length - 1]
    || "";
};

const findNearbyQuantity = (lines, amountLineIndex) => {
  for (let index = Math.max(0, amountLineIndex - 5); index <= amountLineIndex; index += 1) {
    const match = (lines[index] || "").match(/\b(\d+(?:\.\d+)?)\s*(EA|EACH|BOX|CASE|SET|PCS?|UNITS?|BAGS?|LBS?|LB)\b/i);
    if (match) return { quantity: toNumber(match[1], 1), unit: match[2].toUpperCase() };
  }

  for (let index = Math.max(0, amountLineIndex - 3); index <= amountLineIndex; index += 1) {
    const line = lines[index] || "";
    if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line)) continue;
    const match = line.match(/^\s*(\d+(?:\.\d+)?)\b/);
    if (match) return { quantity: toNumber(match[1], 1), unit: "EA" };
  }

  return { quantity: 0, unit: "EA" };
};

const extractPurchaseOrderLineItems = (text) => {
  const lines = getLines(text);
  const items = [];

  lines.forEach((line, index) => {
    if (!/(\$|\d+\.\d{2})/.test(line)) return;
    if (/^\s*(subtotal|grand total|total|amount due|balance due)\b/i.test(line)) return;

    const amounts = [...line.matchAll(/\$?\s*([\d,]+\.\d{2})/g)].map((match) => parseMoney(match[1])).filter((value) => value > 0);
    if (!amounts.length) return;

    const totalPrice = amounts[amounts.length - 1];
    const unitPrice = amounts.length > 1 ? amounts[amounts.length - 2] : 0;
    const nearbyQuantity = findNearbyQuantity(lines, index);
    const quantity = nearbyQuantity.quantity || (unitPrice > 0 ? Number((totalPrice / unitPrice).toFixed(2)) : 1);
    const unit = nearbyQuantity.unit || "EA";
    const description = findLikelyDescription(lines, index);

    if (!description || totalPrice <= 0) return;

    items.push({
      description,
      quantity,
      quantity_ordered: quantity,
      ordered_quantity: quantity,
      quantity_received: 0,
      received_quantity: 0,
      unit,
      unit_of_measure: unit,
      stock_number: "",
      unit_price: unitPrice || (quantity ? Number((totalPrice / quantity).toFixed(2)) : 0),
      total_price: totalPrice,
    });
  });

  if (!items.length) return [];

  const unique = [];
  const seen = new Set();
  items.forEach((item) => {
    const key = `${compact(item.description)}-${item.total_price}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  });

  return normalizeLineItemsForDocument("purchase_order", unique.slice(0, 50));
};

const loadImageElement = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  let objectUrl = "";

  image.onload = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    reject(new Error("Could not load image for OCR."));
  };

  if (source instanceof Blob) {
    objectUrl = URL.createObjectURL(source);
    image.src = objectUrl;
  } else {
    image.crossOrigin = "anonymous";
    image.src = source;
  }
});

const canvasFromSource = async (source) => {
  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) return source;
  const image = await loadImageElement(source);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return canvas;
};

const preprocessCanvasForOcr = (sourceCanvas) => {
  const maxWidth = 2600;
  const scale = Math.max(1, Math.min(3, maxWidth / Math.max(1, sourceCanvas.width)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceCanvas.width * scale);
  canvas.height = Math.round(sourceCanvas.height * scale);

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const enhanced = Math.max(0, Math.min(255, (luminance - 150) * 2.2 + 165));
    data[index] = enhanced;
    data[index + 1] = enhanced;
    data[index + 2] = enhanced;
    data[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);

  return canvas;
};

const createDocumentData = (documentType, text, suppliers = []) => {
  const supplierName = findSupplierName(text, suppliers, documentType);
  const lineItems = documentType === "purchase_order"
    ? extractPurchaseOrderLineItems(text)
    : extractLineItems(text, documentType);
  const today = new Date().toISOString().split("T")[0];
  const dates = findAllDates(text);

  if (documentType === "purchase_order") {
    const totalAmount = findTotal(text, ["grand total", "total amount", "total"]);
    return {
      po_number: findPurchaseOrderNumber(text),
      supplier_name: supplierName,
      supplier_address: "",
      order_date: findDate(text, ["order date", "date"]) || dates[0] || today,
      date_required: findDate(text, ["date required", "required by", "delivery date", "expected delivery"]) || dates[1] || dates[0] || "",
      payment_terms: matchAfterLabel(text, ["payment terms", "terms"]),
      requisition_no: matchAfterLabel(text, ["requisition no", "requisition #", "req no", "req #"]),
      purpose_project: matchAfterLabel(text, ["purpose", "project", "for"]),
      status: "draft",
      line_items: lineItems.length ? lineItems : normalizeLineItemsForDocument(documentType, [{ description: "", quantity_ordered: 1, unit_price: 0, total_price: 0 }]),
      total_amount: totalAmount || lineItems.reduce((sum, item) => sum + toNumber(item.total_price, 0), 0),
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
  const ocrSource = typeof document !== "undefined"
    ? preprocessCanvasForOcr(await canvasFromSource(source))
    : source;

  const result = await recognize(ocrSource, "eng", {
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
