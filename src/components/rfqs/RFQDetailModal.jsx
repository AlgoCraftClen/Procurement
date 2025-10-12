import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText, Building2, Calendar, DollarSign, Users, Award, Star, Clock, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { RFQResponse } from '@/api/entities';

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800", icon: FileText },
  responses_received: { label: "Responses Received", color: "bg-yellow-100 text-yellow-800", icon: FileText },
  evaluated: { label: "Evaluated", color: "bg-purple-100 text-purple-800", icon: Star },
  awarded: { label: "Awarded", color: "bg-green-100 text-green-800", icon: Award },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: FileText }
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

export default function RFQDetailModal({ rfq, isOpen, onClose, onEdit, suppliers }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadResponses = useCallback(async () => {
    if (!rfq?.id) return;
    
    setLoading(true);
    try {
      const rfqResponses = await RFQResponse.filter({ rfq_id: rfq.id });
      const sortedResponses = rfqResponses.sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
      setResponses(sortedResponses);
    } catch (error) {
      console.error('Failed to load RFQ responses:', error);
    } finally {
      setLoading(false);
    }
  }, [rfq?.id]);

  useEffect(() => {
    if (isOpen && rfq) {
      loadResponses();
    }
  }, [isOpen, rfq, loadResponses]);

  if (!rfq) return null;

  const statusInfo = statusConfig[rfq.status] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;
  const selectedSupplier = suppliers.find(s => s.id === rfq.selected_supplier);

  const formatCurrency = (amount) => `$${Number(amount || 0).toLocaleString()}`;
  const formatDate = (dateString) => dateString ? format(new Date(dateString), 'PPP') : 'N/A';
  const getSupplierName = (supplierId) => suppliers.find(s => s.id === supplierId)?.company_name || 'Unknown Supplier';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-1">
                {rfq.rfq_number}
              </DialogTitle>
              <DialogDescription className="text-lg font-medium mb-2">
                {rfq.title}
              </DialogDescription>
              <Badge className={statusInfo.color}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {statusInfo.label}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => { onClose(); onEdit(rfq); }}>Edit RFQ</Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pr-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                RFQ Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <InfoRow icon={DollarSign} label="Total Value" value={formatCurrency(rfq.total_value)} />
                  <InfoRow icon={Calendar} label="Due Date" value={formatDate(rfq.due_date)} />
                </div>
                <div className="space-y-2">
                  <InfoRow icon={Clock} label="Last Contact" value={formatDate(rfq.last_contact_date)} />
                  <InfoRow icon={Calendar} label="Next Follow-up" value={formatDate(rfq.next_followup_date)} />
                </div>
              </div>
              {rfq.description && (
                <div className="mt-4">
                  <h4 className="font-medium text-slate-600 mb-2">Description:</h4>
                  <p className="text-slate-900 bg-slate-50 p-3 rounded-md">{rfq.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Requested Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Specifications</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rfq.line_items || []).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.specifications}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Responses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Supplier Responses ({responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading responses...</div>
              ) : responses.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No supplier responses received yet.
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Shipping Time</TableHead>
                        <TableHead className="text-right">Quality Score</TableHead>
                        <TableHead className="text-right">Weighted Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((response, index) => (
                        <TableRow key={response.id} className={rfq.selected_supplier === response.supplier_id ? 'bg-green-50' : ''}>
                          <TableCell className="font-medium">{getSupplierName(response.supplier_id)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(response.total_cost)}</TableCell>
                          <TableCell className="text-right">{response.shipping_time} days</TableCell>
                          <TableCell className="text-right">{response.quality_score}/10</TableCell>
                          <TableCell className="text-right font-bold text-blue-600">
                            <div className="flex items-center justify-end gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              {response.weighted_score || 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            {rfq.selected_supplier === response.supplier_id ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Award className="w-3 h-3 mr-1" />
                                Selected
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {index === 0 && !rfq.selected_supplier ? 'Best Score' : 'Submitted'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selection Information */}
          {rfq.status === 'awarded' && selectedSupplier && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-500" />
                  Award Decision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow icon={Building2} label="Selected Supplier" value={selectedSupplier.company_name} />
                {rfq.selection_reasoning && (
                  <div>
                    <h4 className="font-medium text-slate-600 mb-2">Selection Reasoning:</h4>
                    <p className="text-slate-900 bg-green-50 p-3 rounded-md border border-green-200">{rfq.selection_reasoning}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}