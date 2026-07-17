export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getOrderedQuantity(item = {}) {
  return toNumber(
    item.quantity_ordered ??
      item.ordered_quantity ??
      item.quantity ??
      item.qty ??
      item.order_quantity,
    0
  );
}

export function getReceivedQuantity(item = {}) {
  return toNumber(item.quantity_received ?? item.received_quantity, 0);
}

export function getLineTotal(item = {}) {
  const quantity = getOrderedQuantity(item);
  const unitPrice = toNumber(item.unit_price, 0);
  return toNumber(
    item.total_price ?? item.line_total ?? item.amount ?? item.extended_price,
    quantity * unitPrice
  );
}

export function normalizePurchaseOrderLineItem(item = {}) {
  const quantityOrdered = getOrderedQuantity(item);
  const quantityReceived = getReceivedQuantity(item);
  const unitPrice = toNumber(item.unit_price, 0);
  const totalPrice = getLineTotal({ ...item, quantity_ordered: quantityOrdered, unit_price: unitPrice });

  return {
    ...item,
    quantity: quantityOrdered,
    quantity_ordered: quantityOrdered,
    ordered_quantity: quantityOrdered,
    quantity_received: quantityReceived,
    received_quantity: quantityReceived,
    unit: item.unit || item.unit_of_measure || "EA",
    unit_of_measure: item.unit_of_measure || item.unit || "EA",
    description: item.description || item.item_description || item.item_name || "",
    unit_price: unitPrice,
    total_price: Number(totalPrice.toFixed(2)),
  };
}

export function normalizeInvoiceLineItem(item = {}) {
  const quantity = toNumber(item.quantity ?? item.quantity_ordered ?? item.ordered_quantity, 0);
  const unitPrice = toNumber(item.unit_price, 0);
  const totalPrice = toNumber(item.total_price ?? item.line_total ?? item.amount, quantity * unitPrice);

  return {
    ...item,
    quantity,
    description: item.description || item.item_description || item.item_name || "",
    unit_price: unitPrice,
    total_price: Number(totalPrice.toFixed(2)),
  };
}

export function normalizeGoodsReceiptLineItem(item = {}) {
  const orderedQuantity = getOrderedQuantity(item);
  const receivedQuantity = getReceivedQuantity(item);

  return {
    ...item,
    description: item.description || item.item_description || item.item_name || "",
    ordered_quantity: orderedQuantity,
    quantity_ordered: orderedQuantity,
    quantity: orderedQuantity,
    received_quantity: receivedQuantity,
    quantity_received: receivedQuantity,
    condition: item.condition || "good",
  };
}

export function normalizeLineItemForDocument(documentType, item = {}) {
  if (documentType === "purchase_order") return normalizePurchaseOrderLineItem(item);
  if (documentType === "goods_receipt") return normalizeGoodsReceiptLineItem(item);
  if (documentType === "invoice") return normalizeInvoiceLineItem(item);
  return item;
}

export function normalizeLineItemsForDocument(documentType, items = []) {
  return Array.isArray(items)
    ? items.map((item) => normalizeLineItemForDocument(documentType, item))
    : [];
}

export function calculateLineItemsTotal(items = []) {
  return normalizeLineItemsForDocument("purchase_order", items)
    .reduce((sum, item) => sum + getLineTotal(item), 0);
}

export function normalizePurchaseOrderRecord(record = {}) {
  const lineItems = normalizeLineItemsForDocument("purchase_order", record.line_items || []);
  const computedTotal = calculateLineItemsTotal(lineItems);
  const savedTotal = toNumber(record.total_amount, computedTotal);

  return {
    ...record,
    line_items: lineItems,
    total_amount: Number((savedTotal || computedTotal).toFixed(2)),
  };
}

export function getDocumentLineQuantity(documentType, item = {}) {
  if (documentType === "goods_receipt") return getReceivedQuantity(item);
  if (documentType === "purchase_order") return getOrderedQuantity(item);
  return toNumber(item.quantity ?? item.quantity_ordered ?? item.ordered_quantity, 0);
}
