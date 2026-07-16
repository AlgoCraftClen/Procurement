
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Receipt, Building2, FileText, Calendar, DollarSign, CreditCard, Clock, CheckCircle, AlertTriangle, AlertCircle, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

// Define statusConfig locally to avoid import issues
const statusConfig = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-800", icon: Clock },
  received: { label: "Received", color: "bg-blue-100 text-blue-800", icon: Receipt },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: DollarSign },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: Clock },
  disputed: { label: "Disputed", color: "bg-orange-100 text-orange-800", icon: AlertCircle }
};

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="font-medium text-slate-600">{label}:</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
};

export default function InvoiceDetailModal({ invoice, isOpen, onClose, onEdit, onDelete, suppliers, purchaseOrders }) {
  if (!invoice) return null;

  const supplier = suppliers.find(s => s.id === invoice.supplier_id);
  const po = purchaseOrders.find(p => p.id === invoice.purchase_order_id);
  
  // Safe access to statusConfig with fallback
  const statusInfo = statusConfig[invoice.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon || Receipt;

  const formatCurrency = (amount) => `$${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateString) => dateString ? format(new Date(dateString), 'PPP') : 'N/A';

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Invoice ${invoice.invoice_number}?\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      onDelete(invoice);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-1">
                Invoice {invoice.invoice_number}
              </DialogTitle>
              <DialogDescription>
                 <Badge className={statusInfo.color}>
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {statusInfo.label}
                  </Badge>
              </DialogDescription>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-3 sm:justify-end">
              <Button variant="outline" onClick={() => { onClose(); onEdit(invoice); }}>
                Edit Invoice
              </Button>
              <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <InfoRow icon={Building2} label="Supplier" value={supplier?.company_name} />
              <InfoRow icon={FileText} label="PO Number" value={po?.po_number} />
            </div>
            <div className="space-y-2">
              <InfoRow icon={Calendar} label="Invoice Date" value={formatDate(invoice.invoice_date)} />
              <InfoRow icon={Clock} label="Due Date" value={formatDate(invoice.due_date)} />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Line Items</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoice.line_items || []).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="flex justify-end gap-4 pt-2">
             <div className="text-right">
                <p className="text-slate-500">Subtotal</p>
                <p className="font-medium">{formatCurrency(invoice.subtotal)}</p>
            </div>
            <div className="text-right">
                <p className="text-slate-500">Tax</p>
                <p className="font-medium">{formatCurrency(invoice.tax_amount)}</p>
            </div>
             <div className="text-right">
                <p className="text-slate-500 text-lg">Total Amount</p>
                <p className="font-bold text-xl text-slate-900">{formatCurrency(invoice.total_amount)}</p>
            </div>
          </div>

          <Separator />
          
           <div>
            <h3 className="font-semibold mb-2">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow icon={CheckCircle} label="Payment Date" value={formatDate(invoice.payment_date)} />
                <InfoRow icon={CreditCard} label="Payment Method" value={invoice.payment_method} />
            </div>
          </div>

          {invoice.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">{invoice.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
