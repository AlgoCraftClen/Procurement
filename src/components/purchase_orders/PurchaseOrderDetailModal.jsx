
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PurchaseOrder } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { RFQ } from "@/api/entities";
import { RFQResponse } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Receipt } from "lucide-react";
import PurchaseOrderForm from "./PurchaseOrderForm";

export default function PurchaseOrderDetailModal({ isOpen, onClose, onSaveSuccess, poId, fromRfqId, winningResponseId }) {
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const supplierData = await Supplier.list();
      setSuppliers(supplierData || []);

      if (poId) {
        const poData = await PurchaseOrder.get(poId);
        setPurchaseOrder(poData);
      } else if (fromRfqId && winningResponseId) {
        const [rfq, response] = await Promise.all([
            RFQ.get(fromRfqId),
            RFQResponse.get(winningResponseId)
        ]);
        const prefilledPO = {
            po_number: `PO-${Date.now()}`,
            supplier_id: response.supplier_id,
            order_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            line_items: response.line_items || rfq.line_items,
            total_amount: response.total_cost,
            payment_terms: response.payment_terms,
            rfq_id: rfq.id,
            notes: `Generated from RFQ: ${rfq.rfq_number}`
        };
        setPurchaseOrder(prefilledPO);
      } else {
        // For creating a blank PO
        setPurchaseOrder({
          po_number: `PO-${Date.now()}`,
          order_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          line_items: [{ description: "", quantity: 1, unit_price: 0, total_price: 0 }],
        });
      }
    } catch (error) {
        console.error("Error loading data for PO modal:", error);
    } finally {
        setLoading(false);
    }
  }, [poId, fromRfqId, winningResponseId]); // Dependencies for useCallback

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    } else {
      // Reset state when modal is closed
      setPurchaseOrder(null);
      setLoading(true);
    }
  }, [isOpen, loadInitialData]); // Updated dependencies for useEffect

  const handleSave = async (data) => {
    let savedPO;
    if (poId) {
      savedPO = await PurchaseOrder.update(poId, data);
    } else {
      savedPO = await PurchaseOrder.create({
        ...data,
        po_number: data.po_number || `PO-${Date.now()}`,
      });
      if (fromRfqId) {
        await RFQ.update(fromRfqId, { status: 'awarded' });
      }
    }
    onSaveSuccess(); // This will close modal and refresh list
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {poId ? `Edit Purchase Order: ${purchaseOrder?.po_number}` : "Create New Purchase Order"}
          </DialogTitle>
          <DialogDescription>
            {poId ? "Update the details for this purchase order." : "Fill out the form to create a new purchase order."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          </div>
        ) : (
          <PurchaseOrderForm
            purchaseOrder={purchaseOrder}
            suppliers={suppliers}
            onSave={handleSave}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
