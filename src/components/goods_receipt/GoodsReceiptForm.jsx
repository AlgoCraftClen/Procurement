import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function GoodsReceiptForm({ receipt, suppliers, purchaseOrders, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    receipt_number: "",
    purchase_order_id: "",
    supplier_id: "",
    received_date: "",
    received_by: "",
    line_items: [{ description: "", ordered_quantity: 0, received_quantity: 0, condition: "good", notes: "" }],
    status: "partial",
    delivery_note: "",
    notes: ""
  });

  useEffect(() => {
    if (receipt) {
      setFormData({
        ...receipt,
        received_date: receipt.received_date ? receipt.received_date.split('T')[0] : "",
        line_items: receipt.line_items?.length ? receipt.line_items : [{ description: "", ordered_quantity: 0, received_quantity: 0, condition: "good", notes: "" }]
      });
    }
  }, [receipt]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-populate supplier when PO is selected
    if (name === 'purchase_order_id' && value) {
      const po = purchaseOrders.find(p => p.id === value);
      if (po) {
        setFormData(prev => ({ 
          ...prev, 
          supplier_id: po.supplier_id,
          line_items: po.line_items?.map(item => ({
            description: item.description,
            ordered_quantity: item.quantity || 0,
            received_quantity: 0,
            condition: "good",
            notes: ""
          })) || prev.line_items
        }));
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.line_items];
    items[index][field] = value;
    setFormData(prev => ({ ...prev, line_items: items }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: "", ordered_quantity: 0, received_quantity: 0, condition: "good", notes: "" }]
    }));
  };

  const removeItem = (index) => {
    const items = formData.line_items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, line_items: items }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Receipt Number*</Label>
          <Input name="receipt_number" value={formData.receipt_number} onChange={handleChange} required />
        </div>
        <div>
          <Label>Received Date*</Label>
          <Input name="received_date" type="date" value={formData.received_date} onChange={handleChange} required />
        </div>
        <div>
          <Label>Received By*</Label>
          <Input name="received_by" value={formData.received_by} onChange={handleChange} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Purchase Order*</Label>
          <Select name="purchase_order_id" value={formData.purchase_order_id} onValueChange={v => handleSelectChange('purchase_order_id', v)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select purchase order" />
            </SelectTrigger>
            <SelectContent>
              {purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.po_number}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Supplier</Label>
          <Select name="supplier_id" value={formData.supplier_id} onValueChange={v => handleSelectChange('supplier_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Received Items</Label>
        <div className="space-y-2">
          {formData.line_items.map((item, index) => (
            <div key={index} className="flex items-end gap-2 p-3 border rounded-md">
              <div className="flex-1">
                <Label className="text-xs">Description</Label>
                <Input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Ordered</Label>
                <Input type="number" value={item.ordered_quantity} onChange={(e) => handleItemChange(index, 'ordered_quantity', e.target.value)} className="w-20" />
              </div>
              <div>
                <Label className="text-xs">Received</Label>
                <Input type="number" value={item.received_quantity} onChange={(e) => handleItemChange(index, 'received_quantity', e.target.value)} className="w-20" />
              </div>
              <div>
                <Label className="text-xs">Condition</Label>
                <Select value={item.condition} onValueChange={v => handleItemChange(index, 'condition', v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="defective">Defective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Notes</Label>
                <Input value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} placeholder="Item notes" />
              </div>
              <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={v => handleSelectChange('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="over_received">Over Received</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Delivery Note</Label>
          <Input name="delivery_note" value={formData.delivery_note} onChange={handleChange} />
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {receipt ? "Update Receipt" : "Create Receipt"}
        </Button>
      </div>
    </form>
  );
}