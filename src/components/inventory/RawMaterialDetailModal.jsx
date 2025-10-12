
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import {
  Boxes,
  Truck,
  DollarSign,
  Warehouse,
  Calendar,
  AlertTriangle,
  History,
  Loader2,
  Package,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Supplier } from '@/api/entities';
import { InventoryAdjustment } from '@/api/entities';
import LabelGenerator from './LabelGenerator';

const InfoRow = ({ icon: Icon, label, value, className = "" }) => {
  if (!value && typeof value !== 'number') return null;
  return (
    <div className={`flex items-start gap-3 py-2 ${className}`}>
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
      <div className="flex-1">
        <span className="text-sm font-medium text-slate-600">{label}:</span>
        <span className="ml-2 text-slate-900">{value}</span>
      </div>
    </div>
  );
};

export default function RawMaterialDetailModal({ material, isOpen, onClose }) {
  const [supplier, setSupplier] = useState(null);
  // Removed unused state variable 'location'
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLabelGeneratorOpen, setIsLabelGeneratorOpen] = useState(false);

  const loadRelatedData = useCallback(async () => {
    if (!material) return;
    setLoading(true);
    try {
      const [supplierData, historyData] = await Promise.all([
        material.supplier_id ? Supplier.get(material.supplier_id) : Promise.resolve(null),
        InventoryAdjustment.filter({ item_id: material.id })
      ]);
      setSupplier(supplierData);
      setHistory(historyData.sort((a,b) => new Date(b.adjustment_date) - new Date(a.adjustment_date)));
      // Removed old comment about 'location' state as it's no longer present.
    } catch (error) {
      console.error("Failed to load related material data:", error);
    } finally {
      setLoading(false);
    }
  }, [material]);

  useEffect(() => {
    if (isOpen && material) {
      loadRelatedData();
    }
  }, [isOpen, material, loadRelatedData]);

  if (!material) return null;

  const isLowStock = material.current_quantity <= material.minimum_stock;
  const totalValue = (material.current_quantity || 0) * (material.unit_cost || 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {material.material_name}
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
              <Badge variant="outline">{material.sku}</Badge>
              <Badge variant="secondary">{material.category}</Badge>
              {isLowStock && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>}
            </div>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <InfoRow icon={Boxes} label="Current Quantity" value={`${material.current_quantity} ${material.unit_of_measure}`} />
              <InfoRow icon={AlertTriangle} label="Minimum Stock" value={`${material.minimum_stock} ${material.unit_of_measure}`} />
              <InfoRow icon={DollarSign} label="Unit Cost" value={`$${material.unit_cost?.toFixed(2)}`} />
              <InfoRow icon={DollarSign} label="Total Stock Value" value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <InfoRow icon={Truck} label="Supplier" value={supplier?.company_name || 'N/A'} />
              <InfoRow icon={Warehouse} label="Storage Location" value={material.storage_location} />
              <InfoRow icon={Calendar} label="Last Restocked" value={material.last_restocked ? format(new Date(material.last_restocked), 'PPP') : 'N/A'} />
              <InfoRow icon={Calendar} label="Expiry Date" value={material.expiry_date ? format(new Date(material.expiry_date), 'PPP') : 'N/A'} />
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><History className="w-5 h-5"/> Adjustment History</h3>
              {loading ? <Loader2 className="animate-spin" /> : (
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {history.length > 0 ? history.map(item => (
                    <div key={item.id} className="text-sm p-2 border rounded-md flex justify-between items-center bg-slate-50">
                      <div>
                        <p className="font-medium">
                          <span className={`capitalize font-bold ${item.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.adjustment_type}: {item.adjustment_quantity} units
                          </span>
                           - <span className="capitalize text-slate-700">{item.reason.replace(/_/g, ' ')}</span>
                        </p>
                        <p className="text-xs text-slate-500">Adjusted by {item.adjusted_by} on {format(new Date(item.adjustment_date), 'MMM d, yyyy')}</p>
                      </div>
                      <p className="text-xs text-slate-600">
                        Before: {item.quantity_before} → After: {item.quantity_after}
                      </p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No adjustment history found.</p>}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LabelGenerator
        isOpen={isLabelGeneratorOpen}
        onClose={() => setIsLabelGeneratorOpen(false)}
        item={material}
        itemType="raw_material"
      />
    </>
  );
}
