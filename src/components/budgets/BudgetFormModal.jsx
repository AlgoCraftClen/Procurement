import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

const defaultFormData = {
  fiscal_year: `FY${new Date().getFullYear()}`,
  department_id: "",
  category: "General",
  geographic_scope: "Global",
  allocated_amount: 0,
  status: "active",
};

export default function BudgetFormModal({ isOpen, onClose, onSave, budget, departments }) {
  const [formData, setFormData] = useState(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (budget) {
      setFormData({
        fiscal_year: budget.fiscal_year,
        department_id: budget.department_id,
        category: budget.category,
        geographic_scope: budget.geographic_scope || "Global",
        allocated_amount: budget.allocated_amount,
        status: budget.status,
      });
    } else {
      setFormData(defaultFormData);
    }
    setError(null);
  }, [budget, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create budget data with proper initial values
      const budgetData = {
        ...formData,
        allocated_amount: parseFloat(formData.allocated_amount),
        // For new budgets, start with 0 spent/committed amounts
        ...(budget ? {} : {
          spent_amount: 0,
          committed_amount: 0,
          available_amount: parseFloat(formData.allocated_amount)
        })
      };
      
      await onSave(budgetData);
      onClose();
    } catch (err) {
      console.error("Failed to save budget:", err);
      setError(err.message || "Failed to save budget. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Edit Budget" : "Add New Budget"}</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fiscal_year">Fiscal Year*</Label>
              <Input 
                id="fiscal_year" 
                name="fiscal_year" 
                value={formData.fiscal_year} 
                onChange={handleChange} 
                disabled={isSubmitting}
                required 
              />
            </div>
            <div>
              <Label htmlFor="department_id">Department*</Label>
              <Select 
                value={formData.department_id} 
                onValueChange={(v) => handleSelectChange('department_id', v)} 
                disabled={isSubmitting}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => 
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category*</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => handleSelectChange('category', v)} 
                disabled={isSubmitting}
                required
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="R&D">R&D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="geographic_scope">Geographic Scope*</Label>
              <Select 
                value={formData.geographic_scope} 
                onValueChange={(v) => handleSelectChange('geographic_scope', v)} 
                disabled={isSubmitting}
                required
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local">Local</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="Global">Global (Both Local & International)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="allocated_amount">Allocated Amount*</Label>
              <Input 
                id="allocated_amount" 
                name="allocated_amount" 
                type="number" 
                step="0.01" 
                value={formData.allocated_amount} 
                onChange={handleChange} 
                disabled={isSubmitting}
                required 
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => handleSelectChange('status', v)}
                disabled={isSubmitting}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="overspent">Overspent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}