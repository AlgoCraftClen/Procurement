import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Location } from "@/api/entities";

export default function DepartmentFormModal({ isOpen, onClose, onSave, department }) {
  const [formData, setFormData] = useState({ name: "", location_id: "", manager_email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (department) {
      setFormData({ 
        name: department.name, 
        location_id: department.location_id || "",
        manager_email: department.manager_email || "" 
      });
    } else {
      setFormData({ name: "", location_id: "", manager_email: "" });
    }
  }, [department, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? "Edit Department" : "Add New Department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Department Name*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Production, Maintenance, Administration"
              required
            />
          </div>
          <div>
            <Label htmlFor="location_id">Plant Location*</Label>
            {loadingLocations ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">Loading locations...</span>
              </div>
            ) : (
              <Select 
                value={formData.location_id} 
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plant location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-slate-500 mt-1">
              This department will be specific to the selected plant
            </p>
          </div>
          <div>
            <Label htmlFor="manager_email">Manager Email</Label>
            <Input
              id="manager_email"
              type="email"
              value={formData.manager_email}
              onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
              placeholder="manager@example.com"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loadingLocations}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}