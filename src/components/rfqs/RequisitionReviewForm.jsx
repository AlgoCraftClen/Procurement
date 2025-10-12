
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Corrected this line
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Users, FileText, Calendar, DollarSign, Printer } from "lucide-react";

export default function RequisitionReviewForm({ 
  requisitionData, 
  suppliers, 
  onSave, 
  onCancel, 
  originalFileUrl 
}) {
  const [rfqData, setRfqData] = useState(requisitionData);
  const [selectedSuppliers, setSelectedSuppliers] = useState(requisitionData.suggested_suppliers || []);

  useEffect(() => {
    setRfqData(requisitionData);
    setSelectedSuppliers(requisitionData.suggested_suppliers || []);
  }, [requisitionData]);

  const handleInputChange = (field, value) => {
    setRfqData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newItems = [...rfqData.line_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setRfqData(prev => ({ ...prev, line_items: newItems }));
  };

  const addLineItem = () => {
    const newItem = {
      description: "",
      quantity: 1,
      unit: "units",
      specifications: "",
      category: "other"
    };
    setRfqData(prev => ({ 
      ...prev, 
      line_items: [...prev.line_items, newItem] 
    }));
  };

  const removeLineItem = (index) => {
    setRfqData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const handleSupplierToggle = (supplierId, checked) => {
    if (checked) {
      setSelectedSuppliers(prev => [...prev, supplierId]);
    } else {
      setSelectedSuppliers(prev => prev.filter(id => id !== supplierId));
    }
  };

  const handleSubmit = () => {
    const finalRFQData = {
      ...rfqData,
      suppliers: selectedSuppliers,
      file_url: originalFileUrl
    };
    onSave(finalRFQData);
  };

  const handlePrint = () => {
    window.print();
  };

  const getSupplierName = (id) => {
    const supplier = suppliers.find(s => s.id === id);
    return supplier ? supplier.company_name : 'Unknown Supplier';
  };

  const categoryColors = {
    raw_material: "bg-blue-100 text-blue-800",
    equipment: "bg-purple-100 text-purple-800",
    supplies: "bg-green-100 text-green-800",
    services: "bg-yellow-100 text-yellow-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-requisition, #printable-requisition * {
            visibility: visible;
          }
          #printable-requisition {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 1rem;
            border: none;
            box-shadow: none;
            background-color: white; /* Ensure background is white for printing */
          }
          .no-print {
            display: none !important;
          }
          /* Adjust input/textarea styles for print if needed */
          #printable-requisition input,
          #printable-requisition textarea {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            background-color: transparent !important;
          }
          #printable-requisition label {
            font-weight: bold;
            display: block;
            margin-bottom: 0.25rem;
          }
          #printable-requisition .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            line-height: 1;
            white-space: nowrap;
          }
          #printable-requisition p {
            margin: 0;
          }
          /* Make sure line item details are visible */
          #printable-requisition .border.rounded-lg.p-4 {
            border: 1px solid #e5e7eb !important; /* light gray border */
            padding: 1rem !important;
            margin-bottom: 1rem;
          }
          #printable-requisition .grid {
            display: grid;
          }
          #printable-requisition .flex {
            display: flex;
          }
        }
      `}</style>
      <div className="space-y-6" id="printable-requisition">
        {/* Original Document Preview */}
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Processed Requisition Review
            </CardTitle>
            <CardDescription>
              Review the extracted information below and make any necessary adjustments before creating the RFQ.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Requester Information */}
            {rfqData.requester_info && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-slate-600">Requester</Label>
                  <p className="font-medium">{rfqData.requester_info.name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Department</Label>
                  <p className="font-medium">{rfqData.requester_info.department || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Priority</Label>
                  <Badge variant="secondary" className={
                    rfqData.requester_info.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    rfqData.requester_info.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {rfqData.requester_info.priority || 'Medium'}
                  </Badge>
                </div>
              </div>
            )}

            {/* RFQ Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="title">RFQ Title*</Label>
                <Input
                  id="title"
                  value={rfqData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter RFQ title"
                />
              </div>
              <div>
                <Label htmlFor="due_date">Response Due Date*</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={rfqData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={rfqData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                placeholder="Add additional context or requirements"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="total_value">Estimated Total Value ($)</Label>
                <Input
                  id="total_value"
                  type="number"
                  value={rfqData.total_value || ''}
                  onChange={(e) => handleInputChange('total_value', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              {rfqData.budget_code && (
                <div>
                  <Label>Budget Code</Label>
                  <Input
                    value={rfqData.budget_code}
                    onChange={(e) => handleInputChange('budget_code', e.target.value)}
                    placeholder="Budget code"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Requested Materials & Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rfqData.line_items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={categoryColors[item.category] || categoryColors.other}>
                      {item.category?.replace('_', ' ') || 'other'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:bg-red-50 no-print"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <Label>Item Description*</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <Label>Quantity*</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                        placeholder="units, kg, m, etc."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Specifications & Requirements</Label>
                    <Textarea
                      value={item.specifications}
                      onChange={(e) => handleLineItemChange(index, 'specifications', e.target.value)}
                      placeholder="Technical specifications, quality requirements, etc."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                onClick={addLineItem}
                className="w-full no-print"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Selection */}
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Invite Suppliers
            </CardTitle>
            <CardDescription>
              Select suppliers to invite for this RFQ. We've suggested some based on the materials requested.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suppliers.map(supplier => (
                <div key={supplier.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`supplier-${supplier.id}`}
                    checked={selectedSuppliers.includes(supplier.id)}
                    onCheckedChange={(checked) => handleSupplierToggle(supplier.id, checked)}
                  />
                  <label
                    htmlFor={`supplier-${supplier.id}`}
                    className="flex-1 text-sm font-medium cursor-pointer"
                  >
                    {supplier.company_name}
                    {supplier.category && (
                      <span className="text-slate-500 ml-2">({supplier.category})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
            {selectedSuppliers.length === 0 && (
              <p className="text-sm text-orange-600 mt-2">
                Please select at least one supplier to invite for quotes.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedSuppliers.length === 0 || !rfqData.title || !rfqData.due_date}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Create RFQ
          </Button>
        </div>
      </div>
    </>
  );
}
