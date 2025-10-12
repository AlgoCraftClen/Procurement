
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import {
  Wrench, // Wrench is now used for maintenance actions and info rows
  CheckCircle,
  User,
  MapPin,
  Calendar,
  Truck,
  DollarSign,
  History,
  Loader2,
  LogIn,
  LogOut,
  QrCode // Added for the new button
} from 'lucide-react';
import { Supplier } from '@/api/entities';
import { EquipmentLog } from '@/api/entities';
import LabelGenerator from './LabelGenerator'; // Added for the new component

const statusConfig = {
  in_use: { label: "In Use", color: "bg-blue-100 text-blue-800" },
  idle: { label: "Idle", color: "bg-green-100 text-green-800" },
  maintenance: { label: "Maintenance", color: "bg-yellow-100 text-yellow-800" },
  out_of_service: { label: "Out of Service", color: "bg-red-100 text-red-800" },
};

const logActionConfig = {
  checked_out: { icon: LogOut, color: 'text-red-500' },
  checked_in: { icon: LogIn, color: 'text-green-500' },
  maintenance_start: { icon: Wrench, color: 'text-yellow-500' }, // Changed from Tool to Wrench
  maintenance_end: { icon: CheckCircle, color: 'text-blue-500' }
};

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value && typeof value !== 'number') return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
      <div className="flex-1">
        <span className="text-sm font-medium text-slate-600">{label}:</span>
        <span className="ml-2 text-slate-900">{value}</span>
      </div>
    </div>
  );
};

export default function EquipmentDetailModal({ equipment, isOpen, onClose }) {
  const [supplier, setSupplier] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false); // Kept false as it's set to true in loadRelatedData
  const [isLabelGeneratorOpen, setIsLabelGeneratorOpen] = useState(false); // New state for LabelGenerator

  const loadRelatedData = useCallback(async () => {
    if (!equipment) return;
    setLoading(true);
    try {
      const [supplierData, logsData] = await Promise.all([
        equipment.supplier_id ? Supplier.get(equipment.supplier_id) : Promise.resolve(null),
        EquipmentLog.filter({ equipment_id: equipment.id })
      ]);
      setSupplier(supplierData);
      setLogs(logsData.sort((a, b) => new Date(b.log_date) - new Date(a.log_date)));
    } catch (error) {
      console.error("Failed to load related equipment data:", error);
    } finally {
      setLoading(false);
    }
  }, [equipment]);

  useEffect(() => {
    if (isOpen && equipment) {
      loadRelatedData();
    }
  }, [isOpen, equipment, loadRelatedData]);

  if (!equipment) return null;

  const currentStatus = statusConfig[equipment.status] || { label: 'Unknown', color: 'bg-slate-100' };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"> {/* Updated className */}
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-500" />
                {equipment.equipment_name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLabelGeneratorOpen(true)}
                className="ml-4"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Generate Label
              </Button>
            </DialogTitle>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline">{equipment.serial_number}</Badge>
              <Badge variant="secondary">{equipment.category}</Badge>
              <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
            </div>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <InfoRow icon={User} label="Current User" value={equipment.current_user || 'N/A'} />
              <InfoRow icon={MapPin} label="Location" value={equipment.location} />
              <InfoRow icon={DollarSign} label="Purchase Cost" value={`$${equipment.purchase_cost?.toLocaleString()}`} />
              <InfoRow icon={Calendar} label="Purchase Date" value={equipment.purchase_date ? format(new Date(equipment.purchase_date), 'PPP') : 'N/A'} />
              <InfoRow icon={Truck} label="Supplier" value={supplier?.company_name || 'N/A'} />
              <InfoRow icon={Wrench} label="Last Maintenance" value={equipment.last_maintenance ? format(new Date(equipment.last_maintenance), 'PPP') : 'N/A'} /> {/* Changed from Tool to Wrench */}
              <InfoRow icon={Wrench} label="Next Maintenance" value={equipment.next_maintenance ? format(new Date(equipment.next_maintenance), 'PPP') : 'N/A'} /> {/* Changed from Tool to Wrench */}
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><History className="w-5 h-5" /> Usage & Maintenance Log</h3>
              {loading ? <Loader2 className="animate-spin" /> : (
                <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
                  {logs.length > 0 ? logs.map(log => {
                    const LogIcon = logActionConfig[log.action]?.icon || History;
                    return (
                      <div key={log.id} className="text-sm p-3 border rounded-md flex items-center gap-3 bg-slate-50">
                        <LogIcon className={`w-5 h-5 flex-shrink-0 ${logActionConfig[log.action]?.color || 'text-slate-500'}`} />
                        <div className="flex-1">
                          <p className="font-medium">
                            <span className="capitalize">{log.action.replace(/_/g, ' ')}</span> by <span className="text-blue-600">{log.user_email}</span>
                          </p>
                          <p className="text-xs text-slate-500">{format(new Date(log.log_date), 'MMM d, yyyy, h:mm a')}</p>
                          {log.notes && <p className="text-xs mt-1 text-slate-600">Note: {log.notes}</p>}
                        </div>
                      </div>
                    );
                  }) : <p className="text-sm text-slate-500">No log history found.</p>}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LabelGenerator
        isOpen={isLabelGeneratorOpen}
        onClose={() => setIsLabelGeneratorOpen(false)}
        item={equipment}
        itemType="equipment"
      />
    </>
  );
}
