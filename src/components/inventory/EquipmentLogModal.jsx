
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Equipment } from "@/api/entities"; // Corrected import for Equipment
import { EquipmentLog } from "@/api/entities"; // Corrected import for EquipmentLog
import { Loader2, List } from "lucide-react";
import { format } from "date-fns";

export default function EquipmentLogModal({ isOpen, setIsOpen, equipment, action, user, onLogSuccess }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (action === 'history' && equipment) {
      const fetchHistory = async () => {
        setLoading(true);
        const logData = await EquipmentLog.filter({ equipment_id: equipment.id }, "-log_date");
        setHistory(logData);
        setLoading(false);
      };
      fetchHistory();
    }
  }, [action, equipment]);
  
  const handleConfirm = async () => {
    if (!equipment || !user) return;
    setLoading(true);

    const logEntry = {
      equipment_id: equipment.id,
      equipment_name: equipment.equipment_name,
      action: action,
      user_email: user.email,
      log_date: new Date().toISOString(),
      notes,
    };
    
    let equipmentUpdate = {};
    if (action === 'checked_out') {
      equipmentUpdate = { status: 'in_use', current_user: user.email };
    } else if (action === 'checked_in') {
      equipmentUpdate = { status: 'idle', current_user: null };
    }

    await Promise.all([
      EquipmentLog.create(logEntry),
      Equipment.update(equipment.id, equipmentUpdate)
    ]);
    
    setLoading(false);
    setNotes("");
    setIsOpen(false);
    onLogSuccess();
  };

  const renderContent = () => {
    if (action === 'history') {
      return (
        <div>
          <DialogHeader><DialogTitle>History for {equipment?.equipment_name}</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-4 p-1 mt-4">
            {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto"/> : history.length === 0 ? <p>No history found.</p> :
             history.map(log => (
                <div key={log.id} className="p-3 border rounded-lg">
                    <p className="font-medium capitalize">{log.action.replace('_', ' ')} by {log.user_email}</p>
                    <p className="text-sm text-slate-500">{format(new Date(log.log_date), 'MMM d, yyyy HH:mm')}</p>
                    {log.notes && <p className="text-sm mt-1 italic">"{log.notes}"</p>}
                </div>
             ))
            }
          </div>
        </div>
      );
    }
    
    const title = action === 'checked_out' ? 'Check Out Equipment' : 'Check In Equipment';
    
    return (
      <>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
            <p>You are about to <strong>{action?.replace('_', ' ')}</strong> the item: <strong>{equipment?.equipment_name}</strong>.</p>
            <div><Label htmlFor="notes">Notes (optional)</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}Confirm</Button>
        </DialogFooter>
      </>
    );
  };

  return <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent>{equipment && renderContent()}</DialogContent></Dialog>;
}
