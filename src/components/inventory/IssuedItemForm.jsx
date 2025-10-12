
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Department } from "@/api/entities";
import { Location } from "@/api/entities";
import { ScanLine } from "lucide-react"; // Removed Loader2 as it's no longer used
import BarcodeScanner from './BarcodeScanner';

export default function IssuedItemForm({ inventoryItems, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    item_type: "",
    item_id: "",
    item_name: "",
    sku_or_serial: "",
    quantity_issued: 1,
    unit_of_measure: "units", // Changed default from "" to "units"
    issued_to_employee: "",
    department_id: "",
    location_id: "",
    issue_date: new Date().toISOString().split('T')[0],
    expected_return_date: "",
    purpose: "",
    notes: "",
    issued_by: "", // Added new field
  });

  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showScanner, setShowScanner] = useState(false);

  // Consolidated useEffect for loading departments and locations
  useEffect(() => {
    const loadDepartmentsAndLocations = async () => {
      try {
        const [deptData, locData] = await Promise.all([
          Department.list(),
          Location.list()
        ]);
        setDepartments(deptData || []);
        // Filter locations to only active ones as per original logic
        setLocations(locData.filter(loc => loc.is_active) || []);
      } catch (error) {
        console.error("Failed to load departments/locations:", error);
        setDepartments([]);
        setLocations([]);
      }
    };
    loadDepartmentsAndLocations();
  }, []);

  // Derive selectedItem from formData.item_id
  const selectedItem = inventoryItems.find(i => i.id === formData.item_id);

  // Renamed from handleItemScanned to handleScan and adapted based on outline
  const handleScan = (scannedItem) => {
    // Assuming 'scannedItem' is the validated item object returned by BarcodeScanner
    // and BarcodeScanner handles basic "item not found" checks.
    if (!scannedItem) {
      console.warn("BarcodeScanner did not return a valid item.");
      return;
    }

    // Re-check availability, as per original handleItemScanned logic
    const availableQuantity = scannedItem.type === 'equipment' ?
      (scannedItem.status === 'idle' ? 1 : 0) :
      scannedItem.type === 'raw_material' ?
      scannedItem.current_quantity :
      scannedItem.quantity;

    if (availableQuantity <= 0) {
      alert(`Scanned item "${scannedItem.display_name}" is not available for issue.`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      item_id: scannedItem.id,
      item_type: scannedItem.type,
      item_name: scannedItem.display_name || scannedItem.equipment_name || scannedItem.material_name || scannedItem.product_name,
      sku_or_serial: scannedItem.sku || scannedItem.serial_number || "",
      unit_of_measure: scannedItem.unit_of_measure || "units",
      quantity_issued: scannedItem.type === 'equipment' ? 1 : prev.quantity_issued, // Force 1 for equipment
    }));
    setShowScanner(false); // Hide scanner after successful scan
  };

  // Adapted handleItemSelect to update formData directly, removing setSelectedItem
  const handleItemSelect = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        item_id: item.id,
        item_type: item.type,
        item_name: item.display_name,
        sku_or_serial: item.sku || item.serial_number || "",
        unit_of_measure: item.unit_of_measure || "units",
        quantity_issued: item.type === 'equipment' ? 1 : prev.quantity_issued, // Force 1 for equipment
      }));
    } else {
        // If an item is deselected or not found, clear item-related formData fields
        setFormData(prev => ({
            ...prev,
            item_id: "",
            item_type: "",
            item_name: "",
            sku_or_serial: "",
            unit_of_measure: "units",
            quantity_issued: 1,
        }));
    }
  };

  const handleDepartmentSelect = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    setFormData(prev => ({
      ...prev,
      department_id: departmentId,
      location_id: department ? department.location_id : prev.location_id
    }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Preserve original validation logic
    if (!selectedItem) {
      alert("Please select an item to issue (or scan a barcode).");
      return;
    }

    // Ensure selectedItem has available_quantity for comparison
    if (formData.quantity_issued > selectedItem.available_quantity) {
      alert(`Cannot issue ${formData.quantity_issued} units. Only ${selectedItem.available_quantity} available.`);
      return;
    }

    if (!formData.department_id) {
      alert("Please select a department.");
      return;
    }

    if (!formData.location_id) {
      alert("Please select a plant location.");
      return;
    }

    // Preserve status: "issued" for submission
    onSubmit({ ...formData, status: "issued" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Barcode Scanner Toggle - per outline */}
      {!showScanner && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowScanner(true)}
          className="w-full" // Added class as per outline
        >
          <ScanLine className="w-4 h-4 mr-2" />
          Scan Barcode
        </Button>
      )}

      {/* Barcode Scanner - per outline */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan} // Changed prop name to onScan as per outline
          onClose={() => setShowScanner(false)}
          inventoryItems={inventoryItems} // Added prop as per outline
        />
      )}

      {/* Manual Item Selection - only visible when scanner is not active */}
      {!showScanner && (
        <div>
          <Label>Select Item to Issue*</Label>
          <Select onValueChange={handleItemSelect} value={formData.item_id} required={!formData.item_id}> {/* Required if no item selected */}
            <SelectTrigger>
              <SelectValue placeholder="Choose an item...">
                {selectedItem ? selectedItem.display_name : "Choose an item..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {inventoryItems
                .filter(item => item.available_quantity > 0)
                .map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.display_name} - Available: {item.available_quantity}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}


      {selectedItem && (
        <>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-sm text-slate-600">
              <strong>Selected:</strong> {selectedItem.display_name}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Available:</strong> {selectedItem.available_quantity} {selectedItem.unit_of_measure || 'units'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity to Issue*</Label>
              <Input
                name="quantity_issued"
                type="number"
                min="1"
                max={selectedItem.available_quantity}
                value={formData.quantity_issued}
                onChange={handleChange}
                required
                disabled={selectedItem.type === 'equipment'}
              />
            </div>
            <div>
              <Label>Issue Date*</Label>
              <Input
                name="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={handleChange}
                required
              />
            </div>
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

          {/* New field: Issued By */}
          <div>
            <Label>Issued By*</Label>
            <Input
              name="issued_by"
              value={formData.issued_by}
              onChange={handleChange}
              placeholder="Your name or employee ID"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department*</Label>
              {/* Removed Loader2 and conditional loading UI */}
              <Select
                value={formData.department_id}
                onValueChange={handleDepartmentSelect}
                required
                disabled={departments.length === 0} // Disable if no departments are loaded
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
              <p className="text-xs text-slate-500 mt-1">
                Select the employee's department
              </p>
            </div>

            <div>
              <Label>Plant Location*</Label>
              {/* Removed Loader2 and conditional loading UI */}
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
                required
                disabled={locations.length === 0} // Disable if no locations are loaded
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
              Issue Item
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
