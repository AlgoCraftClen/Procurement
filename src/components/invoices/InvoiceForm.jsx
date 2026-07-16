
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Budget } from "@/api/entities"; // Import Budget
import { Invoice } from "@/api/entities"; // Import Invoice entity for duplicate check
import { useDuplicateCheck } from "../shared/useDuplicateCheck"; // Custom hook for duplicate check

export default function InvoiceForm({ 
  invoice, 
  suppliers, 
  purchaseOrders, 
  onSubmit, 
  onCancel,
  isSubmitting = false
}) {
  const [formData, setFormData] = useState({
    invoice_number: "",
    purchase_order_id: "",
    supplier_id: "",
    invoice_date: "",
    due_date: "",
    status: "pending",
    line_items: [{ description: "", quantity: 1, unit_price: 0, total_price: 0 }],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    payment_date: "",
    payment_method: "",
    payment_reference: "",
    notes: "",
    budget_id: ""
  });
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    const fetchBudgets = async () => {
      const budgetData = await Budget.list();
      setBudgets(budgetData || []);
    };
    fetchBudgets();
  }, []);

  // Initialize form data when invoice prop changes
  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : "",
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : "",
        payment_date: invoice.payment_date ? invoice.payment_date.split('T')[0] : "",
        line_items: invoice.line_items?.length ? invoice.line_items : [{ description: "", quantity: 1, unit_price: 0, total_price: 0 }],
        budget_id: invoice.budget_id || ""
      });
    } else {
      // Reset to default values for new invoice
      setFormData({
        invoice_number: "",
        purchase_order_id: "",
        supplier_id: "",
        invoice_date: "",
        due_date: "",
        status: "pending",
        line_items: [{ description: "", quantity: 1, unit_price: 0, total_price: 0 }],
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        payment_date: "",
        payment_method: "",
        payment_reference: "",
        notes: "",
        budget_id: ""
      });
    }
  }, [invoice]);

  // --- Duplicate Check Handler ---
  const { isChecking: checkingInvoiceNumber, isDuplicate: isDuplicateInvoiceNumber } = useDuplicateCheck({
    entity: Invoice,
    field: 'invoice_number',
    value: formData.invoice_number,
    idToIgnore: invoice?.id,
    additionalFilters: { supplier_id: formData.supplier_id },
  });
  // --- End Duplicate Check Handler ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateTotals = useCallback(() => {
    const subtotal = formData.line_items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
    const tax = parseFloat(formData.tax_amount) || 0;
    setFormData(prev => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      total_amount: (subtotal + tax).toFixed(2)
    }));
  }, [formData.line_items, formData.tax_amount]);

  const handleItemChange = (index, field, value) => {
    const items = [...formData.line_items];
    items[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : items[index].quantity;
      const unitPrice = field === 'unit_price' ? parseFloat(value) || 0 : items[index].unit_price;
      items[index].total_price = (quantity * unitPrice).toFixed(2);
    }
    
    setFormData(prev => ({ ...prev, line_items: items }));
  };

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);


  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: "", quantity: 1, unit_price: 0, total_price: 0 }]
    }));
  };

  const removeItem = (index) => {
    const items = formData.line_items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, line_items: items }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (isDuplicateInvoiceNumber && !invoice?.id) { // Only prevent submission for new invoices if duplicate
        return;
    }
    onSubmit(formData);
  };
  
  const isSaveDisabled = isSubmitting || (isDuplicateInvoiceNumber && !invoice?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="invoice_number">Invoice Number*</Label>
          <div className="relative">
            <Input 
              id="invoice_number"
              name="invoice_number" 
              value={formData.invoice_number} 
              onChange={handleInputChange} 
              required 
              disabled={isSubmitting}
              className={isDuplicateInvoiceNumber ? 'border-red-500' : ''}
            />
            {checkingInvoiceNumber && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
          </div>
           {isDuplicateInvoiceNumber && (
            <Alert variant="destructive" className="mt-2 text-sm py-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-xs">An invoice with this number already exists for this supplier.</p>
            </Alert>
          )}
        </div>
        <div>
          <Label>Invoice Date*</Label>
          <Input 
            name="invoice_date" 
            type="date" 
            value={formData.invoice_date} 
            onChange={handleInputChange} 
            required 
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input 
            name="due_date" 
            type="date" 
            value={formData.due_date} 
            onChange={handleInputChange} 
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Supplier*</Label>
          <Select 
            value={formData.supplier_id} 
            onValueChange={v => handleSelectChange('supplier_id', v)} 
            required
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(s => 
                <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Purchase Order</Label>
          <Select 
            value={formData.purchase_order_id} 
            onValueChange={v => handleSelectChange('purchase_order_id', v)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select PO (optional)" />
            </SelectTrigger>
            <SelectContent>
              {purchaseOrders.map(po => 
                <SelectItem key={po.id} value={po.id}>{po.po_number}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Budget Allocation</Label>
          <Select 
            value={formData.budget_id} 
            onValueChange={v => handleSelectChange('budget_id', v)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select budget (optional)" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map(b => 
                <SelectItem key={b.id} value={b.id}>{b.fiscal_year} - {b.category}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Line Items</Label>
        <div className="space-y-2">
          {formData.line_items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 rounded-md border bg-white p-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <Label className="text-xs">Description</Label>
                <Input 
                  value={item.description} 
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input 
                  type="number" 
                  value={item.quantity} 
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Unit Price</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={item.unit_price} 
                  onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} 
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Total</Label>
                <Input value={item.total_price} readOnly />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="justify-self-end border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 md:col-span-1"
                onClick={() => removeItem(index)}
                disabled={isSubmitting || formData.line_items.length === 1}
                aria-label="Remove invoice line item"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addItem}
            disabled={isSubmitting}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={v => handleSelectChange('status', v)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tax Amount ($)</Label>
          <Input 
            name="tax_amount" 
            type="number" 
            step="0.01" 
            value={formData.tax_amount} 
            onChange={handleInputChange} 
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label>Total Amount ($)</Label>
          <Input name="total_amount" type="number" step="0.01" value={formData.total_amount} readOnly />
        </div>
      </div>

      {formData.status === 'paid' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Payment Date</Label>
            <Input 
              name="payment_date" 
              type="date" 
              value={formData.payment_date} 
              onChange={handleInputChange} 
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={v => handleSelectChange('payment_method', v)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Reference</Label>
            <Input 
              name="payment_reference" 
              value={formData.payment_reference} 
              onChange={handleInputChange} 
              placeholder="Transaction ID, Check #, etc." 
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      <div>
        <Label>Notes</Label>
        <Textarea 
          name="notes" 
          value={formData.notes} 
          onChange={handleInputChange} 
          rows={3} 
          disabled={isSubmitting}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 flex justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaveDisabled}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {invoice?.id ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
