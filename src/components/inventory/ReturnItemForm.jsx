import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReturnItemForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    actual_return_date: new Date().toISOString().split('T')[0],
    status: 'returned',
    return_condition: 'good',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!item) return null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg">
        <h3 className="font-medium">Returning Item:</h3>
        <p className="text-sm text-slate-600">
          {item.item_name} - Quantity: {item.quantity_issued} {item.unit_of_measure}
        </p>
        <p className="text-sm text-slate-600">
          Issued to: {item.issued_to_employee} on {new Date(item.issue_date).toLocaleDateString()}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Return Date*</Label>
            <Input
              name="actual_return_date"
              type="date"
              value={formData.actual_return_date}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label>Return Status*</Label>
            <Select 
              value={formData.status} 
              onValueChange={value => handleSelectChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.status === 'returned' && (
          <div>
            <Label>Item Condition*</Label>
            <Select 
              value={formData.return_condition} 
              onValueChange={value => handleSelectChange('return_condition', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Return Notes</Label>
          <Textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional notes about the return..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Process Return
          </Button>
        </div>
      </form>
    </div>
  );
}