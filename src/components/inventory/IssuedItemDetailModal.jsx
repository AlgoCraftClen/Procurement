import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, User, Calendar, MapPin, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Department } from "@/api/entities";
import { Location } from "@/api/entities";

const statusConfig = {
  issued: { label: "Issued", color: "bg-blue-100 text-blue-800" },
  returned: { label: "Returned", color: "bg-green-100 text-green-800" },
  lost: { label: "Lost", color: "bg-red-100 text-red-800" },
  damaged: { label: "Damaged", color: "bg-orange-100 text-orange-800" },
};

const conditionConfig = {
  good: { label: "Good", color: "bg-green-100 text-green-800" },
  fair: { label: "Fair", color: "bg-yellow-100 text-yellow-800" },
  poor: { label: "Poor", color: "bg-orange-100 text-orange-800" },
  damaged: { label: "Damaged", color: "bg-red-100 text-red-800" },
};

export default function IssuedItemDetailModal({ item, isOpen, onClose }) {
  const [department, setDepartment] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRelatedData = async () => {
      if (!item) return;
      
      setLoading(true);
      try {
        const promises = [];
        
        if (item.department_id) {
          promises.push(Department.get(item.department_id).catch(() => null));
        } else {
          promises.push(Promise.resolve(null));
        }

        const [deptData] = await Promise.all(promises);
        setDepartment(deptData);

        // If we have department data, load its location
        if (deptData && deptData.location_id) {
          const locData = await Location.get(deptData.location_id).catch(() => null);
          setLocation(locData);
        } else {
          setLocation(null);
        }
      } catch (error) {
        console.error("Failed to load related data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadRelatedData();
    }
  }, [item, isOpen]);

  if (!item) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return 'N/A';
    }
  };

  const isOverdue = item.expected_return_date && 
                    item.status === 'issued' && 
                    new Date(item.expected_return_date) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Issued Item Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{item.item_name}</h3>
              <p className="text-sm text-slate-500 mt-1">SKU/Serial: {item.sku_or_serial}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className={statusConfig[item.status]?.color}>
                {statusConfig[item.status]?.label || item.status}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Item Information */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              Item Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Item Type:</span>
                <p className="font-medium text-slate-900 capitalize">{item.item_type?.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-slate-500">Quantity Issued:</span>
                <p className="font-medium text-slate-900">{item.quantity_issued} {item.unit_of_measure}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Assignment Information */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              Assignment Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Issued To:</span>
                <p className="font-medium text-slate-900">{item.issued_to_employee}</p>
              </div>
              <div>
                <span className="text-slate-500">Issued By:</span>
                <p className="font-medium text-slate-900">{item.issued_by || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Department:</span>
                {loading ? (
                  <p className="font-medium text-slate-400">Loading...</p>
                ) : department ? (
                  <p className="font-medium text-slate-900">{department.name}</p>
                ) : (
                  <p className="font-medium text-slate-400">No department assigned</p>
                )}
              </div>
              {location && (
                <div className="col-span-2">
                  <span className="text-slate-500">Plant Location:</span>
                  <p className="font-medium text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location.location_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Date Information */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Timeline
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Issue Date:</span>
                <p className="font-medium text-slate-900">{formatDate(item.issue_date)}</p>
              </div>
              <div>
                <span className="text-slate-500">Expected Return:</span>
                <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatDate(item.expected_return_date)}
                </p>
              </div>
              {item.actual_return_date && (
                <div>
                  <span className="text-slate-500">Actual Return Date:</span>
                  <p className="font-medium text-slate-900">{formatDate(item.actual_return_date)}</p>
                </div>
              )}
              {item.return_condition && (
                <div>
                  <span className="text-slate-500">Return Condition:</span>
                  <Badge variant="outline" className={conditionConfig[item.return_condition]?.color}>
                    {conditionConfig[item.return_condition]?.label}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Purpose and Notes */}
          {(item.purpose || item.notes) && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Additional Information
                </h4>
                {item.purpose && (
                  <div className="mb-3">
                    <span className="text-sm text-slate-500">Purpose:</span>
                    <p className="text-sm text-slate-900 mt-1">{item.purpose}</p>
                  </div>
                )}
                {item.notes && (
                  <div>
                    <span className="text-sm text-slate-500">Notes:</span>
                    <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{item.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Audit Information */}
          <Separator />
          <div className="text-xs text-slate-500 space-y-1">
            <p>Created: {formatDate(item.created_date)} by {item.created_by}</p>
            {item.updated_date && (
              <p>Last Updated: {formatDate(item.updated_date)}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}