
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Pagination from "../shared/Pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";

// Define statusConfig locally to avoid import issues
const statusConfig = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-800", icon: Clock },
  received: { label: "Received", color: "bg-blue-100 text-blue-800", icon: Receipt },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: DollarSign },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: Clock },
  disputed: { label: "Disputed", color: "bg-orange-100 text-orange-800", icon: AlertCircle }
};

export default function InvoiceTable({
  invoices,
  suppliers,
  purchaseOrders,
  loading,
  onEdit,
  onViewDetails,
  onDelete,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}) {
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.company_name : 'Unknown Supplier';
  };

  const getPONumber = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    return po ? po.po_number : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    return `$${Number(amount || 0).toLocaleString()}`;
  };

  const handleDelete = (e, invoice) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(
      `Are you sure you want to delete Invoice ${invoice.invoice_number}?\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      onDelete(invoice);
    }
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Invoice #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>PO #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center p-8 text-slate-500">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                // Safe access to statusConfig with fallback
                const statusInfo = statusConfig[invoice.status] || statusConfig.pending;
                const StatusIcon = statusInfo.icon || Receipt;
                
                return (
                  <TableRow 
                    key={invoice.id} 
                    className="hover:bg-slate-50 cursor-pointer" 
                    onClick={() => onViewDetails(invoice)}
                  >
                    <TableCell className="font-mono text-blue-600">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>{getSupplierName(invoice.supplier_id)}</TableCell>
                    <TableCell>{getPONumber(invoice.purchase_order_id)}</TableCell>
                    <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(invoice); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleDelete(e, invoice)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          onPageChange={onPageChange}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
        />
      )}
    </>
  );
}
