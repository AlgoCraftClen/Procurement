import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Package, Building2, FileText, Calendar, User, CheckCircle, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  partial: { label: "Partial", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  complete: { label: "Complete", color: "bg-green-100 text-green-800", icon: CheckCircle },
  over_received: { label: "Over Received", color: "bg-blue-100 text-blue-800", icon: Package }
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

export default function GoodsReceiptDetailModal({ receipt, isOpen, onClose, onEdit, suppliers, purchaseOrders }) {
  if (!receipt) return null;

  const supplier = suppliers.find(s => s.id === receipt.supplier_id);
  const po = purchaseOrders.find(p => p.id === receipt.purchase_order_id);
  const statusInfo = statusConfig[receipt.status] || { label: 'Unknown', color: 'bg-slate-100', icon: Package };
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString) => dateString ? format(new Date(dateString), 'PPP') : 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-1">
                Goods Receipt {receipt.receipt_number}
              </DialogTitle>
              <DialogDescription>
                 <Badge className={statusInfo.color}>
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {statusInfo.label}
                  </Badge>
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={() => { onClose(); onEdit(receipt); }}>Edit Receipt</Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <InfoRow icon={Building2} label="Supplier" value={supplier?.company_name} />
              <InfoRow icon={FileText} label="PO Number" value={po?.po_number} />
            </div>
            <div className="space-y-2">
              <InfoRow icon={Calendar} label="Received Date" value={formatDate(receipt.received_date)} />
              <InfoRow icon={User} label="Received By" value={receipt.received_by} />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Received Items</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(receipt.line_items || []).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.ordered_quantity}</TableCell>
                      <TableCell className="text-right font-medium">{item.received_quantity}</TableCell>
                      <TableCell>
                        <Badge variant={item.condition === 'damaged' ? 'destructive' : 'secondary'}>
                          {item.condition || 'Good'}
                        </Badge>
                      </TableCell>
                       <TableCell>{item.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <Separator />

          {(receipt.notes || receipt.delivery_note) && (
            <div>
              <h3 className="font-semibold mb-2">Additional Information</h3>
              {receipt.delivery_note && <InfoRow icon={FileText} label="Delivery Note #" value={receipt.delivery_note} />}
              {receipt.notes && (
                  <div className="mt-2">
                      <p className="text-sm font-medium text-slate-600">General Notes:</p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md mt-1">{receipt.notes}</p>
                  </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}