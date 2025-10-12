
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, X, Trash2, AlertCircle, Users, Package2, Link2 } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDuplicateCheck } from "../shared/useDuplicateCheck";
import { Invoice } from "@/api/entities";

const formatTitle = (str) => {
    if (!str) return '';
    return str
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};

const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '$0.00';
    return `$${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function DataConfirmationForm({ 
    documentType, 
    initialData, 
    suppliers = [],
    purchaseOrders = [],
    departments = [],
    onSave, 
    onCancel, 
    isSaving 
}) {
  const [formData, setFormData] = useState(initialData || {});
  const [assignments, setAssignments] = useState([]);
  const [showAssignments, setShowAssignments] = useState(false);

  const supplierForCheck = useMemo(() => {
    if (!formData.supplier_name || !suppliers.length) return null;
    return suppliers.find(s => s.company_name?.toLowerCase() === formData.supplier_name?.toLowerCase());
  }, [suppliers, formData.supplier_name]);

  const { isChecking: isCheckingDuplicate, isDuplicate } = useDuplicateCheck({
    entity: Invoice,
    field: 'invoice_number',
    value: formData.invoice_number,
    additionalFilters: supplierForCheck ? { supplier_id: supplierForCheck.id } : {},
    enabled: documentType === 'invoice' && !!formData.invoice_number && !!supplierForCheck
  });

  const [amountMismatchWarning, setAmountMismatchWarning] = useState(null);

  const linkedPO = useMemo(() => {
    if (!formData.purchase_order_id || !purchaseOrders.length) return null;
    return purchaseOrders.find(po => po.id === formData.purchase_order_id);
  }, [formData.purchase_order_id, purchaseOrders]);

  useEffect(() => {
    if (documentType !== 'invoice' || !linkedPO || !formData.total_amount) {
      setAmountMismatchWarning(null);
      return;
    }

    const poAmount = parseFloat(linkedPO.total_amount);
    const invoiceAmount = parseFloat(formData.total_amount);

    if (isNaN(poAmount) || isNaN(invoiceAmount)) {
        setAmountMismatchWarning("Could not compare amounts: Invalid PO or Invoice total.");
        return;
    }

    const difference = Math.abs(poAmount - invoiceAmount);
    const percentageDifference = poAmount !== 0 ? (difference / poAmount) * 100 : (invoiceAmount !== 0 ? 100 : 0);

    if (percentageDifference > 5) {
      setAmountMismatchWarning(
        `Invoice total (${formatCurrency(invoiceAmount)}) differs by more than 5% from the linked PO total (${formatCurrency(poAmount)}).`
      );
    } else {
      setAmountMismatchWarning(null);
    }
  }, [linkedPO, formData.total_amount, documentType]);

  const lineItemHeaders = useMemo(() => {
    const items = formData.line_items || [];
    const uniqueHeaders = new Set();
    items.forEach(item => {
        if (item && typeof item === 'object') {
            Object.keys(item).forEach(key => uniqueHeaders.add(key));
        }
    });
    return Array.from(uniqueHeaders);
  }, [formData.line_items]);

  useEffect(() => {
    if (initialData) {
      const dataWithDefaults = {
        ...initialData,
        line_items: Array.isArray(initialData.line_items) ? initialData.line_items : [],
      };
      setFormData(dataWithDefaults);
      
      if (documentType === 'invoice' && initialData.purchase_order_number && purchaseOrders.length) {
        const extractedPONumber = String(initialData.purchase_order_number).toLowerCase();
        const matchingPO = purchaseOrders.find(po => po.po_number && String(po.po_number).toLowerCase() === extractedPONumber);
        if (matchingPO) {
          setFormData(prev => ({ ...prev, purchase_order_id: matchingPO.id }));
        }
      }
      
      // **UPDATED LOGIC:** Assignment options appear ONLY for invoices
      const supportsAssignments = documentType === 'invoice';
      setShowAssignments(supportsAssignments);
      
      if (supportsAssignments && dataWithDefaults.line_items.length) {
        const initialAssignments = dataWithDefaults.line_items.map((item, index) => ({
          itemIndex: index,
          itemDescription: item.description,
          assignQuantity: 0,
          assignToEmployee: '',
          assignToDepartment: '',
          purpose: '',
          expectedReturnDate: '',
          enabled: false
        }));
        setAssignments(initialAssignments);
      } else {
        setAssignments([]);
      }
    }
  }, [initialData, documentType, purchaseOrders]);

  // Add console logging to debug
  useEffect(() => {
    console.log('[DataConfirmationForm] Departments received:', departments?.length || 0);
    console.log('[DataConfirmationForm] Department details:', departments);
  }, [departments]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...(formData.line_items || [])];
    if (!items[index]) {
      items[index] = {};
    }
    items[index][field] = value;
    setFormData(prev => ({ ...prev, line_items: items }));
  };

  const handleAssignmentChange = (index, field, value) => {
    const newAssignments = [...assignments];
    if (newAssignments[index]) {
      newAssignments[index] = { ...newAssignments[index], [field]: value };
      setAssignments(newAssignments);
    }
  };

  const addItem = () => {
    const items = formData.line_items || [];
    let newItem = { description: "", quantity: 1 };
    
    if (documentType === 'goods_receipt') {
        newItem = { ...newItem, ordered_quantity: 0, received_quantity: 0 };
    } else if (documentType === 'invoice' || documentType === 'purchase_order') {
        newItem = { ...newItem, unit_price: 0, total_price: 0 };
    }
    
    setFormData(prev => ({...prev, line_items: [...items, newItem]}));
    
    if (showAssignments) {
      setAssignments(prev => [...prev, {
        itemIndex: items.length,
        itemDescription: "",
        assignQuantity: 0,
        assignToEmployee: '',
        assignToDepartment: '',
        purpose: '',
        expectedReturnDate: '',
        enabled: false
      }]);
    }
  };
  
  const removeItem = (index) => {
    const items = formData.line_items || [];
    const newItems = items.filter((_, i) => i !== index);
    setFormData(prev => ({...prev, line_items: newItems}));
    
    if (showAssignments) {
      setAssignments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    if (documentType === 'invoice' && isDuplicate) {
        console.error("Cannot save: A duplicate invoice number for this supplier has been detected.");
        return;
    }
    const dataToSave = {
      ...formData,
      assignments: showAssignments ? assignments.filter(a => a.enabled && a.assignQuantity > 0) : [],
      hasAmountMismatchWarning: !!amountMismatchWarning
    };
    onSave(dataToSave);
  };

  const renderField = (key, value) => {
    if (key === 'line_items' || (typeof value === 'object' && value !== null && !Array.isArray(value)) || key === 'purchase_order_id') return null;

    if (documentType === 'invoice' && key === 'purchase_order_number') {
      return (
        <div key="po-link" className="grid w-full items-center gap-1.5 relative">
          <Label htmlFor="purchase_order_id">Purchase Order Link</Label>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-400" />
            <Select
              value={formData.purchase_order_id || ""}
              onValueChange={(val) => handleInputChange('purchase_order_id', val === "" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to existing PO..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {purchaseOrders.map(po => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.po_number} - {po.supplierInfo?.company_name || 'N/A'} (Total: {formatCurrency(po.total_amount || 0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {amountMismatchWarning && (
            <Alert variant="destructive" className="mt-2 text-xs py-1.5 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{amountMismatchWarning}</AlertDescription>
            </Alert>
          )}
        </div>
      );
    }
    
    const isDate = key.includes('date');
    let displayValue = value;
    
    if (isDate && value) {
      try {
        const date = parseISO(value);
        if (isValid(date)) {
          displayValue = format(date, 'yyyy-MM-dd');
        } else {
          displayValue = value || '';
        }
      } catch (error) {
        displayValue = value || '';
      }
    }

    return (
      <div key={key} className="grid w-full items-center gap-1.5 relative">
        <Label htmlFor={key}>{formatTitle(key)}</Label>
        <Input
          id={key}
          type={typeof value === 'number' ? 'number' : isDate ? 'date' : 'text'}
          value={displayValue ?? ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          readOnly={key === 'purchase_order_number' && documentType === 'invoice'} 
        />
        {key === 'invoice_number' && isCheckingDuplicate && (
            <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-500" />
        )}
      </div>
    );
  };
  
  const renderLineItems = () => {
    const items = formData.line_items || [];
    if (items.length === 0) {
      return (
        <div className="space-y-4">
          <Label className="text-lg">Line Items</Label>
          <div className="border rounded-lg p-4">
            <p className="text-slate-500 text-center py-4">No line items found. Click "Add Line Item" to add items manually.</p>
            <Button type="button" variant="outline" onClick={addItem}>Add Line Item</Button>
          </div>
        </div>
      );
    }
    
    const headers = lineItemHeaders;
    const filteredHeaders = headers.filter(header => !['itemIndex', 'itemDescription'].includes(header));
    
    if (filteredHeaders.length === 0) {
        return (
            <div className="space-y-4">
                <Label className="text-lg">Line Items</Label>
                <div className="border rounded-lg p-4 space-y-3">
                    {items.map((item, index) => (
                         <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-2 border rounded-md">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor={`item-${index}-description`} className="text-xs">Description</Label>
                                <Input 
                                    id={`item-${index}-description`}
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                />
                            </div>
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}>
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addItem}>Add Line Item</Button>
                </div>
            </div>
        );
    }
    
    return (
      <div className="space-y-4">
        <Label className="text-lg">Line Items</Label>
        <div className="border rounded-lg p-4 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-2 border rounded-md">
              {filteredHeaders.map(header => (
                <div key={header} className="grid w-full items-center gap-1.5">
                  <Label htmlFor={`item-${index}-${header}`} className="text-xs">{formatTitle(header)}</Label>
                  <Input 
                    id={`item-${index}-${header}`}
                    type={typeof item[header] === 'number' ? 'number' : 'text'}
                    value={item[header] ?? ''}
                    onChange={(e) => handleItemChange(index, header, e.target.value)}
                  />
                </div>
              ))}
              <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}>
                <Trash2 className="w-4 h-4"/>
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addItem}>Add Line Item</Button>
        </div>
      </div>
    );
  };

  const renderAssignments = () => {
    if (!showAssignments || !formData.line_items || formData.line_items.length === 0) {
      return null;
    }

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Immediate Assignment Options
          </CardTitle>
          <CardDescription>
            Assign invoiced items directly to employees or departments during processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.map((assignment, index) => {
            const lineItem = formData.line_items[index];
            if (!lineItem) return null;

            return (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                    <Switch
                        checked={assignment.enabled}
                        onCheckedChange={(checked) => handleAssignmentChange(index, 'enabled', checked)}
                    />
                    <Label className="font-medium">
                        Assign: {lineItem.description || `Item ${index + 1}`}
                    </Label>
                    </div>
                    <Package2 className="w-4 h-4 text-slate-400" />
                </div>
                
                {assignment.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-6">
                    <div>
                        <Label className="text-xs">Quantity to Assign</Label>
                        <Input
                        type="number"
                        min="0"
                        max={parseFloat(lineItem.quantity || 0)}
                        value={assignment.assignQuantity}
                        onChange={(e) => handleAssignmentChange(index, 'assignQuantity', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Assign to Employee</Label>
                        <Input
                        value={assignment.assignToEmployee}
                        onChange={(e) => handleAssignmentChange(index, 'assignToEmployee', e.target.value)}
                        placeholder="Employee name/email"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Department</Label>
                        <Select
                          value={assignment.assignToDepartment || ''}
                          onValueChange={(value) => handleAssignmentChange(index, 'assignToDepartment', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department..." />
                          </SelectTrigger>
                          <SelectContent>
                            {departments && departments.length > 0 ? (
                              departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No departments available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {departments && departments.length === 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            No departments found. Create departments first.
                          </p>
                        )}
                    </div>
                    <div>
                        <Label className="text-xs">Purpose</Label>
                        <Input
                        value={assignment.purpose}
                        onChange={(e) => handleAssignmentChange(index, 'purpose', e.target.value)}
                        placeholder="Purpose of assignment"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Expected Return Date (Optional)</Label>
                        <Input
                        type="date"
                        value={assignment.expectedReturnDate}
                        onChange={(e) => handleAssignmentChange(index, 'expectedReturnDate', e.target.value)}
                        />
                    </div>
                    </div>
                )}
                </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  if (!formData || Object.keys(formData).length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          The AI successfully extracted data, but it seems to be in an unexpected format. Please check the uploaded document's structure and try again.
        </AlertDescription>
      </Alert>
    );
  }

  const isSaveDisabled = isSaving || (documentType === 'invoice' && isDuplicate);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Extracted Data</CardTitle>
          <CardDescription>
            Review and edit the automatically extracted data for the <span className="font-semibold">{formatTitle(documentType || '')}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {documentType === 'invoice' && isDuplicate && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                An invoice with this number already exists for this supplier. Please change the invoice number or cancel.
              </AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="document" className="w-full">
            <TabsList>
              <TabsTrigger value="document">Document Details</TabsTrigger>
              {showAssignments && <TabsTrigger value="assignments">Assignments</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="document" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(formData).map(([key, value]) => renderField(key, value))}
              </div>
              
              {renderLineItems()}
            </TabsContent>
            
            {showAssignments && (
              <TabsContent value="assignments">
                {renderAssignments()}
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaveDisabled}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save {formatTitle(documentType || '')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
