import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Location } from "@/api/entities";
import { Loader2 } from "lucide-react";

export default function RawMaterialForm({ material, suppliers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    material_name: "", sku: "", category: "", current_quantity: 0, unit_of_measure: "",
    minimum_stock: 0, supplier_id: "", unit_cost: 0, location_id: "", last_restocked: "",
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
    if (material) {
      setFormData({
        ...material,
        last_restocked: material.last_restocked ? material.last_restocked.split('T')[0] : "",
      });
    }
  }, [material]);

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
        <div><Label>Material Name*</Label><Input name="material_name" value={formData.material_name} onChange={handleChange} required /></div>
        <div><Label>SKU*</Label><Input name="sku" value={formData.sku} onChange={handleChange} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Current Quantity*</Label><Input name="current_quantity" type="number" value={formData.current_quantity} onChange={handleChange} required /></div>
        <div><Label>Unit of Measure*</Label><Input name="unit_of_measure" value={formData.unit_of_measure} onChange={handleChange} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Minimum Stock Level*</Label><Input name="minimum_stock" type="number" value={formData.minimum_stock} onChange={handleChange} required /></div>
        <div><Label>Unit Cost ($)</Label><Input name="unit_cost" type="number" value={formData.unit_cost} onChange={handleChange} /></div>
      </div>
      <div>
        <Label>Supplier</Label>
        <Select name="supplier_id" value={formData.supplier_id} onValueChange={value => handleSelectChange('supplier_id', value)}>
          <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
          <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}</SelectContent>
        </Select>
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
      <div>
        <Label>Last Restocked</Label>
        <Input name="last_restocked" type="date" value={formData.last_restocked} onChange={handleChange} />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{material ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}