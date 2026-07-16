import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ContractForm({ contract, suppliers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    contract_number: '',
    supplier_id: '',
    contract_type: 'purchase_agreement',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    value: '',
    status: 'draft',
    payment_terms: '',
    key_terms: [],
    notes: ''
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        contract_number: contract.contract_number || '',
        supplier_id: contract.supplier_id || '',
        contract_type: contract.contract_type || 'purchase_agreement',
        title: contract.title || '',
        description: contract.description || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        value: contract.value || '',
        status: contract.status || 'draft',
        payment_terms: contract.payment_terms || '',
        key_terms: contract.key_terms || [],
        notes: contract.notes || ''
      });
    }
  }, [contract]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      value: Number(formData.value) || 0,
      key_terms: formData.key_terms.filter(term => term.trim())
    });
  };

  const addKeyTerm = () => {
    setFormData(prev => ({ ...prev, key_terms: [...prev.key_terms, ''] }));
  };

  const updateKeyTerm = (index, value) => {
    const newTerms = [...formData.key_terms];
    newTerms[index] = value;
    setFormData(prev => ({ ...prev, key_terms: newTerms }));
  };

  const removeKeyTerm = (index) => {
    setFormData(prev => ({ ...prev, key_terms: prev.key_terms.filter((_, i) => i !== index) }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="contract_number">Contract Number</Label>
          <Input
            id="contract_number"
            value={formData.contract_number}
            onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
            placeholder="CT-2024-001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier_id">Supplier *</Label>
          <Select value={formData.supplier_id} onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>{supplier.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="contract_type">Contract Type</Label>
          <Select value={formData.contract_type} onValueChange={(value) => setFormData(prev => ({ ...prev, contract_type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchase_agreement">Purchase Agreement</SelectItem>
              <SelectItem value="service_contract">Service Contract</SelectItem>
              <SelectItem value="framework_agreement">Framework Agreement</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
              <SelectItem value="renewed">Renewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Contract Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Annual Supply Agreement"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Contract description and scope..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date *</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="value">Contract Value</Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_terms">Payment Terms</Label>
        <Input
          id="payment_terms"
          value={formData.payment_terms}
          onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
          placeholder="Net 30 days"
        />
      </div>

      <div className="space-y-2">
        <Label>Key Terms</Label>
        {formData.key_terms.map((term, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={term}
              onChange={(e) => updateKeyTerm(index, e.target.value)}
              placeholder={`Key term ${index + 1}`}
            />
            <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeKeyTerm(index)}>Remove</Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addKeyTerm}>Add Key Term</Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes..."
          rows={2}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 flex justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Contract</Button>
      </div>
    </form>
  );
}
