import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Building2, Calendar, DollarSign, CreditCard, 
  Clock, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { format, isAfter, differenceInDays } from 'date-fns';

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800", icon: FileText },
  active: { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  terminated: { label: "Terminated", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  renewed: { label: "Renewed", color: "bg-blue-100 text-blue-800", icon: CheckCircle }
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

export default function ContractDetailModal({ contract, isOpen, onClose, onEdit, suppliers }) {
  if (!contract) return null;

  const statusInfo = statusConfig[contract.status] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;
  const supplier = suppliers.find(s => s.id === contract.supplier_id);

  const formatCurrency = (amount) => `$${Number(amount || 0).toLocaleString()}`;
  const formatDate = (dateString) => dateString ? format(new Date(dateString), 'PPP') : 'N/A';

  // Calculate days until expiry
  const daysUntilExpiry = contract.end_date ? differenceInDays(new Date(contract.end_date), new Date()) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-1">
                {contract.contract_number}
              </DialogTitle>
              <p className="text-lg font-medium text-slate-600 mb-2">{contract.title}</p>
              <div className="flex items-center gap-2">
                <Badge className={statusInfo.color}>
                  <StatusIcon className="w-4 h-4 mr-2" />
                  {statusInfo.label}
                </Badge>
                {isExpiringSoon && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Clock className="w-4 h-4 mr-2" />
                    Expires in {daysUntilExpiry} days
                  </Badge>
                )}
                {isExpired && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Expired {Math.abs(daysUntilExpiry)} days ago
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={() => { onClose(); onEdit(contract); }}>
              Edit Contract
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pr-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Contract Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <InfoRow icon={Building2} label="Supplier" value={supplier?.company_name} />
                  <InfoRow icon={FileText} label="Type" value={contract.contract_type?.replace('_', ' ').toUpperCase()} />
                  <InfoRow icon={DollarSign} label="Value" value={formatCurrency(contract.value)} />
                </div>
                <div className="space-y-2">
                  <InfoRow icon={Calendar} label="Start Date" value={formatDate(contract.start_date)} />
                  <InfoRow icon={Calendar} label="End Date" value={formatDate(contract.end_date)} />
                  <InfoRow icon={CreditCard} label="Payment Terms" value={contract.payment_terms} />
                </div>
              </div>
              {contract.description && (
                <div className="mt-4">
                  <h4 className="font-medium text-slate-600 mb-2">Description:</h4>
                  <p className="text-slate-900 bg-slate-50 p-3 rounded-md">{contract.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Terms */}
          {contract.key_terms && contract.key_terms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {contract.key_terms.map((term, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          {contract.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-md">{contract.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Contract Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="font-medium">Contract Start</span>
                  <span>{formatDate(contract.start_date)}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="font-medium">Contract End</span>
                  <span>{formatDate(contract.end_date)}</span>
                </div>
                {daysUntilExpiry !== null && (
                  <div className={`flex items-center justify-between p-2 rounded ${
                    isExpired ? 'bg-red-100' : isExpiringSoon ? 'bg-yellow-100' : 'bg-blue-50'
                  }`}>
                    <span className="font-medium">
                      {isExpired ? 'Expired' : isExpiringSoon ? 'Expires Soon' : 'Time Remaining'}
                    </span>
                    <span>
                      {isExpired ? `${Math.abs(daysUntilExpiry)} days ago` : 
                       isExpiringSoon ? `${daysUntilExpiry} days` : 
                       `${daysUntilExpiry} days`}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}