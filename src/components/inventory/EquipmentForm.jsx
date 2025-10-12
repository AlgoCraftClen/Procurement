import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Location } from "@/api/entities";
import { Loader2 } from "lucide-react";

export default function EquipmentForm({ equipment, suppliers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    equipment_name: "", serial_number: "", category: "", status: "idle", location_id: "",
    purchase_date: "", purchase_cost: 0, last_maintenance: "", next_maintenance: "",
    maintenance_notes: "", supplier_id: ""
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
    if (equipment) {
      setFormData({
        ...equipment,
        purchase_date: equipment.purchase_date ? equipment.purchase_date.split('T')[0] : "",
        last_maintenance: equipment.last_maintenance ? equipment.last_maintenance.split('T')[0] : "",
        next_maintenance: equipment.next_maintenance ? equipment.next_maintenance.split('T')[0] : "",
      });
    }
  }, [equipment]);

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
        <div><Label>Equipment Name*</Label><Input name="equipment_name" value={formData.equipment_name} onChange={handleChange} required /></div>
        <div><Label>Serial Number*</Label><Input name="serial_number" value={formData.serial_number} onChange={handleChange} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Status</Label>
            <Select name="status" value={formData.status} onValueChange={value => handleSelectChange('status', value)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="idle">Idle</SelectItem><SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
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
      </div>
      <div><Label>Supplier</Label>
        <Select name="supplier_id" value={formData.supplier_id} onValueChange={value => handleSelectChange('supplier_id', value)}>
          <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
          <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Purchase Date</Label><Input name="purchase_date" type="date" value={formData.purchase_date} onChange={handleChange} /></div>
        <div><Label>Purchase Cost ($)</Label><Input name="purchase_cost" type="number" value={formData.purchase_cost} onChange={handleChange} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Last Maintenance</Label><Input name="last_maintenance" type="date" value={formData.last_maintenance} onChange={handleChange} /></div>
        <div><Label>Next Maintenance</Label><Input name="next_maintenance" type="date" value={formData.next_maintenance} onChange={handleChange} /></div>
      </div>
       <div><Label>Maintenance Notes</Label><Textarea name="maintenance_notes" value={formData.maintenance_notes} onChange={handleChange} /></div>
      <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{equipment ? "Update" : "Create"}</Button></div>
    </form>
  );
}