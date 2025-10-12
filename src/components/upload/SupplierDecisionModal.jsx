
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Plus, Search, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// Enhanced utility function for robust supplier name comparison
const normalizeSupplierName = (name) => {
  if (typeof name !== 'string' || !name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // Remove ALL whitespace
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
};

export default function SupplierDecisionModal({ 
  isOpen, 
  onClose, 
  supplierName, 
  existingSuppliers, 
  onCreateNew, 
  onSelectExisting,
  onSkip 
}) {
  const [action, setAction] = useState('create');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [newSupplierData, setNewSupplierData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: '',
    category: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setAction('create'); // Default to create
      setSelectedSupplierId('');
      setNewSupplierData({
        company_name: supplierName || '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        payment_terms: '',
        category: '',
        notes: ''
      });
    }
  }, [isOpen, supplierName]);

  const handleCreateNew = () => {
    if (!newSupplierData.company_name || !newSupplierData.contact_person || !newSupplierData.email) {
      // Add validation feedback here if needed
      return;
    }
    onCreateNew(newSupplierData);
  };

  const handleSelectExisting = () => {
    if (!selectedSupplierId) return;
    const supplier = existingSuppliers.find(s => s.id === selectedSupplierId);
    if (supplier) {
      onSelectExisting(supplier);
    }
  };

  const handleSkip = () => {
    onSkip();
  };
  
  const suggestedSuppliers = existingSuppliers.filter(s => {
    if (!s.company_name) return false;
    const normalizedExistingName = normalizeSupplierName(s.company_name);
    const normalizedSearchName = normalizeSupplierName(supplierName || '');
    
    // Debug logging
    console.log(`[SupplierModal] Checking suggestion: "${s.company_name}" (${normalizedExistingName}) vs "${supplierName}" (${normalizedSearchName})`);
    
    // Use includes for suggestions to be more flexible - show suppliers that partially match
    const matches = normalizedExistingName.includes(normalizedSearchName) || 
                    normalizedSearchName.includes(normalizedExistingName);
    
    if (matches) {
      console.log(`[SupplierModal] ✅ Suggested match found: ${s.company_name}`);
    }
    
    return matches;
  });

  console.log(`[SupplierModal] Total suggested suppliers: ${suggestedSuppliers.length}`);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Supplier Not Found: "{supplierName}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The supplier "{supplierName}" was found in the document but doesn't exist in your system. 
              What would you like to do?
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {/* Option 1: Create New Supplier */}
            <div className="border rounded-lg">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setAction(action === 'create' ? '' : 'create')}
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-slate-800">Create New Supplier</span>
                </div>
                {action === 'create' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {action === 'create' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t">
                  <div>
                    <Label htmlFor="company_name">Company Name*</Label>
                    <Input
                      id="company_name"
                      value={newSupplierData.company_name}
                      onChange={(e) => setNewSupplierData(prev => ({...prev, company_name: e.target.value}))}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">Contact Person*</Label>
                    <Input
                      id="contact_person"
                      value={newSupplierData.contact_person}
                      onChange={(e) => setNewSupplierData(prev => ({...prev, contact_person: e.target.value}))}
                      placeholder="Contact person"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email*</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSupplierData.email}
                      onChange={(e) => setNewSupplierData(prev => ({...prev, email: e.target.value}))}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newSupplierData.phone}
                      onChange={(e) => setNewSupplierData(prev => ({...prev, phone: e.target.value}))}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newSupplierData.address}
                      onChange={(e) => setNewSupplierData(prev => ({...prev, address: e.target.value}))}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Option 2: Select Existing Supplier */}
            {existingSuppliers.length > 0 && (
              <div className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setAction(action === 'select' ? '' : 'select')}
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-slate-800">Select Existing Supplier</span>
                  </div>
                  {action === 'select' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {action === 'select' && (
                  <div className="p-4 border-t">
                    {suggestedSuppliers.length > 0 && (
                      <div className="mb-3">
                        <Label className="text-xs text-green-600 font-medium">Suggested matches:</Label>
                        <div className="space-y-1 mt-1">
                          {suggestedSuppliers.map(supplier => (
                            <button
                              key={supplier.id}
                              className={`w-full text-left p-2 rounded border ${selectedSupplierId === supplier.id ? 'bg-blue-100 border-blue-300' : 'bg-green-50'}`}
                              onClick={() => setSelectedSupplierId(supplier.id)}
                            >
                              <strong>{supplier.company_name}</strong> - {supplier.contact_person}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose from all suppliers" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingSuppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.company_name} - {supplier.contact_person}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Option 3: Skip for now */}
            <div className="border rounded-lg">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setAction(action === 'skip' ? '' : 'skip')}
              >
                <div className="flex items-center gap-3">
                   <span className="font-medium text-slate-800">Skip for now</span>
                </div>
                {action === 'skip' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
               {action === 'skip' && (
                <div className="p-4 border-t">
                    <p className="text-sm text-slate-600">The document will be saved without being linked to a specific supplier. You can link it later.</p>
                </div>
               )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {action === 'create' && (
              <Button 
                onClick={handleCreateNew}
                disabled={!newSupplierData.company_name || !newSupplierData.contact_person || !newSupplierData.email}
              >
                Create & Continue
              </Button>
            )}
            {action === 'select' && (
              <Button onClick={handleSelectExisting} disabled={!selectedSupplierId}>
                Select & Continue
              </Button>
            )}
            {action === 'skip' && (
              <Button variant="secondary" onClick={handleSkip}>
                Skip & Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
