import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';

const supplierTypeOptions = [
  { value: 'all', label: 'All Suppliers' },
  { value: 'local', label: 'Local Suppliers' },
  { value: 'international', label: 'International Suppliers' }
];

export default function SupplierTypeFilter({ value, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-2">
      <Building className="w-4 h-4 text-slate-500" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select supplier type..." />
        </SelectTrigger>
        <SelectContent>
          {supplierTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}