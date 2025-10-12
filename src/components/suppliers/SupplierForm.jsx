
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { Supplier } from "@/api/entities"; // Assuming this path is correct for your project
import { useDuplicateCheck } from "../shared/useDuplicateCheck"; // Assuming this path is correct for your project

export default function SupplierForm({ supplier, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    payment_terms: "",
    category: "",
    supplier_type: "local", // Added supplier_type with default "local"
    notes: "",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        company_name: supplier.company_name || "",
        contact_person: supplier.contact_person || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        payment_terms: supplier.payment_terms || "",
        category: supplier.category || "",
        supplier_type: supplier.supplier_type || "local", // Set supplier_type from supplier or default
        notes: supplier.notes || "",
      });
    } else {
      setFormData({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        payment_terms: "",
        category: "",
        supplier_type: "local", // Reset supplier_type to default
        notes: "",
      });
    }
  }, [supplier]);

  // --- Duplicate Check Handlers ---
  const { isChecking: checkingName, isDuplicate: isDuplicateName } = useDuplicateCheck({
    entity: Supplier,
    field: 'company_name',
    value: formData.company_name,
    idToIgnore: supplier?.id,
  });

  const { isChecking: checkingEmail, isDuplicate: isDuplicateEmail } = useDuplicateCheck({
    entity: Supplier,
    field: 'email',
    value: formData.email,
    idToIgnore: supplier?.id,
  });
  // --- End Duplicate Check Handlers ---

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Prevent submission if a duplicate is detected on a new record
    if ((isDuplicateName || isDuplicateEmail) && !supplier) {
      return;
    }
    onSubmit(formData);
  };

  const isSaveDisabled = ((isDuplicateName && formData.company_name) || (isDuplicateEmail && formData.email)) && !supplier;


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company_name">Company Name*</Label>
          <div className="relative">
            <Input
              id="company_name"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              placeholder="e.g. Acme Inc."
              className={isDuplicateName && formData.company_name ? 'border-red-500 pr-8' : 'pr-8'} // Added pr-8 for icon spacing
            />
            {checkingName && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
          </div>
          {(isDuplicateName && formData.company_name) && ( // Only show alert if there's a value
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>A supplier with this company name already exists.</AlertDescription>
            </Alert>
          )}
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g. Raw Materials, Logistics"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supplier_type">Supplier Type</Label>
          <Select
            name="supplier_type"
            value={formData.supplier_type}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, supplier_type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="international">International</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="contact_person">Contact Person*</Label>
          <Input
            id="contact_person"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            required
            placeholder="e.g. John Doe"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
          <Label htmlFor="email">Email*</Label>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="e.g. john.doe@acme.com"
              className={isDuplicateEmail && formData.email ? 'border-red-500 pr-8' : 'pr-8'} // Added pr-8 for icon spacing
            />
            {checkingEmail && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
          </div>
          {(isDuplicateEmail && formData.email) && ( // Only show alert if there's a value
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>A supplier with this email address already exists.</AlertDescription>
            </Alert>
          )}
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={2}
          placeholder="e.g. 123 Main St, Anytown, USA 12345"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="payment_terms">Payment Terms</Label>
          <Input
            id="payment_terms"
            name="payment_terms"
            value={formData.payment_terms}
            onChange={handleChange}
            placeholder="e.g. Net 30"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Any additional information about the supplier"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaveDisabled}>
          {supplier ? "Update Supplier" : "Create Supplier"}
        </Button>
      </div>
    </form>
  );
}
