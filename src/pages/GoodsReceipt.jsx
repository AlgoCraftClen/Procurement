
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { GoodsReceipt } from "@/api/entities";
import { PurchaseOrder } from "@/api/entities";
import { Supplier } from "@/api/entities";
import { RawMaterial } from "@/api/entities";
import { Equipment } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Package, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import GoodsReceiptForm from "../components/goods_receipt/GoodsReceiptForm";
import GoodsReceiptDetailModal from "../components/goods_receipt/GoodsReceiptDetailModal";
import Pagination from "../components/shared/Pagination";
import { getOrderedQuantity, normalizeGoodsReceiptLineItem } from "@/lib/procurementData";

const statusConfig = {
  partial: { label: "Partial", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  complete: { label: "Complete", color: "bg-green-100 text-green-800", icon: CheckCircle },
  over_received: { label: "Over Received", color: "bg-blue-100 text-blue-800", icon: Package }
};

export default function GoodsReceiptPage() {
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const fromPOId = searchParams.get("fromPO");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [receiptsData, suppliersData, posData] = await Promise.all([
        GoodsReceipt.list("-created_date"),
        Supplier.list(),
        PurchaseOrder.list()
      ]);
      
      setReceipts(receiptsData || []);
      setSuppliers(suppliersData || []);
      setPurchaseOrders(posData || []);
    } catch (error) {
      console.error("Error loading goods receipts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  useEffect(() => {
    if(fromPOId && purchaseOrders.length > 0) {
        const po = purchaseOrders.find(p => p.id === fromPOId);
        if (po) {
            setSelectedReceipt({ // Pre-fill a new receipt object
                purchase_order_id: po.id,
                supplier_id: po.supplier_id,
                line_items: po.line_items.map(item => ({
                    ...normalizeGoodsReceiptLineItem(item),
                    description: item.description,
                    ordered_quantity: getOrderedQuantity(item),
                    received_quantity: getOrderedQuantity(item), // Default to receiving all
                    item_id: item.item_id,
                    item_type: item.item_type
                }))
            });
            setIsFormOpen(true);
        }
    }
  }, [fromPOId, purchaseOrders]);

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.company_name : 'Unknown Supplier';
  };

  const getPONumber = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    return po ? po.po_number : 'N/A';
  };

  const handleEdit = (receipt) => {
    setSelectedReceipt(receipt);
    setIsFormOpen(true);
  };
  
  const handleViewDetails = (receipt) => {
    setViewingReceipt(receipt);
    setIsDetailModalOpen(true);
  };

  const handleNew = () => {
    setSelectedReceipt(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    let savedReceipt;
    if (selectedReceipt && selectedReceipt.id) {
      savedReceipt = await GoodsReceipt.update(selectedReceipt.id, data);
    } else {
      savedReceipt = await GoodsReceipt.create({
        ...data,
        receipt_number: data.receipt_number || `GR-${Date.now()}`
      });
    }

    // --- AUTOMATION LOGIC ---
    await updateInventoryAndPOStatus(savedReceipt);
    
    await loadData();
    setIsFormOpen(false);
    setSelectedReceipt(null);
  };
  
  const updateInventoryAndPOStatus = async (receipt) => {
    if (!receipt.purchase_order_id) return;
    
    // 1. Update Inventory
    for (const item of receipt.line_items) {
      if (item.item_id && item.received_quantity > 0) {
        try {
          if (item.item_type === 'raw_material') {
            const material = await RawMaterial.get(item.item_id);
            await RawMaterial.update(item.item_id, {
              current_quantity: (material.current_quantity || 0) + Number(item.received_quantity)
            });
          } else if (item.item_type === 'equipment') {
            // Equipment is usually a single item, not quantity based, but handle if needed
            const equipment = await Equipment.get(item.item_id);
            // Example: maybe update status from 'ordered' to 'idle'
            if (equipment.status !== 'in_use') {
                 await Equipment.update(item.item_id, { status: 'idle' });
            }
          }
        } catch (e) {
          console.error(`Failed to update inventory for item ${item.item_id}:`, e);
        }
      }
    }
    
    // 2. Update PO Status
    try {
        const po = await PurchaseOrder.get(receipt.purchase_order_id);
        const allReceiptsForPO = await GoodsReceipt.filter({ purchase_order_id: po.id });
        
        const totalReceived = {};
        po.line_items.forEach(line => {
            totalReceived[line.description] = 0;
        });

        allReceiptsForPO.forEach(r => {
            r.line_items.forEach(line => {
                if (totalReceived[line.description] !== undefined) {
                    totalReceived[line.description] += Number(line.received_quantity);
                }
            });
        });

        let isComplete = true;
        for(const line of po.line_items) {
            if ((totalReceived[line.description] || 0) < getOrderedQuantity(line)) {
                isComplete = false;
                break;
            }
        }

        const newStatus = isComplete ? 'completed' : 'partially_received';
        if (po.status !== 'completed') {
             await PurchaseOrder.update(po.id, { status: newStatus });
        }
    } catch(e) {
        console.error(`Failed to update PO status for ${receipt.purchase_order_id}:`, e);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return 'N/A';
    }
  };

  const paginatedReceipts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return receipts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [receipts, currentPage]);

  const totalPages = Math.ceil(receipts.length / ITEMS_PER_PAGE);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Goods Receipt</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Record Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReceipt && selectedReceipt.id ? "Edit Goods Receipt" : "Record New Receipt"}</DialogTitle>
            </DialogHeader>
            <GoodsReceiptForm
              receipt={selectedReceipt}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Receipt #</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : paginatedReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8 text-slate-500">
                      No goods receipts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReceipts.map((receipt) => {
                    const StatusIcon = statusConfig[receipt.status]?.icon || Package;
                    return (
                      <TableRow key={receipt.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleViewDetails(receipt)}>
                        <TableCell className="font-mono text-blue-600">{receipt.receipt_number}</TableCell>
                        <TableCell>{getPONumber(receipt.purchase_order_id)}</TableCell>
                        <TableCell>{getSupplierName(receipt.supplier_id)}</TableCell>
                        <TableCell>{formatDate(receipt.received_date)}</TableCell>
                        <TableCell>{receipt.received_by}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusConfig[receipt.status]?.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[receipt.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(receipt); }}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={receipts.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </CardContent>
      </Card>
      
      <GoodsReceiptDetailModal
        receipt={viewingReceipt}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEdit}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders}
      />
    </div>
  );
}
