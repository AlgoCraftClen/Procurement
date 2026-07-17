import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { PurchaseOrder } from "@/api/entities";
import { useDuplicateCheck } from "../shared/useDuplicateCheck";
import { calculateLineItemsTotal, normalizePurchaseOrderLineItem, normalizePurchaseOrderRecord, toNumber } from "@/lib/procurementData";

const defaultLineItem = () => normalizePurchaseOrderLineItem({
  quantity_ordered: 1,
  quantity_received: 0,
  unit: "EA",
  stock_number: "",
  description: "",
  unit_price: 0,
  total_price: 0
});

export default function PurchaseOrderForm({ purchaseOrder, suppliers, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    po_number: "",
    supplier_id: "",
    supplier_name: "",
    supplier_address: "",
    ship_to_name: "Tobolar Copra Processing Authority",
    ship_to_address: "PO BOX G, Majuro, MH 96960",
    order_date: "",
    date_required: "",
    ship_via: "",
    routing: "",
    payment_terms: "",
    requisition_no: "",
    purpose_project: "",
    status: "draft",
    line_items: [defaultLineItem()],
    total_amount: 0,
    requested_by: "",
    certified_by: "",
    approved_by: "",
    purchasing_agent: "",
    notes: "",
    category: "General"
  });

  useEffect(() => {
    if (purchaseOrder) {
      const normalizedPO = normalizePurchaseOrderRecord(purchaseOrder);
      const poData = {
        ...normalizedPO,
        order_date: purchaseOrder.order_date ? purchaseOrder.order_date.split('T')[0] : "",
        date_required: purchaseOrder.date_required ? purchaseOrder.date_required.split('T')[0] : "",
        received_date: purchaseOrder.received_date ? purchaseOrder.received_date.split('T')[0] : "",
        line_items: normalizedPO.line_items?.length ? normalizedPO.line_items : [defaultLineItem()],
        category: purchaseOrder.category || "General"
      };
      
      // **FIX:** If editing an existing PO and supplier_name is missing, populate it from suppliers list
      if (poData.supplier_id && !poData.supplier_name && suppliers) {
        const supplier = suppliers.find(s => s.id === poData.supplier_id);
        if (supplier) {
          poData.supplier_name = supplier.company_name;
          poData.supplier_address = supplier.address || '';
        }
      }
      
      setFormData(poData);
    }
  }, [purchaseOrder, suppliers]); // Added suppliers to dependencies

  const { isChecking: checkingPoNumber, isDuplicate: isDuplicatePoNumber } = useDuplicateCheck({
    entity: PurchaseOrder,
    field: 'po_number',
    value: formData.po_number,
    idToIgnore: purchaseOrder?.id,
    additionalFilters: { supplier_id: formData.supplier_id },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-fill supplier info when supplier is selected
      if (name === 'supplier_id' && suppliers) {
        const supplier = suppliers.find(s => s.id === value);
        if (supplier) {
          updated.supplier_name = supplier.company_name;
          updated.supplier_address = supplier.address || '';
        }
      }
      
      return updated;
    });
  };

  const calculateTotals = useCallback(() => {
    const total = calculateLineItemsTotal(formData.line_items);
    setFormData(prev => ({
        ...prev,
        total_amount: Number(total.toFixed(2))
    }));
  }, [formData.line_items]);

  const handleItemChange = (index, field, value) => {
    const items = [...formData.line_items];
    const numericValue = toNumber(value, 0);
    items[index][field] = value;
    
    if (field === 'quantity_ordered' || field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity_ordered' || field === 'quantity'
        ? numericValue
        : toNumber(items[index].quantity_ordered ?? items[index].quantity, 0);
      const unitPrice = field === 'unit_price' ? numericValue : toNumber(items[index].unit_price, 0);
      items[index].quantity = quantity;
      items[index].quantity_ordered = quantity;
      items[index].ordered_quantity = quantity;
      items[index].unit_price = unitPrice;
      items[index].total_price = Number((quantity * unitPrice).toFixed(2));
    }
    
    setFormData((prev) => ({ ...prev, line_items: items }));
  };
  
  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      line_items: [...prev.line_items, defaultLineItem()]
    }));
  };

  const removeItem = (index) => {
    const items = formData.line_items.filter((_, i) => i !== index);
    setFormData((prev) => ({...prev, line_items: items}));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDuplicatePoNumber && !purchaseOrder) {
        return;
    }
    
    // **FIX:** Ensure supplier_name and supplier_address are always included
    const normalized = normalizePurchaseOrderRecord(formData);
    const dataToSave = { ...formData, ...normalized };
    if (dataToSave.supplier_id && !dataToSave.supplier_name && suppliers) {
      const supplier = suppliers.find(s => s.id === dataToSave.supplier_id);
      if (supplier) {
        dataToSave.supplier_name = supplier.company_name;
        dataToSave.supplier_address = supplier.address || '';
      }
    }
    
    onSave(dataToSave);
  };
  
  const isSaveDisabled = isSaving || (isDuplicatePoNumber && !purchaseOrder);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="po_number">PO Number*</Label>
          <div className="relative">
            <Input
              id="po_number"
              name="po_number"
              value={formData.po_number}
              onChange={handleInputChange}
              required
              className={isDuplicatePoNumber ? 'border-red-500' : ''}
            />
            {checkingPoNumber && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
          </div>
          {isDuplicatePoNumber && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-xs">A PO with this number already exists for this supplier.</p>
            </Alert>
          )}
        </div>
        <div>
          <Label>Order Date*</Label>
          <Input name="order_date" type="date" value={formData.order_date} onChange={handleInputChange} required />
        </div>
        <div>
          <Label>Date Required</Label>
          <Input name="date_required" type="date" value={formData.date_required} onChange={handleInputChange} />
        </div>
      </div>

      {/* Supplier & Shipping */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Supplier (TO:)*</Label>
          <Select name="supplier_id" value={formData.supplier_id} onValueChange={(v) => handleSelectChange('supplier_id', v)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input name="supplier_address" value={formData.supplier_address} onChange={handleInputChange} placeholder="Supplier address" className="mt-2" />
        </div>
        <div>
          <Label>Ship To</Label>
          <Input name="ship_to_name" value={formData.ship_to_name} onChange={handleInputChange} placeholder="Ship to name" />
          <Input name="ship_to_address" value={formData.ship_to_address} onChange={handleInputChange} placeholder="Ship to address" className="mt-2" />
        </div>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Ship Via</Label>
          <Input name="ship_via" value={formData.ship_via} onChange={handleInputChange} placeholder="e.g., USPS" />
        </div>
        <div>
          <Label>Routing</Label>
          <Input name="routing" value={formData.routing} onChange={handleInputChange} />
        </div>
        <div>
          <Label>Terms</Label>
          <Input name="payment_terms" value={formData.payment_terms} onChange={handleInputChange} placeholder="e.g., 30 Days" />
        </div>
        <div>
          <Label>Requisition No</Label>
          <Input name="requisition_no" value={formData.requisition_no} onChange={handleInputChange} />
        </div>
      </div>

      {/* Status, Category, Purpose */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Status</Label>
          <Select name="status" value={formData.status} onValueChange={v => handleSelectChange('status', v)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="partially_received">Partially Received</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category*</Label>
          <Select name="category" value={formData.category} onValueChange={(v) => handleSelectChange('category', v)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Raw Materials">Raw Materials</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Services">Services</SelectItem>
              <SelectItem value="Travel">Travel</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="R&D">R&D</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Purpose/Project</Label>
          <Input name="purpose_project" value={formData.purpose_project} onChange={handleInputChange} placeholder="e.g., For: Boiler Water Supply" />
        </div>
      </div>
      
      {/* Line Items */}
      <div>
        <Label className="text-lg">Line Items</Label>
        <div className="space-y-2">
          {formData.line_items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 rounded-md border bg-white p-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-2">
                <Label className="text-xs">Qty Ordered</Label>
                <Input type="number" value={item.quantity_ordered} onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)} />
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Unit</Label>
                <Input value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} placeholder="EA" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Stock #</Label>
                <Input value={item.stock_number} onChange={(e) => handleItemChange(index, 'stock_number', e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Description</Label>
                <Input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Unit Price</Label>
                <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} />
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Total</Label>
                <Input value={item.total_price} readOnly />
              </div>
              <div className="flex justify-end md:col-span-1">
                <Button type="button" variant="outline" size="icon" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeItem(index)} disabled={formData.line_items.length === 1} aria-label="Remove purchase order line item"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-2" /> Add Line Item</Button>
        </div>
      </div>
      
      {/* Approvals & Total */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Requested By</Label>
          <Input name="requested_by" value={formData.requested_by} onChange={handleInputChange} />
        </div>
        <div>
          <Label>Certified By</Label>
          <Input name="certified_by" value={formData.certified_by} onChange={handleInputChange} />
        </div>
        <div>
          <Label>Approved By</Label>
          <Input name="approved_by" value={formData.approved_by} onChange={handleInputChange} />
        </div>
        <div>
          <Label>Total Amount ($)</Label>
          <Input name="total_amount" type="number" step="0.01" value={formData.total_amount} readOnly className="font-bold" />
        </div>
      </div>
       
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" value={formData.notes} onChange={handleInputChange} />
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 flex justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaveDisabled}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (purchaseOrder?.id ? "Update Purchase Order" : "Save Purchase Order")}
        </Button>
      </div>
    </form>
  );
}
