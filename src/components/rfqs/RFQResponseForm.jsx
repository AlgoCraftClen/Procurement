
import React, { useState, useEffect } from "react";
import { RFQResponse } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function RFQResponseForm({ response, suppliers, onSubmit }) {
  const [formData, setFormData] = useState({
    supplier_id: "",
    total_cost: 0,
    payment_terms: "",
    shipping_time: 0,
    quality_score: 5,
    notes: "",
  });

  useEffect(() => {
    if (response) {
      setFormData({
        supplier_id: response.supplier_id || "",
        total_cost: response.total_cost || 0,
        payment_terms: response.payment_terms || "",
        shipping_time: response.shipping_time || 0,
        quality_score: response.quality_score || 5,
        notes: response.notes || "",
      });
    }
  }, [response]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Supplier*</Label>
        <Select name="supplier_id" value={formData.supplier_id} onValueChange={value => handleSelectChange('supplier_id', value)} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Total Quoted Cost ($)*</Label>
          <Input name="total_cost" type="number" value={formData.total_cost} onChange={handleChange} required />
        </div>
        <div>
          <Label>Estimated Shipping Time (days)*</Label>
          <Input name="shipping_time" type="number" value={formData.shipping_time} onChange={handleChange} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Payment Terms</Label>
          <Input name="payment_terms" value={formData.payment_terms} onChange={handleChange} />
        </div>
        <div>
          <Label>Quality Score (1-10)</Label>
          <Input name="quality_score" type="number" min="1" max="10" value={formData.quality_score} onChange={handleChange} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" value={formData.notes} onChange={handleChange} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save Response</Button>
      </div>
    </form>
  );
}
