import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Department } from "@/api/entities";
import { Location } from "@/api/entities";
import { Loader2 } from "lucide-react";

export default function IssuedItemEditForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    issued_to_employee: "",
    department_id: "",
    location_id: "",
    expected_return_date: "",
    purpose: "",
    notes: "",
  });
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const deptData = await Department.list();
        setDepartments(deptData || []);
      } catch (error) {
        console.error("Error loading departments:", error);
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };
    loadDepartments();
  }, []);

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
    if (item) {
      setFormData({
        issued_to_employee: item.issued_to_employee || "",
        department_id: item.department_id || "",
        location_id: item.location_id || "",
        expected_return_date: item.expected_return_date || "",
        purpose: item.purpose || "",
        notes: item.notes || "",
      });
    }
  }, [item]);

  const handleDepartmentSelect = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    setFormData(prev => ({
      ...prev,
      department_id: departmentId,
      location_id: department ? department.location_id : prev.location_id
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!item) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg mb-4">
        <h3 className="font-medium text-slate-900">Editing:</h3>
        <p className="text-sm text-slate-600">{item.item_name}</p>
        <p className="text-xs text-slate-500">
          Quantity: {item.quantity_issued} {item.unit_of_measure} | 
          Issued: {new Date(item.issue_date).toLocaleDateString()}
        </p>
      </div>

      <div>
        <Label>Issued to Employee*</Label>
        <Input
          name="issued_to_employee"
          value={formData.issued_to_employee}
          onChange={handleChange}
          placeholder="Employee name or email"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Department*</Label>
          {loadingDepartments || loadingLocations ? (
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500">Loading...</span>
            </div>
          ) : (
            <Select 
              value={formData.department_id} 
              onValueChange={handleDepartmentSelect}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Select the employee's department
          </p>
        </div>

        <div>
          <Label>Plant Location*</Label>
          {loadingLocations ? (
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-slate-50">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500">Loading...</span>
            </div>
          ) : (
            <Select 
              value={formData.location_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location..." />
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
            Auto-fills from department, but can be overridden
          </p>
        </div>
      </div>

      <div>
        <Label>Expected Return Date</Label>
        <Input
          name="expected_return_date"
          type="date"
          value={formData.expected_return_date}
          onChange={handleChange}
        />
        <p className="text-xs text-slate-500 mt-1">
          Leave blank if item is not returnable
        </p>
      </div>

      <div>
        <Label>Purpose/Reason</Label>
        <Textarea
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          placeholder="Why is this item being issued?"
          rows={2}
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Additional notes or special instructions"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}