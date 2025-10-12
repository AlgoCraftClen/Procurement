import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "@/api/entities";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FinishedGoodForm({ good, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    product_name: "", sku: "", batch_number: "", quantity: 0, unit_of_measure: "",
    production_date: "", expiry_date: "", location_id: "", cost_per_unit: 0, selling_price: 0
  });
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locationData = await Location.list();
        setLocations(locationData.filter(loc => loc.is_active) || []);
      } catch (error) {
        console.error("Failed to load locations:", error);
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };
    loadLocations();
  }, []);

  useEffect(() => {
    if (good) {
      setFormData({
        ...good,
        production_date: good.production_date ? good.production_date.split('T')[0] : "",
        expiry_date: good.expiry_date ? good.expiry_date.split('T')[0] : "",
      });
    }
  }, [good]);

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
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Product Name*</Label><Input name="product_name" value={formData.product_name} onChange={handleChange} required /></div>
        <div><Label>SKU*</Label><Input name="sku" value={formData.sku} onChange={handleChange} required /></div>
      </div>
       <div className="grid grid-cols-2 gap-4">
        <div><Label>Batch Number*</Label><Input name="batch_number" value={formData.batch_number} onChange={handleChange} required /></div>
        <div><Label>Quantity*</Label><Input name="quantity" type="number" value={formData.quantity} onChange={handleChange} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Production Date</Label><Input name="production_date" type="date" value={formData.production_date} onChange={handleChange} /></div>
        <div><Label>Expiry Date</Label><Input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Cost per Unit ($)</Label><Input name="cost_per_unit" type="number" value={formData.cost_per_unit} onChange={handleChange} /></div>
        <div><Label>Selling Price ($)</Label><Input name="selling_price" type="number" value={formData.selling_price} onChange={handleChange} /></div>
      </div>
      <div>
        <Label>Plant Location*</Label>
        {loadingLocations ? (
          <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Loading locations...</span>
          </div>
        ) : (
          <Select name="location_id" value={formData.location_id} onValueChange={value => handleSelectChange('location_id', value)} required>
            <SelectTrigger><SelectValue placeholder="Select plant location" /></SelectTrigger>
            <SelectContent>
              {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.location_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{good ? "Update" : "Create"}</Button></div>
    </form>
  );
}