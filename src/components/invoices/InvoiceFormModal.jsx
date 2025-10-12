import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import InvoiceForm from "./InvoiceForm";

export default function InvoiceFormModal({ 
  isOpen, 
  invoice, 
  suppliers, 
  purchaseOrders, 
  onSubmit, 
  onCancel 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (data) => {
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitError(error.message || "Failed to save invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSubmitError(null);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice?.id ? "Edit Invoice" : "Add New Invoice"}
          </DialogTitle>
        </DialogHeader>
        
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        
        <InvoiceForm
          invoice={invoice}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}