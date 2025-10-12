
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Package2, // Changed from PackageCheck to Package2 as per outline
  ClipboardList,
  Boxes,
  Warehouse,
  Calendar,
  DollarSign,
  Star,
  QrCode
} from 'lucide-react';
import LabelGenerator from './LabelGenerator';

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

export default function FinishedGoodDetailModal({ finishedGood, isOpen, onClose }) {
  const [location, setLocation] = useState(null); // This state is declared but not used in the provided snippet.
  const [loading, setLoading] = useState(true); // This state is declared but not used in the provided snippet.
  const [isLabelGeneratorOpen, setIsLabelGeneratorOpen] = useState(false);

  if (!finishedGood) return null;

  const totalValue = (finishedGood.quantity || 0) * (finishedGood.cost_per_unit || 0);
  const potentialRevenue = (finishedGood.quantity || 0) * (finishedGood.selling_price || 0);
  const profitMargin = finishedGood.selling_price && finishedGood.cost_per_unit
    ? ((finishedGood.selling_price - finishedGood.cost_per_unit) / finishedGood.selling_price * 100).toFixed(1)
    : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package2 className="w-5 h-5 text-green-500" />
                {finishedGood.product_name}
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
              <Badge variant="outline">{finishedGood.sku}</Badge>
              <Badge variant="secondary">{finishedGood.category || 'No Category'}</Badge>
            </div>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <InfoRow icon={ClipboardList} label="Batch Number" value={finishedGood.batch_number} />
              <InfoRow icon={Boxes} label="Current Quantity" value={`${finishedGood.quantity} ${finishedGood.unit_of_measure}`} />
              <InfoRow icon={DollarSign} label="Cost Per Unit" value={`$${finishedGood.cost_per_unit?.toFixed(2)}`} />
              <InfoRow icon={DollarSign} label="Selling Price" value={`$${finishedGood.selling_price?.toFixed(2)}`} />
              <InfoRow icon={DollarSign} label="Total Stock Value" value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <InfoRow icon={Warehouse} label="Storage Location" value={finishedGood.storage_location} />
              <InfoRow icon={Calendar} label="Production Date" value={finishedGood.production_date ? format(new Date(finishedGood.production_date), 'PPP') : 'N/A'} />
              <InfoRow icon={Calendar} label="Expiry Date" value={finishedGood.expiry_date ? format(new Date(finishedGood.expiry_date), 'PPP') : 'N/A'} />
              <InfoRow icon={Star} label="Quality Grade" value={`Grade ${finishedGood.quality_grade}`} />
              {/* The following InfoRows are calculated but not explicitly requested to be displayed in the outline's InfoRow section. */}
              {/* If needed, uncomment and add them to the grid: */}
              {/* <InfoRow icon={DollarSign} label="Potential Revenue" value={`$${potentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} /> */}
              {/* <InfoRow icon={DollarSign} label="Profit Margin" value={`${profitMargin}%`} /> */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LabelGenerator
        isOpen={isLabelGeneratorOpen}
        onClose={() => setIsLabelGeneratorOpen(false)}
        item={finishedGood}
        itemType="finished_good"
      />
    </>
  );
}
