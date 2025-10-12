
import React, { useState, useEffect, useMemo } from "react";
import { Supplier } from "@/api/entities";
import { RawMaterial } from "@/api/entities";
import { Equipment } from "@/api/entities";
import { FinishedGood } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function RFQForm({ rfq, suppliers, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    total_value: 0,
    due_date: "",
    status: "draft",
    suppliers: [],
    line_items: [{ description: "", quantity: 1, unit: "", specifications: "" }],
    last_contact_date: "",
    next_followup_date: "",
  });

  useEffect(() => {
    if (rfq) {
      setFormData({
        title: rfq.title || "",
        description: rfq.description || "",
        total_value: rfq.total_value || 0,
        due_date: rfq.due_date ? rfq.due_date.split('T')[0] : "",
        status: rfq.status || "draft",
        suppliers: rfq.suppliers || [],
        line_items: rfq.line_items?.length > 0 ? rfq.line_items : [{ description: "", quantity: 1, unit: "", specifications: "" }],
        last_contact_date: rfq.last_contact_date ? rfq.last_contact_date.split('T')[0] : "",
        next_followup_date: rfq.next_followup_date ? rfq.next_followup_date.split('T')[0] : "",
      });
    }
  }, [rfq]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.line_items];
    items[index][field] = value;
    setFormData((prev) => ({ ...prev, line_items: items }));
  };
  
  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      line_items: [...prev.line_items, { description: "", quantity: 1, unit: "", specifications: "" }]
    }));
  };

  const removeItem = (index) => {
    const items = formData.line_items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, line_items: items }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Title*</Label>
          <Input name="title" value={formData.title} onChange={handleChange} required />
        </div>
        <div>
          <Label>Status</Label>
          <Select name="status" value={formData.status} onValueChange={value => handleSelectChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="responses_received">Responses Received</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea name="description" value={formData.description} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Total Estimated Value ($)</Label>
          <Input name="total_value" type="number" value={formData.total_value} onChange={handleChange} />
        </div>
        <div>
          <Label>Response Due Date*</Label>
          <Input name="due_date" type="date" value={formData.due_date} onChange={handleChange} required />
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Last Contact Date</Label>
          <Input name="last_contact_date" type="date" value={formData.last_contact_date} onChange={handleChange} />
        </div>
        <div>
          <Label>Next Follow-up Date</Label>
          <Input name="next_followup_date" type="date" value={formData.next_followup_date} onChange={handleChange} />
        </div>
      </div>
      <div>
        <Label>Line Items</Label>
        <div className="space-y-2">
          {formData.line_items.map((item, index) => (
            <div key={index} className="flex items-end gap-2 p-2 border rounded-md">
              <div className="flex-1">
                <Label className="text-xs">Description</Label>
                <Input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-20" />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Input value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-24" />
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
      <div className="flex justify-end">
        <Button type="submit">Save RFQ</Button>
      </div>
    </form>
  );
}
