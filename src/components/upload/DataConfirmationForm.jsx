import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, X, Trash2, AlertCircle, Users, Package2, Link2 } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDuplicateCheck } from "../shared/useDuplicateCheck";
import { Invoice } from "@/api/entities";
import {
  calculateLineItemsTotal,
  getDocumentLineQuantity,
  normalizeLineItemsForDocument,
  normalizeLineItemForDocument,
  toNumber,
} from "@/lib/procurementData";

const formatTitle = (str) => {
  if (!str) return "";
  return str.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatCurrency = (amount) => {
  const numAmount = parseFloat(amount);
  if (Number.isNaN(numAmount)) return "$0.00";
  return `$${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getDepartmentName = (department) =>
  department?.name || department?.department_name || department?.title || department?.code || "Unnamed department";

const getInventoryName = (type, item) => {
  if (!item) return "";
  if (type === "raw_material") return item.material_name || item.item_name || item.name || item.sku || "Unnamed raw material";
  if (type === "equipment") return item.equipment_name || item.item_name || item.name || item.asset_tag || "Unnamed equipment";
  if (type === "finished_good") return item.product_name || item.item_name || item.name || item.sku || "Unnamed finished good";
  return item.item_name || item.name || "Unnamed item";
};

const getInventoryList = (inventoryData, type) => {
  if (type === "raw_material") return inventoryData.rawMaterials || [];
  if (type === "equipment") return inventoryData.equipment || [];
  if (type === "finished_good") return inventoryData.finishedGoods || [];
  return [];
};

const getPreferredHeaders = (documentType, items) => {
  const base =
    documentType === "goods_receipt"
      ? ["description", "ordered_quantity", "received_quantity", "unit", "condition"]
      : documentType === "purchase_order"
        ? ["description", "quantity_ordered", "quantity_received", "unit", "stock_number", "unit_price", "total_price"]
        : ["description", "quantity", "unit_price", "total_price"];

  const hiddenAliases = new Set([
    "quantity",
    "ordered_quantity",
    "received_quantity",
    "unit_of_measure",
    "item_type",
    "item_id",
    "department_id",
    "distribution_status",
    "receive_to_inventory",
  ]);

  const present = new Set();
  items.forEach((item) => {
    Object.keys(item || {}).forEach((key) => present.add(key));
  });

  const headers = base.filter((key) => present.has(key) || ["description", "quantity", "quantity_ordered"].includes(key));
  present.forEach((key) => {
    if (!headers.includes(key) && !hiddenAliases.has(key)) headers.push(key);
  });
  return headers;
};

const createDefaultLineItem = (documentType) => {
  if (documentType === "goods_receipt") {
    return normalizeLineItemForDocument(documentType, {
      description: "",
      ordered_quantity: 0,
      received_quantity: 0,
      unit: "EA",
      condition: "good",
    });
  }

  if (documentType === "purchase_order") {
    return normalizeLineItemForDocument(documentType, {
      description: "",
      quantity_ordered: 1,
      quantity_received: 0,
      unit: "EA",
      unit_price: 0,
      total_price: 0,
    });
  }

  return normalizeLineItemForDocument(documentType, {
    description: "",
    quantity: 1,
    unit_price: 0,
    total_price: 0,
  });
};

export default function DataConfirmationForm({
  documentType,
  initialData,
  suppliers = [],
  purchaseOrders = [],
  departments = [],
  inventoryData = { rawMaterials: [], equipment: [], finishedGoods: [] },
  onSave,
  onCancel,
  isSaving,
}) {
  const [formData, setFormData] = useState(initialData || {});
  const [assignments, setAssignments] = useState([]);
  const [showAssignments, setShowAssignments] = useState(false);
  const [amountMismatchWarning, setAmountMismatchWarning] = useState(null);

  const supplierForCheck = useMemo(() => {
    if (!formData.supplier_name || !suppliers.length) return null;
    return suppliers.find((s) => s.company_name?.toLowerCase() === formData.supplier_name?.toLowerCase());
  }, [suppliers, formData.supplier_name]);

  const { isChecking: isCheckingDuplicate, isDuplicate } = useDuplicateCheck({
    entity: Invoice,
    field: "invoice_number",
    value: formData.invoice_number,
    additionalFilters: supplierForCheck ? { supplier_id: supplierForCheck.id } : {},
    enabled: documentType === "invoice" && !!formData.invoice_number && !!supplierForCheck,
  });

  const linkedPO = useMemo(() => {
    if (!formData.purchase_order_id || !purchaseOrders.length) return null;
    return purchaseOrders.find((po) => po.id === formData.purchase_order_id);
  }, [formData.purchase_order_id, purchaseOrders]);

  useEffect(() => {
    if (!initialData) return;

    const normalizedLineItems = normalizeLineItemsForDocument(documentType, initialData.line_items || []);
    const dataWithDefaults = {
      ...initialData,
      line_items: normalizedLineItems,
    };

    setFormData(dataWithDefaults);

    if (documentType === "invoice" && initialData.purchase_order_number && purchaseOrders.length) {
      const extractedPONumber = String(initialData.purchase_order_number).toLowerCase();
      const matchingPO = purchaseOrders.find((po) => po.po_number && String(po.po_number).toLowerCase() === extractedPONumber);
      if (matchingPO) {
        setFormData((prev) => ({ ...prev, purchase_order_id: matchingPO.id }));
      }
    }

    const supportsAssignments = ["purchase_order", "invoice", "goods_receipt"].includes(documentType);
    setShowAssignments(supportsAssignments);

    if (supportsAssignments && normalizedLineItems.length) {
      setAssignments(
        normalizedLineItems.map((item, index) => ({
          itemIndex: index,
          itemDescription: item.description || "",
          enabled: false,
          itemType: item.item_type || "none",
          itemId: item.item_id || "create_new",
          receiveToInventory: documentType === "goods_receipt",
          stockQuantity: getDocumentLineQuantity(documentType, item),
          issueNow: false,
          assignQuantity: 0,
          assignToEmployee: "",
          assignToDepartment: item.department_id || "",
          purpose: "",
          expectedReturnDate: "",
        }))
      );
    } else {
      setAssignments([]);
    }
  }, [initialData, documentType, purchaseOrders]);

  useEffect(() => {
    if (documentType !== "invoice" || !linkedPO || !formData.total_amount) {
      setAmountMismatchWarning(null);
      return;
    }

    const poAmount = parseFloat(linkedPO.total_amount);
    const invoiceAmount = parseFloat(formData.total_amount);

    if (Number.isNaN(poAmount) || Number.isNaN(invoiceAmount)) {
      setAmountMismatchWarning("Could not compare amounts: Invalid PO or Invoice total.");
      return;
    }

    const difference = Math.abs(poAmount - invoiceAmount);
    const percentageDifference = poAmount !== 0 ? (difference / poAmount) * 100 : invoiceAmount !== 0 ? 100 : 0;

    if (percentageDifference > 5) {
      setAmountMismatchWarning(
        `Invoice total (${formatCurrency(invoiceAmount)}) differs by more than 5% from the linked PO total (${formatCurrency(poAmount)}).`
      );
    } else {
      setAmountMismatchWarning(null);
    }
  }, [linkedPO, formData.total_amount, documentType]);

  const lineItemHeaders = useMemo(() => getPreferredHeaders(documentType, formData.line_items || []), [documentType, formData.line_items]);

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...(formData.line_items || [])];
    const current = { ...(items[index] || {}) };
    current[field] = value;

    if (["quantity", "quantity_ordered", "ordered_quantity"].includes(field)) {
      current.quantity = toNumber(value, 0);
      current.quantity_ordered = toNumber(value, 0);
      current.ordered_quantity = toNumber(value, 0);
    }

    if (["quantity_received", "received_quantity"].includes(field)) {
      current.quantity_received = toNumber(value, 0);
      current.received_quantity = toNumber(value, 0);
    }

    if (field === "unit") {
      current.unit_of_measure = value;
    }

    if (["quantity", "quantity_ordered", "ordered_quantity", "unit_price"].includes(field)) {
      const quantity = documentType === "invoice" ? toNumber(current.quantity, 0) : toNumber(current.quantity_ordered, 0);
      const unitPrice = toNumber(current.unit_price, 0);
      current.total_price = Number((quantity * unitPrice).toFixed(2));
    }

    items[index] = current;
    setFormData((prev) => ({ ...prev, line_items: normalizeLineItemsForDocument(documentType, items) }));

    if (assignments[index]) {
      handleAssignmentChange(index, "itemDescription", current.description || "");
    }
  };

  const handleAssignmentChange = (index, field, value) => {
    setAssignments((prev) => {
      const next = [...prev];
      if (!next[index]) return next;
      const updated = { ...next[index], [field]: value };

      if (field === "itemType") {
        updated.itemId = value === "none" ? "" : "create_new";
      }

      if (field === "receiveToInventory" && value) {
        updated.enabled = true;
      }

      if (field === "issueNow" && value) {
        updated.enabled = true;
      }

      next[index] = updated;
      return next;
    });
  };

  const addItem = () => {
    const items = formData.line_items || [];
    const newItem = createDefaultLineItem(documentType);
    setFormData((prev) => ({ ...prev, line_items: [...items, newItem] }));

    if (showAssignments) {
      setAssignments((prev) => [
        ...prev,
        {
          itemIndex: items.length,
          itemDescription: "",
          enabled: false,
          itemType: "none",
          itemId: "create_new",
          receiveToInventory: documentType === "goods_receipt",
          stockQuantity: getDocumentLineQuantity(documentType, newItem),
          issueNow: false,
          assignQuantity: 0,
          assignToEmployee: "",
          assignToDepartment: "",
          purpose: "",
          expectedReturnDate: "",
        },
      ]);
    }
  };

  const removeItem = (index) => {
    const items = formData.line_items || [];
    const newItems = items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, line_items: newItems }));

    if (showAssignments) {
      setAssignments((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((assignment, nextIndex) => ({ ...assignment, itemIndex: nextIndex }))
      );
    }
  };

  const handleSubmit = () => {
    if (documentType === "invoice" && isDuplicate) {
      console.error("Cannot save: A duplicate invoice number for this supplier has been detected.");
      return;
    }

    const normalizedItems = normalizeLineItemsForDocument(documentType, formData.line_items || []);
    const activeAssignments = showAssignments
      ? assignments.filter((assignment) => assignment.enabled && assignment.itemType && assignment.itemType !== "none")
      : [];

    const lineItemsWithDistribution = normalizedItems.map((item, index) => {
      const assignment = activeAssignments.find((entry) => entry.itemIndex === index);
      if (!assignment) return item;

      return {
        ...item,
        item_type: assignment.itemType,
        item_id: assignment.itemId && assignment.itemId !== "create_new" ? assignment.itemId : item.item_id || null,
        department_id: assignment.assignToDepartment || item.department_id || null,
        distribution_status: "reviewed",
        receive_to_inventory: !!assignment.receiveToInventory,
      };
    });

    const calculatedLineTotal = calculateLineItemsTotal(lineItemsWithDistribution);

    onSave({
      ...formData,
      line_items: lineItemsWithDistribution,
      total_amount: documentType === "purchase_order" ? Number(calculatedLineTotal.toFixed(2)) : formData.total_amount,
      assignments: activeAssignments,
      amountMismatchWarning: !!amountMismatchWarning,
      hasAmountMismatchWarning: !!amountMismatchWarning,
    });
  };

  const renderField = (key, value) => {
    if (key === "line_items" || (typeof value === "object" && value !== null && !Array.isArray(value)) || key === "purchase_order_id") {
      return null;
    }

    if (documentType === "invoice" && key === "purchase_order_number") {
      return (
        <div key="po-link" className="grid w-full items-center gap-1.5 relative">
          <Label htmlFor="purchase_order_id">Purchase Order Link</Label>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-400" />
            <Select
              value={formData.purchase_order_id || "none"}
              onValueChange={(val) => handleInputChange("purchase_order_id", val === "none" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to existing PO..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {purchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.po_number} - {po.supplierInfo?.company_name || "N/A"} (Total: {formatCurrency(po.total_amount || 0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {amountMismatchWarning && (
            <Alert variant="destructive" className="mt-2 text-xs py-1.5 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{amountMismatchWarning}</AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    const isDate = key.includes("date");
    let displayValue = value;

    if (isDate && value) {
      try {
        const date = parseISO(value);
        displayValue = isValid(date) ? format(date, "yyyy-MM-dd") : value || "";
      } catch {
        displayValue = value || "";
      }
    }

    return (
      <div key={key} className="grid w-full items-center gap-1.5 relative">
        <Label htmlFor={key}>{formatTitle(key)}</Label>
        <Input
          id={key}
          type={typeof value === "number" ? "number" : isDate ? "date" : "text"}
          value={displayValue ?? ""}
          onChange={(event) => handleInputChange(key, event.target.value)}
          readOnly={key === "purchase_order_number" && documentType === "invoice"}
        />
        {key === "invoice_number" && isCheckingDuplicate && (
          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-500" />
        )}
      </div>
    );
  };

  const renderLineItems = () => {
    const items = formData.line_items || [];

    if (items.length === 0) {
      return (
        <div className="space-y-4">
          <Label className="text-lg">Line Items</Label>
          <div className="border rounded-lg p-4">
            <p className="text-slate-500 text-center py-4">No line items found. Click "Add Line Item" to add items manually.</p>
            <Button type="button" variant="outline" onClick={addItem}>
              Add Line Item
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Label className="text-lg">Line Items</Label>
        <div className="border rounded-lg p-4 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-3 items-end p-2 border rounded-md">
              {lineItemHeaders.map((header) => (
                <div key={header} className="grid w-full items-center gap-1.5">
                  <Label htmlFor={`item-${index}-${header}`} className="text-xs">
                    {formatTitle(header)}
                  </Label>
                  <Input
                    id={`item-${index}-${header}`}
                    type={typeof item[header] === "number" ? "number" : "text"}
                    value={item[header] ?? ""}
                    onChange={(event) => handleItemChange(index, header, event.target.value)}
                  />
                </div>
              ))}
              <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addItem}>
            Add Line Item
          </Button>
        </div>
      </div>
    );
  };

  const renderAssignments = () => {
    if (!showAssignments || !formData.line_items || formData.line_items.length === 0) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Inventory Distribution and Issuing
          </CardTitle>
          <CardDescription>
            Verify where each uploaded line belongs, receive it into inventory when appropriate, and issue items immediately if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.map((assignment, index) => {
            const lineItem = formData.line_items[index];
            if (!lineItem) return null;

            const inventoryOptions = getInventoryList(inventoryData, assignment.itemType);

            return (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={assignment.enabled}
                      onCheckedChange={(checked) => handleAssignmentChange(index, "enabled", checked)}
                    />
                    <Label className="font-medium">
                      Review: {lineItem.description || `Item ${index + 1}`}
                    </Label>
                  </div>
                  <Package2 className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                {assignment.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Inventory Type</Label>
                      <Select value={assignment.itemType || "none"} onValueChange={(value) => handleAssignmentChange(index, "itemType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No inventory item</SelectItem>
                          <SelectItem value="raw_material">Raw Material</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="finished_good">Finished Good</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Inventory Item</Label>
                      <Select
                        value={assignment.itemId || "create_new"}
                        onValueChange={(value) => handleAssignmentChange(index, "itemId", value)}
                        disabled={!assignment.itemType || assignment.itemType === "none"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select inventory item..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create_new">Create new from this line</SelectItem>
                          {inventoryOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {getInventoryName(assignment.itemType, item)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Department</Label>
                      <Select
                        value={assignment.assignToDepartment || "none"}
                        onValueChange={(value) => handleAssignmentChange(index, "assignToDepartment", value === "none" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No department</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {getDepartmentName(dept)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Verified Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={assignment.stockQuantity}
                        onChange={(event) => handleAssignmentChange(index, "stockQuantity", toNumber(event.target.value, 0))}
                      />
                    </div>

                    <div className="flex items-center gap-2 rounded-md border p-3">
                      <Switch
                        checked={!!assignment.receiveToInventory}
                        onCheckedChange={(checked) => handleAssignmentChange(index, "receiveToInventory", checked)}
                      />
                      <Label className="text-sm">Receive into inventory</Label>
                    </div>

                    <div className="flex items-center gap-2 rounded-md border p-3">
                      <Switch checked={!!assignment.issueNow} onCheckedChange={(checked) => handleAssignmentChange(index, "issueNow", checked)} />
                      <Label className="text-sm">Issue now</Label>
                    </div>

                    {assignment.issueNow && (
                      <>
                        <div>
                          <Label className="text-xs">Quantity to Issue</Label>
                          <Input
                            type="number"
                            min="0"
                            max={toNumber(assignment.stockQuantity, 0)}
                            value={assignment.assignQuantity}
                            onChange={(event) => handleAssignmentChange(index, "assignQuantity", toNumber(event.target.value, 0))}
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Issue to Employee</Label>
                          <Input
                            value={assignment.assignToEmployee}
                            onChange={(event) => handleAssignmentChange(index, "assignToEmployee", event.target.value)}
                            placeholder="Employee name or email"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Purpose</Label>
                          <Input
                            value={assignment.purpose}
                            onChange={(event) => handleAssignmentChange(index, "purpose", event.target.value)}
                            placeholder="Purpose of issue"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Expected Return Date</Label>
                          <Input
                            type="date"
                            value={assignment.expectedReturnDate}
                            onChange={(event) => handleAssignmentChange(index, "expectedReturnDate", event.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  if (!formData || Object.keys(formData).length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          The app extracted data, but it was in an unexpected format. Please check the uploaded document and try again.
        </AlertDescription>
      </Alert>
    );
  }

  const isSaveDisabled = isSaving || (documentType === "invoice" && isDuplicate);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Extracted Data</CardTitle>
          <CardDescription>
            Review and edit the extracted data for the <span className="font-semibold">{formatTitle(documentType || "")}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {documentType === "invoice" && isDuplicate && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                An invoice with this number already exists for this supplier. Please change the invoice number or cancel.
              </AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="document" className="w-full">
            <TabsList>
              <TabsTrigger value="document">Document Details</TabsTrigger>
              {showAssignments && <TabsTrigger value="assignments">Distribution</TabsTrigger>}
            </TabsList>

            <TabsContent value="document" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(formData).map(([key, value]) => renderField(key, value))}
              </div>

              {renderLineItems()}
            </TabsContent>

            {showAssignments && <TabsContent value="assignments">{renderAssignments()}</TabsContent>}
          </Tabs>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaveDisabled}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save {formatTitle(documentType || "")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
