
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldQuestion, 
  Globe,
  FileText,
  Calendar,
  DollarSign,
  Package,
  Building // Added Building icon for supplier type classification
} from 'lucide-react';
import { format } from 'date-fns';
import { PurchaseOrder } from '@/api/entities';
import { Invoice } from '@/api/entities';

const validationStatusConfig = {
  verified: {
    icon: ShieldCheck,
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Verified",
  },
  uncertain: {
    icon: ShieldQuestion,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "Uncertain",
  },
  potential_risk: {
    icon: ShieldAlert,
    color: "bg-red-100 text-red-800 border-red-200",
    label: "Potential Risk",
  },
  pending: {
    icon: Globe,
    color: "bg-slate-100 text-slate-800 border-slate-200",
    label: "Pending Validation",
  },
};

const InfoRow = ({ icon: Icon, label, value, className = "" }) => {
  if (!value) return null;
  
  return (
    <div className={`flex items-center gap-3 py-2 ${className}`}>
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-medium text-slate-600">{label}:</span>
        <span className="ml-2 text-slate-900">{value}</span>
      </div>
    </div>
  );
};

const ValidationBadge = ({ status, score }) => {
  const config = validationStatusConfig[status] || validationStatusConfig.pending;
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`flex items-center gap-2 px-3 py-1 ${config.color}`}>
      <Icon className="w-4 h-4" />
      <span className="font-medium">{config.label}</span>
      {score !== null && score !== undefined && (
        <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded">
          {score}% confidence
        </span>
      )}
    </Badge>
  );
};

export default function SupplierDetailModal({ supplier, isOpen, onClose, onEdit }) {
  const [relatedData, setRelatedData] = useState({
    purchaseOrders: [],
    invoices: [],
    totalSpent: 0,
    recentActivity: []
  });
  const [loadingRelated, setLoadingRelated] = useState(false);

  const loadRelatedData = useCallback(async () => {
    if (!supplier?.id) return;
    
    setLoadingRelated(true);
    try {
      const [purchaseOrders, invoices] = await Promise.all([
        PurchaseOrder.filter({ supplier_id: supplier.id }),
        Invoice.filter({ supplier_id: supplier.id })
      ]);

      const totalSpent = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      // Combine recent activity
      const recentActivity = [
        ...purchaseOrders.slice(0, 3).map(po => ({
          type: 'purchase_order',
          title: `Purchase Order ${po.po_number}`,
          date: po.created_date,
          amount: po.total_amount,
          status: po.status
        })),
        ...invoices.slice(0, 3).map(inv => ({
          type: 'invoice',
          title: `Invoice ${inv.invoice_number}`,
          date: inv.invoice_date,
          amount: inv.total_amount,
          status: inv.status
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      setRelatedData({
        purchaseOrders,
        invoices,
        totalSpent,
        recentActivity
      });
    } catch (error) {
      console.error('Failed to load related data:', error);
    } finally {
      setLoadingRelated(false);
    }
  }, [supplier?.id]); // Dependency on supplier.id ensures it re-runs if supplier changes

  useEffect(() => {
    if (isOpen && supplier) {
      loadRelatedData();
    }
  }, [isOpen, supplier, loadRelatedData]); // Added loadRelatedData to dependencies

  const formatCurrency = (amount) => {
    return `$${Number(amount || 0).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  if (!supplier) return null;

  const isLocal = supplier.supplier_type === 'local';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">
                {supplier.company_name}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                <ValidationBadge 
                  status={supplier.validation_status || 'pending'} 
                  score={supplier.confidence_score} 
                />
                <Badge variant="secondary" className={isLocal ? "bg-teal-100 text-teal-800" : "bg-purple-100 text-purple-800"}>
                  <Building className="w-3 h-3 mr-1.5" />
                  {isLocal ? 'Local Supplier' : 'International Supplier'}
                </Badge>
              </div>
            </div>
            <Button className="flex-shrink-0 sm:self-start" variant="outline" onClick={() => onEdit(supplier)}>
              Edit Supplier
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={User} label="Contact Person" value={supplier.contact_person} />
              <InfoRow icon={Mail} label="Email" value={supplier.email} />
              <InfoRow icon={Phone} label="Phone" value={supplier.phone} />
              <InfoRow icon={MapPin} label="Address" value={supplier.address} />
              <InfoRow icon={Package} label="Category" value={supplier.category} />
              <InfoRow icon={CreditCard} label="Payment Terms" value={supplier.payment_terms} />
            </CardContent>
          </Card>

          {/* Validation Details */}
          {supplier.validation_details && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  Validation Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{supplier.validation_details}</p>
              </CardContent>
            </Card>
          )}

          {/* Business Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(relatedData.totalSpent)}</p>
                <p className="text-sm text-slate-600">Total Spent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{relatedData.purchaseOrders.length}</p>
                <p className="text-sm text-slate-600">Purchase Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Package className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-purple-600">{relatedData.invoices.length}</p>
                <p className="text-sm text-slate-600">Invoices</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          {relatedData.recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          activity.type === 'purchase_order' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {activity.type === 'purchase_order' ? (
                            <FileText className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Package className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{activity.title}</p>
                          <p className="text-sm text-slate-500">{formatDate(activity.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{formatCurrency(activity.amount)}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
